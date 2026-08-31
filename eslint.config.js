// Configurazione ESLint (flat config, ESLint 9+).
//
// js/*.js sono veri moduli ES (import/export, vedi vite.config.js): ESLint
// risolve da solo i riferimenti tra file, non serve piu' nessuna lista
// manuale di nomi condivisi.
//
// public/stations-data.js resta uno script "classico" (caricato via <script
// src> non-module, in stile UMD: sia globale lato client sia require() lato
// Cloud Functions), quindi ha una sezione a parte con sourceType "script".
module.exports = [
  {
    ignores: ["android-app/**", "**/node_modules/**", "dist/**", "functions/stations-data.js"],
  },
  // App client: moduli ES veri.
  {
    files: ["js/**/*.js"],
    languageOptions: {
      ecmaVersion: 2021,
      sourceType: "module",
      globals: {
        window: "readonly", document: "readonly", console: "readonly",
        navigator: "readonly", localStorage: "readonly", sessionStorage: "readonly",
        fetch: "readonly", setTimeout: "readonly", clearTimeout: "readonly",
        setInterval: "readonly", clearInterval: "readonly", location: "readonly",
        history: "readonly", XMLHttpRequest: "readonly", FormData: "readonly",
        Notification: "readonly", Image: "readonly", alert: "readonly", confirm: "readonly", prompt: "readonly",
        URL: "readonly", URLSearchParams: "readonly", crypto: "readonly", requestAnimationFrame: "readonly", btoa: "readonly",
        MediaRecorder: "readonly", Blob: "readonly", FileReader: "readonly", getComputedStyle: "readonly",
        // librerie esterne + roba definita inline in index.html: non fanno parte
        // del grafo di moduli, restano globali veri caricati via <script> classico.
        google: "readonly", firebase: "readonly", Sentry: "readonly",
        firebaseSdk: "readonly", _sentrySetTag: "readonly", _sentryCapture: "readonly",
        SENTRY_RELEASE: "readonly", _requestNotifPermission: "readonly",
        STATIONS_DATA: "readonly", // public/stations-data.js
      },
    },
    rules: {
      "no-undef": "error",
      "no-unused-vars": ["warn", { args: "none", varsIgnorePattern: "^_" }],
      "no-var": "off",
      eqeqeq: "off",
      "no-empty": ["warn", { allowEmptyCatch: true }],
    },
  },
  // stations-data.js: script classico condiviso client/Cloud Functions.
  {
    files: ["public/stations-data.js"],
    languageOptions: {
      ecmaVersion: 2021,
      sourceType: "script",
      globals: { module: "readonly" },
    },
    rules: { "no-undef": "error" },
  },
  // Cloud Functions (Node.js, CommonJS)
  {
    files: ["functions/**/*.js"],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: "commonjs",
      globals: {
        require: "readonly", module: "writable", exports: "writable",
        process: "readonly", console: "readonly", __dirname: "readonly", __filename: "readonly",
        Buffer: "readonly", setTimeout: "readonly", clearTimeout: "readonly",
        setInterval: "readonly", clearInterval: "readonly", global: "readonly",
        // Globali di Node 24 (le funzioni girano su nodejs24): fetch e
        // AbortSignal esistono senza import, ma eslint non lo sa da solo.
        fetch: "readonly", AbortSignal: "readonly",
      },
    },
    rules: {
      "no-undef": "error",
      "no-unused-vars": ["warn", { args: "none" }],
    },
  },
];
