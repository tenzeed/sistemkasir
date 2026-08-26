/**
 * ============================================================================
 * Warung Manager — Backend (Google Apps Script)
 * ============================================================================
 * This script turns a Google Sheet into the database + REST-ish API for the
 * Warung Manager frontend (see ../frontend). Deploy it as a Web App (see
 * SETUP.md) and paste the resulting URL into the frontend's VITE_API_URL.
 *
 * Design notes:
 * - Every "table" is a tab in the bound spreadsheet. Column names use
 *   snake_case (matching the PRD's schema); this file maps them to the
 *   camelCase field names the frontend expects.
 * - All business rules (FEFO allocation, EXP status, stock math, transaction
 *   numbering, gross-profit calculation) live here — the frontend only
 *   displays whatever this script computes and sends back.
 * - Every mutating action returns the SAME shape as `bootstrap` (the full,
 *   freshly recomputed dataset) so the frontend can just re-render from one
 *   response instead of doing a second round trip.
 * - Writes are serialized with LockService so two simultaneous requests
 *   (e.g. two browser tabs) can't corrupt the sheet.
 * ============================================================================
 */

// ---------------------------------------------------------------------------
// Schema — sheet name + snake_case column -> camelCase field mapping
// ---------------------------------------------------------------------------
const SHEET_SETTINGS = 'Settings';

const SCHEMAS = {
  categories: {
    sheet: 'Categories',
    columns: [['category_id', 'id'], ['name', 'name'], ['status', 'status']],
  },
  products: {
    sheet: 'Products',
    columns: [
      ['product_id', 'id'], ['name', 'name'], ['category_id', 'categoryId'], ['unit', 'unit'],
      ['purchase_price', 'purchasePrice'], ['selling_price', 'sellingPrice'], ['minimum_stock', 'minimumStock'],
      ['status', 'status'], ['created_at', 'createdAt'], ['updated_at', 'updatedAt'],
    ],
  },
  batches: {
    sheet: 'Stock_Batches',
    columns: [
      ['batch_id', 'id'], ['product_id', 'productId'], ['quantity', 'quantity'],
      ['remaining_quantity', 'remainingQuantity'], ['purchase_price', 'purchasePrice'],
      ['purchase_date', 'purchaseDate'], ['expiry_date', 'expiryDate'], ['status', 'status'],
      ['created_at', 'createdAt'],
    ],
  },
  movements: {
    sheet: 'Stock_Movements',
    columns: [
      ['movement_id', 'id'], ['product_id', 'productId'], ['batch_id', 'batchId'], ['type', 'type'],
      ['quantity', 'quantity'], ['reference_id', 'referenceId'], ['note', 'note'], ['created_at', 'createdAt'],
    ],
  },
  transactions: {
    sheet: 'Transactions',
    columns: [
      ['transaction_id', 'id'], ['transaction_number', 'transactionNumber'], ['transaction_date', 'transactionDate'],
      ['total_amount', 'totalAmount'], ['payment_method', 'paymentMethod'], ['paid_amount', 'paidAmount'],
      ['change_amount', 'changeAmount'], ['status', 'status'], ['created_at', 'createdAt'],
    ],
  },
  transactionItems: {
    sheet: 'Transaction_Items',
    columns: [
      ['item_id', 'id'], ['transaction_id', 'transactionId'], ['product_id', 'productId'],
      ['product_name', 'productName'], ['batch_id', 'batchId'], ['quantity', 'quantity'],
      ['purchase_price', 'purchasePrice'], ['selling_price', 'sellingPrice'], ['subtotal', 'subtotal'],
    ],
  },
  expenses: {
    sheet: 'Expenses',
    columns: [
      ['expense_id', 'id'], ['date', 'date'], ['category', 'category'], ['amount', 'amount'],
      ['description', 'description'], ['auto', 'auto'], ['created_at', 'createdAt'],
    ],
  },
};

const DATE_ONLY_FIELDS = ['purchaseDate', 'expiryDate', 'date'];

// ---------------------------------------------------------------------------
// Low-level sheet <-> array-of-objects helpers
// ---------------------------------------------------------------------------
function getSheet_(name) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  return ss.getSheetByName(name) || ss.insertSheet(name);
}

function ensureHeaders_(sheet, headerRow) {
  if (sheet.getLastRow() === 0) sheet.appendRow(headerRow);
}

function coerceCell_(key, value) {
  if (value instanceof Date) {
    return DATE_ONLY_FIELDS.indexOf(key) !== -1
      ? Utilities.formatDate(value, Session.getScriptTimeZone(), 'yyyy-MM-dd')
      : value.toISOString();
  }
  if (value === '') return null;
  return value;
}

function readTable_(schemaKey) {
  const schema = SCHEMAS[schemaKey];
  const sheet = getSheet_(schema.sheet);
  const sheetHeaders = schema.columns.map((c) => c[0]);
  ensureHeaders_(sheet, sheetHeaders);
  const values = sheet.getDataRange().getValues();
  if (values.length < 2) return [];
  const headerRow = values[0];
  const colIndex = {};
  headerRow.forEach((h, i) => { colIndex[h] = i; });
  const idCol = colIndex[sheetHeaders[0]];
  return values.slice(1)
    .filter((r) => r[idCol] !== '' && r[idCol] != null)
    .map((r) => {
      const obj = {};
      schema.columns.forEach(([col, key]) => { obj[key] = coerceCell_(key, r[colIndex[col]]); });
      return obj;
    });
}

function writeTable_(schemaKey, arr) {
  const schema = SCHEMAS[schemaKey];
  const sheet = getSheet_(schema.sheet);
  const sheetHeaders = schema.columns.map((c) => c[0]);
  sheet.clearContents();
  sheet.appendRow(sheetHeaders);
  if (arr.length === 0) return;
  const rows = arr.map((obj) => schema.columns.map(([, key]) => {
    const v = obj[key];
    return v === undefined || v === null ? '' : v;
  }));
  sheet.getRange(2, 1, rows.length, sheetHeaders.length).setValues(rows);
}

function getSettings_() {
  const headers = ['store_name', 'address', 'phone', 'admin_name', 'pin', 'exp_warning_days', 'receipt_width'];
  const sheet = getSheet_(SHEET_SETTINGS);
  ensureHeaders_(sheet, headers);
  if (sheet.getLastRow() < 2) return null;
  const row = sheet.getRange(2, 1, 1, headers.length).getValues()[0];
  if (!row[0]) return null;
  return {
    storeName: row[0], address: row[1] || '', phone: row[2] || '', adminName: row[3],
    pin: row[4] || '', expWarningDays: Number(row[5]) || 30, receiptWidth: String(row[6] || '58'),
  };
}

function setSettings_(settings) {
  const headers = ['store_name', 'address', 'phone', 'admin_name', 'pin', 'exp_warning_days', 'receipt_width'];
  const sheet = getSheet_(SHEET_SETTINGS);
  ensureHeaders_(sheet, headers);
  sheet.getRange(2, 1, 1, headers.length).setValues([[
    settings.storeName, settings.address || '', settings.phone || '', settings.adminName,
    settings.pin || '', settings.expWarningDays || 30, settings.receiptWidth || '58',
  ]]);
}

// ---------------------------------------------------------------------------
// Business logic — mirrors dev-mock-server/server.mjs used during development
// ---------------------------------------------------------------------------
function uid_(prefix) {
  return (prefix || '') + Utilities.getUuid().replace(/-/g, '').slice(0, 12);
}
function todayStr_() {
  return Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'yyyy-MM-dd');
}
function isExpired_(expiryDate) {
  if (!expiryDate) return false;
  return expiryDate < todayStr_();
}
function getBatchStatus_(expiryDate, warningDays) {
  if (!expiryDate) return { status: 'aman', daysLeft: null };
  const diffDays = Math.round((new Date(expiryDate + 'T00:00:00Z') - new Date(todayStr_() + 'T00:00:00Z')) / 86400000);
  if (diffDays < 0) return { status: 'expired', daysLeft: diffDays };
  if (diffDays === 0) return { status: 'today', daysLeft: 0 };
  if (diffDays <= warningDays) return { status: 'soon', daysLeft: diffDays };
  return { status: 'aman', daysLeft: diffDays };
}
function computeProductStock_(productId, batches) {
  const pbs = batches.filter((b) => b.productId === productId);
  const total = pbs.reduce((s, b) => s + Number(b.remainingQuantity || 0), 0);
  const sellable = pbs.filter((b) => !isExpired_(b.expiryDate)).reduce((s, b) => s + Number(b.remainingQuantity || 0), 0);
  return { total, sellable };
}
function fefoAllocate_(productId, qty, batches) {
  const candidates = batches
    .filter((b) => b.productId === productId && Number(b.remainingQuantity) > 0 && !isExpired_(b.expiryDate))
    .slice()
    .sort((a, b) => {
      if (!a.expiryDate && !b.expiryDate) return new Date(a.purchaseDate) - new Date(b.purchaseDate);
      if (!a.expiryDate) return 1;
      if (!b.expiryDate) return -1;
      return new Date(a.expiryDate) - new Date(b.expiryDate);
    });
  let remaining = qty;
  const allocations = [];
  for (let i = 0; i < candidates.length; i++) {
    if (remaining <= 0) break;
    const b = candidates[i];
    const take = Math.min(Number(b.remainingQuantity), remaining);
    allocations.push({ batchId: b.id, quantity: take, purchasePrice: Number(b.purchasePrice) });
    remaining -= take;
  }
  return { allocations: allocations, shortage: remaining };
}
function generateTrxNumber_(transactions) {
  const today = todayStr_().replace(/-/g, '');
  const todayCount = transactions.filter((t) => t.transactionNumber && t.transactionNumber.indexOf(today) !== -1).length;
  return 'TRX-' + today + '-' + String(todayCount + 1).padStart(3, '0');
}

function assembleTransactions_() {
  const headers = readTable_('transactions');
  const itemRows = readTable_('transactionItems');
  return headers.map((t) => {
    const rowsForTx = itemRows.filter((it) => it.transactionId === t.id);
    const grouped = {};
    rowsForTx.forEach((it) => {
      if (!grouped[it.productId]) {
        grouped[it.productId] = { productId: it.productId, productName: it.productName, quantity: 0, sellingPrice: Number(it.sellingPrice), subtotal: 0, cogs: 0 };
      }
      const g = grouped[it.productId];
      g.quantity += Number(it.quantity);
      g.subtotal += Number(it.quantity) * Number(it.sellingPrice);
      g.cogs += Number(it.quantity) * Number(it.purchasePrice);
    });
    const items = Object.keys(grouped).map((k) => grouped[k]);
    return Object.assign({}, t, { items: items });
  });
}

function bootstrapPayload_() {
  const settings = getSettings_();
  const warningDays = settings ? settings.expWarningDays : 30;
  const categories = readTable_('categories');
  const productsRaw = readTable_('products');
  const batchesRaw = readTable_('batches');
  const movements = readTable_('movements');
  const transactions = assembleTransactions_();
  const expenses = readTable_('expenses');

  const products = productsRaw.map((p) => {
    const stock = computeProductStock_(p.id, batchesRaw);
    return Object.assign({}, p, {
      totalStock: stock.total,
      sellableStock: stock.sellable,
      isLowStock: stock.sellable > 0 && stock.sellable <= Number(p.minimumStock || 0),
      isOutOfStock: stock.sellable <= 0,
    });
  });
  const batches = batchesRaw.map((b) => {
    const st = getBatchStatus_(b.expiryDate, warningDays);
    return Object.assign({}, b, { expStatus: st.status, daysLeft: st.daysLeft });
  });

  return {
    settings: settings ? { storeName: settings.storeName, address: settings.address, phone: settings.phone, adminName: settings.adminName, hasPin: !!settings.pin, expWarningDays: settings.expWarningDays, receiptWidth: settings.receiptWidth } : null,
    categories: categories, products: products, batches: batches, movements: movements,
    transactions: transactions, expenses: expenses,
  };
}

// ---------------------------------------------------------------------------
// Actions
// ---------------------------------------------------------------------------
function actionSetupStore_(payload) {
  setSettings_({ storeName: payload.storeName, address: payload.address || '', phone: '', adminName: payload.adminName, pin: payload.pin || '', expWarningDays: 30, receiptWidth: '58' });
  return bootstrapPayload_();
}
function actionVerifyPin_(payload) {
  const settings = getSettings_();
  return { valid: !!settings && settings.pin === payload.pin };
}
function actionUpdateSettings_(payload) {
  const current = getSettings_() || {};
  setSettings_(Object.assign({}, current, payload));
  return bootstrapPayload_();
}

function actionAddCategory_(payload) {
  const list = readTable_('categories');
  list.push({ id: uid_('cat_'), name: payload.name, status: 'active' });
  writeTable_('categories', list);
  return bootstrapPayload_();
}
function actionUpdateCategory_(payload) {
  const list = readTable_('categories').map((c) => (c.id === payload.id ? Object.assign({}, c, { name: payload.name }) : c));
  writeTable_('categories', list);
  return bootstrapPayload_();
}
function actionToggleCategoryStatus_(payload) {
  const list = readTable_('categories').map((c) => (c.id === payload.id ? Object.assign({}, c, { status: c.status === 'active' ? 'inactive' : 'active' }) : c));
  writeTable_('categories', list);
  return bootstrapPayload_();
}

function actionAddProduct_(payload) {
  const now = new Date().toISOString();
  const list = readTable_('products');
  list.push(Object.assign({ id: uid_('p_'), status: 'active', createdAt: now, updatedAt: now }, payload));
  writeTable_('products', list);
  return bootstrapPayload_();
}
function actionUpdateProduct_(payload) {
  const id = payload.id;
  const rest = Object.assign({}, payload);
  delete rest.id;
  const list = readTable_('products').map((p) => (p.id === id ? Object.assign({}, p, rest, { updatedAt: new Date().toISOString() }) : p));
  writeTable_('products', list);
  return bootstrapPayload_();
}
function actionToggleProductStatus_(payload) {
  const list = readTable_('products').map((p) => (p.id === payload.id ? Object.assign({}, p, { status: p.status === 'active' ? 'inactive' : 'active' }) : p));
  writeTable_('products', list);
  return bootstrapPayload_();
}
function actionDeleteProduct_(payload) {
  const list = readTable_('products').filter((p) => p.id !== payload.id);
  writeTable_('products', list);
  return bootstrapPayload_();
}

function actionRestock_(payload) {
  const now = new Date().toISOString();
  const products = readTable_('products');
  const product = products.filter((p) => p.id === payload.productId)[0];

  const batch = {
    id: uid_('b_'), productId: payload.productId, quantity: payload.quantity, remainingQuantity: payload.quantity,
    purchasePrice: payload.purchasePrice, purchaseDate: payload.purchaseDate, expiryDate: payload.expiryDate || null,
    status: 'active', createdAt: now,
  };
  const batches = readTable_('batches');
  batches.push(batch);
  writeTable_('batches', batches);

  const movements = readTable_('movements');
  movements.push({ id: uid_('mv_'), productId: payload.productId, batchId: batch.id, type: 'RESTOCK', quantity: payload.quantity, referenceId: batch.id, note: payload.note || '', createdAt: now });
  writeTable_('movements', movements);

  const expenses = readTable_('expenses');
  expenses.push({
    id: uid_('e_'), date: payload.purchaseDate, category: 'Pembelian Stok', amount: payload.quantity * payload.purchasePrice,
    description: 'Restock ' + (product ? product.name : '') + ' x' + payload.quantity, auto: true, createdAt: now,
  });
  writeTable_('expenses', expenses);

  const newProducts = products.map((p) => (p.id === payload.productId ? Object.assign({}, p, { purchasePrice: payload.purchasePrice }) : p));
  writeTable_('products', newProducts);

  return bootstrapPayload_();
}
function actionAdjustStock_(payload) {
  const batches = readTable_('batches');
  const batch = batches.filter((b) => b.id === payload.batchId)[0];
  if (!batch) throw new Error('Batch tidak ditemukan');
  const newQty = Math.max(0, Number(batch.remainingQuantity) + Number(payload.delta));
  const newBatches = batches.map((b) => (b.id === payload.batchId ? Object.assign({}, b, { remainingQuantity: newQty }) : b));
  writeTable_('batches', newBatches);
  const movements = readTable_('movements');
  movements.push({ id: uid_('mv_'), productId: batch.productId, batchId: payload.batchId, type: 'ADJUSTMENT', quantity: payload.delta, referenceId: null, note: payload.note || '', createdAt: new Date().toISOString() });
  writeTable_('movements', movements);
  return bootstrapPayload_();
}
function actionWriteOffBatch_(payload) {
  const batches = readTable_('batches');
  const batch = batches.filter((b) => b.id === payload.id)[0];
  if (!batch) throw new Error('Batch tidak ditemukan');
  const qty = Number(batch.remainingQuantity);
  const newBatches = batches.map((b) => (b.id === payload.id ? Object.assign({}, b, { remainingQuantity: 0, status: 'written_off' }) : b));
  writeTable_('batches', newBatches);
  const movements = readTable_('movements');
  movements.push({ id: uid_('mv_'), productId: batch.productId, batchId: payload.id, type: 'EXPIRED', quantity: -qty, referenceId: null, note: 'Barang kedaluwarsa dibuang', createdAt: new Date().toISOString() });
  writeTable_('movements', movements);
  return bootstrapPayload_();
}

function actionCompleteSale_(payload) {
  const cart = payload.cart || [];
  const paymentMethod = payload.paymentMethod;
  const paidAmount = Number(payload.paidAmount);
  const products = readTable_('products');
  let batches = readTable_('batches');

  // Validate against current server-side stock first (never trust the client).
  for (let i = 0; i < cart.length; i++) {
    const item = cart[i];
    const stock = computeProductStock_(item.productId, batches);
    if (item.quantity > stock.sellable) {
      const p = products.filter((pp) => pp.id === item.productId)[0];
      throw new Error('Stok ' + (p ? p.name : 'produk') + ' tidak mencukupi');
    }
  }

  const trxId = uid_('trx_');
  const nowIso = new Date().toISOString();
  const newMovements = [];
  const newItemRows = [];
  const summaryItems = [];
  let total = 0;

  for (let i = 0; i < cart.length; i++) {
    const item = cart[i];
    const product = products.filter((p) => p.id === item.productId)[0];
    const alloc = fefoAllocate_(item.productId, item.quantity, batches);
    if (alloc.shortage > 0) throw new Error('Stok ' + (product ? product.name : '') + ' tidak mencukupi');

    let cogs = 0;
    alloc.allocations.forEach((a) => {
      batches = batches.map((b) => (b.id === a.batchId ? Object.assign({}, b, { remainingQuantity: Number(b.remainingQuantity) - a.quantity }) : b));
      cogs += a.quantity * a.purchasePrice;
      newMovements.push({ id: uid_('mv_'), productId: item.productId, batchId: a.batchId, type: 'SALE', quantity: -a.quantity, referenceId: trxId, note: 'Penjualan ' + (product ? product.name : ''), createdAt: nowIso });
      newItemRows.push({
        id: uid_('ti_'), transactionId: trxId, productId: item.productId, productName: product.name, batchId: a.batchId,
        quantity: a.quantity, purchasePrice: a.purchasePrice, sellingPrice: product.sellingPrice, subtotal: a.quantity * product.sellingPrice,
      });
    });

    const subtotal = item.quantity * product.sellingPrice;
    total += subtotal;
    summaryItems.push({ productId: item.productId, productName: product.name, quantity: item.quantity, sellingPrice: product.sellingPrice, subtotal: subtotal, cogs: cogs });
  }

  if (paymentMethod === 'Tunai' && paidAmount < total) throw new Error('Uang diterima kurang dari total belanja');
  const paid = paymentMethod === 'Tunai' ? paidAmount : total;
  const change = paymentMethod === 'Tunai' ? paid - total : 0;

  const transactions = readTable_('transactions');
  const transactionRow = {
    id: trxId, transactionNumber: generateTrxNumber_(transactions), transactionDate: nowIso, totalAmount: total,
    paymentMethod: paymentMethod, paidAmount: paid, changeAmount: change, status: 'COMPLETED', createdAt: nowIso,
  };

  writeTable_('batches', batches);
  writeTable_('movements', readTable_('movements').concat(newMovements));
  writeTable_('transactionItems', readTable_('transactionItems').concat(newItemRows));
  writeTable_('transactions', transactions.concat([transactionRow]));

  const result = bootstrapPayload_();
  result.createdTransaction = Object.assign({}, transactionRow, { items: summaryItems });
  return result;
}

function actionVoidTransaction_(payload) {
  const transactions = readTable_('transactions');
  const trx = transactions.filter((t) => t.id === payload.id)[0];
  if (!trx || trx.status === 'VOID') return bootstrapPayload_();

  const itemRows = readTable_('transactionItems').filter((it) => it.transactionId === payload.id);
  let batches = readTable_('batches');
  const nowIso = new Date().toISOString();
  const newMovements = [];
  itemRows.forEach((it) => {
    batches = batches.map((b) => (b.id === it.batchId ? Object.assign({}, b, { remainingQuantity: Number(b.remainingQuantity) + Number(it.quantity) }) : b));
    newMovements.push({ id: uid_('mv_'), productId: it.productId, batchId: it.batchId, type: 'RETURN', quantity: Number(it.quantity), referenceId: payload.id, note: 'Void transaksi ' + trx.transactionNumber, createdAt: nowIso });
  });

  writeTable_('batches', batches);
  writeTable_('movements', readTable_('movements').concat(newMovements));
  writeTable_('transactions', transactions.map((t) => (t.id === payload.id ? Object.assign({}, t, { status: 'VOID' }) : t)));
  return bootstrapPayload_();
}

function actionAddExpense_(payload) {
  const list = readTable_('expenses');
  list.push(Object.assign({ id: uid_('e_'), auto: false, createdAt: new Date().toISOString() }, payload));
  writeTable_('expenses', list);
  return bootstrapPayload_();
}
function actionUpdateExpense_(payload) {
  const id = payload.id;
  const rest = Object.assign({}, payload);
  delete rest.id;
  const list = readTable_('expenses').map((e) => (e.id === id ? Object.assign({}, e, rest) : e));
  writeTable_('expenses', list);
  return bootstrapPayload_();
}
function actionDeleteExpense_(payload) {
  const list = readTable_('expenses').filter((e) => e.id !== payload.id);
  writeTable_('expenses', list);
  return bootstrapPayload_();
}

function actionResetAllData_() {
  writeTable_('categories', []);
  writeTable_('products', []);
  writeTable_('batches', []);
  writeTable_('movements', []);
  writeTable_('transactions', []);
  writeTable_('transactionItems', []);
  writeTable_('expenses', []);
  return bootstrapPayload_();
}

const ACTIONS = {
  setupStore: actionSetupStore_,
  verifyPin: actionVerifyPin_,
  updateSettings: actionUpdateSettings_,
  addCategory: actionAddCategory_,
  updateCategory: actionUpdateCategory_,
  toggleCategoryStatus: actionToggleCategoryStatus_,
  addProduct: actionAddProduct_,
  updateProduct: actionUpdateProduct_,
  toggleProductStatus: actionToggleProductStatus_,
  deleteProduct: actionDeleteProduct_,
  restock: actionRestock_,
  adjustStock: actionAdjustStock_,
  writeOffBatch: actionWriteOffBatch_,
  completeSale: actionCompleteSale_,
  voidTransaction: actionVoidTransaction_,
  addExpense: actionAddExpense_,
  updateExpense: actionUpdateExpense_,
  deleteExpense: actionDeleteExpense_,
  resetAllData: actionResetAllData_,
};

// ---------------------------------------------------------------------------
// Web App entry points
// ---------------------------------------------------------------------------
function jsonResponse_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}

function doGet(e) {
  try {
    const action = e && e.parameter ? e.parameter.action : null;
    if (action === 'bootstrap') return jsonResponse_({ ok: true, data: bootstrapPayload_() });
    return jsonResponse_({ ok: false, error: 'Unknown GET action: ' + action });
  } catch (err) {
    return jsonResponse_({ ok: false, error: err.message });
  }
}

function doPost(e) {
  const lock = LockService.getScriptLock();
  try {
    lock.waitLock(10000);
  } catch (lockErr) {
    return jsonResponse_({ ok: false, error: 'Server sedang sibuk, coba lagi sebentar lagi.' });
  }
  try {
    const body = JSON.parse(e.postData.contents);
    const handler = ACTIONS[body.action];
    if (!handler) throw new Error('Unknown action: ' + body.action);
    const result = handler(body.payload || {});
    return jsonResponse_({ ok: true, data: result });
  } catch (err) {
    return jsonResponse_({ ok: false, error: err.message });
  } finally {
    lock.releaseLock();
  }
}

/**
 * Optional: run this once from the Apps Script editor (select it in the
 * function dropdown and click Run) to pre-create every sheet tab with its
 * header row. Not required — every action creates sheets it needs on first
 * use — but handy if you want to eyeball the schema before using the app.
 */
function setupSheets() {
  Object.keys(SCHEMAS).forEach((key) => {
    const schema = SCHEMAS[key];
    const sheet = getSheet_(schema.sheet);
    ensureHeaders_(sheet, schema.columns.map((c) => c[0]));
  });
  getSheet_(SHEET_SETTINGS);
  Logger.log('Semua sheet siap digunakan.');
}
