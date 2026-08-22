const { onValueCreated, onValueWritten } = require("firebase-functions/v2/database");
const { onSchedule } = require("firebase-functions/v2/scheduler");
const { onCall, onRequest, HttpsError } = require("firebase-functions/v2/https");
const admin = require("firebase-admin");
const Sentry = require("@sentry/google-cloud-serverless");

Sentry.init({
  dsn: "https://ef8a222e773db61d93b710620e7bf8b4@o4511943579926528.ingest.de.sentry.io/4511944270217296",
  tracesSampleRate: 0,
});

// Manda l'errore a Sentry E ai log di Cloud Functions, e aspetta l'invio
// prima di proseguire — necessario in ambiente serverless, dove il processo
// può terminare prima che la richiesta di rete verso Sentry sia completata.
async function reportError(error, context) {
  console.error(context, error);
  Sentry.captureException(error, { tags: { context } });
  try {
    await Sentry.flush(2000);
  } catch (e) {}
}

admin.initializeApp();

// Etichette leggibili per tipo di segnalazione
const TYPE_LABEL = { emergenza: "EMERGENZA", pericolo: "PERICOLO" };

// Per quanto tempo l'allarme continua a ripetersi (tetto di sicurezza)
const REPEAT_WINDOW_MS = 15 * 60 * 1000; // 15 minuti

// ---- Costruzione del messaggio push (condivisa tra invio iniziale e ripetizioni) ----
function buildMessage(tokens, data, reportId, opts) {
  opts = opts || {};
  const isMinore = !!data.childCase;
  const tipo = TYPE_LABEL[data.type] || "SEGNALAZIONE";
  const sub = data.sub || "";
  const zona = data.zone || "";

  let title = isMinore
    ? "🚨 MINORE SMARRITO"
    : `🚨 ${tipo}` + (sub ? ` — ${sub}` : "");
  // Sulle ripetizioni segnaliamo che è un promemoria ancora aperto
  if (opts.repeat) title = "🔁 ANCORA APERTA · " + title;

  const bodyParts = [];
  if (!isMinore && sub) bodyParts.push(sub);
  if (zona) bodyParts.push("📍 " + zona);
  if (data.notes) bodyParts.push(data.notes);
  const body =
    bodyParts.join(" · ").slice(0, 240) || "Nuova segnalazione ricevuta";

  const isEmergenza = data.type === "emergenza";

  return {
    tokens,
    notification: { title, body },
    data: {
      id: String(reportId || ""),
      type: String(data.type || ""),
      isMinore: isMinore ? "1" : "0",
      repeat: opts.repeat ? "1" : "0",
    },
    android: {
      priority: "high",
      notification: {
        channelId: isEmergenza ? "omnia_emergenze" : "omnia_segnalazioni",
        sound: "default",
        color: isMinore ? "#D81B8C" : "#D62B1F",
        defaultVibrateTimings: false,
        vibrateTimingsMillis: [0, 500, 200, 500, 200, 500],
        // tag diverso ad ogni ripetizione → ogni push fa un nuovo suono invece di sostituire la precedente
        tag: "report_" + reportId + (opts.repeat ? "_r" + Date.now() : ""),
      },
    },
    apns: {
      headers: { "apns-priority": "10" },
      payload: { aps: { sound: "default", badge: 1 } },
    },
    webpush: {
      headers: { Urgency: "high", TTL: "120" },
      notification: {
        icon: "/appsegnalazioni/icon-192-fixed.png",
        badge: "/appsegnalazioni/icon-192-fixed.png",
        requireInteraction: true,
        vibrate: [500, 200, 500, 200, 500],
      },
      fcmOptions: {
        link: "https://omniaturismoroseto.github.io/appsegnalazioni/",
      },
    },
  };
}

// ---- Legge i token operatore abilitati ----
async function getEnabledTokens() {
  const snap = await admin.database().ref("operatorTokens").once("value");
  const obj = snap.val();
  if (!obj) return [];
  return Object.values(obj)
    .filter((row) => row && row.enabled === true && row.token)
    .map((row) => row.token);
}

// ---- Rimuove dal database i token risultati non più validi ----
async function cleanupInvalidTokens(response, tokens) {
  if (!response.failureCount) return;
  const removals = [];
  response.responses.forEach((r, i) => {
    if (!r.success) {
      const code = r.error && r.error.code;
      if (
        code === "messaging/registration-token-not-registered" ||
        code === "messaging/invalid-registration-token" ||
        code === "messaging/invalid-argument"
      ) {
        const key = Buffer.from(tokens[i]).toString("base64url");
        removals.push(admin.database().ref("operatorTokens/" + key).remove());
      }
    }
  });
  if (removals.length) await Promise.allSettled(removals);
}

// ============================================================
// 0) MIRROR PUBBLICO DELLE SEGNALAZIONI (privacy)
//    /reports contiene dati personali (telefono, nome, note, GPS, foto,
//    anche di minori) ed e' leggibile SOLO da operatori/postazioni
//    autenticati (vedi database.rules.json). La mappa dei visitatori
//    pubblici ha pero' bisogno di sapere DOVE ci sono allarmi aperti:
//    questa funzione mantiene una copia ripulita in /reportsPublic con
//    solo type/zone/status — nessun dato personale. E' l'unica cosa che
//    scrive /reportsPublic (i client non possono, vedi le regole), quindi
//    non e' falsificabile piu' di quanto lo sia creare una segnalazione.
// ============================================================
exports.mirrorReportPublic = onValueWritten(
  { ref: "/reports/{id}", region: "europe-west1" },
  async (event) => {
    const pubRef = admin.database().ref("reportsPublic/" + event.params.id);
    const after = event.data.after.val();
    try {
      if (!after) {
        await pubRef.remove();
        return;
      }
      await pubRef.set({
        type: String(after.type || ""),
        zone: String(after.zone || ""),
        status: String(after.status || "aperta"),
      });
    } catch (e) {
      await reportError(e, "mirrorReportPublic");
    }
  }
);

// ============================================================
// 1) PUSH IMMEDIATA alla creazione della segnalazione
// ============================================================
exports.sendPushOnNewReport = onValueCreated(
  { ref: "/reports/{id}", region: "europe-west1" },
  async (event) => {
    const data = event.data.val();
    const reportId = event.params.id;
    if (!data) return null;
    if (data.status && data.status !== "aperta") return null;
    // Gli allarmi rapidi dal pulsante EMERGENZA di postazione NON vanno in broadcast
    // a tutti gli operatori: li notifica solo sendStationEmergency, in modo mirato
    // (2 postazioni a nord, 2 a sud, admin/coordinatore). Restano comunque visibili
    // qui su /reports per lo storico e la dashboard.
    if (data.quickAlert === true) {
      console.log("Segnalazione", reportId, "è un quickAlert di postazione: broadcast saltato di proposito");
      return null;
    }

    try {
      const tokens = await getEnabledTokens();
      if (!tokens.length) {
        console.log("Lista token vuota");
        return null;
      }
      const message = buildMessage(tokens, data, reportId, { repeat: false });
      const response = await admin.messaging().sendEachForMulticast(message);
      console.log("Push iniziale:", response.successCount, "Errori:", response.failureCount);
      await cleanupInvalidTokens(response, tokens);
    } catch (error) {
      await reportError(error, "sendPushOnNewReport");
    }
    return null;
  }
);

// ============================================================
// 2) RIPETIZIONE ogni 30s (per le segnalazioni aperte da < 15 min)
//    La funzione gira ogni minuto e invia DUE raffiche distanziate di 30s.
// ============================================================
exports.repeatOpenAlerts = onSchedule(
  {
    schedule: "* * * * *", // ogni minuto
    region: "europe-west1",
    timeZone: "Europe/Rome",
  },
  async () => {
    let tokens;
    try {
      tokens = await getEnabledTokens();
    } catch (e) {
      await reportError(e, "repeatOpenAlerts:getEnabledTokens");
      return;
    }
    if (!tokens.length) return;

    // Legge tutte le segnalazioni e tiene solo quelle APERTE entro la finestra di 15 min
    const snap = await admin.database().ref("reports").once("value");
    const reports = snap.val() || {};
    const now = Date.now();

    const daRipetere = [];
    for (const [id, r] of Object.entries(reports)) {
      if (!r || r.status !== "aperta") continue;
      if (r.quickAlert === true) continue; // niente broadcast a tutti per gli allarmi rapidi di postazione
      // r.id è il timestamp di creazione (Date.now() lato app); fallback su r.ts
      const creato = Number(r.id) || (r.ts ? new Date(r.ts).getTime() : 0);
      if (!creato) continue;
      const eta = now - creato;
      if (eta >= 0 && eta <= REPEAT_WINDOW_MS) {
        daRipetere.push([id, r]);
      }
    }

    if (!daRipetere.length) return;

    async function inviaRaffica() {
      for (const [id, r] of daRipetere) {
        try {
          const message = buildMessage(tokens, r, id, { repeat: true });
          const resp = await admin.messaging().sendEachForMulticast(message);
          await cleanupInvalidTokens(resp, tokens);
        } catch (e) {
          await reportError(e, "repeatOpenAlerts:inviaRaffica:" + id);
        }
      }
    }

    // Prima raffica subito, seconda dopo 30 secondi → effetto "ogni 30s"
    await inviaRaffica();
    await new Promise((res) => setTimeout(res, 30000));
    await inviaRaffica();

    console.log("Ripetizione inviata per", daRipetere.length, "segnalazioni aperte");
  }
);

// ============================================================
// 3) BANDIERE AUTOMATICHE (Cloud Scheduler, puntuale al minuto)
//    Scrive direttamente su /flags, indipendentemente da qualsiasi dispositivo.
//      • 09:00 ora di Roma → tutte VERDI
//      • 19:00 ora di Roma → tutte ROSSE
//    Le postazioni vanno da P.10 a P.35.
// ============================================================
function buildFlags(color) {
  const flags = {};
  for (let n = 10; n <= 35; n++) flags[String(n)] = color;
  return flags;
}

exports.bandiereVerdi = onSchedule(
  {
    schedule: "0 9 * * *",        // 09:00
    timeZone: "Europe/Rome",      // gestisce automaticamente ora legale/solare
    region: "europe-west1",
  },
  async () => {
    try {
      await admin.database().ref("flags").set(buildFlags("verde"));
      console.log("Bandiere impostate a VERDE (09:00 Roma)");
    } catch (e) {
      await reportError(e, "bandiereVerdi");
    }
  }
);

exports.bandiereRosse = onSchedule(
  {
    schedule: "0 19 * * *",       // 19:00
    timeZone: "Europe/Rome",
    region: "europe-west1",
  },
  async () => {
    try {
      await admin.database().ref("flags").set(buildFlags("rossa"));
      console.log("Bandiere impostate a ROSSO (19:00 Roma)");
    } catch (e) {
      await reportError(e, "bandiereRosse");
    }
  }
);

// Reset "visivo" serale della chat interna: i messaggi NON vengono
// cancellati (restano nello storico completo, vedi il tab chat lato
// dashboard operatore), ma il client nasconde di default quelli precedenti
// a questo momento - cosi' ogni turno riparte con una chat pulita. Subito
// dopo il passaggio a bandiera rossa (fine giornata di servizio).
exports.resetChatSerale = onSchedule(
  {
    schedule: "5 19 * * *",       // 19:05
    timeZone: "Europe/Rome",
    region: "europe-west1",
  },
  async () => {
    try {
      await admin.database().ref("chat/resetAt").set(Date.now());
      console.log("Chat interna: reset visivo serale (19:05 Roma)");
    } catch (e) {
      await reportError(e, "resetChatSerale");
    }
  }
);

// Chat esterna (admin/coordinatore/CP/forze dell'ordine): reset a fine
// giornata (23:59), non alle 19:05 come la chat con le postazioni - orari
// diversi voluti apposta. Per l'admin nessuna delle due si resetta mai
// (vedi chat.js, _visibleMessages: se window.isAdmin ignora del tutto
// questo timestamp).
exports.resetChatEsternaSerale = onSchedule(
  {
    schedule: "59 23 * * *",      // 23:59
    timeZone: "Europe/Rome",
    region: "europe-west1",
  },
  async () => {
    try {
      await admin.database().ref("chatEsterna/resetAt").set(Date.now());
      console.log("Chat esterna: reset visivo serale (23:59 Roma)");
    } catch (e) {
      await reportError(e, "resetChatEsternaSerale");
    }
  }
);

// ============================================================
// 4) DISPOSITIVI DI POSTAZIONE — autenticazione e allarme emergenza mirato
// ============================================================

// Stessa lista di postazioni del client (index.html): fonte unica in
// ../stations-data.js, copiata qui automaticamente ad ogni deploy (vedi
// "predeploy" in firebase.json) — non modificare stations-data.js in questa
// cartella a mano, si perde al prossimo deploy.
const STATIONS = require("./stations-data.js");

// Ordina le postazioni da sud a nord per LATITUDINE REALE (non per numero:
// P.31-35 non sono in sequenza geografica col resto), poi prende fino a 2
// vicine per lato. Se un lato ne ha meno di 2 (o zero), semplicemente non
// include quelle mancanti — nessun avvolgimento (wrap-around).
function stationNeighbors(stationNum) {
  const ordered = STATIONS.slice().sort((a, b) => a.lat - b.lat);
  const idx = ordered.findIndex((s) => String(s.num) === String(stationNum));
  if (idx === -1) return { north: [], south: [] };
  const south = ordered.slice(Math.max(0, idx - 2), idx);
  const north = ordered.slice(idx + 1, idx + 3);
  return { north, south };
}

// ---- Rilascia un custom token Firebase Auth per un dispositivo di postazione ----
// Chiamabile pubblicamente (il dispositivo non ha ancora nessuna sessione), ma
// il token viene emesso SOLO se quel deviceId risulta abilitato per una postazione
// nel pannello admin. Il token porta i claim role:"station" e station:<numero>,
// che le regole del Realtime Database usano per limitare i permessi di scrittura
// alla sola postazione di competenza.
exports.getStationToken = onCall({ region: "europe-west1" }, async (request) => {
  try {
    const deviceId = request.data && request.data.deviceId;
    if (!deviceId || typeof deviceId !== "string") {
      throw new HttpsError("invalid-argument", "deviceId mancante");
    }
    const snap = await admin.database().ref("stationDevices/" + deviceId).once("value");
    const d = snap.val();
    if (!d || d.enabled !== true || !d.station) {
      throw new HttpsError("permission-denied", "Dispositivo non abilitato per nessuna postazione");
    }
    const station = String(d.station);
    const token = await admin.auth().createCustomToken(deviceId, { role: "station", station });
    return { token, station };
  } catch (e) {
    // I rifiuti "attesi" (deviceId mancante/non abilitato) non sono bug: li
    // rilanciamo così come sono, senza inondare Sentry di eventi normali.
    if (!(e instanceof HttpsError)) await reportError(e, "getStationToken");
    throw e;
  }
});

// ---- Allarme EMERGENZA da un pannello di postazione ----
// Scattato dalla scrittura su /stationEmergencies/{id} (solo un dispositivo di
// postazione autenticato con il proprio custom token può scriverci, e solo per
// la propria postazione — vedi database.rules.json). Invia una push mirata SOLO
// alle 2 postazioni più vicine a nord, alle 2 più vicine a sud, e ai contatti
// admin/coordinatore — non a tutti gli operatori (quello lo fa già la segnalazione
// "emergenza" normale creata in parallelo dal client su /reports).
exports.sendStationEmergency = onValueCreated(
  { ref: "/stationEmergencies/{id}", region: "europe-west1" },
  async (event) => {
    const data = event.data.val();
    if (!data || !data.station) return null;

    const { north, south } = stationNeighbors(data.station);
    const targetStations = [...north, ...south].map((s) => String(s.num));

    const devicesSnap = await admin.database().ref("stationDevices").once("value");
    const devices = devicesSnap.val() || {};
    const stationEntries = Object.entries(devices)
      .filter(([, d]) => d && d.enabled && d.pushToken && targetStations.includes(String(d.station)))
      .map(([id, d]) => ({ token: d.pushToken, path: "stationDevices/" + id + "/pushToken" }));

    const contactsSnap = await admin.database().ref("config/emergencyContacts").once("value");
    const contacts = contactsSnap.val() || {};
    const contactEntries = ["admin", "coordinator"]
      .filter((role) => contacts[role] && contacts[role].pushToken)
      .map((role) => ({ token: contacts[role].pushToken, path: "config/emergencyContacts/" + role + "/pushToken" }));

    // Mappa token -> percorso da azzerare se il token risulta morto (dedup: primo percorso trovato)
    const tokenPaths = new Map();
    [...stationEntries, ...contactEntries].forEach((e) => {
      if (!tokenPaths.has(e.token)) tokenPaths.set(e.token, e.path);
    });
    const tokens = [...tokenPaths.keys()];
    if (!tokens.length) {
      console.log("Emergenza P." + data.station + ": nessun destinatario con push attiva trovato");
      return null;
    }

    // Messaggio SOLO DATI (niente campo "notification"): e' l'unico modo per
    // cui Android richiama sempre il nostro codice (onMessageReceived) anche
    // con l'app in background o completamente chiusa - necessario per far
    // suonare l'allarme a schermo intero (vedi OmniaMessagingService.java
    // nel progetto Android). Con un messaggio "notification+data" Android
    // mostrerebbe una notifica di sistema senza mai passare dal nostro
    // codice quando l'app non e' in primo piano.
    const title = "🚨 EMERGENZA — P." + data.station;
    const body = "Allarme immediato dalla postazione P." + data.station + ". Intervieni o coordina i soccorsi.";
    const message = {
      tokens,
      data: {
        type: "station_emergency",
        station: String(data.station),
        title,
        body,
      },
      android: { priority: "high" },
      apns: {
        headers: { "apns-priority": "10", "apns-push-type": "background" },
        payload: { aps: { "content-available": 1 } },
      },
      webpush: {
        headers: { Urgency: "high", TTL: "120" },
        fcmOptions: { link: "https://omniaturismoroseto.github.io/appsegnalazioni/" },
      },
    };

    try {
      const resp = await admin.messaging().sendEachForMulticast(message);
      console.log(
        "Emergenza P." + data.station + " inviata a", resp.successCount,
        "destinatari (" + targetStations.join(",") + " + contatti), falliti:", resp.failureCount
      );
      if (resp.failureCount) {
        const removals = [];
        resp.responses.forEach((r, i) => {
          if (r.success) return;
          const code = r.error && r.error.code;
          if (
            code === "messaging/registration-token-not-registered" ||
            code === "messaging/invalid-registration-token" ||
            code === "messaging/invalid-argument"
          ) {
            const path = tokenPaths.get(tokens[i]);
            if (path) removals.push(admin.database().ref(path).remove());
          }
        });
        if (removals.length) {
          await Promise.allSettled(removals);
          console.log("Token push non validi rimossi:", removals.length);
        }
      }
    } catch (e) {
      await reportError(e, "sendStationEmergency");
    }
    return null;
  }
);

// ============================================================
// 5) PULIZIA FOTO MINORI SCADUTE — server-side, indipendente da qualsiasi
//    dispositivo/operatore connesso (dato sensibile, non può dipendere dal
//    fatto che qualcuno abbia la dashboard aperta in quel momento).
// ============================================================
const CHILD_PHOTO_TTL_MS = 6 * 60 * 60 * 1000; // 6 ore dopo la chiusura del caso

exports.purgeExpiredChildPhotos = onSchedule(
  {
    schedule: "0 * * * *", // ogni ora, al minuto 0
    timeZone: "Europe/Rome",
    region: "europe-west1",
  },
  async () => {
    try {
      const snap = await admin.database().ref("reports").once("value");
      const reports = snap.val() || {};
      const now = Date.now();
      let purged = 0;

      const updates = {};
      for (const [id, r] of Object.entries(reports)) {
        if (!r || !r.childCase || !r.photo || !r.childResolvedAt) continue;
        const closedAt = new Date(r.childResolvedAt).getTime();
        if (!closedAt) continue;
        if (now - closedAt > CHILD_PHOTO_TTL_MS) {
          updates[id + "/photo"] = null;
          purged++;
        }
      }

      if (purged > 0) {
        await admin.database().ref("reports").update(updates);
      }
      console.log("Pulizia foto minori: " + purged + " foto rimosse");
    } catch (e) {
      await reportError(e, "purgeExpiredChildPhotos");
    }
  }
);

// ============================================================
// 6) PUSH PER LA CHAT INTERNA — canale condiviso solo da postazioni,
//    admin e coordinatore (un operatore semplice non la vede piu').
//    A differenza di sendStationEmergency e' una notifica normale (non
//    "solo dati"): non deve far scattare l'allarme a schermo intero, solo
//    avvisare chi non ha l'app aperta.
// ============================================================
async function getAllChatTokens() {
  const [operatorSnap, deviceSnap, contactSnap, userList] = await Promise.all([
    admin.database().ref("operatorTokens").once("value"),
    admin.database().ref("stationDevices").once("value"),
    admin.database().ref("config/emergencyContacts").once("value"),
    admin.auth().listUsers(1000),
  ]);

  // La chat con le postazioni e' riservata a postazioni + admin +
  // coordinatore (vedi anche database.rules.json) - un operatore "semplice"
  // (nessun ruolo speciale) NON la vede piu', ne' CP/forze dell'ordine.
  // operatorTokens non salva il ruolo Firebase vero (solo la stringa fissa
  // "operator", storica - vedi enableOperatorPush), serve incrociare per
  // uid con i claim reali.
  const roleByUid = new Map();
  userList.users.forEach((u) => {
    if (u.customClaims && u.customClaims.role) roleByUid.set(u.uid, u.customClaims.role);
  });
  const allowedOperatorRoles = new Set(["admin", "coordinator"]);

  const tokenPaths = new Map(); // token -> percorso da azzerare se risulta morto

  const operators = operatorSnap.val() || {};
  Object.entries(operators).forEach(([id, row]) => {
    if (!row || row.enabled !== true || !row.token || !row.uid) return;
    if (!allowedOperatorRoles.has(roleByUid.get(row.uid))) return;
    if (!tokenPaths.has(row.token)) {
      tokenPaths.set(row.token, "operatorTokens/" + id); // rimuove l'intero nodo, come cleanupInvalidTokens
    }
  });

  const devices = deviceSnap.val() || {};
  Object.entries(devices).forEach(([id, d]) => {
    if (d && d.enabled && d.pushToken && !tokenPaths.has(d.pushToken)) {
      tokenPaths.set(d.pushToken, "stationDevices/" + id + "/pushToken");
    }
  });

  const contacts = contactSnap.val() || {};
  ["admin", "coordinator"].forEach((role) => {
    const c = contacts[role];
    if (c && c.pushToken && !tokenPaths.has(c.pushToken)) {
      tokenPaths.set(c.pushToken, "config/emergencyContacts/" + role + "/pushToken");
    }
  });

  return tokenPaths;
}

exports.sendChatNotification = onValueCreated(
  { ref: "/chat/messages/{id}", region: "europe-west1" },
  async (event) => {
    const data = event.data.val();
    const isAudio = data && data.type === "audio";
    if (!data || (!data.text && !isAudio)) return null;
    const msgId = event.params.id;

    try {
      const tokenPaths = await getAllChatTokens();
      const tokens = [...tokenPaths.keys()];
      if (!tokens.length) return null;

      const author = String(data.authorLabel || "Chat interna").slice(0, 40);

      // I messaggi vocali (walkie-talkie) vanno "solo dati", MAI come
      // "notification": e' l'unico modo per cui Android riproduce sempre
      // l'audio da solo a volume forte (vedi OmniaMessagingService.java),
      // anche con l'app chiusa. L'audio stesso non entra nel push (troppo
      // grande per il limite FCM di ~4KB): arriva un link a getChatAudio,
      // che lo serve intero cosi' com'e' salvato (vedi sotto).
      const message = isAudio
        ? {
            tokens,
            data: {
              type: "chat_audio",
              msgId: String(msgId),
              authorLabel: author,
              audioUrl:
                "https://europe-west1-app-segnalazioni-omnia-roseto.cloudfunctions.net/getChatAudio?id=" +
                encodeURIComponent(msgId),
            },
            android: { priority: "high" },
            apns: {
              headers: { "apns-priority": "10", "apns-push-type": "background" },
              payload: { aps: { "content-available": 1 } },
            },
            webpush: { headers: { Urgency: "high", TTL: "120" } },
          }
        : {
            tokens,
            notification: { title: "💬 " + author, body: String(data.text || "").slice(0, 150) },
            data: { type: "chat_message" },
            android: {
              priority: "high",
              notification: { channelId: "omnia_chat", sound: "default", tag: "omnia_chat" },
            },
            webpush: {
              headers: { Urgency: "normal", TTL: "120" },
              notification: {
                icon: "/appsegnalazioni/icon-192-fixed.png",
                badge: "/appsegnalazioni/icon-192-fixed.png",
                tag: "omnia_chat",
              },
              fcmOptions: { link: "https://omniaturismoroseto.github.io/appsegnalazioni/" },
            },
          };

      const resp = await admin.messaging().sendEachForMulticast(message);
      if (resp.failureCount) {
        const removals = [];
        resp.responses.forEach((r, i) => {
          if (r.success) return;
          const code = r.error && r.error.code;
          if (
            code === "messaging/registration-token-not-registered" ||
            code === "messaging/invalid-registration-token" ||
            code === "messaging/invalid-argument"
          ) {
            const path = tokenPaths.get(tokens[i]);
            if (path) removals.push(admin.database().ref(path).remove());
          }
        });
        if (removals.length) await Promise.allSettled(removals);
      }
    } catch (e) {
      await reportError(e, "sendChatNotification");
    }
    return null;
  }
);

// ============================================================
// 7) AUDIO DEI MESSAGGI VOCALI PER LA RIPRODUZIONE NATIVA (walkie-talkie)
//    MediaPlayer su Android sa riprodurre direttamente un URL http/https,
//    ma serve un audio/mp3-o-simile "vero" (con Content-Type), non un
//    JSON: questo endpoint decodifica il base64 salvato nel messaggio e
//    restituisce i byte audio cosi' come sono.
//
//    Endpoint SENZA autenticazione (a differenza di /chat/messages, che
//    resta leggibile solo da utenti autenticati): serve un solo messaggio
//    alla volta, il cui id e' una chiave push Firebase (praticamente
//    impossibile da indovinare), e il contenuto sono note vocali operative
//    tra postazioni - non dati sensibili. Scelta deliberata per permettere
//    a MediaPlayer di riprodurlo nativamente senza dover replicare
//    l'autenticazione Firebase (che vive solo lato JS/WebView) in Java.
// ============================================================
exports.getChatAudio = onRequest({ region: "europe-west1", cors: false }, async (req, res) => {
  try {
    const msgId = String(req.query.id || "");
    if (!msgId || !/^[\w-]+$/.test(msgId)) {
      res.status(400).send("id mancante o non valido");
      return;
    }
    const snap = await admin.database().ref("chat/messages/" + msgId).once("value");
    const data = snap.val();
    if (!data || data.type !== "audio" || !data.audioData) {
      res.status(404).send("messaggio vocale non trovato");
      return;
    }
    const m = /^data:([^;]+);base64,(.+)$/.exec(data.audioData);
    if (!m) {
      res.status(500).send("formato audio non valido");
      return;
    }
    const buffer = Buffer.from(m[2], "base64");
    res.set("Content-Type", m[1]);
    res.set("Cache-Control", "private, max-age=86400");
    res.status(200).send(buffer);
  } catch (e) {
    await reportError(e, "getChatAudio");
    res.status(500).send("errore server");
  }
});

// ============================================================
// 7bis) PUSH PER LA CHAT ESTERNA — solo admin/coordinatore/CP/forze
//    dell'ordine, mai postazioni/operatori normali (vedi anche
//    database.rules.json). operatorTokens non salva il ruolo Firebase vero
//    (solo la stringa fissa "operator", storica), serve incrociare per uid
//    con i claim reali - stesso schema di getAllChatTokens ma al contrario:
//    qui si INCLUDONO solo i 4 ruoli ammessi, invece di escluderne due.
// ============================================================
async function getExternalChatTokens() {
  const [operatorSnap, userList] = await Promise.all([
    admin.database().ref("operatorTokens").once("value"),
    admin.auth().listUsers(1000),
  ]);

  const roleByUid = new Map();
  userList.users.forEach((u) => {
    if (u.customClaims && u.customClaims.role) roleByUid.set(u.uid, u.customClaims.role);
  });
  const allowedRoles = new Set(["admin", "coordinator", "cp", "forze_ordine"]);

  const tokenPaths = new Map();
  const operators = operatorSnap.val() || {};
  Object.entries(operators).forEach(([id, row]) => {
    if (!row || row.enabled !== true || !row.token || !row.uid) return;
    if (!allowedRoles.has(roleByUid.get(row.uid))) return;
    if (!tokenPaths.has(row.token)) tokenPaths.set(row.token, "operatorTokens/" + id);
  });
  return tokenPaths;
}

exports.sendChatEsternaNotification = onValueCreated(
  { ref: "/chatEsterna/messages/{id}", region: "europe-west1" },
  async (event) => {
    const data = event.data.val();
    if (!data || !data.text) return null;

    try {
      const tokenPaths = await getExternalChatTokens();
      const tokens = [...tokenPaths.keys()];
      if (!tokens.length) return null;

      const author = String(data.authorLabel || "Chat esterna").slice(0, 60);
      const message = {
        tokens,
        notification: { title: "🌐 " + author, body: String(data.text || "").slice(0, 150) },
        data: { type: "chat_esterna_message" },
        android: {
          priority: "high",
          notification: { channelId: "omnia_chat", sound: "default", tag: "omnia_chat_esterna" },
        },
        webpush: {
          headers: { Urgency: "normal", TTL: "120" },
          notification: {
            icon: "/appsegnalazioni/icon-192-fixed.png",
            badge: "/appsegnalazioni/icon-192-fixed.png",
            tag: "omnia_chat_esterna",
          },
          fcmOptions: { link: "https://omniaturismoroseto.github.io/appsegnalazioni/" },
        },
      };

      const resp = await admin.messaging().sendEachForMulticast(message);
      if (resp.failureCount) {
        const removals = [];
        resp.responses.forEach((r, i) => {
          if (r.success) return;
          const code = r.error && r.error.code;
          if (
            code === "messaging/registration-token-not-registered" ||
            code === "messaging/invalid-registration-token" ||
            code === "messaging/invalid-argument"
          ) {
            const path = tokenPaths.get(tokens[i]);
            if (path) removals.push(admin.database().ref(path).remove());
          }
        });
        if (removals.length) await Promise.allSettled(removals);
      }
    } catch (e) {
      await reportError(e, "sendChatEsternaNotification");
    }
    return null;
  }
);

// ============================================================
// 8) RUOLO ADMIN — gestione account operatori
//
//    Fino ad ora "operatore" era un unico livello: chiunque avesse fatto
//    login (email/password) poteva fare tutto quello che un operatore puo'
//    fare, senza distinzioni. Qui si introduce un vero claim Firebase
//    "role: admin" (oltre a "role: station" gia' esistente per i
//    dispositivi di postazione) e le funzioni per gestirlo.
//
//    Bootstrap del primo admin: dato che promoteToAdmin normalmente
//    richiede di essere gia' admin, se non esiste ANCORA nessun admin nel
//    progetto la richiesta e' permessa a qualunque operatore autenticato
//    (si "auto-promuove" il primo che la usa) - funziona una sola volta,
//    dopo che il primo admin esiste il controllo torna rigido.
// ============================================================

async function _hasAnyAdmin() {
  const list = await admin.auth().listUsers(1000);
  return list.users.some((u) => u.customClaims && u.customClaims.role === "admin");
}

function _requireOperatorAuth(request) {
  if (!request.auth) throw new HttpsError("unauthenticated", "Devi essere autenticato");
  if (request.auth.token.role === "station") {
    throw new HttpsError("permission-denied", "Non disponibile per i dispositivi di postazione");
  }
}

function _requireAdmin(request) {
  _requireOperatorAuth(request);
  if (request.auth.token.role !== "admin") {
    throw new HttpsError("permission-denied", "Solo un admin puo' fare questa operazione");
  }
}

// Ruoli account oltre al normale "operatore" (nessun ruolo speciale, valore
// null/assente). Le funzioni specifiche per ciascuno restano da definire in
// seguito - per ora l'unica differenza attiva e' che CP e forze dell'ordine
// non vedono mai la chat interna, ne' testo ne' vocali (vedi
// database.rules.json e getAllChatTokens qui sotto).
const VALID_ROLES = ["admin", "coordinator", "cp", "forze_ordine"];

exports.promoteToAdmin = onCall({ region: "europe-west1" }, async (request) => {
  _requireOperatorAuth(request);
  const email = String((request.data && request.data.email) || "").trim();
  if (!email) throw new HttpsError("invalid-argument", "Email mancante");

  try {
    const isBootstrap = !(await _hasAnyAdmin());
    if (!isBootstrap && request.auth.token.role !== "admin") {
      throw new HttpsError("permission-denied", "Solo un admin puo' promuovere altri admin");
    }
    const user = await admin.auth().getUserByEmail(email);
    await admin.auth().setCustomUserClaims(user.uid, { ...(user.customClaims || {}), role: "admin" });
    return { ok: true, bootstrap: isBootstrap };
  } catch (e) {
    if (!(e instanceof HttpsError)) await reportError(e, "promoteToAdmin");
    throw e instanceof HttpsError ? e : new HttpsError("internal", "Errore durante la promozione");
  }
});

exports.demoteAdmin = onCall({ region: "europe-west1" }, async (request) => {
  _requireOperatorAuth(request);
  if (request.auth.token.role !== "admin") {
    throw new HttpsError("permission-denied", "Solo un admin puo' rimuovere altri admin");
  }
  const email = String((request.data && request.data.email) || "").trim();
  if (!email) throw new HttpsError("invalid-argument", "Email mancante");
  if (email.toLowerCase() === String(request.auth.token.email || "").toLowerCase()) {
    throw new HttpsError("failed-precondition", "Non puoi rimuovere il ruolo admin a te stesso");
  }

  try {
    const user = await admin.auth().getUserByEmail(email);
    const claims = { ...(user.customClaims || {}) };
    delete claims.role;
    await admin.auth().setCustomUserClaims(user.uid, claims);
    return { ok: true };
  } catch (e) {
    if (!(e instanceof HttpsError)) await reportError(e, "demoteAdmin");
    throw e instanceof HttpsError ? e : new HttpsError("internal", "Errore durante la rimozione");
  }
});

// Cambia il ruolo di un account (o lo riporta a "operatore normale" con
// role:null). Sostituisce demoteAdmin per l'uso quotidiano dal pannello -
// demoteAdmin resta comunque disponibile, usata solo internamente se serve.
exports.setAccountRole = onCall({ region: "europe-west1" }, async (request) => {
  _requireAdmin(request);
  const uid = String((request.data && request.data.uid) || "");
  const role = request.data && request.data.role ? String(request.data.role) : null;
  if (!uid) throw new HttpsError("invalid-argument", "uid mancante");
  if (role && !VALID_ROLES.includes(role)) throw new HttpsError("invalid-argument", "Ruolo non valido");
  if (uid === request.auth.uid && role !== "admin") {
    throw new HttpsError("failed-precondition", "Non puoi rimuovere il ruolo admin a te stesso");
  }

  try {
    const user = await admin.auth().getUser(uid);
    const claims = { ...(user.customClaims || {}) };
    if (role) claims.role = role;
    else delete claims.role;
    await admin.auth().setCustomUserClaims(uid, claims);
    return { ok: true };
  } catch (e) {
    if (!(e instanceof HttpsError)) await reportError(e, "setAccountRole");
    throw e instanceof HttpsError ? e : new HttpsError("internal", "Errore nel cambio ruolo");
  }
});

exports.listOperatorAccounts = onCall({ region: "europe-west1" }, async (request) => {
  _requireAdmin(request);
  try {
    const list = await admin.auth().listUsers(1000);
    return {
      accounts: list.users.map((u) => ({
        uid: u.uid,
        email: u.email,
        role: (u.customClaims && u.customClaims.role) || null,
        createdAt: u.metadata.creationTime,
        lastSignIn: u.metadata.lastSignInTime,
        disabled: u.disabled,
      })),
    };
  } catch (e) {
    await reportError(e, "listOperatorAccounts");
    throw new HttpsError("internal", "Errore nel recupero dell'elenco");
  }
});

exports.createOperatorAccount = onCall({ region: "europe-west1" }, async (request) => {
  _requireAdmin(request);
  const email = String((request.data && request.data.email) || "").trim();
  const password = String((request.data && request.data.password) || "");
  const role = request.data && request.data.role ? String(request.data.role) : null;
  if (!email || !email.includes("@")) throw new HttpsError("invalid-argument", "Email non valida");
  if (password.length < 6) throw new HttpsError("invalid-argument", "Password troppo corta (minimo 6 caratteri)");
  if (role && !VALID_ROLES.includes(role)) throw new HttpsError("invalid-argument", "Ruolo non valido");

  try {
    const user = await admin.auth().createUser({ email, password });
    if (role) await admin.auth().setCustomUserClaims(user.uid, { role });
    return { ok: true, uid: user.uid };
  } catch (e) {
    if (e.code === "auth/email-already-exists") throw new HttpsError("already-exists", "Email gia' registrata");
    await reportError(e, "createOperatorAccount");
    throw new HttpsError("internal", "Errore nella creazione dell'account");
  }
});

exports.deleteOperatorAccount = onCall({ region: "europe-west1" }, async (request) => {
  _requireOperatorAuth(request);
  if (request.auth.token.role !== "admin") {
    throw new HttpsError("permission-denied", "Solo un admin puo' eliminare account");
  }
  const uid = String((request.data && request.data.uid) || "");
  if (!uid) throw new HttpsError("invalid-argument", "uid mancante");
  if (uid === request.auth.uid) throw new HttpsError("failed-precondition", "Non puoi eliminare il tuo stesso account");

  try {
    await admin.auth().deleteUser(uid);
    return { ok: true };
  } catch (e) {
    await reportError(e, "deleteOperatorAccount");
    throw new HttpsError("internal", "Errore nell'eliminazione dell'account");
  }
});
