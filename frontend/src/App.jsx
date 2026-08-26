import { useState, useEffect, useCallback } from 'react';
import { Loader2, AlertTriangle } from 'lucide-react';
import { AppCtx } from './lib/context.jsx';
import { api } from './lib/api.js';
import { NAV_ITEMS } from './lib/constants';
import { Sidebar, TopBar, BottomNav, MoreSheet } from './components/Nav.jsx';
import { Toasts, Btn } from './components/ui.jsx';
import { SetupView, LoginView } from './views/Auth.jsx';
import DashboardView from './views/Dashboard.jsx';
import ProductsView from './views/Products.jsx';
import StockView from './views/Stock.jsx';
import ExpView from './views/Exp.jsx';
import PosView from './views/Pos.jsx';
import HistoryView from './views/History.jsx';
import FinanceView from './views/Finance.jsx';
import ReportsView from './views/Reports.jsx';
import SettingsView from './views/Settings.jsx';

function uid(prefix = '') {
  return prefix + Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

const EMPTY_DATA = { settings: null, categories: [], products: [], batches: [], movements: [], transactions: [], expenses: [] };

export default function App() {
  const [phase, setPhase] = useState('loading'); // loading | error | setup | login | ready
  const [errorMsg, setErrorMsg] = useState('');
  const [data, setData] = useState(EMPTY_DATA);
  const [loggedIn, setLoggedIn] = useState(false);
  const [activeView, setActiveView] = useState('dashboard');
  const [moreOpen, setMoreOpen] = useState(false);
  const [toasts, setToasts] = useState([]);

  const pushToast = useCallback((message, type = 'success') => {
    const id = uid('t_');
    setToasts((ts) => [...ts, { id, message, type }]);
    setTimeout(() => setToasts((ts) => ts.filter((t) => t.id !== id)), 3200);
  }, []);
  const removeToast = (id) => setToasts((ts) => ts.filter((t) => t.id !== id));

  function applyData(d) {
    setData({
      settings: d.settings || null,
      categories: d.categories || [],
      products: d.products || [],
      batches: d.batches || [],
      movements: d.movements || [],
      transactions: d.transactions || [],
      expenses: d.expenses || [],
    });
  }

  const load = useCallback(async () => {
    setPhase('loading');
    try {
      const d = await api.bootstrap();
      applyData(d);
      setPhase(d.settings ? 'login' : 'setup');
    } catch (e) {
      setErrorMsg(e.message || 'Gagal terhubung ke server');
      setPhase('error');
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  // Every mutating API call returns the freshly recomputed full dataset
  // (same shape as bootstrap). This wrapper applies it to state and shows
  // exactly one toast — success on the happy path, error on failure — so
  // individual views never need their own duplicate toast/try-catch logic.
  const act = useCallback(async (fn, successMsg) => {
    try {
      const d = await fn();
      applyData(d);
      if (successMsg) pushToast(successMsg);
      return d;
    } catch (e) {
      pushToast(e.message || 'Terjadi kesalahan, coba lagi', 'error');
      throw e;
    }
  }, [pushToast]);

  async function completeSetup({ storeName, address, adminName, pin }) {
    const d = await act(() => api.setupStore({ storeName, address, adminName, pin }));
    applyData(d);
    setLoggedIn(true);
    setPhase('ready');
  }

  async function verifyPin(pin) {
    try {
      const res = await api.verifyPin({ pin });
      return !!res.valid;
    } catch (e) {
      pushToast(e.message || 'Gagal memeriksa PIN', 'error');
      return false;
    }
  }

  function onLoginSuccess() { setLoggedIn(true); setPhase('ready'); }
  function onLogout() { setLoggedIn(false); setPhase('login'); setMoreOpen(false); }

  const actions = {
    addCategory: (name) => act(() => api.addCategory({ name }), 'Kategori ditambahkan'),
    updateCategory: (id, name) => act(() => api.updateCategory({ id, name }), 'Kategori diperbarui'),
    toggleCategoryStatus: (id) => act(() => api.toggleCategoryStatus({ id })),

    addProduct: (payload) => act(() => api.addProduct(payload), 'Produk berhasil ditambahkan'),
    updateProduct: (id, payload) => act(() => api.updateProduct({ id, ...payload }), 'Produk berhasil diperbarui'),
    toggleProductStatus: (id) => act(() => api.toggleProductStatus({ id })),
    deleteProduct: (id) => act(() => api.deleteProduct({ id }), 'Produk dihapus'),

    restock: (payload) => act(() => api.restock(payload), 'Stok berhasil ditambahkan'),
    adjustStock: (payload) => act(() => api.adjustStock(payload), 'Koreksi stok tersimpan'),
    writeOffBatch: (id) => act(() => api.writeOffBatch({ id }), 'Stok kedaluwarsa dicatat sebagai dibuang'),

    completeSale: async (payload) => {
      const d = await act(() => api.completeSale(payload), 'Transaksi berhasil disimpan');
      return d.createdTransaction;
    },
    voidTransaction: (id) => act(() => api.voidTransaction({ id }), 'Transaksi telah di-void, stok dikembalikan'),

    addExpense: (payload) => act(() => api.addExpense(payload), 'Pengeluaran dicatat'),
    updateExpense: (id, payload) => act(() => api.updateExpense({ id, ...payload }), 'Pengeluaran diperbarui'),
    deleteExpense: (id) => act(() => api.deleteExpense({ id }), 'Pengeluaran dihapus'),

    updateSettings: (payload) => act(() => api.updateSettings(payload), 'Pengaturan disimpan'),
    resetAllData: () => act(() => api.resetAllData(), 'Semua data telah direset'),
  };

  const alertCount = data.batches
    .filter((b) => b.remainingQuantity > 0)
    .filter((b) => b.expStatus === 'soon' || b.expStatus === 'today' || b.expStatus === 'expired').length;

  if (phase === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-ink-50">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="animate-spin text-warung-700" size={28} />
          <p className="text-sm text-ink-400">Menghubungkan ke server...</p>
        </div>
      </div>
    );
  }

  if (phase === 'error') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-ink-50 p-4">
        <div className="max-w-sm w-full text-center bg-white rounded-2xl shadow-card p-6 border border-chili-100">
          <div className="w-12 h-12 rounded-2xl bg-chili-50 text-chili-500 flex items-center justify-center mx-auto mb-3">
            <AlertTriangle size={22} />
          </div>
          <p className="font-bold text-ink-800 mb-1">Tidak bisa terhubung ke server</p>
          <p className="text-sm text-ink-500 mb-4">{errorMsg}</p>
          <p className="text-xs text-ink-400 mb-4 leading-relaxed">
            Pastikan file <code className="bg-ink-100 px-1 rounded">.env</code> berisi <code className="bg-ink-100 px-1 rounded">VITE_API_URL</code> yang valid,
            dan Apps Script sudah di-deploy sebagai Web App dengan akses "Anyone". Lihat <code className="bg-ink-100 px-1 rounded">backend/SETUP.md</code>.
          </p>
          <Btn onClick={load} size="sm">Coba Lagi</Btn>
        </div>
      </div>
    );
  }

  if (phase === 'setup') return <SetupView onComplete={completeSetup} />;
  if (phase === 'login' && !loggedIn) return <LoginView settings={data.settings} onLogin={onLoginSuccess} verifyPin={verifyPin} />;

  const ctxValue = { ...data, pushToast, goTo: setActiveView, ...actions };
  const currentLabel = NAV_ITEMS.find((n) => n.id === activeView)?.label || '';

  return (
    <AppCtx.Provider value={ctxValue}>
      <div className="min-h-screen bg-ink-50 flex">
        <Sidebar active={activeView} onNav={setActiveView} onLogout={onLogout} storeName={data.settings.storeName} adminName={data.settings.adminName} alertCount={alertCount} />
        <div className="flex-1 min-w-0">
          <TopBar title={currentLabel} onMenu={() => setMoreOpen(true)} />
          <main className="p-4 lg:p-6 max-w-6xl mx-auto pb-24 lg:pb-6">
            {activeView === 'dashboard' && <DashboardView />}
            {activeView === 'pos' && <PosView />}
            {activeView === 'products' && <ProductsView />}
            {activeView === 'stock' && <StockView />}
            {activeView === 'exp' && <ExpView />}
            {activeView === 'history' && <HistoryView />}
            {activeView === 'finance' && <FinanceView />}
            {activeView === 'reports' && <ReportsView />}
            {activeView === 'settings' && <SettingsView />}
          </main>
        </div>
        <BottomNav active={activeView} onNav={setActiveView} onMore={() => setMoreOpen(true)} alertCount={alertCount} />
        <MoreSheet open={moreOpen} onClose={() => setMoreOpen(false)} onNav={setActiveView} onLogout={onLogout} />
        <Toasts toasts={toasts} remove={removeToast} />
      </div>
    </AppCtx.Provider>
  );
}
