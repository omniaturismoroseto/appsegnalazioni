const { onValueCreated } = require("firebase-functions/v2/database");
const admin = require("firebase-admin");

admin.initializeApp();

exports.sendPushOnNewReport = onValueCreated(
  {
    ref: "/reports/{id}",
    region: "europe-west1",
  },
  async (event) => {
    const data = event.data.val();
    const reportId = event.params.id;

    if (!data) return null;

    try {
      const tokensSnapshot = await admin.database().ref("tokens").once("value");
      const tokensObj = tokensSnapshot.val();

      if (!tokensObj) {
        console.log("Nessun token trovato");
        return null;
      }

      const tokens = Object.values(tokensObj).filter(Boolean);

      if (!tokens.length) {
        console.log("Lista token vuota");
        return null;
      }

      const message = {
        tokens,
        notification: {
          title: "🚨 Nuova segnalazione",
          body: data.testo || "Nuova segnalazione ricevuta",
        },
        data: {
          id: String(reportId || ""),
        },
        webpush: {
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

      return null;
    } catch (error) {
      console.error("Errore push:", error);
      return null;
    }
  }
);
