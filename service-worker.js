// Invalidate and unregister existing service worker caches in dev environment
self.addEventListener('install', () => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(keys.map((key) => caches.delete(key)));
    }).then(() => self.clients.claim())
  );
});

// Do not intercept or cache any fetch requests during development to prevent module chunk caching mismatches
self.addEventListener('fetch', () => {
  // Let network handle directly
});
