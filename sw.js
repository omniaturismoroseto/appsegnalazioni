
self.addEventListener('push', function(e) {
  var data = {};
  try { data = e.data.json(); } catch(err) {
    data = { title: 'Omnia Segnalazioni', body: 'Nuova segnalazione' };
  }
  e.waitUntil(
    self.registration.showNotification(data.title || 'Omnia Segnalazioni', {
      body: data.body || 'Nuova segnalazione ricevuta',
      icon: '/appsegnalazioni/icon-192.png',
      badge: '/appsegnalazioni/icon-192.png',
      vibrate: [200,100,200],
      tag: 'omnia-segnalazione',
      renotify: true,
      data: { url: '/appsegnalazioni/' }
    })
  );
});
