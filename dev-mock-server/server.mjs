// Local development mock of the Apps Script backend. It implements the
// exact same action contract described in backend/SETUP.md and Code.gs,
// backed by an in-memory store instead of Google Sheets. This lets us run
// the whole app end-to-end (real browser, real HTTP calls) without needing
// a live Google account — useful for local development and for the
// automated smoke tests in this project. It is NOT meant to be deployed.

import http from 'node:http';

const PORT = process.env.PORT || 8787;

// ---------------------------------------------------------------------------
// In-memory "sheets"
// ---------------------------------------------------------------------------
let db = {
  settings: null,
  categories: [],
  products: [],
  batches: [],
  movements: [],
  transactions: [],
  expenses: [],
};

function resetDb(keepSettings) {
  db = {
    settings: keepSettings ? db.settings : null,
    categories: [], products: [], batches: [], movements: [], transactions: [], expenses: [],
  };
}

// ---------------------------------------------------------------------------
// Shared business logic (mirrors backend/Code.gs)
// ---------------------------------------------------------------------------
function uid(prefix = '') {
  return prefix + Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}
function todayStr() {
  return new Date().toISOString().slice(0, 10);
}
function isExpired(expiryDate) {
  if (!expiryDate) return false;
  return expiryDate < todayStr();
}
function getBatchStatus(expiryDate, warningDays) {
  if (!expiryDate) return { status: 'aman', daysLeft: null };
  const diffDays = Math.round((new Date(expiryDate + 'T00:00:00Z') - new Date(todayStr() + 'T00:00:00Z')) / 86400000);
  if (diffDays < 0) return { status: 'expired', daysLeft: diffDays };
  if (diffDays === 0) return { status: 'today', daysLeft: 0 };
  if (diffDays <= warningDays) return { status: 'soon', daysLeft: diffDays };
  return { status: 'aman', daysLeft: diffDays };
}
function computeProductStock(productId, batches) {
  const pbs = batches.filter((b) => b.productId === productId);
  const total = pbs.reduce((s, b) => s + b.remainingQuantity, 0);
  const sellable = pbs.filter((b) => !isExpired(b.expiryDate)).reduce((s, b) => s + b.remainingQuantity, 0);
  return { total, sellable };
}
function fefoAllocate(productId, qty, batches) {
  const candidates = batches
    .filter((b) => b.productId === productId && b.remainingQuantity > 0 && !isExpired(b.expiryDate))
    .slice()
    .sort((a, b) => {
      if (!a.expiryDate && !b.expiryDate) return new Date(a.purchaseDate) - new Date(b.purchaseDate);
      if (!a.expiryDate) return 1;
      if (!b.expiryDate) return -1;
      return new Date(a.expiryDate) - new Date(b.expiryDate);
    });
  let remaining = qty;
  const allocations = [];
  for (const b of candidates) {
    if (remaining <= 0) break;
    const take = Math.min(b.remainingQuantity, remaining);
    allocations.push({ batchId: b.id, quantity: take, purchasePrice: b.purchasePrice });
    remaining -= take;
  }
  return { allocations, shortage: remaining };
}
function generateTrxNumber(transactions) {
  const today = todayStr().replace(/-/g, '');
  const todayCount = transactions.filter((t) => t.transactionNumber && t.transactionNumber.includes(today)).length;
  return `TRX-${today}-${String(todayCount + 1).padStart(3, '0')}`;
}

function bootstrapPayload() {
  const warningDays = db.settings?.expWarningDays ?? 30;
  const products = db.products.map((p) => {
    const { total, sellable } = computeProductStock(p.id, db.batches);
    return { ...p, totalStock: total, sellableStock: sellable, isLowStock: sellable > 0 && sellable <= p.minimumStock, isOutOfStock: sellable <= 0 };
  });
  const batches = db.batches.map((b) => {
    const { status, daysLeft } = getBatchStatus(b.expiryDate, warningDays);
    return { ...b, expStatus: status, daysLeft };
  });
  const settings = db.settings ? { ...db.settings, hasPin: !!db.settings.pin, pin: undefined } : null;
  return {
    settings,
    categories: db.categories,
    products,
    batches,
    movements: db.movements,
    transactions: db.transactions,
    expenses: db.expenses,
  };
}

// ---------------------------------------------------------------------------
// Actions
// ---------------------------------------------------------------------------
const actions = {
  setupStore({ storeName, address, adminName, pin }) {
    db.settings = { storeName, address: address || '', phone: '', adminName, pin: pin || '', expWarningDays: 30, receiptWidth: '58' };
    return bootstrapPayload();
  },
  verifyPin({ pin }) {
    return { valid: !!db.settings && db.settings.pin === pin };
  },
  updateSettings(payload) {
    db.settings = { ...db.settings, ...payload };
    return bootstrapPayload();
  },

  addCategory({ name }) {
    db.categories.push({ id: uid('cat_'), name, status: 'active' });
    return bootstrapPayload();
  },
  updateCategory({ id, name }) {
    db.categories = db.categories.map((c) => (c.id === id ? { ...c, name } : c));
    return bootstrapPayload();
  },
  toggleCategoryStatus({ id }) {
    db.categories = db.categories.map((c) => (c.id === id ? { ...c, status: c.status === 'active' ? 'inactive' : 'active' } : c));
    return bootstrapPayload();
  },

  addProduct(payload) {
    const now = new Date().toISOString();
    db.products.push({ id: uid('p_'), ...payload, status: 'active', createdAt: now, updatedAt: now });
    return bootstrapPayload();
  },
  updateProduct({ id, ...payload }) {
    db.products = db.products.map((p) => (p.id === id ? { ...p, ...payload, updatedAt: new Date().toISOString() } : p));
    return bootstrapPayload();
  },
  toggleProductStatus({ id }) {
    db.products = db.products.map((p) => (p.id === id ? { ...p, status: p.status === 'active' ? 'inactive' : 'active' } : p));
    return bootstrapPayload();
  },
  deleteProduct({ id }) {
    db.products = db.products.filter((p) => p.id !== id);
    return bootstrapPayload();
  },

  restock({ productId, quantity, purchasePrice, purchaseDate, expiryDate, note }) {
    const now = new Date().toISOString();
    const product = db.products.find((p) => p.id === productId);
    const batch = { id: uid('b_'), productId, quantity, remainingQuantity: quantity, purchasePrice, purchaseDate, expiryDate: expiryDate || null, status: 'active', createdAt: now };
    db.batches.push(batch);
    db.movements.push({ id: uid('mv_'), productId, batchId: batch.id, type: 'RESTOCK', quantity, referenceId: batch.id, note: note || '', createdAt: now });
    db.expenses.push({ id: uid('e_'), date: purchaseDate, category: 'Pembelian Stok', amount: quantity * purchasePrice, description: `Restock ${product?.name || ''} x${quantity}`, createdAt: now, auto: true });
    db.products = db.products.map((p) => (p.id === productId ? { ...p, purchasePrice } : p));
    return bootstrapPayload();
  },
  adjustStock({ batchId, delta, note }) {
    const batch = db.batches.find((b) => b.id === batchId);
    if (!batch) throw new Error('Batch tidak ditemukan');
    db.batches = db.batches.map((b) => (b.id === batchId ? { ...b, remainingQuantity: Math.max(0, b.remainingQuantity + delta) } : b));
    db.movements.push({ id: uid('mv_'), productId: batch.productId, batchId, type: 'ADJUSTMENT', quantity: delta, referenceId: null, note, createdAt: new Date().toISOString() });
    return bootstrapPayload();
  },
  writeOffBatch({ id }) {
    const batch = db.batches.find((b) => b.id === id);
    if (!batch) throw new Error('Batch tidak ditemukan');
    const qty = batch.remainingQuantity;
    db.batches = db.batches.map((b) => (b.id === id ? { ...b, remainingQuantity: 0, status: 'written_off' } : b));
    db.movements.push({ id: uid('mv_'), productId: batch.productId, batchId: id, type: 'EXPIRED', quantity: -qty, referenceId: null, note: 'Barang kedaluwarsa dibuang', createdAt: new Date().toISOString() });
    return bootstrapPayload();
  },

  completeSale({ cart, paymentMethod, paidAmount }) {
    for (const item of cart) {
      const { sellable } = computeProductStock(item.productId, db.batches);
      if (item.quantity > sellable) {
        const p = db.products.find((pp) => pp.id === item.productId);
        throw new Error(`Stok ${p?.name || 'produk'} tidak mencukupi`);
      }
    }
    let workingBatches = db.batches.slice();
    const newMovements = [];
    const items = [];
    let total = 0;
    const trxId = uid('trx_');
    const nowIso = new Date().toISOString();
    for (const item of cart) {
      const product = db.products.find((p) => p.id === item.productId);
      const { allocations, shortage } = fefoAllocate(item.productId, item.quantity, workingBatches);
      if (shortage > 0) throw new Error(`Stok ${product?.name} tidak mencukupi`);
      let cogs = 0;
      allocations.forEach((a) => {
        workingBatches = workingBatches.map((b) => (b.id === a.batchId ? { ...b, remainingQuantity: b.remainingQuantity - a.quantity } : b));
        cogs += a.quantity * a.purchasePrice;
        newMovements.push({ id: uid('mv_'), productId: item.productId, batchId: a.batchId, type: 'SALE', quantity: -a.quantity, referenceId: trxId, note: `Penjualan ${product?.name}`, createdAt: nowIso });
      });
      const subtotal = item.quantity * product.sellingPrice;
      total += subtotal;
      items.push({ productId: item.productId, productName: product.name, quantity: item.quantity, sellingPrice: product.sellingPrice, subtotal, cogs, batchAllocations: allocations });
    }
    if (paymentMethod === 'Tunai' && paidAmount < total) throw new Error('Uang diterima kurang dari total belanja');
    const paid = paymentMethod === 'Tunai' ? paidAmount : total;
    const change = paymentMethod === 'Tunai' ? paid - total : 0;
    const transaction = { id: trxId, transactionNumber: generateTrxNumber(db.transactions), transactionDate: nowIso, items, totalAmount: total, paymentMethod, paidAmount: paid, changeAmount: change, status: 'COMPLETED' };
    db.batches = workingBatches;
    db.movements.push(...newMovements);
    db.transactions.push(transaction);
    return { ...bootstrapPayload(), createdTransaction: transaction };
  },
  voidTransaction({ id }) {
    const trx = db.transactions.find((t) => t.id === id);
    if (!trx || trx.status === 'VOID') return bootstrapPayload();
    let newBatches = db.batches.slice();
    const nowIso = new Date().toISOString();
    trx.items.forEach((item) => {
      item.batchAllocations.forEach((a) => {
        newBatches = newBatches.map((b) => (b.id === a.batchId ? { ...b, remainingQuantity: b.remainingQuantity + a.quantity } : b));
        db.movements.push({ id: uid('mv_'), productId: item.productId, batchId: a.batchId, type: 'RETURN', quantity: a.quantity, referenceId: id, note: `Void transaksi ${trx.transactionNumber}`, createdAt: nowIso });
      });
    });
    db.batches = newBatches;
    db.transactions = db.transactions.map((t) => (t.id === id ? { ...t, status: 'VOID' } : t));
    return bootstrapPayload();
  },

  addExpense(payload) {
    db.expenses.push({ id: uid('e_'), ...payload, createdAt: new Date().toISOString(), auto: false });
    return bootstrapPayload();
  },
  updateExpense({ id, ...payload }) {
    db.expenses = db.expenses.map((e) => (e.id === id ? { ...e, ...payload } : e));
    return bootstrapPayload();
  },
  deleteExpense({ id }) {
    db.expenses = db.expenses.filter((e) => e.id !== id);
    return bootstrapPayload();
  },

  resetAllData() {
    resetDb(true);
    return bootstrapPayload();
  },
};

// ---------------------------------------------------------------------------
// HTTP server
// ---------------------------------------------------------------------------
const server = http.createServer((req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Headers', '*');
  res.setHeader('Content-Type', 'application/json');

  if (req.method === 'OPTIONS') { res.writeHead(204); res.end(); return; }

  const url = new URL(req.url, `http://localhost:${PORT}`);

  if (req.method === 'GET' && url.searchParams.get('action') === 'bootstrap') {
    res.writeHead(200);
    res.end(JSON.stringify({ ok: true, data: bootstrapPayload() }));
    return;
  }

  if (req.method === 'POST') {
    let body = '';
    req.on('data', (chunk) => { body += chunk; });
    req.on('end', () => {
      try {
        const { action, payload } = JSON.parse(body);
        const handler = actions[action];
        if (!handler) throw new Error(`Unknown action: ${action}`);
        const result = handler(payload || {});
        res.writeHead(200);
        res.end(JSON.stringify({ ok: true, data: result }));
      } catch (e) {
        res.writeHead(200);
        res.end(JSON.stringify({ ok: false, error: e.message }));
      }
    });
    return;
  }

  res.writeHead(404);
  res.end(JSON.stringify({ ok: false, error: 'Not found' }));
});

server.listen(PORT, () => {
  console.log(`Mock warung backend listening on http://localhost:${PORT}`);
});
