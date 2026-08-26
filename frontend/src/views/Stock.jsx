import { useState, useEffect } from 'react';
import { Plus, Search, ChevronDown, PackageCheck, Layers } from 'lucide-react';
import { Card, SectionHeader, Btn, Badge, Modal, Tabs, EmptyState, Field, inputCls } from '../components/ui.jsx';
import { rupiah, fmtDate, fmtDateTime, todayStr, batchStatusTone } from '../lib/helpers';
import { useApp } from '../lib/context.jsx';

function RestockModal({ open, onClose, products }) {
  const { restock, pushToast } = useApp();
  const blank = { productId: products[0]?.id || '', quantity: '', purchasePrice: '', purchaseDate: todayStr(), expiryDate: '', note: '' };
  const [form, setForm] = useState(blank);
  const [saving, setSaving] = useState(false);
  useEffect(() => { if (open) setForm({ ...blank, productId: products[0]?.id || '' }); /* eslint-disable-next-line */ }, [open]);

  function set(k, v) { setForm((f) => ({ ...f, [k]: v })); }
  const product = products.find((p) => p.id === form.productId);

  async function submit() {
    if (!form.productId || !form.quantity || Number(form.quantity) <= 0 || form.purchasePrice === '') {
      pushToast('Lengkapi produk, jumlah, dan harga beli', 'error'); return;
    }
    setSaving(true);
    try {
      await restock({
        productId: form.productId, quantity: Number(form.quantity), purchasePrice: Number(form.purchasePrice),
        purchaseDate: form.purchaseDate, expiryDate: form.expiryDate || null, note: form.note,
      });
      onClose();
    } catch (e) {
      // error toast already shown by the centralized action wrapper
    } finally {
      setSaving(false);
    }
  }

  const total = (Number(form.quantity) || 0) * (Number(form.purchasePrice) || 0);

  return (
    <Modal open={open} onClose={onClose} title="Stok Masuk / Restock" footer={<><Btn variant="secondary" onClick={onClose}>Batal</Btn><Btn onClick={submit} icon={PackageCheck} disabled={saving}>{saving ? 'Menyimpan...' : 'Simpan Restock'}</Btn></>}>
      <div className="space-y-4">
        <Field label="Produk">
          <select value={form.productId} onChange={(e) => set('productId', e.target.value)} className={inputCls}>
            {products.map((p) => <option key={p.id} value={p.id}>{p.name} ({p.unit})</option>)}
          </select>
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label={`Jumlah${product ? ' (' + product.unit + ')' : ''}`}><input type="number" value={form.quantity} onChange={(e) => set('quantity', e.target.value)} placeholder="0" className={inputCls} /></Field>
          <Field label="Harga Beli / satuan"><input type="number" value={form.purchasePrice} onChange={(e) => set('purchasePrice', e.target.value)} placeholder="0" className={inputCls} /></Field>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Tanggal Pembelian"><input type="date" value={form.purchaseDate} onChange={(e) => set('purchaseDate', e.target.value)} className={inputCls} /></Field>
          <Field label="Tanggal EXP (opsional)"><input type="date" value={form.expiryDate} onChange={(e) => set('expiryDate', e.target.value)} className={inputCls} /></Field>
        </div>
        <Field label="Catatan (opsional)"><input value={form.note} onChange={(e) => set('note', e.target.value)} placeholder="mis. beli dari Toko Sinar" className={inputCls} /></Field>
        {total > 0 && (
          <div className="bg-warung-50 rounded-xl px-4 py-3 flex justify-between items-center">
            <span className="text-sm text-warung-700 font-medium">Total pengeluaran otomatis tercatat</span>
            <span className="font-mono font-bold text-warung-800">{rupiah(total)}</span>
          </div>
        )}
      </div>
    </Modal>
  );
}

function AdjustModal({ open, onClose, batch, product }) {
  const { adjustStock, pushToast } = useApp();
  const [delta, setDelta] = useState('');
  const [note, setNote] = useState('');
  const [saving, setSaving] = useState(false);
  useEffect(() => { if (open) { setDelta(''); setNote(''); } }, [open]);
  if (!batch) return null;

  async function submit() {
    const d = Number(delta);
    if (!d) { pushToast('Masukkan jumlah koreksi (boleh negatif)', 'error'); return; }
    if (batch.remainingQuantity + d < 0) { pushToast('Stok tidak boleh menjadi negatif', 'error'); return; }
    setSaving(true);
    try {
      await adjustStock({ batchId: batch.id, delta: d, note: note || 'Koreksi stok manual' });
      onClose();
    } catch (e) {
      // error toast already shown by the centralized action wrapper
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal open={open} onClose={onClose} title="Koreksi Stok" footer={<><Btn variant="secondary" onClick={onClose}>Batal</Btn><Btn onClick={submit} disabled={saving}>{saving ? 'Menyimpan...' : 'Simpan Koreksi'}</Btn></>}>
      <div className="space-y-4">
        <div className="bg-ink-50 rounded-xl px-4 py-3 text-sm">
          <p className="font-semibold text-ink-700">{product?.name}</p>
          <p className="text-ink-400 text-xs mt-0.5">Batch {batch.id.slice(-6)} · Stok saat ini: {batch.remainingQuantity}</p>
        </div>
        <Field label="Jumlah Koreksi" hint="Isi angka positif untuk menambah, negatif untuk mengurangi (mis. -2)">
          <input type="number" value={delta} onChange={(e) => setDelta(e.target.value)} placeholder="mis. -2 atau 5" className={inputCls} />
        </Field>
        <Field label="Alasan"><input value={note} onChange={(e) => setNote(e.target.value)} placeholder="mis. barang rusak / salah hitung" className={inputCls} /></Field>
      </div>
    </Modal>
  );
}

export default function StockView() {
  const { products, categories, batches, movements } = useApp();
  const [tab, setTab] = useState('current');
  const [search, setSearch] = useState('');
  const [restockOpen, setRestockOpen] = useState(false);
  const [adjustTarget, setAdjustTarget] = useState(null);
  const [expandedProduct, setExpandedProduct] = useState(null);

  const activeProducts = products.filter((p) => p.status === 'active');
  const stockRows = activeProducts.filter((p) => !search || p.name.toLowerCase().includes(search.toLowerCase()));

  const movementTypeTone = { RESTOCK: 'warung', SALE: 'ink', ADJUSTMENT: 'marigold', EXPIRED: 'chili', RETURN: 'marigold' };
  const movementTypeLabel = { RESTOCK: 'Stok Masuk', SALE: 'Penjualan', ADJUSTMENT: 'Koreksi', EXPIRED: 'Kedaluwarsa', RETURN: 'Retur/Void' };

  const sortedMovements = movements.slice().sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)).slice(0, 150);

  return (
    <div className="space-y-5">
      <SectionHeader title="Manajemen Stok" subtitle="Pantau persediaan, catat stok masuk, dan lihat riwayat pergerakan"
        action={<Btn icon={Plus} onClick={() => setRestockOpen(true)}>Stok Masuk</Btn>} />

      <Tabs tabs={[{ id: 'current', label: 'Stok Saat Ini' }, { id: 'movements', label: 'Riwayat Pergerakan' }]} active={tab} onChange={setTab} />

      {tab === 'current' && (
        <Card noPad>
          <div className="p-4 border-b border-ink-100">
            <div className="relative">
              <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-300" />
              <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Cari produk..." className={`${inputCls} pl-10`} />
            </div>
          </div>
          {stockRows.length === 0 ? (
            <EmptyState icon={Layers} title="Belum ada produk aktif" desc="Tambahkan produk terlebih dahulu di menu Produk." />
          ) : (
            <div className="divide-y divide-ink-50">
              {stockRows.map((p) => {
                const cat = categories.find((c) => c.id === p.categoryId);
                const isExpanded = expandedProduct === p.id;
                const productBatches = batches.filter((b) => b.productId === p.id && b.remainingQuantity > 0);
                return (
                  <div key={p.id}>
                    <button type="button" onClick={() => setExpandedProduct(isExpanded ? null : p.id)} className="w-full p-4 flex items-center gap-3 hover:bg-ink-50/60 text-left transition-colors">
                      <div className={`w-2 h-10 rounded-full flex-shrink-0 ${p.isOutOfStock ? 'bg-chili-400' : p.isLowStock ? 'bg-marigold-400' : 'bg-warung-400'}`} />
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-sm text-ink-800 truncate">{p.name}</p>
                        <p className="text-xs text-ink-400">{cat?.name} · {productBatches.length} batch aktif</p>
                      </div>
                      <div className="text-right flex-shrink-0">
                        <p className="font-mono font-bold text-ink-800">{p.sellableStock} <span className="text-xs font-normal text-ink-400">{p.unit}</span></p>
                        {p.isOutOfStock ? <Badge tone="chili">Habis</Badge> : p.isLowStock ? <Badge tone="marigold">Menipis</Badge> : <Badge tone="warung">Aman</Badge>}
                      </div>
                      <ChevronDown size={16} className={`text-ink-300 transition-transform flex-shrink-0 ${isExpanded ? 'rotate-180' : ''}`} />
                    </button>
                    {isExpanded && (
                      <div className="bg-ink-50/70 px-4 pb-4">
                        {productBatches.length === 0 ? (
                          <p className="text-xs text-ink-400 py-2">Tidak ada batch stok aktif.</p>
                        ) : (
                          <div className="space-y-1.5 pt-1">
                            {productBatches.map((b) => (
                              <div key={b.id} className="flex items-center justify-between bg-white rounded-xl px-3.5 py-2.5 border border-ink-100">
                                <div className="flex items-center gap-3">
                                  <span className="font-mono text-xs text-ink-400">#{b.id.slice(-6)}</span>
                                  <span className="text-sm font-semibold text-ink-700">{b.remainingQuantity} {p.unit}</span>
                                  <Badge tone={batchStatusTone(b.expStatus)}>{b.expiryDate ? `EXP ${fmtDate(b.expiryDate)}` : 'Tanpa EXP'}</Badge>
                                </div>
                                <button type="button" onClick={() => setAdjustTarget(b)} className="text-xs font-bold text-warung-700 hover:underline">Koreksi</button>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </Card>
      )}

      {tab === 'movements' && (
        <Card noPad>
          {sortedMovements.length === 0 ? (
            <EmptyState icon={Layers} title="Belum ada pergerakan stok" desc="Riwayat penambahan, penjualan, dan koreksi stok akan tampil di sini." />
          ) : (
            <div className="divide-y divide-ink-50">
              {sortedMovements.map((m) => {
                const p = products.find((pr) => pr.id === m.productId);
                return (
                  <div key={m.id} className="p-4 flex items-center gap-3">
                    <Badge tone={movementTypeTone[m.type] || 'ink'}>{movementTypeLabel[m.type] || m.type}</Badge>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-ink-700 truncate">{p?.name || 'Produk dihapus'}</p>
                      <p className="text-xs text-ink-400">{fmtDateTime(m.createdAt)}{m.note ? ` · ${m.note}` : ''}</p>
                    </div>
                    <span className={`font-mono font-bold text-sm flex-shrink-0 ${m.quantity >= 0 ? 'text-warung-600' : 'text-chili-500'}`}>{m.quantity >= 0 ? '+' : ''}{m.quantity}</span>
                  </div>
                );
              })}
            </div>
          )}
        </Card>
      )}

      <RestockModal open={restockOpen} onClose={() => setRestockOpen(false)} products={activeProducts} />
      <AdjustModal open={!!adjustTarget} batch={adjustTarget} product={products.find((p) => p.id === adjustTarget?.productId)} onClose={() => setAdjustTarget(null)} />
    </div>
  );
}
