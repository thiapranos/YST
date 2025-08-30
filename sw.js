/* Minimal, privacy-first service worker for offline reliability.
   - Caches this results page and same-origin assets.
   - No telemetry. No data sync. */

const CACHE_NAME = 'yst-cache-v1';
const CORE_ASSETS = [
  '/',            // adjust if your site root differs
  '/results.html' // update if results lives elsewhere
];

// Install: pre-cache core assets (best-effort)
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(CORE_ASSETS)).catch(()=>{})
  );
  self.skipWaiting();
});

// Activate: cleanup old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    )
  );
  self.clients.claim();
});

// Fetch: cache-first for same-origin GET; network fallback; then cache
self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;

  const url = new URL(req.url);
  const sameOrigin = url.origin === self.location.origin;

  if (sameOrigin) {
    event.respondWith(
      caches.match(req).then(cached => {
        if (cached) return cached;
        return fetch(req).then(res => {
          const resClone = res.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(req, resClone)).catch(()=>{});
          return res;
        }).catch(() => caches.match('/results.html') || caches.match('/'));
      })
    );
  }
});
