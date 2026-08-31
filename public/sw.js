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

const CACHE_VERSION = "omnia-v2026-08-31a";
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

  // Passano dal service worker solo le richieste della nostra origine. Quelle
  // verso Google Maps, Firebase o i CDN non finivano comunque in cache (il
  // filtro res.type === "basic" piu' sotto scarta le risposte cross-origin):
  // intercettarle aggiungeva soltanto un punto di rottura in piu' davanti al
  // caricamento dei moduli della mappa.
  if (url.origin !== self.location.origin) return;

  // Anche una pagina .html richiesta via fetch (non solo una navigazione vera)
  // va presa dalla rete: e' cosi' che l'app di postazione si accorge di essere
  // rimasta indietro, e da una copia in cache non lo scoprirebbe mai.
  const isNavigation =
    req.mode === "navigate" ||
    url.pathname.endsWith("/") ||
    url.pathname.endsWith(".html");

  if (isNavigation) {
    // NETWORK-FIRST: prova la rete forzando il bypass della cache HTTP del
    // browser (altrimenti anche un fetch "di rete" può restituire una risposta
    // salvata lì sotto), ricadi sulla cache solo se offline.
    //
    // Ogni pagina si salva sotto il proprio indirizzo: le pagine sono due
    // (index.html per l'app segnalazioni, postazione.html per i dispositivi di
    // postazione) e con una chiave sola l'ultima visitata soppiantava l'altra,
    // servendo offline l'app sbagliata.
    event.respondWith(
      fetch(req, { cache: "no-store" })
        .then(function (res) {
          const copy = res.clone();
          caches.open(CACHE_VERSION).then(function (c) { c.put(req, copy); });
          return res;
        })
        .catch(function () {
          return caches.match(req).then(function (r) {
            return r || caches.match(APP_SHELL);
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
        // Senza il fallback finale respondWith() riceverebbe undefined e il
        // browser mostrerebbe un errore di rete generico al posto della richiesta.
        .catch(function () { return cached || Response.error(); });
      return cached || network;
    })
  );
});
