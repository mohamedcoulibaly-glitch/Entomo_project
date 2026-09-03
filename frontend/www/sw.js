/**
 * Service Worker Ento-App — precache étendu + stale-while-revalidate.
 */
const CACHE_VERSION = 'entomo-static-v7';
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/login.html',
  '/manifest.json',
  '/css/tailwind.min.css',
  '/css/design-tokens.css',
  '/js/api.js',
  '/js/core.js',
  '/js/tailwind-shim.js',
  '/js/offline-store.js',
  '/js/offline-sync.js',
  '/js/permission-guard.js',
  '/js/components/avatar.js',
  '/pages/centre-application.html',
  '/pages/dashboard-entomo.html',
  '/pages/gestion-captures.html',
  '/pages/nouvelle-capture.html',
  '/pages/gestion-hors-ligne.html',
  '/pages/validation-dhis2.html',
  '/pages/statut-sync.html',
  '/js/utils/download.js',
  '/js/utils/audio-waveform.js',
  '/pages/surveillance-audio.html',
  '/pages/gestion-modeles-visuels.html',
  '/pages/assistant.html',
  '/pages/404.html',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_VERSION).then((cache) => cache.addAll(STATIC_ASSETS).catch(() => {}))
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_VERSION).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);
  if (url.pathname.includes('/api/') || event.request.method !== 'GET') {
    return;
  }
  const isAppAsset = event.request.destination === 'document'
    || event.request.destination === 'script'
    || event.request.destination === 'style';
  if (isAppAsset) {
    event.respondWith(
      fetch(event.request).then((response) => {
        if (response.ok && url.origin === self.location.origin) {
          const clone = response.clone();
          caches.open(CACHE_VERSION).then((cache) => cache.put(event.request, clone));
        }
        return response;
      }).catch(() => caches.match(event.request))
    );
    return;
  }
  event.respondWith(
    caches.match(event.request).then((cached) => {
      const network = fetch(event.request)
        .then((response) => {
          if (response.ok && url.origin === self.location.origin) {
            const clone = response.clone();
            caches.open(CACHE_VERSION).then((cache) => cache.put(event.request, clone));
          }
          return response;
        })
        .catch(() => cached);
      return cached || network;
    }).catch(() => caches.match('/index.html'))
  );
});
