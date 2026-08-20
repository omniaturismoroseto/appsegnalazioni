// Configurazione ESLint (flat config, ESLint 9+).
//
// L'app client (js/*.js + stations-data.js) NON usa moduli ES/CommonJS: sono
// semplici <script src> caricati in sequenza in index.html che condividono
// tutti lo stesso scope globale (vedi index.html). Per questo "no-undef" da
// solo non basterebbe: ESLint lint-a un file alla volta e segnalerebbe come
// "non definite" tutte le funzioni/variabili dichiarate in un ALTRO file del
// gruppo. La lista qui sotto elenca ESATTAMENTE i nomi top-level dichiarati
// in uno di quei file (script tag) e usati altrove, cosi' no-undef resta
// attivo per intercettare i VERI refusi (come i bug trovati durante lo split
// in moduli: _showOnboarding, renderHome, stationDevicesRef ecc. richiamati
// prima che il file che li definisce fosse caricato).
//
// Se aggiungi una nuova funzione/variabile top-level in un file js/*.js che
// deve essere richiamabile da un altro file js/*.js, aggiungila qui.
const crossFileGlobals = {
  // core.js
  ALERT_COLORS: "readonly", FLAG_COLORS: "readonly", TYPES: "readonly", ZONES: "readonly",
  CHILD_ESCALATE_MIN: "readonly", CHILD_PHOTO_TTL_MS: "readonly", FCM_VAPID_KEY: "readonly",
  PERMANENT_STATION_NOTES: "readonly", PHONE: "readonly", WA_CHANNEL: "readonly",
  firebaseConfig: "readonly", auth: "writable", fbReady: "writable",
  currentScreen: "writable", currentRole: "writable", stationMode: "writable",
  reportsData: "writable", prevReportKeys: "writable", suppressHistory: "writable",
  activeFilter: "writable", meteoData: "writable",
  reportsRef: "writable", flagsRef: "writable", stationNotesRef: "writable",
  stationDevicesRef: "writable", stationEmergenciesRef: "writable", emergencyContactsRef: "writable",
  _realDb: "writable", _realDbInstance: "writable", _savedAuth: "writable",
  _fcmApp: "writable", _fcmMessaging: "writable", _fcmToken: "writable",
  _gpsWatchId: "writable", _userLat: "writable", _gpsError: "writable",
  _lastChildKey: "writable", _alertCtx: "writable", _alertBanner: "writable",
  _alertInterval: "writable", _alertReportKey: "writable", _child112Banner: "writable",
  _boePopupOpen: "writable", _appReady: "writable",
  _getAuth: "readonly", _getRealDb: "readonly", _getDeviceId: "readonly",
  _activateStationMode: "readonly", _openNoteModal: "readonly", _escapeHtml: "readonly",
  _refreshNotePanel: "readonly", _refreshPending: "readonly", _safeTokenKey: "readonly",
  _onGPSPosition: "readonly", _gpsError_fn: "readonly", requestGPS: "readonly",
  _checkForActiveAlerts: "readonly", _checkServiceOrEmergency: "readonly",
  _openAnnegamentoAlert: "readonly", _emergency112Prompt: "readonly", callEmergency112: "readonly",
  _unlockAudio: "readonly", _playAlertTone: "readonly", _startAlertSound: "readonly", _stopAlertSound: "readonly",
  _ensureStationPushForegroundHandler: "readonly", _handleStationPush: "readonly",
  addReport: "readonly", getReports: "readonly", deleteReport: "readonly", resolveReport: "readonly",
  getFlags: "readonly", setFlag: "readonly", saveFlags: "readonly",
  onNewReport: "readonly", isServiceActive: "readonly", sendWANotify: "readonly",
  render: "writable", renderPage: "readonly", dbg: "readonly",
  fmt: "readonly", fmtHour: "readonly", fmtDist: "readonly", romeNow: "readonly",
  haversine: "readonly", findNearest: "readonly", nearestStation: "writable",
  getMarkerColor: "readonly", resizeImg: "readonly", playBeep: "readonly",
  STATIONS: "writable",
  activeStation: "writable", activeDashTab: "writable",
  mapMarkers: "writable", userMarker: "writable", locamareMarker: "writable",
  nearestDist: "writable", newReportCount: "writable",
  flagsData: "writable", stationNotesData: "writable", stationDevicesData: "writable",
  meteoLoading: "writable", meteoError: "writable", meteoLastFetch: "writable",
  nearestDAEDist: "writable", _userLng: "writable", _userGpsAcc: "writable",
  _registerStationPush: "readonly", _registerContactPush: "readonly",
  enableOperatorPush: "readonly", disableOperatorPush: "readonly",

  // meteo.js
  fetchMeteoMarine: "readonly", renderMeteoCard: "readonly", renderSatelliteCard: "readonly",
  getRiskFromMeteo: "readonly", degToCompass: "readonly", knotsFromKmh: "readonly",
  wmoIcon: "readonly", wIcon: "readonly",

  // map.js
  mapObj: "writable", initMap: "readonly", renderHeader: "readonly", renderMapLegend: "readonly",
  refreshMarkers: "readonly", ensureLocamareMarker: "readonly", findNearestDAE: "readonly", nearestDAE: "writable",
  addCCMarker: "readonly", ccMarker: "writable", CC_POINT: "readonly", CC_B64: "readonly",
  addComuneMarker: "readonly", comuneMarker: "writable", COMUNE_POINT: "readonly", STEMMA_B64: "readonly",
  addGuardiaMedicaMarker: "readonly", guardiaMedicaMarker: "writable", GM_POINT: "readonly", GM_B64: "readonly",
  addPLMarker: "readonly", plMarker: "writable", PL_POINT: "readonly", PL_B64: "readonly",
  addFinanzaMarker: "readonly", finanzaMarker: "writable", FINANZA_POINT: "readonly", FINANZA_B64: "readonly",
  addVVFMarker: "readonly", vvfMarker: "writable", VVF_POINT: "readonly", VVF_B64: "readonly",
  addIATMarker: "readonly", iatMarker: "writable", IAT_POINT: "readonly", IAT_B64: "readonly",
  addRosetanaMarker: "readonly", rosetanaMarker: "writable", ROSETANA_POINT: "readonly", ROSETANA_B64: "readonly",
  addPortoroseMarker: "readonly", portoroseMarker: "writable", PORTOROSE_POINT: "readonly",
  PORTOROSE_B64: "readonly", PORTOROSE_POPUP_B64: "readonly",
  addDAEMarkers: "readonly", daeMarkers: "writable", DAE_POINTS: "readonly", DAE_B64: "readonly",
  addBoeCantiereMarkers: "readonly", boeCantiereMarkers: "writable", BOE_CANTIERE_23_2026: "readonly",
  addZoneVietate: "readonly", zoneVietateMarkers: "writable", ZONE_VIETATE: "readonly",
  addCorridoiLancio: "readonly", _corridoiMarkers: "writable", CORRIDOI_LANCIO: "readonly",
  addLimitLine: "readonly", _limitLines: "writable",
  SPECIAL_POINTS: "readonly", METEO_POINT: "readonly", RED: "readonly",
  _nearestStationNavCard: "readonly",

  // pages-public.js
  _showOnboarding: "readonly", renderHome: "readonly", renderForecastPage: "readonly",
  renderPartnerPage: "readonly", renderOrdinanzePage: "readonly", renderInstallPage: "readonly",
  renderConsigliPage: "readonly", renderLogin: "readonly", _renderDeviceActivation: "readonly",
  renderSubmit: "readonly", renderDone: "readonly", renderMinoreBivio: "readonly",
  renderMinoreForm: "readonly", renderMinoreDone: "readonly", LOGO_SRC: "readonly",

  // pages-operator.js
  renderDashboard: "readonly", renderNote: "readonly", renderDispositivi: "readonly", renderBandiere: "readonly",

  // pages-station.js
  _stationNeighborsClient: "readonly", _sendStationEmergency: "readonly", renderStationPanel: "readonly",
  WA_NOTIFY: "readonly", _purgeExpiredChildPhotos: "readonly",

  // definite inline in index.html (condivise tra i moduli js/*.js)
  firebaseSdk: "readonly", _sentrySetTag: "readonly", _sentryCapture: "readonly", SENTRY_RELEASE: "readonly",
  _requestNotifPermission: "readonly", // window._requestNotifPermission, index.html

  // stations-data.js
  STATIONS_DATA: "readonly",
};

module.exports = [
  {
    ignores: [
      "android-app/**",
      "**/node_modules/**",
      "functions/stations-data.js", // copia generata al deploy, vedi functions/copy-stations.js
    ],
  },
  // App client: index.html carica questi file come <script src> in sequenza,
  // scope globale condiviso (no import/export).
  {
    files: ["js/**/*.js", "stations-data.js"],
    languageOptions: {
      ecmaVersion: 2021,
      sourceType: "script",
      globals: {
        // ambiente browser
        window: "readonly", document: "readonly", console: "readonly",
        navigator: "readonly", localStorage: "readonly", sessionStorage: "readonly",
        fetch: "readonly", setTimeout: "readonly", clearTimeout: "readonly",
        setInterval: "readonly", clearInterval: "readonly", location: "readonly",
        history: "readonly", XMLHttpRequest: "readonly", FormData: "readonly",
        Notification: "readonly", Image: "readonly", alert: "readonly", confirm: "readonly",
        URL: "readonly", crypto: "readonly", requestAnimationFrame: "readonly", btoa: "readonly",
        module: "readonly", // stations-data.js controlla typeof module per doppio uso
        // librerie esterne caricate via <script> in index.html
        L: "readonly", firebase: "readonly", Sentry: "readonly",
        // condivisi tra i file js/*.js (vedi commento sopra)
        ...crossFileGlobals,
      },
    },
    rules: {
      "no-undef": "error",
      "no-unused-vars": ["warn", { args: "none", varsIgnorePattern: "^_" }],
      "no-redeclare": "off", // STATIONS ecc. sono dichiarati "var" e riassegnati tra file per design
      "no-var": "off",
      eqeqeq: "off",
      "no-empty": ["warn", { allowEmptyCatch: true }],
    },
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
      },
    },
    rules: {
      "no-undef": "error",
      "no-unused-vars": ["warn", { args: "none" }],
    },
  },
];
