/* Omnia Segnalazioni — Service Worker PWA
 * Va nella cartella dell'app:
 *   https://omniaturismoroseto.github.io/appsegnalazioni/sw.js
 *
 * Strategia:
 *  • index.html e navigazione → NETWORK-FIRST: scarica sempre la versione aggiornata
 *    se c'è rete, usa la cache solo come riserva offline. Niente più versioni vecchie bloccate.
 *  • altri file (icone, ecc.) → cache con aggiornamento in background.
 *
 * Per forzare un aggiornamento, basta cambiare il numero di versione qui sotto.
 */

const CACHE_VERSION = "omnia-v2026-06-17";
const APP_SHELL = "/appsegnalazioni/index.html";

self.addEventListener("install", function (event) {
  // Attiva subito la nuova versione senza aspettare la chiusura delle schede
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_VERSION).then(function (cache) {
      return cache.add(APP_SHELL).catch(function () {});
    })
  );
});

self.addEventListener("activate", function (event) {
  // Elimina le cache delle versioni precedenti
  event.waitUntil(
    caches.keys().then(function (keys) {
      return Promise.all(
        keys.filter(function (k) { return k !== CACHE_VERSION; })
            .map(function (k) { return caches.delete(k); })
      );
    }).then(function () { return self.clients.claim(); })
  );
});

self.addEventListener("fetch", function (event) {
  const req = event.request;
  if (req.method !== "GET") return;

  const url = new URL(req.url);
  const isNavigation =
    req.mode === "navigate" ||
    url.pathname.endsWith("/") ||
    url.pathname.endsWith("/index.html");

  if (isNavigation) {
    // NETWORK-FIRST: prova la rete, ricadi sulla cache solo se offline
    event.respondWith(
      fetch(req)
        .then(function (res) {
          const copy = res.clone();
          caches.open(CACHE_VERSION).then(function (c) { c.put(APP_SHELL, copy); });
          return res;
        })
        .catch(function () {
          return caches.match(APP_SHELL).then(function (r) {
            return r || caches.match(req);
          });
        })
    );
    return;
  }

  // Altri GET: cache-first con aggiornamento in background (stale-while-revalidate)
  event.respondWith(
    caches.match(req).then(function (cached) {
      const network = fetch(req)
        .then(function (res) {
          if (res && res.status === 200 && res.type === "basic") {
            const copy = res.clone();
            caches.open(CACHE_VERSION).then(function (c) { c.put(req, copy); });
          }
          return res;
        })
        .catch(function () { return cached; });
      return cached || network;
    })
  );
});
