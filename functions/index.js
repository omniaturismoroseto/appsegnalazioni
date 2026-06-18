const { onValueCreated } = require("firebase-functions/v2/database");
const admin = require("firebase-admin");

admin.initializeApp();

// Etichette leggibili per tipo di segnalazione
const TYPE_LABEL = { emergenza: "EMERGENZA", pericolo: "PERICOLO" };

exports.sendPushOnNewReport = onValueCreated(
  {
    ref: "/reports/{id}",
    region: "europe-west1",
  },
  async (event) => {
    const data = event.data.val();
    const reportId = event.params.id;

    if (!data) return null;
    // Notifica solo le segnalazioni aperte
    if (data.status && data.status !== "aperta") return null;

    try {
      const tokensSnapshot = await admin.database().ref("operatorTokens").once("value");
      const tokensObj = tokensSnapshot.val();

      if (!tokensObj) {
        console.log("Nessun token trovato");
        return null;
      }

      const tokens = Object.values(tokensObj)
        .filter((row) => row && row.enabled === true && row.token)
        .map((row) => row.token);

      if (!tokens.length) {
        console.log("Lista token vuota");
        return null;
      }

      // --- Titolo e corpo costruiti dai campi REALI della segnalazione ---
      const isMinore = !!data.childCase;
      const tipo = TYPE_LABEL[data.type] || "SEGNALAZIONE";
      const sub = data.sub || "";
      const zona = data.zone || "";

      const title = isMinore
        ? "🚨 MINORE SMARRITO"
        : `🚨 ${tipo}` + (sub ? ` — ${sub}` : "");

      const bodyParts = [];
      if (!isMinore && sub) bodyParts.push(sub);
      if (zona) bodyParts.push("📍 " + zona);
      if (data.notes) bodyParts.push(data.notes);
      const body =
        bodyParts.join(" · ").slice(0, 240) || "Nuova segnalazione ricevuta";

      const isEmergenza = data.type === "emergenza";

      const message = {
        tokens,
        notification: { title, body },
        data: {
          id: String(reportId || ""),
          type: String(data.type || ""),
          isMinore: isMinore ? "1" : "0",
        },
        // --- ANDROID: priorità alta + canale + suono (fondamentale ad app chiusa) ---
        android: {
          priority: "high",
          notification: {
            channelId: isEmergenza ? "omnia_emergenze" : "omnia_segnalazioni",
            sound: "default",
            color: isMinore ? "#D81B8C" : "#D62B1F",
            defaultVibrateTimings: false,
            vibrateTimingsMillis: [0, 500, 200, 500, 200, 500],
          },
        },
        // --- iPhone: suono e priorità massima ---
        apns: {
          headers: { "apns-priority": "10" },
          payload: { aps: { sound: "default", badge: 1 } },
        },
        // --- Web (PWA su Android/desktop) ---
        webpush: {
          headers: { Urgency: "high", TTL: "600" },
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

      const response = await admin.messaging().sendEachForMulticast(message);
      console.log("Push inviate:", response.successCount, "Errori:", response.failureCount);

      // --- Pulizia automatica dei token non più validi ---
      if (response.failureCount > 0) {
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
        if (removals.length) {
          await Promise.allSettled(removals);
          console.log("Token non validi rimossi:", removals.length);
        }
      }

      return null;
    } catch (error) {
      console.error("Errore push:", error);
      return null;
    }
  }
);
