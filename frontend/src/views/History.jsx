import { useState, useEffect } from 'react';
import { Search, ChevronRight, Printer, Undo2, History, Receipt } from 'lucide-react';
import { Card, SectionHeader, Btn, Badge, Modal, DateRangeFilter, EmptyState, ConfirmDialog, inputCls } from '../components/ui.jsx';
import { rupiah, fmtDateTime, todayStr, rangeForPreset, inRange } from '../lib/helpers';
import { PAYMENT_METHODS } from '../lib/constants';
import { useApp } from '../lib/context.jsx';
import { ReceiptModal } from '../components/Receipt.jsx';

function TransactionDetailModal({ open, onClose, transaction, onVoid, onPrint }) {
  if (!transaction) return null;
  return (
    <Modal open={open} onClose={onClose} title={transaction.transactionNumber} maxW="max-w-md"
      footer={
        <>
          {transaction.status === 'COMPLETED' && <Btn variant="danger" icon={Undo2} onClick={() => onVoid(transaction)}>Void</Btn>}
          <Btn variant="secondary" icon={Printer} onClick={() => onPrint(transaction)}>Cetak Ulang</Btn>
        </>
      }
    >
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <span className="text-sm text-ink-500">{fmtDateTime(transaction.transactionDate)}</span>
          {transaction.status === 'VOID' ? <Badge tone="chili">Void</Badge> : <Badge tone="warung">Selesai</Badge>}
        </div>
        <div className="divide-y divide-ink-50 border border-ink-100 rounded-xl overflow-hidden">
          {transaction.items.map((it, i) => (
            <div key={i} className="flex justify-between px-3.5 py-2.5 text-sm">
              <div>
                <p className="font-medium text-ink-700">{it.productName}</p>
                <p className="text-xs text-ink-400 font-mono">{it.quantity} x {rupiah(it.sellingPrice)}</p>
              </div>
              <span className="font-mono font-semibold text-ink-700">{rupiah(it.subtotal)}</span>
            </div>
          ))}
        </div>
        <div className="space-y-1.5 text-sm">
          <div className="flex justify-between font-bold text-base"><span>Total</span><span className="font-mono">{rupiah(transaction.totalAmount)}</span></div>
          <div className="flex justify-between text-ink-500"><span>Metode</span><span>{transaction.paymentMethod}</span></div>
          <div className="flex justify-between text-ink-500"><span>Dibayar</span><span className="font-mono">{rupiah(transaction.paidAmount)}</span></div>
          <div className="flex justify-between text-ink-500"><span>Kembalian</span><span className="font-mono">{rupiah(transaction.changeAmount)}</span></div>
        </div>
      </div>
    </Modal>
  );
}

export default function HistoryView() {
  const { transactions, voidTransaction } = useApp();
  const [preset, setPreset] = useState('today');
  const [from, setFrom] = useState(todayStr());
  const [to, setTo] = useState(todayStr());
  const [method, setMethod] = useState('all');
  const [search, setSearch] = useState('');
  const [detail, setDetail] = useState(null);
  const [receipt, setReceipt] = useState(null);
  const [confirmVoid, setConfirmVoid] = useState(null);
  const [voiding, setVoiding] = useState(false);

  useEffect(() => {
    if (preset !== 'custom') { const [f, t] = rangeForPreset(preset); setFrom(f); setTo(t); }
  }, [preset]);

  const filtered = transactions
    .filter((t) => inRange(t.transactionDate, from, to))
    .filter((t) => method === 'all' || t.paymentMethod === method)
    .filter((t) => !search || t.transactionNumber.toLowerCase().includes(search.toLowerCase()))
    .sort((a, b) => new Date(b.transactionDate) - new Date(a.transactionDate));

  const totalRevenue = filtered.filter((t) => t.status === 'COMPLETED').reduce((s, t) => s + t.totalAmount, 0);

  return (
    <div className="space-y-5">
      <SectionHeader title="Riwayat Transaksi" subtitle={`${filtered.length} transaksi · Total ${rupiah(totalRevenue)}`} />

      <Card className="space-y-3">
        <DateRangeFilter preset={preset} onPreset={setPreset} from={from} to={to} onFrom={setFrom} onTo={setTo} />
        <div className="flex flex-col sm:flex-row gap-2">
          <div className="relative flex-1">
            <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-300" />
            <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Cari nomor transaksi..." className={`${inputCls} pl-10`} />
          </div>
          <select value={method} onChange={(e) => setMethod(e.target.value)} className={`${inputCls} sm:w-44`}>
            <option value="all">Semua Metode</option>
            {PAYMENT_METHODS.map((m) => <option key={m} value={m}>{m}</option>)}
          </select>
        </div>
      </Card>

      <Card noPad>
        {filtered.length === 0 ? (
          <EmptyState icon={History} title="Belum ada transaksi" desc="Transaksi yang sudah selesai akan muncul di sini." />
        ) : (
          <div className="divide-y divide-ink-50">
            {filtered.map((t) => (
              <button type="button" key={t.id} onClick={() => setDetail(t)} className="w-full p-4 flex items-center gap-3 hover:bg-ink-50/60 text-left transition-colors">
                <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${t.status === 'VOID' ? 'bg-chili-50 text-chili-500' : 'bg-warung-50 text-warung-700'}`}>
                  <Receipt size={16} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-ink-800 font-mono truncate">{t.transactionNumber}</p>
                  <p className="text-xs text-ink-400">{fmtDateTime(t.transactionDate)} · {t.items.length} item · {t.paymentMethod}</p>
                </div>
                <div className="text-right flex-shrink-0">
                  <p className={`font-mono font-bold text-sm ${t.status === 'VOID' ? 'text-chili-300 line-through' : 'text-ink-800'}`}>{rupiah(t.totalAmount)}</p>
                  {t.status === 'VOID' && <Badge tone="chili">Void</Badge>}
                </div>
                <ChevronRight size={16} className="text-ink-300 flex-shrink-0" />
              </button>
            ))}
          </div>
        )}
      </Card>

      <TransactionDetailModal
        open={!!detail} onClose={() => setDetail(null)} transaction={detail}
        onVoid={(t) => setConfirmVoid(t)}
        onPrint={(t) => { setReceipt(t); setDetail(null); }}
      />
      <ReceiptModal open={!!receipt} onClose={() => setReceipt(null)} transaction={receipt} />
      <ConfirmDialog
        open={!!confirmVoid} onClose={() => setConfirmVoid(null)} title="Void Transaksi?"
        message={`Transaksi ${confirmVoid?.transactionNumber} akan dibatalkan dan stok terkait akan dikembalikan. Riwayat tetap tersimpan.`}
        onConfirm={async () => {
          setVoiding(true);
          try {
            await voidTransaction(confirmVoid.id);
            setConfirmVoid(null); setDetail(null);
          } catch (e) {
            // error toast already shown centrally
          } finally {
            setVoiding(false);
          }
        }}
        loading={voiding}
      />
    </div>
  );
}
