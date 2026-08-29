import { useRef, useState } from 'react';
import { Printer, ImageDown } from 'lucide-react';
import html2canvas from 'html2canvas';
import { Modal, Btn } from './ui.jsx';
import { rupiah, fmtDateTime } from '../lib/helpers';
import { useApp } from '../lib/context.jsx';

export function ReceiptContent({ transaction, settings }) {
  const width = settings.receiptWidth === '80' ? 'max-w-xs' : 'max-w-[260px]';
  return (
    <div className={`receipt-paper font-mono mx-auto ${width} px-4 pt-5 shadow-sm`}>
      <div className="text-center mb-3">
        <p className="font-bold text-sm">{settings.storeName}</p>
        {settings.address && <p className="text-[10px] text-ink-500">{settings.address}</p>}
        {settings.phone && <p className="text-[10px] text-ink-500">{settings.phone}</p>}
      </div>
      <div className="dashed-rule my-2" />
      <div className="text-[10px] flex justify-between"><span>No</span><span>{transaction.transactionNumber}</span></div>
      <div className="text-[10px] flex justify-between"><span>Tanggal</span><span>{fmtDateTime(transaction.transactionDate)}</span></div>
      <div className="dashed-rule my-2" />
      <div className="space-y-1.5">
        {transaction.items.map((it, i) => (
          <div key={i} className="text-[11px]">
            <p>{it.productName}</p>
            <div className="flex justify-between text-ink-500">
              <span>{it.quantity} x {rupiah(it.sellingPrice)}</span>
              <span>{rupiah(it.subtotal)}</span>
            </div>
          </div>
        ))}
      </div>
      <div className="dashed-rule my-2" />
      <div className="text-xs font-bold flex justify-between"><span>TOTAL</span><span>{rupiah(transaction.totalAmount)}</span></div>
      <div className="dashed-rule my-2" />
      <div className="text-[11px] flex justify-between"><span>Pembayaran</span><span>{transaction.paymentMethod}</span></div>
      <div className="text-[11px] flex justify-between"><span>Bayar</span><span>{rupiah(transaction.paidAmount)}</span></div>
      <div className="text-[11px] flex justify-between"><span>Kembali</span><span>{rupiah(transaction.changeAmount)}</span></div>
      <p className="text-center text-[11px] mt-4">Terima Kasih 🙏</p>
    </div>
  );
}

export function ReceiptModal({ open, onClose, transaction }) {
  const { settings, pushToast } = useApp();
  const captureRef = useRef(null);
  const [saving, setSaving] = useState(false);

  if (!transaction) return null;

  async function saveAsImage() {
    if (saving || !captureRef.current) return;
    setSaving(true);
    try {
      const canvas = await html2canvas(captureRef.current, {
        backgroundColor: '#f5f7f6',
        scale: 2, // sharp enough to stay readable when shared/zoomed in WhatsApp
        useCORS: true,
      });
      const blob = await new Promise((resolve) => canvas.toBlob(resolve, 'image/png'));
      if (!blob) throw new Error('no-blob');

      const fileName = `struk-${transaction.transactionNumber}.png`;
      const file = new File([blob], fileName, { type: 'image/png' });

      // On phones this opens the native share sheet directly — WhatsApp
      // shows up there automatically if it's installed, no extra steps.
      if (navigator.canShare && navigator.canShare({ files: [file] })) {
        try {
          await navigator.share({ files: [file], title: 'Struk Transaksi', text: `Struk ${transaction.transactionNumber}` });
          return;
        } catch (shareErr) {
          if (shareErr && shareErr.name === 'AbortError') return; // person cancelled the share sheet — not an error
          // Any other share failure: fall through to a plain download instead.
        }
      }

      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      pushToast('Gambar struk tersimpan, bisa dibagikan lewat WhatsApp dari galeri/unduhan');
    } catch (e) {
      pushToast('Gagal menyimpan gambar struk', 'error');
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal
      open={open} onClose={onClose} title="Struk Transaksi" maxW="max-w-sm"
      footer={
        <>
          <Btn variant="secondary" className="flex-1" onClick={onClose} disabled={saving}>Tutup</Btn>
          <Btn variant="secondary" className="flex-1" icon={ImageDown} loading={saving} loadingText="Memproses..." onClick={saveAsImage}>Simpan</Btn>
          <Btn className="flex-1" icon={Printer} onClick={() => window.print()} disabled={saving}>Cetak</Btn>
        </>
      }
    >
      <div ref={captureRef} className="print-area bg-ink-50 -m-5 sm:m-0 p-6 rounded-xl">
        <ReceiptContent transaction={transaction} settings={settings} />
      </div>
    </Modal>
  );
}
