importScripts("https://www.gstatic.com/firebasejs/10.13.2/firebase-app-compat.js");
importScripts("https://www.gstatic.com/firebasejs/10.13.2/firebase-messaging-compat.js");

firebase.initializeApp({
  apiKey: "AIzaSyDcLeex_9o0BqgAs2lEEXTiVYG_zRSiXQA",
  authDomain: "app-segnalazioni-omnia-roseto.firebaseapp.com",
  databaseURL: "https://app-segnalazioni-omnia-roseto-default-rtdb.europe-west1.firebasedatabase.app",
  projectId: "app-segnalazioni-omnia-roseto",
  storageBucket: "app-segnalazioni-omnia-roseto.firebasestorage.app",
  messagingSenderId: "699028105579",
  appId: "1:699028105579:web:cdc0a432083b7fe18d442e"
});

const messaging = firebase.messaging();

messaging.onBackgroundMessage((payload) => {
  const data = payload.data || {};

  const title = data.title || "🚨 Omnia – Nuova segnalazione";
  const options = {
    body: data.body || "Apri la dashboard operatore",
    icon: "/appsegnalazioni/icon-192-fixed.png",
    badge: "/appsegnalazioni/icon-192-fixed.png",
    vibrate: [500, 200, 500, 200, 500],
    tag: data.tag || "omnia-alert",
    renotify: true,
    requireInteraction: true,
    data: {
      url: data.url || "/appsegnalazioni/?screen=dashboard",
      reportId: data.reportId || ""
    }
  };

  self.registration.showNotification(title, options);
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();

  const targetUrl =
    (event.notification.data && event.notification.data.url) ||
    "/appsegnalazioni/?screen=dashboard";

  event.waitUntil(
    clients.matchAll({ type: "window", includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if ("focus" in client) {
          try {
            client.navigate(targetUrl);
          } catch (e) {}
          return client.focus();
        }
      }
      if (clients.openWindow) {
        return clients.openWindow(targetUrl);
      }
    })
  );
});
