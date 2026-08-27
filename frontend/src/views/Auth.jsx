import { useState } from 'react';
import { Store, Lock, User } from 'lucide-react';
import { Btn, Field, inputCls } from '../components/ui.jsx';
import { InstallChip } from '../components/InstallChip.jsx';

export function SetupView({ onComplete, loading }) {
  const [storeName, setStoreName] = useState('');
  const [address, setAddress] = useState('');
  const [adminName, setAdminName] = useState('');
  const [pin, setPin] = useState('');
  const [step, setStep] = useState(1);

  const canNext = step === 1 ? storeName.trim().length > 0 : adminName.trim().length > 0;

  return (
    <div className="min-h-screen bg-warung-hero bg-grain flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-6">
          <div className="w-16 h-16 rounded-2xl bg-white/10 ring-1 ring-white/20 flex items-center justify-center mx-auto mb-4">
            <Store className="text-marigold-300" size={28} />
          </div>
          <h1 className="text-white text-xl font-extrabold">Selamat Datang</h1>
          <p className="text-warung-200 text-sm mt-1">Mari siapkan aplikasi warung Anda</p>
          <div className="flex justify-center mt-4">
            <InstallChip tone="dark" />
          </div>
        </div>
        <div className="bg-white rounded-2xl shadow-pop p-6">
          <div className="flex items-center gap-1.5 mb-5">
            <div className={`h-1 flex-1 rounded-full ${step >= 1 ? 'bg-warung-600' : 'bg-ink-100'}`} />
            <div className={`h-1 flex-1 rounded-full ${step >= 2 ? 'bg-warung-600' : 'bg-ink-100'}`} />
          </div>

          {step === 1 && (
            <div className="space-y-4">
              <Field label="Nama Warung">
                <input autoFocus value={storeName} onChange={(e) => setStoreName(e.target.value)} placeholder="mis. Warung Berkah Jaya" className={inputCls} />
              </Field>
              <Field label="Alamat (opsional)">
                <input value={address} onChange={(e) => setAddress(e.target.value)} placeholder="Jl. Contoh No. 1" className={inputCls} />
              </Field>
              <Btn className="w-full mt-2" disabled={!canNext} onClick={() => setStep(2)}>Lanjut</Btn>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-4">
              <Field label="Nama Admin">
                <input autoFocus value={adminName} onChange={(e) => setAdminName(e.target.value)} placeholder="mis. Budi" className={inputCls} />
              </Field>
              <Field label="Buat PIN 4 digit (opsional)" hint="Untuk mengunci aplikasi saat dibuka lagi. Bisa dilewati.">
                <input value={pin} onChange={(e) => setPin(e.target.value.replace(/\D/g, '').slice(0, 4))} placeholder="••••" inputMode="numeric" className={`${inputCls} font-mono tracking-[0.3em]`} />
              </Field>
              <div className="flex gap-2 mt-2">
                <Btn variant="secondary" onClick={() => setStep(1)}>Kembali</Btn>
                <Btn className="flex-1" disabled={!canNext} loading={loading} loadingText="Menyimpan..." onClick={() => onComplete({ storeName, address, adminName, pin })}>Mulai Pakai Aplikasi</Btn>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export function LoginView({ settings, onLogin, verifyPin }) {
  const [pin, setPin] = useState('');
  const [error, setError] = useState('');
  const [checking, setChecking] = useState(false);
  const needsPin = !!settings.hasPin;

  async function submit() {
    if (!needsPin) { onLogin(); return; }
    setChecking(true);
    try {
      const ok = await verifyPin(pin);
      if (ok) onLogin();
      else { setError('PIN salah, coba lagi.'); setPin(''); }
    } finally {
      setChecking(false);
    }
  }

  return (
    <div className="min-h-screen bg-warung-hero bg-grain flex items-center justify-center p-4">
      <div className="w-full max-w-sm text-center">
        <div className="w-16 h-16 rounded-2xl bg-white/10 ring-1 ring-white/20 flex items-center justify-center mx-auto mb-4">
          <Store className="text-marigold-300" size={28} />
        </div>
        <h1 className="text-white text-xl font-extrabold">{settings.storeName}</h1>
        <p className="text-warung-200 text-sm mt-1">Selamat datang kembali, {settings.adminName}</p>
        <div className="flex justify-center mt-4">
          <InstallChip tone="dark" />
        </div>

        <div className="bg-white rounded-2xl shadow-pop p-6 mt-6">
          {needsPin ? (
            <>
              <Field label="Masukkan PIN">
                <input
                  autoFocus value={pin} onChange={(e) => { setPin(e.target.value.replace(/\D/g, '').slice(0, 4)); setError(''); }}
                  onKeyDown={(e) => e.key === 'Enter' && submit()}
                  placeholder="••••" inputMode="numeric" className={`${inputCls} font-mono tracking-[0.3em] text-center text-lg`}
                />
              </Field>
              {error && <p className="text-chili-600 text-xs mt-2 text-left">{error}</p>}
              <Btn className="w-full mt-4" icon={Lock} disabled={pin.length < 4} loading={checking} loadingText="Memeriksa..." onClick={submit}>Masuk</Btn>
            </>
          ) : (
            <Btn className="w-full" icon={User} onClick={onLogin}>Masuk sebagai {settings.adminName}</Btn>
          )}
        </div>
      </div>
    </div>
  );
}
