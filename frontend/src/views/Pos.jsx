import { useState, useMemo } from 'react';
import { Search, Minus, Plus, X, CreditCard, ShoppingCart, Check } from 'lucide-react';
import { Card, SectionHeader, Btn, Modal, EmptyState, Field, inputCls } from '../components/ui.jsx';
import { PAYMENT_METHODS } from '../lib/constants';
import { rupiah } from '../lib/helpers';
import { useApp } from '../lib/context.jsx';
import { ReceiptModal } from '../components/Receipt.jsx';

export function PaymentModal({ open, onClose, total, onConfirm }) {
  const [method, setMethod] = useState('Tunai');
  const [paid, setPaid] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Reset fields every time the modal is (re)opened.
  useMemo(() => { if (open) { setMethod('Tunai'); setPaid(''); setSubmitting(false); } }, [open]);

  const paidNum = Number(paid) || 0;
  const change = paidNum - total;
  const isCash = method === 'Tunai';
  const canConfirm = !isCash || paidNum >= total;

  const quickAmounts = Array.from(
    new Set([total, Math.ceil(total / 5000) * 5000, Math.ceil(total / 10000) * 10000 + 10000, Math.ceil(total / 50000) * 50000])
  ).filter((v) => v > 0).sort((a, b) => a - b).slice(0, 4);

  async function handleConfirm() {
    if (!canConfirm || submitting) return;
    setSubmitting(true);
    try {
      await onConfirm({ paymentMethod: method, paidAmount: isCash ? paidNum : total });
    } catch (e) {
      // Failure is already surfaced via toast by the app-level action
      // wrapper — swallow here so we don't leave an unhandled rejection,
      // and leave the modal open so the cashier can retry.
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Modal
      open={open} onClose={onClose} title="Pembayaran" maxW="max-w-sm"
      footer={
        <>
          <Btn variant="secondary" className="flex-1" onClick={onClose} disabled={submitting}>Batal</Btn>
          <Btn className="flex-1" disabled={!canConfirm} loading={submitting} loadingText="Memproses..." onClick={handleConfirm} icon={Check}>Selesaikan</Btn>
        </>
      }
    >
      <div className="space-y-4">
        <div className="bg-warung-50 rounded-xl px-4 py-3 flex justify-between items-center">
          <span className="text-sm text-warung-700 font-semibold">Total Belanja</span>
          <span className="font-mono font-extrabold text-lg text-warung-800">{rupiah(total)}</span>
        </div>
        <Field label="Metode Pembayaran">
          <div className="grid grid-cols-3 gap-2">
            {PAYMENT_METHODS.map((m) => (
              <button
                type="button" key={m} onClick={() => setMethod(m)}
                className={`py-2.5 rounded-xl text-xs font-bold border transition-colors ${method === m ? 'bg-warung-700 text-white border-warung-700' : 'bg-white text-ink-600 border-ink-200'}`}
              >
                {m}
              </button>
            ))}
          </div>
        </Field>
        {isCash && (
          <>
            <Field label="Uang Diterima">
              <input autoFocus type="number" value={paid} onChange={(e) => setPaid(e.target.value)} placeholder="0" className={`${inputCls} font-mono text-lg`} />
            </Field>
            <div className="flex gap-2 flex-wrap">
              {quickAmounts.map((a) => (
                <button type="button" key={a} onClick={() => setPaid(String(a))} className="px-3 py-1.5 rounded-lg bg-ink-100 hover:bg-ink-200 text-xs font-bold text-ink-600 transition-colors">{rupiah(a)}</button>
              ))}
            </div>
            {paid !== '' && (
              <div className={`rounded-xl px-4 py-3 flex justify-between items-center ${change >= 0 ? 'bg-ink-50' : 'bg-chili-50'}`}>
                <span className={`text-sm font-semibold ${change >= 0 ? 'text-ink-600' : 'text-chili-600'}`}>{change >= 0 ? 'Kembalian' : 'Kurang'}</span>
                <span className={`font-mono font-bold ${change >= 0 ? 'text-ink-800' : 'text-chili-600'}`}>{rupiah(Math.abs(change))}</span>
              </div>
            )}
          </>
        )}
      </div>
    </Modal>
  );
}

export default function PosView() {
  const { products, categories, completeSale, pushToast } = useApp();
  const [search, setSearch] = useState('');
  const [catFilter, setCatFilter] = useState('all');
  const [cart, setCart] = useState([]); // [{productId, quantity}]
  const [cartOpen, setCartOpen] = useState(false);
  const [paymentOpen, setPaymentOpen] = useState(false);
  const [receipt, setReceipt] = useState(null);

  const activeProducts = products.filter((p) => p.status === 'active');
  const stockMap = useMemo(() => {
    const m = {};
    activeProducts.forEach((p) => { m[p.id] = p.sellableStock; });
    return m;
  }, [activeProducts]);

  const filtered = activeProducts.filter((p) => {
    if (catFilter !== 'all' && p.categoryId !== catFilter) return false;
    if (search && !p.name.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  function addToCart(productId) {
    const stock = stockMap[productId] || 0;
    const existing = cart.find((c) => c.productId === productId);
    const currentQty = existing ? existing.quantity : 0;
    if (currentQty + 1 > stock) { pushToast('Stok tidak mencukupi', 'error'); return; }
    if (existing) setCart(cart.map((c) => (c.productId === productId ? { ...c, quantity: c.quantity + 1 } : c)));
    else setCart([...cart, { productId, quantity: 1 }]);
  }

  function changeQty(productId, delta) {
    const stock = stockMap[productId] || 0;
    setCart((prev) => prev
      .map((c) => {
        if (c.productId !== productId) return c;
        const next = c.quantity + delta;
        if (next > stock) { pushToast('Stok tidak mencukupi', 'error'); return c; }
        return { ...c, quantity: next };
      })
      .filter((c) => c.quantity > 0));
  }

  function removeFromCart(productId) { setCart(cart.filter((c) => c.productId !== productId)); }

  const cartDetailed = cart.map((c) => ({ ...c, product: products.find((p) => p.id === c.productId) })).filter((c) => c.product);
  const total = cartDetailed.reduce((s, c) => s + c.quantity * c.product.sellingPrice, 0);
  const itemCount = cartDetailed.reduce((s, c) => s + c.quantity, 0);

  function openPayment() {
    // Close the mobile cart sheet first so only one modal is ever mounted at once.
    setCartOpen(false);
    setPaymentOpen(true);
  }

  async function handleConfirmPayment({ paymentMethod, paidAmount }) {
    // No try/catch here on purpose: completeSale() already shows a toast on
    // both success and failure (see App.jsx's `act` wrapper). We just let a
    // failure propagate back up to PaymentModal, which keeps itself open.
    const trx = await completeSale({ cart: cartDetailed.map((c) => ({ productId: c.productId, quantity: c.quantity })), paymentMethod, paidAmount });
    setCart([]); setPaymentOpen(false); setReceipt(trx);
  }

  const CartPanel = () => (
    <div className="flex flex-col h-full">
      <div className="flex-1 overflow-y-auto">
        {cartDetailed.length === 0 ? (
          <EmptyState icon={ShoppingCart} title="Keranjang kosong" desc="Pilih produk di sebelah kiri untuk mulai transaksi." />
        ) : (
          <div className="space-y-3 p-1">
            {cartDetailed.map((c) => (
              <div key={c.productId} className="flex items-center gap-2">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-ink-700 truncate">{c.product.name}</p>
                  <p className="text-xs text-ink-400 font-mono">{rupiah(c.product.sellingPrice)} x {c.quantity}</p>
                </div>
                <div className="flex items-center gap-1 flex-shrink-0">
                  <button type="button" onClick={() => changeQty(c.productId, -1)} className="w-7 h-7 rounded-lg bg-ink-100 hover:bg-ink-200 flex items-center justify-center transition-colors"><Minus size={13} /></button>
                  <span className="w-6 text-center text-sm font-bold font-mono">{c.quantity}</span>
                  <button type="button" onClick={() => changeQty(c.productId, 1)} className="w-7 h-7 rounded-lg bg-ink-100 hover:bg-ink-200 flex items-center justify-center transition-colors"><Plus size={13} /></button>
                  <button type="button" onClick={() => removeFromCart(c.productId)} className="w-7 h-7 rounded-lg hover:bg-chili-50 text-ink-300 hover:text-chili-500 flex items-center justify-center ml-1 transition-colors"><X size={14} /></button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
      {cartDetailed.length > 0 && (
        <div className="pt-3 border-t border-ink-100 flex-shrink-0">
          <div className="flex justify-between items-center mb-3">
            <span className="text-sm font-semibold text-ink-500">Total ({itemCount} item)</span>
            <span className="font-mono font-extrabold text-lg text-ink-900">{rupiah(total)}</span>
          </div>
          <Btn className="w-full" size="lg" icon={CreditCard} onClick={openPayment}>Bayar</Btn>
        </div>
      )}
    </div>
  );

  return (
    <div className="space-y-5">
      <SectionHeader title="Transaksi Penjualan" subtitle="Pilih produk, sistem otomatis menerapkan FEFO saat menyimpan" />

      <div className="lg:grid lg:grid-cols-3 lg:gap-5">
        <div className="lg:col-span-2 space-y-4">
          <div className="relative">
            <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-300" />
            <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Cari produk..." className={`${inputCls} pl-10`} />
          </div>
          <div className="flex gap-2 overflow-x-auto pb-1">
            <button type="button" onClick={() => setCatFilter('all')} className={`flex-shrink-0 px-3.5 py-2 rounded-lg text-sm font-bold transition-colors ${catFilter === 'all' ? 'bg-warung-700 text-white' : 'bg-white border border-ink-200 text-ink-600'}`}>Semua</button>
            {categories.filter((c) => c.status === 'active').map((c) => (
              <button type="button" key={c.id} onClick={() => setCatFilter(c.id)} className={`flex-shrink-0 px-3.5 py-2 rounded-lg text-sm font-bold transition-colors ${catFilter === c.id ? 'bg-warung-700 text-white' : 'bg-white border border-ink-200 text-ink-600'}`}>{c.name}</button>
            ))}
          </div>

          {filtered.length === 0 ? (
            <EmptyState icon={ShoppingCart} title="Tidak ada produk" desc="Coba ubah pencarian atau tambahkan produk baru di menu Produk." />
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 pb-24 lg:pb-0">
              {filtered.map((p) => {
                const stock = stockMap[p.id] || 0;
                const inCart = cart.find((c) => c.productId === p.id)?.quantity || 0;
                const isOut = stock <= 0;
                return (
                  <button
                    type="button" key={p.id} disabled={isOut} onClick={() => addToCart(p.id)}
                    className={`text-left rounded-2xl border p-3.5 transition-all relative active:scale-[0.97] ${isOut ? 'bg-ink-50 border-ink-100 opacity-50 cursor-not-allowed' : inCart > 0 ? 'bg-warung-50 border-warung-300 shadow-sm' : 'bg-white border-ink-200 hover:border-warung-300 hover:shadow-sm'}`}
                  >
                    {inCart > 0 && <span className="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-warung-700 text-white text-xs font-bold flex items-center justify-center shadow-sm">{inCart}</span>}
                    <p className="font-semibold text-sm text-ink-800 leading-tight mb-2 line-clamp-2 min-h-[2.5rem]">{p.name}</p>
                    <p className="font-mono font-bold text-warung-700 text-sm">{rupiah(p.sellingPrice)}</p>
                    <p className="text-xs text-ink-400 mt-0.5">Stok: {isOut ? 'Habis' : `${stock} ${p.unit}`}</p>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        <div className="hidden lg:block">
          <Card className="sticky top-5 h-[calc(100vh-140px)]">
            <p className="font-bold text-ink-800 mb-3">Keranjang</p>
            <CartPanel />
          </Card>
        </div>
      </div>

      {cartDetailed.length > 0 && (
        <button type="button" onClick={() => setCartOpen(true)} className="lg:hidden fixed bottom-20 left-4 right-4 z-20 bg-gradient-to-r from-warung-700 to-warung-600 text-white rounded-2xl shadow-pop px-5 py-4 flex items-center justify-between active:scale-[0.98] transition-transform">
          <span className="flex items-center gap-2 text-sm font-bold"><ShoppingCart size={18} /> {itemCount} item</span>
          <span className="font-mono font-extrabold">{rupiah(total)}</span>
        </button>
      )}

      <Modal open={cartOpen} onClose={() => setCartOpen(false)} title="Keranjang" maxW="max-w-md">
        <div className="h-[60vh]"><CartPanel /></div>
      </Modal>

      <PaymentModal open={paymentOpen} onClose={() => setPaymentOpen(false)} total={total} onConfirm={handleConfirmPayment} />
      <ReceiptModal open={!!receipt} onClose={() => setReceipt(null)} transaction={receipt} />
    </div>
  );
}
