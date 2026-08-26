import { useState, useEffect } from 'react';
import { Store, ShieldCheck, Save, AlertTriangle, RefreshCw } from 'lucide-react';
import { Card, SectionHeader, Btn, Field, ConfirmDialog, inputCls } from '../components/ui.jsx';
import { useApp } from '../lib/context.jsx';

export default function SettingsView() {
  const { settings, updateSettings, resetAllData } = useApp();
  const [form, setForm] = useState({ ...settings, pin: '' });
  const [saving, setSaving] = useState(false);
  const [confirmReset, setConfirmReset] = useState(false);
  useEffect(() => setForm({ ...settings, pin: '' }), [settings]);

  function set(k, v) { setForm((f) => ({ ...f, [k]: v })); }

  async function save() {
    setSaving(true);
    try {
      const payload = { storeName: form.storeName, address: form.address, phone: form.phone, adminName: form.adminName, receiptWidth: form.receiptWidth };
      // Only send `pin` if the admin actually typed a new one — an empty
      // field here means "leave it unchanged", not "remove the PIN".
      if (form.pin) payload.pin = form.pin;
      await updateSettings(payload);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-5">
      <SectionHeader title="Pengaturan" subtitle="Profil warung dan preferensi aplikasi" />

      <Card>
        <p className="font-bold text-ink-800 mb-4 flex items-center gap-2"><Store size={16} className="text-warung-700" /> Profil Warung</p>
        <div className="space-y-4">
          <Field label="Nama Warung"><input value={form.storeName || ''} onChange={(e) => set('storeName', e.target.value)} className={inputCls} /></Field>
          <Field label="Alamat"><input value={form.address || ''} onChange={(e) => set('address', e.target.value)} className={inputCls} placeholder="opsional" /></Field>
          <Field label="Nomor Telepon"><input value={form.phone || ''} onChange={(e) => set('phone', e.target.value)} className={inputCls} placeholder="opsional" /></Field>
          <Field label="Nama Admin"><input value={form.adminName || ''} onChange={(e) => set('adminName', e.target.value)} className={inputCls} /></Field>
        </div>
      </Card>

      <Card>
        <p className="font-bold text-ink-800 mb-4 flex items-center gap-2"><ShieldCheck size={16} className="text-warung-700" /> Keamanan & Struk</p>
        <div className="space-y-4">
          <Field label={settings.hasPin ? 'Ganti PIN Aplikasi' : 'Buat PIN Aplikasi'} hint="Kosongkan jika tidak ingin mengubah PIN saat ini.">
            <input value={form.pin} onChange={(e) => set('pin', e.target.value.replace(/\D/g, '').slice(0, 4))} placeholder="••••" inputMode="numeric" className={`${inputCls} font-mono tracking-[0.3em]`} />
          </Field>
          <Field label="Ukuran Struk">
            <div className="grid grid-cols-2 gap-2">
              {['58', '80'].map((w) => (
                <button type="button" key={w} onClick={() => set('receiptWidth', w)} className={`py-2.5 rounded-xl text-sm font-bold border transition-colors ${form.receiptWidth === w ? 'bg-warung-700 text-white border-warung-700' : 'bg-white text-ink-600 border-ink-200'}`}>Thermal {w}mm</button>
              ))}
            </div>
          </Field>
        </div>
      </Card>

      <Btn onClick={save} icon={Save} className="w-full sm:w-auto" disabled={saving}>{saving ? 'Menyimpan...' : 'Simpan Pengaturan'}</Btn>

      <Card className="border-chili-100">
        <p className="font-bold text-chili-600 mb-2 flex items-center gap-2"><AlertTriangle size={16} /> Zona Berbahaya</p>
        <p className="text-sm text-ink-500 mb-3">Menghapus seluruh data produk, stok, transaksi, dan keuangan yang tersimpan di Google Sheets Anda. Tindakan ini tidak bisa dibatalkan.</p>
        <Btn variant="danger" icon={RefreshCw} onClick={() => setConfirmReset(true)}>Reset Semua Data</Btn>
      </Card>

      <ConfirmDialog
        open={confirmReset} onClose={() => setConfirmReset(false)} title="Reset Semua Data?"
        message="Tindakan ini akan menghapus semua data yang tersimpan di spreadsheet dan tidak dapat dibatalkan. Lanjutkan?"
        onConfirm={() => { resetAllData(); setConfirmReset(false); }}
      />
    </div>
  );
}
