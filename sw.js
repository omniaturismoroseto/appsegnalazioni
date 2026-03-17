
const CACHE_NAME = 'omnia-v1';
const ASSETS = [
  '/appsegnalazioni/',
  '/appsegnalazioni/index.html',
  '/appsegnalazioni/manifest.json',
  'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.css',
  'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.js'
];

self.addEventListener('install', function(e) {
  e.waitUntil(
    caches.open(CACHE_NAME).then(function(cache) {
      return cache.addAll(ASSETS).catch(function(err) {
        console.warn('Cache parziale:', err);
      });
    })
  );
  self.skipWaiting();
});

self.addEventListener('activate', function(e) {
  e.waitUntil(
    caches.keys().then(function(keys) {
      return Promise.all(
        keys.filter(function(k) { return k !== CACHE_NAME; })
            .map(function(k) { return caches.delete(k); })
      );
    })
  );
  self.clients.claim();
});

self.addEventListener('fetch', function(e) {
  var url = e.request.url;
  if (url.includes('firebasedatabase.app') ||
      url.includes('cartocdn.com') ||
      url.includes('openstreetmap.org') ||
      url.includes('wa.me')) {
    return;
  }
  e.respondWith(
    fetch(e.request)
      .then(function(response) {
        if (response && response.status === 200) {
          var clone = response.clone();
          caches.open(CACHE_NAME).then(function(cache) {
            cache.put(e.request, clone);
          });
        }
        return response;
      })
      .catch(function() {
        return caches.match(e.request);
      })
  );
});

self.addEventListener('push', function(e) {
  var data = {};
  try { data = e.data.json(); } catch(err) {
    data = { title: 'Omnia Segnalazioni', body: e.data ? e.data.text() : 'Nuova segnalazione' };
  }
  e.waitUntil(
    self.registration.showNotification(data.title || 'Omnia Segnalazioni', {
      body: data.body || 'Nuova segnalazione ricevuta',
      icon: '/appsegnalazioni/icon.png',
      badge: '/appsegnalazioni/icon.png',
      vibrate: [200, 100, 200],
      tag: 'omnia-segnalazione',
      renotify: true,
      data: { url: '/appsegnalazioni/' }
    })
  );
});

self.addEventListener('notificationclick', function(e) {
  e.notification.close();
  e.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true })
      .then(function(clientList) {
        for (var i = 0; i < clientList.length; i++) {
          var client = clientList[i];
          if (client.url.includes('appsegnalazioni') && 'focus' in client) {
            return client.focus();
          }
        }
        if (clients.openWindow) {
          return clients.openWindow('/appsegnalazioni/');
        }
      })
  );
});
