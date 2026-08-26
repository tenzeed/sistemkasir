import { useState } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Banknote, ShoppingCart, TrendingDown, TrendingUp, PackageX, CalendarClock, PackageSearch, ChevronDown } from 'lucide-react';
import { Card, SectionHeader, StatCard, Tabs, EmptyState, ProgressBar } from '../components/ui.jsx';
import { rupiah, fmtDate, todayStr, addDaysStr, rangeForPreset, buildHourlySeries, buildDailySeries, topProductsInRange } from '../lib/helpers';
import { useApp } from '../lib/context.jsx';

export default function DashboardView() {
  const { products, batches, transactions, expenses, settings, goTo } = useApp();
  const [chartPeriod, setChartPeriod] = useState('week');
  const [topPeriod, setTopPeriod] = useState('today');
  const [topBy, setTopBy] = useState('qty');

  const t = todayStr();
  const todayTx = transactions.filter((tr) => tr.status === 'COMPLETED' && tr.transactionDate.slice(0, 10) === t);
  const todayRevenue = todayTx.reduce((s, tr) => s + tr.totalAmount, 0);
  const todayItemsSold = todayTx.reduce((s, tr) => s + tr.items.reduce((s2, it) => s2 + it.quantity, 0), 0);
  const todayExpenses = expenses.filter((e) => e.date === t).reduce((s, e) => s + e.amount, 0);
  const todayCogs = todayTx.reduce((s, tr) => s + tr.items.reduce((s2, it) => s2 + it.cogs, 0), 0);
  const todayGrossProfit = todayRevenue - todayCogs;

  const yesterday = addDaysStr(t, -1);
  const yTx = transactions.filter((tr) => tr.status === 'COMPLETED' && tr.transactionDate.slice(0, 10) === yesterday);
  const yRevenue = yTx.reduce((s, tr) => s + tr.totalAmount, 0);
  const revenueTrend = yRevenue > 0 ? Math.round(((todayRevenue - yRevenue) / yRevenue) * 100) : null;

  const activeProducts = products.filter((p) => p.status === 'active');
  const lowStock = activeProducts.filter((p) => p.isLowStock);
  const outOfStock = activeProducts.filter((p) => p.isOutOfStock);

  const activeBatches = batches.filter((b) => b.remainingQuantity > 0);
  const nearExp = activeBatches.filter((b) => b.expStatus === 'soon' || b.expStatus === 'today');
  const expiredCount = activeBatches.filter((b) => b.expStatus === 'expired').length;
  const firstNearExp = nearExp.slice().sort((a, b) => (a.daysLeft ?? 0) - (b.daysLeft ?? 0))[0];
  const firstNearExpProduct = firstNearExp && products.find((p) => p.id === firstNearExp.productId);

  const chartData = chartPeriod === 'today' ? buildHourlySeries(transactions) : buildDailySeries(transactions, chartPeriod === 'week' ? 7 : 30);
  const [topFrom, topTo] = rangeForPreset(topPeriod);
  const topProducts = topProductsInRange(transactions, topFrom, topTo, topBy).slice(0, 5);
  const maxTop = topProducts[0] ? (topBy === 'qty' ? topProducts[0].qty : topProducts[0].revenue) : 1;

  return (
    <div className="space-y-5">
      <SectionHeader title={`Halo, ${settings.adminName} 👋`} subtitle={fmtDate(t) + ' — begini kondisi warung hari ini'} />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard icon={Banknote} label="Pendapatan Hari Ini" value={rupiah(todayRevenue)} tone="warung" trend={revenueTrend} />
        <StatCard icon={ShoppingCart} label="Transaksi Hari Ini" value={todayTx.length} sub={`${todayItemsSold} item terjual`} tone="ink" />
        <StatCard icon={TrendingDown} label="Pengeluaran Hari Ini" value={rupiah(todayExpenses)} tone="chili" />
        <StatCard icon={TrendingUp} label="Estimasi Laba Kotor" value={rupiah(todayGrossProfit)} tone="marigold" />
      </div>

      {(lowStock.length > 0 || outOfStock.length > 0 || nearExp.length > 0 || expiredCount > 0) && (
        <div className="grid sm:grid-cols-2 gap-3">
          {(outOfStock.length > 0 || lowStock.length > 0) && (
            <Card accent="marigold" className="bg-marigold-50/30">
              <div className="flex items-center gap-2 mb-3">
                <PackageX size={16} className="text-marigold-600" />
                <p className="text-sm font-bold text-ink-800">Peringatan Stok</p>
              </div>
              <div className="flex gap-4 text-sm">
                {outOfStock.length > 0 && <button type="button" onClick={() => goTo('products')} className="text-left"><span className="font-extrabold text-chili-600">{outOfStock.length}</span> <span className="text-ink-500">produk habis</span></button>}
                {lowStock.length > 0 && <button type="button" onClick={() => goTo('products')} className="text-left"><span className="font-extrabold text-marigold-600">{lowStock.length}</span> <span className="text-ink-500">stok menipis</span></button>}
              </div>
            </Card>
          )}
          {(nearExp.length > 0 || expiredCount > 0) && (
            <Card accent="chili" className="bg-chili-50/20">
              <div className="flex items-center gap-2 mb-3">
                <CalendarClock size={16} className="text-chili-500" />
                <p className="text-sm font-bold text-ink-800">Peringatan Kedaluwarsa</p>
              </div>
              <div className="flex gap-4 text-sm mb-2">
                {nearExp.length > 0 && <button type="button" onClick={() => goTo('exp')} className="text-left"><span className="font-extrabold text-marigold-600">{nearExp.length}</span> <span className="text-ink-500">mendekati EXP</span></button>}
                {expiredCount > 0 && <button type="button" onClick={() => goTo('exp')} className="text-left"><span className="font-extrabold text-chili-600">{expiredCount}</span> <span className="text-ink-500">sudah EXP</span></button>}
              </div>
              {firstNearExp && (
                <p className="text-xs text-ink-500 border-t border-chili-100 pt-2">
                  ⚠ {firstNearExpProduct?.name} — sisa {firstNearExp.daysLeft === 0 ? 'hari ini' : `${firstNearExp.daysLeft} hari`}
                </p>
              )}
            </Card>
          )}
        </div>
      )}

      <Card noPad>
        <div className="p-5 pb-0 flex items-center justify-between flex-wrap gap-3">
          <p className="font-bold text-ink-800">Grafik Penjualan</p>
          <Tabs tabs={[{ id: 'today', label: 'Hari ini' }, { id: 'week', label: 'Mingguan' }, { id: 'month', label: 'Bulanan' }]} active={chartPeriod} onChange={setChartPeriod} />
        </div>
        <div className="h-64 px-2 pb-4 pt-4">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#eef1ee" />
              <XAxis dataKey="label" tick={{ fontSize: 11, fill: '#a6b5ac' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: '#a6b5ac' }} axisLine={false} tickLine={false} tickFormatter={(v) => (v >= 1000 ? `${v / 1000}rb` : v)} width={40} />
              <Tooltip formatter={(v) => rupiah(v)} cursor={{ fill: '#f5f7f6' }} contentStyle={{ borderRadius: 12, border: '1px solid #e7ebe8', fontSize: 12 }} />
              <Bar dataKey="total" fill="#0f6b4c" radius={[6, 6, 0, 0]} maxBarSize={36} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </Card>

      <Card noPad>
        <div className="p-5 pb-0 flex items-center justify-between flex-wrap gap-3">
          <p className="font-bold text-ink-800">Produk Terlaris</p>
          <Tabs tabs={[{ id: 'today', label: 'Hari ini' }, { id: 'week', label: '7 Hari' }, { id: 'month', label: 'Bulan ini' }]} active={topPeriod} onChange={setTopPeriod} />
        </div>
        <div className="p-5">
          {topProducts.length === 0 ? (
            <EmptyState icon={PackageSearch} title="Belum ada penjualan" desc="Produk terlaris akan muncul di sini setelah ada transaksi." />
          ) : (
            <div className="space-y-3">
              <div className="flex justify-end">
                <button type="button" onClick={() => setTopBy(topBy === 'qty' ? 'revenue' : 'qty')} className="text-xs font-bold text-warung-700 flex items-center gap-1">
                  Urutkan: {topBy === 'qty' ? 'Jumlah Terjual' : 'Omzet'} <ChevronDown size={12} />
                </button>
              </div>
              {topProducts.map((p, i) => (
                <div key={p.productId} className="flex items-center gap-3">
                  <span className="w-5 text-xs font-extrabold text-ink-300">{i + 1}</span>
                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between text-sm mb-1.5">
                      <span className="font-semibold text-ink-700 truncate">{p.name}</span>
                      <span className="font-mono text-ink-500 flex-shrink-0 ml-2">{topBy === 'qty' ? `${p.qty}x` : rupiah(p.revenue)}</span>
                    </div>
                    <ProgressBar value={topBy === 'qty' ? p.qty : p.revenue} max={maxTop} />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </Card>
    </div>
  );
}
