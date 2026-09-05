/**
 * Service Worker Ento-App — precache étendu + stale-while-revalidate.
 */
const CACHE_VERSION = 'entomo-disabled-v1';
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
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    Promise.all([
      self.registration.unregister(),
      caches.keys().then((keys) => Promise.all(keys.map((key) => caches.delete(key)))),
    ])
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  // Le frontend doit toujours être servi directement par le serveur.
});
