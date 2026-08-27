import { Download } from 'lucide-react';
import { useInstallPrompt } from '../lib/useInstallPrompt.js';
import { cx } from '../lib/helpers';

/**
 * A quiet pill button, not a promo banner: no dismiss button, no color
 * flourish, no auto-popup. It simply doesn't render at all unless the
 * browser has genuinely confirmed the app can be installed right now.
 *
 * tone="dark"  — for the green hero background (setup/login screens)
 * tone="light" — for use inside a white card (e.g. Settings)
 */
export function InstallChip({ tone = 'dark', className = '' }) {
  const { canInstall, promptInstall } = useInstallPrompt();
  if (!canInstall) return null;

  const toneCls =
    tone === 'dark'
      ? 'border-white/25 bg-white/10 text-white hover:bg-white/15'
      : 'border-ink-200 bg-white text-ink-700 hover:bg-ink-50';

  return (
    <button
      type="button"
      onClick={promptInstall}
      className={cx(
        'inline-flex items-center gap-1.5 rounded-full border px-3.5 py-1.5 text-xs font-semibold backdrop-blur transition-colors active:scale-95',
        toneCls,
        className
      )}
    >
      <Download size={13} strokeWidth={2.4} />
      Pasang Aplikasi
    </button>
  );
}
