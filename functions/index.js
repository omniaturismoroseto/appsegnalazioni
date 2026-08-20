const { onValueCreated } = require("firebase-functions/v2/database");
const { onSchedule } = require("firebase-functions/v2/scheduler");
const { onCall, HttpsError } = require("firebase-functions/v2/https");
const admin = require("firebase-admin");

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
        const key = Buffer.from(tokens[i])
          .toString("base64")
          .replace(/\+/g, "-")
          .replace(/\//g, "_")
          .replace(/=+$/g, "");
        removals.push(admin.database().ref("operatorTokens/" + key).remove());
      }
    }
  });
  if (removals.length) await Promise.allSettled(removals);
}

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
      console.error("Errore push iniziale:", error);
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
      console.error("Errore lettura token:", e);
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
          console.error("Errore ripetizione per", id, e);
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
    await admin.database().ref("flags").set(buildFlags("verde"));
    console.log("Bandiere impostate a VERDE (09:00 Roma)");
  }
);

exports.bandiereRosse = onSchedule(
  {
    schedule: "0 19 * * *",       // 19:00
    timeZone: "Europe/Rome",
    region: "europe-west1",
  },
  async () => {
    await admin.database().ref("flags").set(buildFlags("rossa"));
    console.log("Bandiere impostate a ROSSO (19:00 Roma)");
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
    const stationTokens = Object.values(devices)
      .filter((d) => d && d.enabled && d.pushToken && targetStations.includes(String(d.station)))
      .map((d) => d.pushToken);

    const contactsSnap = await admin.database().ref("config/emergencyContacts").once("value");
    const contacts = contactsSnap.val() || {};
    const contactTokens = [contacts.admin, contacts.coordinator]
      .filter((c) => c && c.pushToken)
      .map((c) => c.pushToken);

    const tokens = [...new Set([...stationTokens, ...contactTokens])];
    if (!tokens.length) {
      console.log("Emergenza P." + data.station + ": nessun destinatario con push attiva trovato");
      return null;
    }

    const message = {
      tokens,
      notification: {
        title: "🚨 EMERGENZA — P." + data.station,
        body: "Allarme immediato dalla postazione P." + data.station + ". Intervieni o coordina i soccorsi.",
      },
      data: { type: "station_emergency", station: String(data.station) },
      android: {
        priority: "high",
        notification: {
          channelId: "omnia_emergenze",
          sound: "default",
          color: "#a5140a",
          defaultVibrateTimings: false,
          vibrateTimingsMillis: [0, 500, 200, 500, 200, 500],
          tag: "station_emergency_" + data.station + "_" + Date.now(),
        },
      },
      apns: { headers: { "apns-priority": "10" }, payload: { aps: { sound: "default", badge: 1 } } },
      webpush: {
        headers: { Urgency: "high", TTL: "120" },
        notification: {
          icon: "/appsegnalazioni/icon-192-fixed.png",
          badge: "/appsegnalazioni/icon-192-fixed.png",
          requireInteraction: true,
          vibrate: [500, 200, 500, 200, 500],
        },
        fcmOptions: { link: "https://omniaturismoroseto.github.io/appsegnalazioni/" },
      },
    };

    try {
      const resp = await admin.messaging().sendEachForMulticast(message);
      console.log(
        "Emergenza P." + data.station + " inviata a", resp.successCount,
        "destinatari (" + targetStations.join(",") + " + contatti), falliti:", resp.failureCount
      );
    } catch (e) {
      console.error("Errore invio emergenza postazione:", e);
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
  }
);
