// ──────────────────────────────────────────────────────────────
// SELF-DESTRUCT: This service worker immediately unregisters
// itself and all other workers. The old Firebase SW was causing
// browsers to serve stale cached assets after deploys.
// ──────────────────────────────────────────────────────────────
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', e => {
  e.waitUntil(
    self.registration.unregister().then(() => {
      return self.clients.matchAll({ type: 'window' });
    }).then(clients => {
      clients.forEach(c => c.navigate && c.navigate(c.url));
    })
  );
});
