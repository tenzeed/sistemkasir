export function cx(...parts) {
  return parts.filter(Boolean).join(' ');
}

export function rupiah(n) {
  const v = Math.round(Number(n) || 0);
  return 'Rp' + v.toLocaleString('id-ID');
}

export function todayStr() {
  return new Date().toISOString().slice(0, 10);
}

export function addDaysStr(base, days) {
  const d = new Date(base);
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

export function fmtDate(iso) {
  if (!iso) return '-';
  const d = new Date(iso.length <= 10 ? iso + 'T00:00:00' : iso);
  return d.toLocaleDateString('id-ID', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

export function fmtDateTime(iso) {
  if (!iso) return '-';
  const d = new Date(iso);
  const date = d.toLocaleDateString('id-ID', { day: '2-digit', month: '2-digit', year: 'numeric' });
  const time = d.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
  return `${date} ${time}`;
}

export function fmtDateShort(iso) {
  const d = new Date(iso.length <= 10 ? iso + 'T00:00:00' : iso);
  return d.toLocaleDateString('id-ID', { weekday: 'short', day: '2-digit', month: 'short' });
}

export function inRange(iso, from, to) {
  const d = iso.slice(0, 10);
  return d >= from && d <= to;
}

export function rangeForPreset(preset) {
  const t = todayStr();
  if (preset === 'today') return [t, t];
  if (preset === 'yesterday') { const y = addDaysStr(t, -1); return [y, y]; }
  if (preset === 'week') {
    const d = new Date(t + 'T00:00:00');
    const day = (d.getDay() + 6) % 7; // Monday = 0
    return [addDaysStr(t, -day), t];
  }
  if (preset === 'month') {
    const d = new Date(t + 'T00:00:00');
    return [`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`, t];
  }
  return [t, t];
}

export function batchStatusTone(status) {
  if (status === 'expired') return 'chili';
  if (status === 'today') return 'orange';
  if (status === 'soon') return 'marigold';
  return 'warung';
}

export function buildHourlySeries(transactions) {
  const t = todayStr();
  const buckets = {};
  for (let h = 7; h <= 21; h++) buckets[h] = 0;
  transactions
    .filter((tr) => tr.status === 'COMPLETED' && tr.transactionDate.slice(0, 10) === t)
    .forEach((tr) => {
      const h = new Date(tr.transactionDate).getHours();
      if (buckets[h] == null) buckets[h] = 0;
      buckets[h] += tr.totalAmount;
    });
  return Object.entries(buckets).map(([h, v]) => ({ label: `${h}:00`, total: v }));
}

export function buildDailySeries(transactions, numDays) {
  const days = [];
  for (let i = numDays - 1; i >= 0; i--) days.push(addDaysStr(todayStr(), -i));
  const totals = {};
  days.forEach((d) => (totals[d] = 0));
  transactions
    .filter((tr) => tr.status === 'COMPLETED')
    .forEach((tr) => {
      const d = tr.transactionDate.slice(0, 10);
      if (totals[d] != null) totals[d] += tr.totalAmount;
    });
  return days.map((d) => ({ label: fmtDateShort(d), total: totals[d] }));
}

export function topProductsInRange(transactions, from, to, by = 'qty') {
  const map = {};
  transactions
    .filter((tr) => tr.status === 'COMPLETED' && inRange(tr.transactionDate, from, to))
    .forEach((tr) => {
      tr.items.forEach((it) => {
        if (!map[it.productId]) map[it.productId] = { productId: it.productId, name: it.productName, qty: 0, revenue: 0 };
        map[it.productId].qty += it.quantity;
        map[it.productId].revenue += it.subtotal;
      });
    });
  return Object.values(map).sort((a, b) => (by === 'qty' ? b.qty - a.qty : b.revenue - a.revenue));
}
