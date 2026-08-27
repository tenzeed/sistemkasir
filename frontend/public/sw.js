// Minimal service worker — exists ONLY to satisfy PWA installability
// requirements (Chrome/Edge require an active service worker with a fetch
// handler before they'll offer the install prompt). It deliberately does
// NOT cache or serve anything: every request goes straight to the network,
// exactly as if there were no service worker at all.
//
// Why so bare-bones: this app has no real offline mode (every screen needs
// live data from the Apps Script backend), so there's nothing meaningful
// to cache. An earlier version of this file DID cache the HTML shell, and
// that caused a nasty, well-known PWA bug: after a new deploy, Vite's JS
// bundle gets a new hashed filename, but a browser with the old service
// worker still active kept serving the OLD cached index.html — which
// pointed at a JS file that no longer existed on the server, producing a
// blank white screen. Not caching anything here makes that bug structurally
// impossible.
self.addEventListener('install', () => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      // Wipe any caches left behind by earlier versions of this file, so
      // anyone still affected by the bug above recovers automatically.
      .then((keys) => Promise.all(keys.map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', () => {
  // Intentionally empty. Not calling event.respondWith() means the
  // browser's default network handling takes over completely — this
  // listener's mere existence is what satisfies installability checks.
});
