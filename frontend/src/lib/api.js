// Talks to the Google Apps Script Web App (see /backend/Code.gs).
// POST requests use `text/plain` content-type on purpose: Apps Script Web
// Apps don't handle CORS preflight (OPTIONS) requests, so we keep the POST
// a "simple request" (no preflight) and parse JSON from the raw body
// server-side via e.postData.contents.

const BASE_URL = import.meta.env.VITE_API_URL || '';

function requireBaseUrl() {
  if (!BASE_URL) {
    throw new Error('VITE_API_URL belum diatur. Salin URL Web App Apps Script Anda ke file .env (lihat .env.example).');
  }
}

async function callApi(action, payload = {}) {
  requireBaseUrl();
  const res = await fetch(BASE_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'text/plain;charset=utf-8' },
    body: JSON.stringify({ action, payload }),
  });
  if (!res.ok) throw new Error(`Server merespons dengan status ${res.status}`);
  const json = await res.json();
  if (!json.ok) throw new Error(json.error || 'Terjadi kesalahan pada server');
  return json.data;
}

export async function bootstrap() {
  requireBaseUrl();
  const res = await fetch(`${BASE_URL}?action=bootstrap`);
  if (!res.ok) throw new Error(`Server merespons dengan status ${res.status}`);
  const json = await res.json();
  if (!json.ok) throw new Error(json.error || 'Gagal memuat data dari server');
  return json.data;
}

export const api = {
  bootstrap,
  setupStore: (payload) => callApi('setupStore', payload),
  verifyPin: (payload) => callApi('verifyPin', payload),

  addCategory: (payload) => callApi('addCategory', payload),
  updateCategory: (payload) => callApi('updateCategory', payload),
  toggleCategoryStatus: (payload) => callApi('toggleCategoryStatus', payload),

  addProduct: (payload) => callApi('addProduct', payload),
  updateProduct: (payload) => callApi('updateProduct', payload),
  toggleProductStatus: (payload) => callApi('toggleProductStatus', payload),
  deleteProduct: (payload) => callApi('deleteProduct', payload),

  restock: (payload) => callApi('restock', payload),
  adjustStock: (payload) => callApi('adjustStock', payload),
  writeOffBatch: (payload) => callApi('writeOffBatch', payload),

  completeSale: (payload) => callApi('completeSale', payload),
  voidTransaction: (payload) => callApi('voidTransaction', payload),

  addExpense: (payload) => callApi('addExpense', payload),
  updateExpense: (payload) => callApi('updateExpense', payload),
  deleteExpense: (payload) => callApi('deleteExpense', payload),

  updateSettings: (payload) => callApi('updateSettings', payload),
  resetAllData: () => callApi('resetAllData', {}),
};
