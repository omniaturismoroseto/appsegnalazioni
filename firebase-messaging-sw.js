/* Omnia Segnalazioni — Service Worker per le notifiche push (FCM)
 * Questo file DEVE stare nella ROOT del percorso dell'app:
 *   https://omniaturismoroseto.github.io/appsegnalazioni/firebase-messaging-sw.js
 * Gestisce i messaggi push quando l'app è chiusa o in secondo piano.
 */

importScripts("https://www.gstatic.com/firebasejs/10.13.2/firebase-app-compat.js");
importScripts("https://www.gstatic.com/firebasejs/10.13.2/firebase-messaging-compat.js");

firebase.initializeApp({
  apiKey: "AIzaSyDcLeex_9o0BqgAs2lEEXTiVYG_zRSiXQA",
  authDomain: "app-segnalazioni-omnia-roseto.firebaseapp.com",
  databaseURL: "https://app-segnalazioni-omnia-roseto-default-rtdb.europe-west1.firebasedatabase.app",
  projectId: "app-segnalazioni-omnia-roseto",
  storageBucket: "app-segnalazioni-omnia-roseto.firebasestorage.app",
  messagingSenderId: "699028105579",
  appId: "1:699028105579:web:cdc0a432083b7fe18d442e",
});

const messaging = firebase.messaging();

// Messaggi ricevuti mentre l'app NON è in primo piano
messaging.onBackgroundMessage(function (payload) {
  const n = payload.notification || {};
  const d = payload.data || {};
  const title = n.title || "🚨 Omnia — Nuova segnalazione";
  const options = {
    body: n.body || "",
    icon: "https://omniaturismoroseto.github.io/appsegnalazioni/icon-192.png",
    badge: "https://omniaturismoroseto.github.io/appsegnalazioni/icon-192.png",
    tag: d.reportId ? "report_" + d.reportId : "omnia_report",
    requireInteraction: d.type === "emergenza",
    vibrate: [200, 100, 200, 100, 200],
    data: { url: d.url || "https://omniaturismoroseto.github.io/appsegnalazioni/" },
  };
  return self.registration.showNotification(title, options);
});

// Tocco sulla notifica: porta l'operatore all'app (o la mette in primo piano)
self.addEventListener("notificationclick", function (event) {
  event.notification.close();
  const url =
    (event.notification.data && event.notification.data.url) ||
    "https://omniaturismoroseto.github.io/appsegnalazioni/";
  event.waitUntil(
    clients.matchAll({ type: "window", includeUncontrolled: true }).then(function (list) {
      for (const c of list) {
        if (c.url.indexOf("/appsegnalazioni") !== -1 && "focus" in c) return c.focus();
      }
      if (clients.openWindow) return clients.openWindow(url);
    })
  );
});
