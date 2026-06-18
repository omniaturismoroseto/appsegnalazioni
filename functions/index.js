const { onValueCreated } = require("firebase-functions/v2/database");
const { onSchedule } = require("firebase-functions/v2/scheduler");
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
