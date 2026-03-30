// Omnia Adriatic Lifeguard Service - Service Worker
const CACHE_NAME = 'omnia-v4';

self.addEventListener('install', function(e) {
  self.skipWaiting();
});

self.addEventListener('activate', function(e) {
  e.waitUntil(clients.claim());
});

// Handle push notifications from server (future use)
self.addEventListener('push', function(e) {
  var data = e.data ? e.data.json() : {};
  var title = data.title || '🚨 Omnia – Nuova segnalazione';
  var options = {
    body: data.body || 'Nuova segnalazione ricevuta',
    icon: '/appsegnalazioni/icon-192-fixed.png',
    badge: '/appsegnalazioni/icon-192-fixed.png',
    vibrate: [300, 100, 300, 100, 300],
    tag: 'omnia-segnalazione',
    renotify: true,
    data: { url: self.registration.scope }
  };
  e.waitUntil(self.registration.showNotification(title, options));
});

// Handle notification click - open/focus app
self.addEventListener('notificationclick', function(e) {
  e.notification.close();
  e.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(function(clientList) {
      for (var i = 0; i < clientList.length; i++) {
        var client = clientList[i];
        if ('focus' in client) return client.focus();
      }
      if (clients.openWindow) return clients.openWindow(e.notification.data.url || '/appsegnalazioni/');
    })
  );
});

// Message from page to show notification (quando app in background)
self.addEventListener('message', function(e) {
  if (e.data && e.data.type === 'SHOW_NOTIFICATION') {
    self.registration.showNotification(e.data.title, e.data.options);
  }
});
