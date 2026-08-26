import { useState, useEffect } from 'react';
import { Plus, Banknote, TrendingDown, TrendingUp, Wallet, Pencil, Trash2, Save } from 'lucide-react';
import { Card, SectionHeader, Btn, Badge, StatCard, Tabs, Modal, EmptyState, ConfirmDialog, Field, DateRangeFilter, inputCls } from '../components/ui.jsx';
import { rupiah, todayStr, rangeForPreset, inRange } from '../lib/helpers';
import { EXPENSE_CATEGORIES } from '../lib/constants';
import { useApp } from '../lib/context.jsx';

function ExpenseModal({ open, onClose, editing }) {
  const { addExpense, updateExpense, pushToast } = useApp();
  const blank = { date: todayStr(), category: EXPENSE_CATEGORIES[1], amount: '', description: '' };
  const [form, setForm] = useState(blank);
  const [saving, setSaving] = useState(false);
  useEffect(() => {
    if (editing) setForm({ date: editing.date, category: editing.category, amount: editing.amount, description: editing.description });
    else setForm(blank);
    // eslint-disable-next-line
  }, [editing, open]);

  function set(k, v) { setForm((f) => ({ ...f, [k]: v })); }

  async function submit() {
    if (saving) return;
    if (!form.amount || Number(form.amount) <= 0) { pushToast('Nominal pengeluaran harus diisi', 'error'); return; }
    const payload = { date: form.date, category: form.category, amount: Number(form.amount), description: form.description };
    setSaving(true);
    try {
      if (editing) await updateExpense(editing.id, payload); else await addExpense(payload);
      onClose();
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal open={open} onClose={onClose} title={editing ? 'Edit Pengeluaran' : 'Catat Pengeluaran'} footer={<><Btn variant="secondary" onClick={onClose} disabled={saving}>Batal</Btn><Btn onClick={submit} icon={Save} loading={saving} loadingText="Menyimpan...">Simpan</Btn></>}>
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <Field label="Tanggal"><input type="date" value={form.date} onChange={(e) => set('date', e.target.value)} className={inputCls} /></Field>
          <Field label="Kategori">
            <select value={form.category} onChange={(e) => set('category', e.target.value)} className={inputCls}>
              {EXPENSE_CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </Field>
        </div>
        <Field label="Nominal"><input autoFocus type="number" value={form.amount} onChange={(e) => set('amount', e.target.value)} placeholder="0" className={inputCls} /></Field>
        <Field label="Keterangan (opsional)"><input value={form.description} onChange={(e) => set('description', e.target.value)} placeholder="mis. bayar listrik bulan ini" className={inputCls} /></Field>
      </div>
    </Modal>
  );
}

export default function FinanceView() {
  const { transactions, expenses, deleteExpense } = useApp();
  const [tab, setTab] = useState('income');
  const [preset, setPreset] = useState('month');
  const [from, setFrom] = useState(rangeForPreset('month')[0]);
  const [to, setTo] = useState(rangeForPreset('month')[1]);
  const [expenseModal, setExpenseModal] = useState({ open: false, editing: null });
  const [confirmDelete, setConfirmDelete] = useState(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => { if (preset !== 'custom') { const [f, t] = rangeForPreset(preset); setFrom(f); setTo(t); } }, [preset]);

  const completedTx = transactions.filter((t) => t.status === 'COMPLETED' && inRange(t.transactionDate, from, to));
  const income = completedTx.reduce((s, t) => s + t.totalAmount, 0);
  const cogs = completedTx.reduce((s, t) => s + t.items.reduce((s2, i) => s2 + i.cogs, 0), 0);
  const grossProfit = income - cogs;

  const filteredExpenses = expenses.filter((e) => inRange(e.date, from, to)).sort((a, b) => new Date(b.date) - new Date(a.date));
  const totalExpenses = filteredExpenses.reduce((s, e) => s + e.amount, 0);

  const byCategory = {};
  filteredExpenses.forEach((e) => { byCategory[e.category] = (byCategory[e.category] || 0) + e.amount; });

  return (
    <div className="space-y-5">
      <SectionHeader title="Keuangan Warung" subtitle="Pendapatan, pengeluaran, dan estimasi laba kotor"
        action={<Btn icon={Plus} onClick={() => setExpenseModal({ open: true, editing: null })}>Catat Pengeluaran</Btn>} />

      <Card><DateRangeFilter preset={preset} onPreset={setPreset} from={from} to={to} onFrom={setFrom} onTo={setTo} /></Card>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard icon={Banknote} label="Pendapatan" value={rupiah(income)} tone="warung" />
        <StatCard icon={TrendingDown} label="Pengeluaran" value={rupiah(totalExpenses)} tone="chili" />
        <StatCard icon={TrendingUp} label="Laba Kotor" value={rupiah(grossProfit)} tone="marigold" sub={`HPP: ${rupiah(cogs)}`} />
        <StatCard icon={Wallet} label="Arus Kas Bersih" value={rupiah(income - totalExpenses)} tone="ink" />
      </div>

      <Tabs tabs={[{ id: 'income', label: 'Pendapatan' }, { id: 'expenses', label: 'Pengeluaran' }]} active={tab} onChange={setTab} />

      {tab === 'income' && (
        <Card noPad>
          {completedTx.length === 0 ? (
            <EmptyState icon={Banknote} title="Belum ada pendapatan" desc="Pendapatan tercatat otomatis dari setiap transaksi penjualan." />
          ) : (
            <div className="divide-y divide-ink-50">
              {completedTx.slice().sort((a, b) => new Date(b.transactionDate) - new Date(a.transactionDate)).map((t) => (
                <div key={t.id} className="p-4 flex items-center justify-between">
                  <div>
                    <p className="text-sm font-semibold text-ink-800 font-mono">{t.transactionNumber}</p>
                    <p className="text-xs text-ink-400">{t.transactionDate.slice(0, 10)}</p>
                  </div>
                  <span className="font-mono font-bold text-warung-700">+{rupiah(t.totalAmount)}</span>
                </div>
              ))}
            </div>
          )}
        </Card>
      )}

      {tab === 'expenses' && (
        <>
          {Object.keys(byCategory).length > 0 && (
            <Card>
              <p className="text-sm font-bold text-ink-700 mb-3">Ringkasan per Kategori</p>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {Object.entries(byCategory).map(([cat, amt]) => (
                  <div key={cat} className="bg-ink-50 rounded-xl px-3.5 py-2.5">
                    <p className="text-xs text-ink-500">{cat}</p>
                    <p className="font-mono font-bold text-sm text-ink-800">{rupiah(amt)}</p>
                  </div>
                ))}
              </div>
            </Card>
          )}
          <Card noPad>
            {filteredExpenses.length === 0 ? (
              <EmptyState icon={TrendingDown} title="Belum ada pengeluaran" desc="Catat pengeluaran operasional warung seperti listrik, air, atau transportasi." action={<Btn size="sm" icon={Plus} onClick={() => setExpenseModal({ open: true, editing: null })}>Catat Pengeluaran</Btn>} />
            ) : (
              <div className="divide-y divide-ink-50">
                {filteredExpenses.map((e) => (
                  <div key={e.id} className="p-4 flex items-center gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="text-sm font-semibold text-ink-800">{e.category}</p>
                        {e.auto && <Badge tone="ink">Otomatis</Badge>}
                      </div>
                      <p className="text-xs text-ink-400">{e.date}{e.description ? ` · ${e.description}` : ''}</p>
                    </div>
                    <span className="font-mono font-bold text-chili-500 flex-shrink-0">-{rupiah(e.amount)}</span>
                    {!e.auto && (
                      <div className="flex items-center gap-1 flex-shrink-0">
                        <button type="button" onClick={() => setExpenseModal({ open: true, editing: e })} className="w-8 h-8 rounded-lg hover:bg-ink-100 flex items-center justify-center text-ink-400"><Pencil size={14} /></button>
                        <button type="button" onClick={() => setConfirmDelete(e)} className="w-8 h-8 rounded-lg hover:bg-chili-50 flex items-center justify-center text-ink-400 hover:text-chili-500"><Trash2 size={14} /></button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </Card>
        </>
      )}

      <ExpenseModal open={expenseModal.open} editing={expenseModal.editing} onClose={() => setExpenseModal({ open: false, editing: null })} />
      <ConfirmDialog
        open={!!confirmDelete} onClose={() => setConfirmDelete(null)} title="Hapus Pengeluaran?"
        message="Catatan pengeluaran ini akan dihapus permanen."
        onConfirm={async () => {
          setDeleting(true);
          try {
            await deleteExpense(confirmDelete.id);
            setConfirmDelete(null);
          } catch (e) {
            // error toast already shown centrally
          } finally {
            setDeleting(false);
          }
        }}
        loading={deleting}
      />
    </div>
  );
}
