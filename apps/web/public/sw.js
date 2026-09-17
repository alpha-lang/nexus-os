const CACHE_NAME = 'nexus-os-v1';
const PRECACHE_URLS = ['/', '/manifest.json'];

self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(PRECACHE_URLS))
  );
  self.skipWaiting();
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', (e) => {
  // Ignore les méthodes non-GET
  if (e.request.method !== 'GET') return;

  // Récupère l'URL
  let url;
  try {
    url = new URL(e.request.url);
  } catch {
    return;
  }

  // Ignore tout sauf http et https (chrome-extension, data:, file:, etc.)
  if (url.protocol !== 'http:' && url.protocol !== 'https:') return;

  // Ignore les requêtes cross-origin (API, CDN, etc.)
  if (url.origin !== self.location.origin) return;

  // Ignore les requêtes d'API (toujours réseau)
  if (url.pathname.startsWith('/api/')) return;

  // Network first, fallback cache
  e.respondWith(
    fetch(e.request)
      .then((res) => {
        // Ne cache que les réponses valides
        if (res && res.status === 200 && res.type === 'basic') {
          const copy = res.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(e.request, copy)).catch(() => {});
        }
        return res;
      })
      .catch(() => caches.match(e.request).then((cached) => cached || Response.error()))
  );
});
