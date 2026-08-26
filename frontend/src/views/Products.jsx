import { useState, useEffect } from 'react';
import { Plus, Tag, Search, Pencil, Eye, EyeOff, Trash2, Save, Package } from 'lucide-react';
import { Card, SectionHeader, Btn, Badge, Modal, ConfirmDialog, EmptyState, Field, inputCls } from '../components/ui.jsx';
import { rupiah } from '../lib/helpers';
import { useApp } from '../lib/context.jsx';

function ProductModal({ open, onClose, editing, categories }) {
  const { addProduct, updateProduct, pushToast } = useApp();
  const blank = { name: '', categoryId: categories[0]?.id || '', unit: '', purchasePrice: '', sellingPrice: '', minimumStock: '' };
  const [form, setForm] = useState(blank);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (editing) setForm({ name: editing.name, categoryId: editing.categoryId, unit: editing.unit, purchasePrice: editing.purchasePrice, sellingPrice: editing.sellingPrice, minimumStock: editing.minimumStock });
    else setForm(blank);
    // eslint-disable-next-line
  }, [editing, open]);

  function set(k, v) { setForm((f) => ({ ...f, [k]: v })); }

  async function submit() {
    if (!form.name.trim() || !form.unit.trim() || form.sellingPrice === '' || form.purchasePrice === '') {
      pushToast('Lengkapi nama, satuan, dan harga terlebih dahulu', 'error');
      return;
    }
    const payload = {
      name: form.name.trim(), categoryId: form.categoryId, unit: form.unit.trim(),
      purchasePrice: Number(form.purchasePrice) || 0, sellingPrice: Number(form.sellingPrice) || 0,
      minimumStock: Number(form.minimumStock) || 0,
    };
    setSaving(true);
    try {
      if (editing) await updateProduct(editing.id, payload);
      else await addProduct(payload);
      onClose();
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal open={open} onClose={onClose} title={editing ? 'Edit Produk' : 'Tambah Produk'} footer={<><Btn variant="secondary" onClick={onClose}>Batal</Btn><Btn onClick={submit} icon={Save} disabled={saving}>{saving ? 'Menyimpan...' : 'Simpan'}</Btn></>}>
      <div className="space-y-4">
        <Field label="Nama Produk"><input autoFocus value={form.name} onChange={(e) => set('name', e.target.value)} placeholder="mis. Indomie Goreng" className={inputCls} /></Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Kategori">
            <select value={form.categoryId} onChange={(e) => set('categoryId', e.target.value)} className={inputCls}>
              {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </Field>
          <Field label="Satuan"><input value={form.unit} onChange={(e) => set('unit', e.target.value)} placeholder="pcs / kg / botol" className={inputCls} /></Field>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Harga Beli"><input type="number" value={form.purchasePrice} onChange={(e) => set('purchasePrice', e.target.value)} placeholder="0" className={inputCls} /></Field>
          <Field label="Harga Jual"><input type="number" value={form.sellingPrice} onChange={(e) => set('sellingPrice', e.target.value)} placeholder="0" className={inputCls} /></Field>
        </div>
        <Field label="Stok Minimum" hint="Batas peringatan 'stok menipis'"><input type="number" value={form.minimumStock} onChange={(e) => set('minimumStock', e.target.value)} placeholder="0" className={inputCls} /></Field>
      </div>
    </Modal>
  );
}

function CategoryModal({ open, onClose, categories }) {
  const { addCategory, updateCategory, toggleCategoryStatus, pushToast } = useApp();
  const [name, setName] = useState('');
  const [editingId, setEditingId] = useState(null);

  async function submit() {
    if (!name.trim()) { pushToast('Nama kategori tidak boleh kosong', 'error'); return; }
    if (editingId) await updateCategory(editingId, name.trim());
    else await addCategory(name.trim());
    setName(''); setEditingId(null);
  }

  return (
    <Modal open={open} onClose={onClose} title="Kelola Kategori" maxW="max-w-sm">
      <div className="flex gap-2 mb-4">
        <input value={name} onChange={(e) => setName(e.target.value)} placeholder={editingId ? 'Ubah nama kategori' : 'Kategori baru'} className={inputCls} onKeyDown={(e) => e.key === 'Enter' && submit()} />
        <Btn size="md" onClick={submit} icon={editingId ? Save : Plus} />
      </div>
      <div className="space-y-1.5">
        {categories.map((c) => (
          <div key={c.id} className="flex items-center justify-between px-3 py-2.5 rounded-xl border border-ink-100">
            <span className={c.status === 'active' ? 'text-sm font-medium text-ink-700' : 'text-sm font-medium text-ink-300 line-through'}>{c.name}</span>
            <div className="flex items-center gap-1">
              <button type="button" onClick={() => { setEditingId(c.id); setName(c.name); }} className="w-7 h-7 rounded-lg hover:bg-ink-100 flex items-center justify-center text-ink-400"><Pencil size={14} /></button>
              <button type="button" onClick={() => toggleCategoryStatus(c.id)} className="w-7 h-7 rounded-lg hover:bg-ink-100 flex items-center justify-center text-ink-400">{c.status === 'active' ? <EyeOff size={14} /> : <Eye size={14} />}</button>
            </div>
          </div>
        ))}
        {categories.length === 0 && <p className="text-sm text-ink-400 text-center py-4">Belum ada kategori.</p>}
      </div>
    </Modal>
  );
}

export default function ProductsView() {
  const { products, categories, transactions, toggleProductStatus, deleteProduct, pushToast } = useApp();
  const [search, setSearch] = useState('');
  const [catFilter, setCatFilter] = useState('all');
  const [showInactive, setShowInactive] = useState(false);
  const [productModal, setProductModal] = useState({ open: false, editing: null });
  const [categoryModal, setCategoryModal] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(null);

  const filtered = products.filter((p) => {
    if (!showInactive && p.status !== 'active') return false;
    if (catFilter !== 'all' && p.categoryId !== catFilter) return false;
    if (search && !p.name.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  function hasHistory(productId) {
    return transactions.some((t) => t.items.some((i) => i.productId === productId));
  }

  function handleDelete(p) {
    if (hasHistory(p.id)) { pushToast('Produk memiliki riwayat transaksi, nonaktifkan saja', 'error'); return; }
    setConfirmDelete(p);
  }

  return (
    <div className="space-y-5">
      <SectionHeader
        title="Manajemen Produk" subtitle={`${products.filter((p) => p.status === 'active').length} produk aktif`}
        action={
          <div className="flex gap-2">
            <Btn variant="secondary" icon={Tag} onClick={() => setCategoryModal(true)}>Kategori</Btn>
            <Btn icon={Plus} onClick={() => setProductModal({ open: true, editing: null })}>Tambah Produk</Btn>
          </div>
        }
      />

      <Card noPad>
        <div className="p-4 flex flex-col sm:flex-row gap-3 border-b border-ink-100">
          <div className="relative flex-1">
            <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-300" />
            <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Cari produk..." className={`${inputCls} pl-10`} />
          </div>
          <select value={catFilter} onChange={(e) => setCatFilter(e.target.value)} className={`${inputCls} sm:w-48`}>
            <option value="all">Semua Kategori</option>
            {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
          <label className="flex items-center gap-2 text-sm text-ink-500 flex-shrink-0 px-1">
            <input type="checkbox" checked={showInactive} onChange={(e) => setShowInactive(e.target.checked)} className="rounded accent-warung-600" />
            Tampilkan nonaktif
          </label>
        </div>

        {products.length === 0 ? (
          <EmptyState icon={Package} title="Belum ada produk" desc="Mulai dengan menambahkan produk pertama yang dijual di warung Anda." action={<Btn size="sm" icon={Plus} onClick={() => setProductModal({ open: true, editing: null })}>Tambah Produk</Btn>} />
        ) : filtered.length === 0 ? (
          <EmptyState icon={Package} title="Produk tidak ditemukan" desc="Coba ubah kata kunci pencarian atau filter kategori." />
        ) : (
          <div className="divide-y divide-ink-50">
            {filtered.map((p) => {
              const cat = categories.find((c) => c.id === p.categoryId);
              return (
                <div key={p.id} className="p-4 flex items-center gap-3 hover:bg-ink-50/60 transition-colors">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-warung-500 to-warung-700 text-white flex items-center justify-center flex-shrink-0 font-bold text-sm shadow-sm">
                    {p.name.slice(0, 1).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-semibold text-sm text-ink-800 truncate">{p.name}</p>
                      {p.status !== 'active' && <Badge tone="ink">Nonaktif</Badge>}
                      {p.isOutOfStock && <Badge tone="chili" dot>Stok Habis</Badge>}
                      {p.isLowStock && !p.isOutOfStock && <Badge tone="marigold" dot>Stok Menipis</Badge>}
                    </div>
                    <p className="text-xs text-ink-400 mt-0.5">{cat?.name} · {p.unit} · Min. {p.minimumStock}</p>
                  </div>
                  <div className="text-right flex-shrink-0 hidden sm:block">
                    <p className="font-mono font-bold text-sm text-ink-800">{rupiah(p.sellingPrice)}</p>
                    <p className="text-xs text-ink-400">Stok: {p.sellableStock}</p>
                  </div>
                  <div className="flex items-center gap-1 flex-shrink-0">
                    <button type="button" onClick={() => setProductModal({ open: true, editing: p })} className="w-8 h-8 rounded-lg hover:bg-ink-100 flex items-center justify-center text-ink-400"><Pencil size={15} /></button>
                    <button type="button" onClick={() => toggleProductStatus(p.id)} className="w-8 h-8 rounded-lg hover:bg-ink-100 flex items-center justify-center text-ink-400">{p.status === 'active' ? <EyeOff size={15} /> : <Eye size={15} />}</button>
                    <button type="button" onClick={() => handleDelete(p)} className="w-8 h-8 rounded-lg hover:bg-chili-50 flex items-center justify-center text-ink-400 hover:text-chili-500"><Trash2 size={15} /></button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </Card>

      <ProductModal open={productModal.open} editing={productModal.editing} categories={categories} onClose={() => setProductModal({ open: false, editing: null })} />
      <CategoryModal open={categoryModal} categories={categories} onClose={() => setCategoryModal(false)} />
      <ConfirmDialog
        open={!!confirmDelete} onClose={() => setConfirmDelete(null)} title="Hapus Produk?"
        message={`"${confirmDelete?.name}" akan dihapus permanen karena belum memiliki riwayat transaksi. Lanjutkan?`}
        onConfirm={() => { deleteProduct(confirmDelete.id); setConfirmDelete(null); }}
      />
    </div>
  );
}
