import { useState, useEffect, useCallback } from 'react';

/**
 * Wraps the browser's `beforeinstallprompt` flow. Renders nothing on its
 * own — `canInstall` is only ever true when the browser has actually
 * confirmed the app is installable (right manifest, service worker,
 * HTTPS, not already installed). On browsers that never fire the event
 * (Safari/iOS, Firefox) `canInstall` just stays false forever, so callers
 * should hide their own install UI in that case rather than showing a
 * button that does nothing.
 */
export function useInstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [installed, setInstalled] = useState(false);

  useEffect(() => {
    const isStandalone =
      window.matchMedia?.('(display-mode: standalone)').matches || window.navigator.standalone === true;
    if (isStandalone) setInstalled(true);

    function onBeforeInstallPrompt(e) {
      e.preventDefault();
      setDeferredPrompt(e);
    }
    function onAppInstalled() {
      setInstalled(true);
      setDeferredPrompt(null);
    }

    window.addEventListener('beforeinstallprompt', onBeforeInstallPrompt);
    window.addEventListener('appinstalled', onAppInstalled);
    return () => {
      window.removeEventListener('beforeinstallprompt', onBeforeInstallPrompt);
      window.removeEventListener('appinstalled', onAppInstalled);
    };
  }, []);

  const promptInstall = useCallback(async () => {
    if (!deferredPrompt) return false;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    setDeferredPrompt(null);
    return outcome === 'accepted';
  }, [deferredPrompt]);

  return { canInstall: !!deferredPrompt && !installed, installed, promptInstall };
}
