// sw.js - Service Worker básico para CelApp
const CACHE_NAME = 'celapp-v1';
const urlsToCache = [
  '/CelApp/',
  '/CelApp/index.html',
  '/CelApp/css/base.css',
  '/CelApp/css/layout.css',
  '/CelApp/css/dock.css',
  '/CelApp/css/cards.css',
  '/CelApp/css/modals.css',
  '/CelApp/js/app.js',
  '/CelApp/js/state/appState.js',
  '/CelApp/js/services/storage.js',
  '/CelApp/js/services/sync.js',
  '/CelApp/js/services/auth.js',
  '/CelApp/js/services/resetService.js',
  '/CelApp/js/services/adminService.js',
  '/CelApp/js/config/unidades.js',
  '/CelApp/js/config/franjas.js',
  '/CelApp/js/config/estructuraCamas.js',
  '/CelApp/js/config/materiales.js',
  '/CelApp/js/config/atributos.js',
  '/CelApp/js/config/tareasExtra.js',
  '/CelApp/js/components/header.js',
  '/CelApp/js/components/unidadView.js',
  '/CelApp/js/components/periodoView.js',
  '/CelApp/js/components/camaCard.js',
  '/CelApp/js/components/tareaCard.js',
  '/CelApp/js/components/dock.js',
  '/CelApp/js/components/loginView.js',
  '/CelApp/js/components/modals/editorCamaModal.js',
  '/CelApp/js/components/modals/almacenModal.js',
  '/CelApp/js/components/modals/tareasExtraModal.js',
  '/CelApp/js/components/modals/filtrosModal.js',
  '/CelApp/js/components/modals/ajustesModal.js',
  '/CelApp/js/components/modals/adminPanelModal.js',
  '/CelApp/js/components/modals/confirmModal.js',
  '/CelApp/js/components/modals/historialModal.js',
  '/CelApp/js/components/modals/trasladoModal.js'
];

self.addEventListener('install', function(event) {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(function(cache) {
        return cache.addAll(urlsToCache);
      })
  );
});

self.addEventListener('fetch', function(event) {
  event.respondWith(
    caches.match(event.request)
      .then(function(response) {
        if (response) {
          return response;
        }
        return fetch(event.request);
      })
  );
});

self.addEventListener('activate', function(event) {
  event.waitUntil(
    caches.keys().then(function(cacheNames) {
      return Promise.all(
        cacheNames.map(function(cacheName) {
          if (cacheName !== CACHE_NAME) {
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
});