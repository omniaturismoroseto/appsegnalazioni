// Eseguito prima di ogni file di test (vedi test.setupFiles in vite.config.js).
//
// js/core.js fa cose vere all'avvio del modulo (non solo dichiara funzioni):
// inizializza Firebase e registra listener .on() sui suoi ref, chiama
// _sentrySetTag(), legge document/localStorage. In produzione questi nomi
// sono globali veri (SDK caricati via <script> in index.html, vedi
// eslint.config.js). Qui li sostituiamo con finti innocui, cosi' importare
// un modulo qualsiasi dell'app nei test non prova a contattare Firebase o
// Sentry davvero: bastano perche' il modulo si carichi senza eccezioni,
// non simulano un vero database.
function fakeRef() {
  const ref = {
    on: () => {},
    off: () => {},
    once: () => Promise.resolve({ val: () => null }),
    child: () => fakeRef(),
    push: () => ({ key: "fake-key", set: () => Promise.resolve() }),
    set: () => Promise.resolve(),
    update: () => Promise.resolve(),
    limitToLast: () => fakeRef(),
  };
  return ref;
}

globalThis.firebaseSdk = {
  apps: [],
  initializeApp: () => ({}),
  app: () => ({}),
  auth: () => ({
    onAuthStateChanged: () => {},
    signInWithCustomToken: () => Promise.resolve(),
    signOut: () => Promise.resolve(),
  }),
  database: () => ({ ref: fakeRef }),
  messaging: () => ({ onMessage: () => {}, getToken: () => Promise.resolve(null) }),
};
globalThis.firebase = globalThis.firebaseSdk;

globalThis._sentrySetTag = () => {};
globalThis._sentryCapture = () => {};

// Coordinate reali di 3 postazioni (fonte: public/stations-data.js), scelte
// per avere distanze e ordine di vicinanza noti nei test.
globalThis.STATIONS_DATA = [
  { num: 10, name: "Spiaggia Libera tra Orsa Minore e Scirocco", lat: 42.6712, lng: 14.02308 },
  { num: 20, name: "Lido Azzurra", lat: 42.68372, lng: 14.01391 },
  { num: 30, name: "Bora Bora", lat: 42.6963, lng: 14.00378 },
];
