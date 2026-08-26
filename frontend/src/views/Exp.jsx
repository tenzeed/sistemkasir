import { useState } from 'react';
import { Info, Trash2, CalendarClock } from 'lucide-react';
import { Card, SectionHeader, Btn, Badge, Tabs, EmptyState, ConfirmDialog, inputCls } from '../components/ui.jsx';
import { fmtDate, batchStatusTone } from '../lib/helpers';
import { useApp } from '../lib/context.jsx';

export default function ExpView() {
  const { products, batches, settings, updateSettings, writeOffBatch } = useApp();
  const [filter, setFilter] = useState('all');
  const [confirmWriteOff, setConfirmWriteOff] = useState(null);

  const rows = batches
    .filter((b) => b.remainingQuantity > 0)
    .map((b) => ({ ...b, product: products.find((p) => p.id === b.productId) }))
    .filter((b) => b.product)
    .sort((a, b) => (a.daysLeft ?? 99999) - (b.daysLeft ?? 99999));

  const counts = {
    all: rows.length,
    expired: rows.filter((r) => r.expStatus === 'expired').length,
    today: rows.filter((r) => r.expStatus === 'today').length,
    soon: rows.filter((r) => r.expStatus === 'soon').length,
    aman: rows.filter((r) => r.expStatus === 'aman').length,
  };

  const filtered = filter === 'all' ? rows : rows.filter((r) => r.expStatus === filter);

  const filterTabs = [
    { id: 'all', label: `Semua (${counts.all})` },
    { id: 'expired', label: `Sudah EXP (${counts.expired})` },
    { id: 'today', label: `Hari Ini (${counts.today})` },
    { id: 'soon', label: `Mendekati (${counts.soon})` },
    { id: 'aman', label: `Aman (${counts.aman})` },
  ];

  const labelMap = { expired: 'Sudah EXP', today: 'Hari ini EXP', soon: 'Mendekati EXP', aman: 'Aman' };

  return (
    <div className="space-y-5">
      <SectionHeader title="Manajemen Kedaluwarsa (EXP)" subtitle="Pantau tanggal EXP per batch stok agar penjualan mengikuti prinsip FEFO" />

      <Card>
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-2 text-sm text-ink-600">
            <Info size={15} className="text-ink-400" />
            Batas "mendekati EXP" saat ini:
          </div>
          <select
            value={settings.expWarningDays}
            onChange={(e) => updateSettings({ expWarningDays: Number(e.target.value) })}
            className={`${inputCls} w-40`}
          >
            <option value={7}>7 hari</option>
            <option value={14}>14 hari</option>
            <option value={30}>30 hari</option>
          </select>
        </div>
      </Card>

      <Tabs tabs={filterTabs} active={filter} onChange={setFilter} />

      <Card noPad>
        {filtered.length === 0 ? (
          <EmptyState icon={CalendarClock} title="Tidak ada batch di kategori ini" desc="Coba pilih filter status EXP yang lain." />
        ) : (
          <div className="divide-y divide-ink-50">
            {filtered.map((b) => (
              <div key={b.id} className="p-4 flex items-center gap-3 flex-wrap sm:flex-nowrap">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="font-semibold text-sm text-ink-800">{b.product.name}</p>
                    <Badge tone={batchStatusTone(b.expStatus)}>{labelMap[b.expStatus]}</Badge>
                  </div>
                  <p className="text-xs text-ink-400 mt-0.5 font-mono">Batch #{b.id.slice(-6)} · {b.remainingQuantity} {b.product.unit}</p>
                </div>
                <div className="text-right flex-shrink-0">
                  <p className="text-sm font-semibold text-ink-700">{b.expiryDate ? fmtDate(b.expiryDate) : 'Tanpa EXP'}</p>
                  <p className="text-xs text-ink-400">
                    {b.daysLeft == null ? '—' : b.daysLeft < 0 ? `${Math.abs(b.daysLeft)} hari lalu` : b.daysLeft === 0 ? 'hari ini' : `sisa ${b.daysLeft} hari`}
                  </p>
                </div>
                {b.expStatus === 'expired' && (
                  <Btn size="sm" variant="danger" icon={Trash2} onClick={() => setConfirmWriteOff(b)}>Buang</Btn>
                )}
              </div>
            ))}
          </div>
        )}
      </Card>

      <ConfirmDialog
        open={!!confirmWriteOff} onClose={() => setConfirmWriteOff(null)} title="Buang Stok Kedaluwarsa?"
        message={`${confirmWriteOff?.remainingQuantity} ${confirmWriteOff?.product?.unit} ${confirmWriteOff?.product?.name} akan ditandai sebagai rusak/dibuang dan dikeluarkan dari stok.`}
        onConfirm={() => { writeOffBatch(confirmWriteOff.id); setConfirmWriteOff(null); }}
      />
    </div>
  );
}
