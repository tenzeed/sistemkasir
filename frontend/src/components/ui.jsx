import { useEffect } from 'react';
import { X, AlertTriangle, CircleCheck, Info, Loader2 } from 'lucide-react';
import { cx } from '../lib/helpers';

export const inputCls =
  'w-full rounded-xl border border-ink-200 bg-white px-3.5 py-2.5 text-sm text-ink-800 placeholder-ink-300 outline-none transition-all focus:border-warung-600 focus:ring-4 focus:ring-warung-500/15';
export const labelCls = 'block text-sm font-semibold text-ink-700 mb-1.5';

export function Field({ label, hint, children }) {
  return (
    <label className="block">
      {label && <span className={labelCls}>{label}</span>}
      {children}
      {hint && <span className="block text-xs text-ink-400 mt-1.5">{hint}</span>}
    </label>
  );
}

const BTN_VARIANTS = {
  primary:
    'bg-gradient-to-b from-warung-600 to-warung-700 hover:from-warung-500 hover:to-warung-700 text-white shadow-md shadow-warung-900/20 border border-warung-700/50',
  secondary: 'bg-white hover:bg-ink-50 text-ink-700 border border-ink-200 shadow-sm',
  danger:
    'bg-gradient-to-b from-chili-500 to-chili-600 hover:from-chili-400 hover:to-chili-600 text-white shadow-md shadow-chili-900/20',
  ghost: 'bg-transparent hover:bg-ink-100 text-ink-600',
  amber:
    'bg-gradient-to-b from-marigold-400 to-marigold-500 hover:from-marigold-300 hover:to-marigold-500 text-white shadow-md shadow-marigold-900/20',
};
const BTN_SIZES = {
  sm: 'px-3 py-1.5 text-xs gap-1.5',
  md: 'px-4 py-2.5 text-sm gap-2',
  lg: 'px-5 py-3.5 text-base gap-2.5',
};

export function Btn({ children, variant = 'primary', size = 'md', className = '', icon: Icon, loading = false, loadingText, disabled, ...props }) {
  const isDisabled = disabled || loading;
  const ShownIcon = loading ? Loader2 : Icon;
  return (
    <button
      type="button"
      disabled={isDisabled}
      className={cx(
        'inline-flex items-center justify-center rounded-xl font-semibold transition-all active:scale-[0.97]',
        'disabled:opacity-40 disabled:cursor-not-allowed disabled:active:scale-100 disabled:shadow-none',
        BTN_VARIANTS[variant],
        BTN_SIZES[size],
        className
      )}
      {...props}
    >
      {ShownIcon && <ShownIcon size={size === 'sm' ? 14 : 16} strokeWidth={2.4} className={loading ? 'animate-spin' : ''} />}
      {loading && loadingText ? loadingText : children}
    </button>
  );
}

const TONES = {
  warung: { badge: 'bg-warung-50 text-warung-700 ring-1 ring-inset ring-warung-600/15', dot: 'bg-warung-500', tile: 'bg-gradient-to-br from-warung-500 to-warung-700 text-white' },
  marigold: { badge: 'bg-marigold-50 text-marigold-700 ring-1 ring-inset ring-marigold-500/20', dot: 'bg-marigold-400', tile: 'bg-gradient-to-br from-marigold-400 to-marigold-600 text-white' },
  orange: { badge: 'bg-orange-50 text-orange-700 ring-1 ring-inset ring-orange-500/20', dot: 'bg-orange-400', tile: 'bg-gradient-to-br from-orange-400 to-orange-600 text-white' },
  chili: { badge: 'bg-chili-50 text-chili-700 ring-1 ring-inset ring-chili-500/20', dot: 'bg-chili-500', tile: 'bg-gradient-to-br from-chili-500 to-chili-700 text-white' },
  ink: { badge: 'bg-ink-100 text-ink-600 ring-1 ring-inset ring-ink-300/40', dot: 'bg-ink-400', tile: 'bg-gradient-to-br from-ink-400 to-ink-600 text-white' },
};

export function Badge({ children, tone = 'ink', dot = false }) {
  const t = TONES[tone] || TONES.ink;
  return (
    <span className={cx('inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-bold', t.badge)}>
      {dot && <span className={cx('w-1.5 h-1.5 rounded-full', t.dot)} />}
      {children}
    </span>
  );
}

export function IconTile({ icon: Icon, tone = 'warung', size = 10 }) {
  const t = TONES[tone] || TONES.warung;
  return (
    <div className={cx('flex items-center justify-center rounded-2xl shadow-sm', t.tile)} style={{ width: `${size * 0.25}rem`, height: `${size * 0.25}rem` }}>
      <Icon size={Math.round(size * 1.1)} strokeWidth={2.2} />
    </div>
  );
}

export function Card({ children, className = '', noPad = false, accent }) {
  return (
    <div className={cx('relative min-w-0 bg-white rounded-2xl border border-ink-100 shadow-card overflow-hidden', className)}>
      {accent && <div className={cx('absolute inset-x-0 top-0 h-1', TONES[accent]?.tile || TONES.warung.tile)} />}
      <div className={noPad ? '' : 'p-4 sm:p-5'}>{children}</div>
    </div>
  );
}

export function SectionHeader({ title, subtitle, action }) {
  return (
    <div className="flex items-start justify-between gap-3 mb-5 flex-wrap">
      <div>
        <h2 className="text-xl font-extrabold text-ink-900 tracking-tight">{title}</h2>
        {subtitle && <p className="text-sm text-ink-400 mt-1">{subtitle}</p>}
      </div>
      {action}
    </div>
  );
}

export function EmptyState({ icon: Icon, title, desc, action }) {
  return (
    <div className="flex flex-col items-center justify-center text-center py-16 px-6">
      <div className="relative w-16 h-16 mb-4">
        <div className="absolute inset-0 rounded-full border-2 border-dashed border-ink-200" />
        <div className="absolute inset-2 rounded-full bg-ink-50 flex items-center justify-center">
          <Icon size={22} className="text-ink-400" strokeWidth={2} />
        </div>
      </div>
      <h3 className="font-bold text-ink-800">{title}</h3>
      {desc && <p className="text-sm text-ink-400 mt-1.5 max-w-xs">{desc}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}

export function Modal({ open, onClose, title, children, footer, maxW = 'max-w-md' }) {
  useEffect(() => {
    if (!open) return;
    function onKey(e) { if (e.key === 'Escape') onClose?.(); }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="absolute inset-0 bg-ink-950/50 backdrop-blur-[2px] animate-[wm-fade_.18s_ease_both]" onClick={onClose} />
      <div
        className={cx(
          'relative bg-white w-full',
          maxW,
          'sm:rounded-2xl rounded-t-3xl shadow-pop max-h-[92vh] flex flex-col',
          'animate-[wm-slide-up_.25s_cubic-bezier(0.16,1,0.3,1)_both]'
        )}
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-ink-100 flex-shrink-0">
          <h3 className="font-bold text-ink-900">{title}</h3>
          <button type="button" onClick={onClose} className="w-8 h-8 rounded-full hover:bg-ink-100 flex items-center justify-center text-ink-400 transition-colors active:scale-95">
            <X size={18} />
          </button>
        </div>
        <div className="px-5 py-4 overflow-y-auto">{children}</div>
        {footer && <div className="px-5 py-4 border-t border-ink-100 flex-shrink-0 flex gap-2 justify-end">{footer}</div>}
      </div>
    </div>
  );
}

export function ConfirmDialog({ open, onClose, onConfirm, title, message, tone = 'danger', confirmLabel = 'Ya, lanjutkan', loading = false }) {
  return (
    <Modal
      open={open}
      onClose={loading ? () => {} : onClose}
      title={title}
      footer={
        <>
          <Btn variant="secondary" onClick={onClose} disabled={loading}>Batal</Btn>
          <Btn variant={tone} onClick={onConfirm} loading={loading} loadingText="Memproses...">{confirmLabel}</Btn>
        </>
      }
    >
      <p className="text-sm text-ink-600 leading-relaxed">{message}</p>
    </Modal>
  );
}

function withWrapHints(text) {
  // Break only after the thousand-separator dots (never mid-digit-group) if
  // the value ever needs to wrap onto a second line on narrow screens.
  const parts = String(text).split('.');
  return parts.map((part, i) => (
    <span key={i}>
      {part}
      {i < parts.length - 1 ? <>.<wbr /></> : null}
    </span>
  ));
}

export function StatCard({ icon: Icon, label, value, sub, tone = 'warung', trend }) {
  return (
    <Card className="relative min-w-0">
      <div className="flex items-start justify-between gap-2">
        <IconTile icon={Icon} tone={tone} size={9} />
        {trend != null && (
          <span className={cx('flex-shrink-0 flex items-center gap-0.5 text-xs font-bold px-1.5 py-0.5 rounded-full', trend >= 0 ? 'text-warung-700 bg-warung-50' : 'text-chili-600 bg-chili-50')}>
            {trend >= 0 ? '▲' : '▼'} {Math.abs(trend)}%
          </span>
        )}
      </div>
      <p className="text-xs font-bold text-ink-400 uppercase tracking-wide mt-3.5 line-clamp-2">{label}</p>
      <p className="text-base sm:text-xl lg:text-2xl font-extrabold text-ink-900 mt-1 font-mono tracking-tight leading-tight break-words">
        {typeof value === 'string' ? withWrapHints(value) : value}
      </p>
      {sub && <p className="text-xs text-ink-400 mt-1.5 truncate">{sub}</p>}
    </Card>
  );
}

export function Tabs({ tabs, active, onChange }) {
  return (
    <div className="flex gap-1 bg-ink-100/70 rounded-xl p-1 overflow-x-auto">
      {tabs.map((t) => (
        <button
          type="button"
          key={t.id}
          onClick={() => onChange(t.id)}
          className={cx(
            'flex-shrink-0 px-3.5 py-2 rounded-lg text-sm font-bold transition-all whitespace-nowrap',
            active === t.id ? 'bg-white text-warung-700 shadow-sm' : 'text-ink-400 hover:text-ink-600'
          )}
        >
          {t.label}
        </button>
      ))}
    </div>
  );
}

export function Toasts({ toasts, remove }) {
  return (
    <div className="fixed z-[100] bottom-24 sm:bottom-6 left-1/2 -translate-x-1/2 sm:left-auto sm:right-6 sm:translate-x-0 flex flex-col gap-2 w-[92%] sm:w-auto max-w-sm">
      {toasts.map((t) => (
        <div
          key={t.id}
          onClick={() => remove(t.id)}
          className={cx(
            'animate-[wm-slide-up_.22s_cubic-bezier(0.16,1,0.3,1)_both] cursor-pointer rounded-2xl px-4 py-3.5 shadow-pop text-sm font-semibold flex items-center gap-2.5 border',
            t.type === 'error' ? 'bg-chili-600 text-white border-chili-700' : t.type === 'info' ? 'bg-ink-800 text-white border-ink-900' : 'bg-warung-700 text-white border-warung-800'
          )}
        >
          {t.type === 'error' ? <AlertTriangle size={16} /> : t.type === 'info' ? <Info size={16} /> : <CircleCheck size={16} />}
          <span>{t.message}</span>
        </div>
      ))}
    </div>
  );
}

export function DateRangeFilter({ preset, onPreset, from, to, onFrom, onTo }) {
  const presets = [
    { id: 'today', label: 'Hari ini' },
    { id: 'yesterday', label: 'Kemarin' },
    { id: 'week', label: 'Minggu ini' },
    { id: 'month', label: 'Bulan ini' },
    { id: 'custom', label: 'Custom' },
  ];
  return (
    <div className="flex flex-wrap items-center gap-2">
      {presets.map((p) => (
        <button
          type="button"
          key={p.id}
          onClick={() => onPreset(p.id)}
          className={cx(
            'px-3 py-1.5 rounded-lg text-xs font-bold border transition-colors',
            preset === p.id ? 'bg-warung-700 text-white border-warung-700' : 'bg-white text-ink-600 border-ink-200 hover:border-ink-300'
          )}
        >
          {p.label}
        </button>
      ))}
      {preset === 'custom' && (
        <div className="flex items-center gap-1.5 ml-1">
          <input type="date" value={from} onChange={(e) => onFrom(e.target.value)} className={cx(inputCls, 'py-1.5 text-xs')} />
          <span className="text-ink-400 text-xs">s/d</span>
          <input type="date" value={to} onChange={(e) => onTo(e.target.value)} className={cx(inputCls, 'py-1.5 text-xs')} />
        </div>
      )}
    </div>
  );
}

export function ProgressBar({ value, max, tone = 'warung' }) {
  const pct = max > 0 ? Math.max(4, Math.min(100, (value / max) * 100)) : 0;
  const t = TONES[tone] || TONES.warung;
  return (
    <div className="h-1.5 bg-ink-100 rounded-full overflow-hidden">
      <div className={cx('h-full rounded-full', t.tile)} style={{ width: `${pct}%` }} />
    </div>
  );
}
