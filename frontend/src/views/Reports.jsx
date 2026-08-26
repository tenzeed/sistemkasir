import { useState, useEffect } from 'react';
import { Banknote, Receipt, Package, Boxes, PackageCheck, PackageSearch, PackageX, AlertTriangle, CalendarClock, AlertCircle, ClipboardList, TrendingUp, TrendingDown, Wallet } from 'lucide-react';
import { Card, SectionHeader, StatCard, Tabs, Badge, DateRangeFilter, EmptyState } from '../components/ui.jsx';
import { rupiah, rangeForPreset, inRange, topProductsInRange, batchStatusTone } from '../lib/helpers';
import { useApp } from '../lib/context.jsx';

export default function ReportsView() {
  const { transactions, batches, products, expenses } = useApp();
  const [tab, setTab] = useState('sales');
  const [preset, setPreset] = useState('month');
  const [from, setFrom] = useState(rangeForPreset('month')[0]);
  const [to, setTo] = useState(rangeForPreset('month')[1]);

  useEffect(() => { if (preset !== 'custom') { const [f, t] = rangeForPreset(preset); setFrom(f); setTo(t); } }, [preset]);

  const completedTx = transactions.filter((t) => t.status === 'COMPLETED' && inRange(t.transactionDate, from, to));
  const revenue = completedTx.reduce((s, t) => s + t.totalAmount, 0);
  const itemsSold = completedTx.reduce((s, t) => s + t.items.reduce((s2, i) => s2 + i.quantity, 0), 0);
  const byMethod = {};
  completedTx.forEach((t) => { byMethod[t.paymentMethod] = (byMethod[t.paymentMethod] || 0) + t.totalAmount; });
  const topProducts = topProductsInRange(transactions, from, to, 'qty');

  const activeProducts = products.filter((p) => p.status === 'active');
  const stockIn = batches.filter((b) => inRange(b.purchaseDate, from, to)).reduce((s, b) => s + b.quantity, 0);

  const activeBatches = batches.filter((b) => b.remainingQuantity > 0);
  const expExpired = activeBatches.filter((b) => b.expStatus === 'expired').map((b) => ({ ...b, product: products.find((p) => p.id === b.productId) }));
  const expToday = activeBatches.filter((b) => b.expStatus === 'today').map((b) => ({ ...b, product: products.find((p) => p.id === b.productId) }));
  const expSoon = activeBatches.filter((b) => b.expStatus === 'soon').map((b) => ({ ...b, product: products.find((p) => p.id === b.productId) }));

  const filteredExpenses = expenses.filter((e) => inRange(e.date, from, to));
  const totalExpenses = filteredExpenses.reduce((s, e) => s + e.amount, 0);
  const cogs = completedTx.reduce((s, t) => s + t.items.reduce((s2, i) => s2 + i.cogs, 0), 0);
  const grossProfit = revenue - cogs;

  const labelMap = { expired: 'Sudah EXP', today: 'Hari ini EXP', soon: 'Mendekati EXP' };

  return (
    <div className="space-y-5">
      <SectionHeader title="Laporan" subtitle="Ringkasan operasional warung berdasarkan periode" />
      <Card><DateRangeFilter preset={preset} onPreset={setPreset} from={from} to={to} onFrom={setFrom} onTo={setTo} /></Card>
      <Tabs tabs={[{ id: 'sales', label: 'Penjualan' }, { id: 'stock', label: 'Stok' }, { id: 'exp', label: 'EXP' }, { id: 'finance', label: 'Keuangan' }]} active={tab} onChange={setTab} />

      {tab === 'sales' && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
            <StatCard icon={Banknote} label="Total Penjualan" value={rupiah(revenue)} tone="warung" />
            <StatCard icon={Receipt} label="Jumlah Transaksi" value={completedTx.length} tone="ink" />
            <StatCard icon={Package} label="Produk Terjual" value={itemsSold} tone="marigold" />
          </div>
          <Card>
            <p className="text-sm font-bold text-ink-700 mb-3">Berdasarkan Metode Pembayaran</p>
            {Object.keys(byMethod).length === 0 ? <p className="text-sm text-ink-400">Tidak ada data.</p> : (
              <div className="space-y-2">
                {Object.entries(byMethod).map(([m, v]) => (
                  <div key={m} className="flex justify-between text-sm py-1.5 border-b border-ink-50 last:border-0">
                    <span className="text-ink-600">{m}</span>
                    <span className="font-mono font-semibold text-ink-800">{rupiah(v)}</span>
                  </div>
                ))}
              </div>
            )}
          </Card>
          <Card noPad>
            <p className="text-sm font-bold text-ink-700 p-5 pb-0">Produk Terlaris</p>
            {topProducts.length === 0 ? <div className="p-5"><p className="text-sm text-ink-400">Belum ada penjualan pada periode ini.</p></div> : (
              <div className="divide-y divide-ink-50 mt-3">
                {topProducts.slice(0, 10).map((p, i) => (
                  <div key={p.productId} className="flex justify-between items-center px-5 py-3 text-sm">
                    <span className="text-ink-600"><span className="text-ink-300 mr-2">{i + 1}.</span>{p.name}</span>
                    <span className="font-mono font-semibold text-ink-800">{p.qty}x · {rupiah(p.revenue)}</span>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>
      )}

      {tab === 'stock' && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
            <StatCard icon={Boxes} label="Jenis Produk Aktif" value={activeProducts.length} tone="ink" />
            <StatCard icon={PackageCheck} label="Stok Masuk (unit)" value={stockIn} tone="warung" />
            <StatCard icon={PackageSearch} label="Stok Keluar (unit)" value={itemsSold} tone="ink" />
            <StatCard icon={AlertTriangle} label="Stok Menipis" value={activeProducts.filter((p) => p.isLowStock).length} tone="marigold" />
            <StatCard icon={PackageX} label="Stok Habis" value={activeProducts.filter((p) => p.isOutOfStock).length} tone="chili" />
          </div>
          <Card noPad>
            <p className="text-sm font-bold text-ink-700 p-5 pb-3">Stok Saat Ini per Produk</p>
            <div className="divide-y divide-ink-50">
              {activeProducts.map((p) => (
                <div key={p.id} className="flex justify-between items-center px-5 py-2.5 text-sm">
                  <span className="text-ink-600">{p.name}</span>
                  <span className="font-mono font-semibold text-ink-800">{p.sellableStock} {p.unit}</span>
                </div>
              ))}
            </div>
          </Card>
        </div>
      )}

      {tab === 'exp' && (
        <div className="space-y-4">
          <div className="grid grid-cols-3 gap-3">
            <StatCard icon={CalendarClock} label="Mendekati EXP" value={expSoon.length} tone="marigold" />
            <StatCard icon={AlertCircle} label="EXP Hari Ini" value={expToday.length} tone="chili" />
            <StatCard icon={PackageX} label="Sudah EXP" value={expExpired.length} tone="chili" />
          </div>
          <Card noPad>
            {[...expToday, ...expSoon, ...expExpired].length === 0 ? (
              <EmptyState icon={CalendarClock} title="Tidak ada peringatan EXP" desc="Semua batch stok dalam kondisi aman." />
            ) : (
              <div className="divide-y divide-ink-50">
                {[...expExpired, ...expToday, ...expSoon].map((b) => (
                  <div key={b.id} className="flex justify-between items-center px-5 py-3 text-sm">
                    <div>
                      <p className="font-medium text-ink-700">{b.product?.name}</p>
                      <p className="text-xs text-ink-400">{b.remainingQuantity} {b.product?.unit} · EXP {b.expiryDate}</p>
                    </div>
                    <Badge tone={batchStatusTone(b.expStatus)}>{labelMap[b.expStatus]}</Badge>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>
      )}

      {tab === 'finance' && (
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
          <StatCard icon={Banknote} label="Pendapatan" value={rupiah(revenue)} tone="warung" />
          <StatCard icon={ClipboardList} label="HPP (Harga Pokok)" value={rupiah(cogs)} tone="ink" />
          <StatCard icon={TrendingUp} label="Laba Kotor" value={rupiah(grossProfit)} tone="marigold" />
          <StatCard icon={TrendingDown} label="Pengeluaran Operasional" value={rupiah(totalExpenses)} tone="chili" />
          <StatCard icon={Wallet} label="Arus Kas Bersih" value={rupiah(revenue - totalExpenses)} tone="ink" />
        </div>
      )}
    </div>
  );
}
