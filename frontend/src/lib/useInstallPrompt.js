import { useState, useEffect, useCallback } from 'react';

/**
 * Wraps the browser's `beforeinstallprompt` flow. The actual event is
 * captured as early as possible by an inline script in index.html (see
 * that file for why) and stashed on `window.__pwaInstallEvent`; this hook
 * just reads that global and re-renders whenever it changes, so it works
 * correctly no matter which screen happens to be mounted when the browser
 * decides the app is installable.
 *
 * On browsers that never fire the event (Safari/iOS, Firefox) `canInstall`
 * just stays false forever, so callers should hide their own install UI
 * in that case rather than showing a button that does nothing.
 */
export function useInstallPrompt() {
  const [ready, setReady] = useState(() => typeof window !== 'undefined' && !!window.__pwaInstallEvent);
  const [installed, setInstalled] = useState(false);

  useEffect(() => {
    const isStandalone =
      window.matchMedia?.('(display-mode: standalone)').matches || window.navigator.standalone === true;
    if (isStandalone) setInstalled(true);

    // In case the event arrived between module init and this effect running.
    if (window.__pwaInstallEvent) setReady(true);

    function onReady() { setReady(true); }
    function onDone() { setInstalled(true); setReady(false); }

    window.addEventListener('pwa-install-ready', onReady);
    window.addEventListener('pwa-install-done', onDone);
    return () => {
      window.removeEventListener('pwa-install-ready', onReady);
      window.removeEventListener('pwa-install-done', onDone);
    };
  }, []);

  const promptInstall = useCallback(async () => {
    const evt = window.__pwaInstallEvent;
    if (!evt) return false;
    evt.prompt();
    const { outcome } = await evt.userChoice;
    window.__pwaInstallEvent = null;
    setReady(false);
    if (outcome === 'accepted') setInstalled(true);
    return outcome === 'accepted';
  }, []);

  return { canInstall: ready && !installed, installed, promptInstall };
}
