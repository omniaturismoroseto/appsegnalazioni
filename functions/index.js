const { onValueCreated } = require("firebase-functions/v2/database");
const admin = require("firebase-admin");

admin.initializeApp();

exports.notifyOperatorsOnNewReport = onValueCreated(
  {
    ref: "/reports/{reportId}",
    region: "europe-west1"
  },
  async (event) => {
    const report = event.data.val();
    const reportId = event.params.reportId;

    if (!report) return;

    const tokenSnap = await admin.database().ref("operatorTokens").once("value");
    const tokenMap = tokenSnap.val() || {};

    const tokens = Object.values(tokenMap)
      .filter(x => x && x.enabled === true && x.token)
      .map(x => x.token);

    if (!tokens.length) {
      console.log("Nessun token attivo");
      return;
    }

    const type = (report.type || "").toLowerCase();
    const sub = report.sub || "Nuova segnalazione";
    const zone = report.zone || "Zona non indicata";

    const title =
      type === "emergenza"
        ? "🚨 EMERGENZA"
        : type === "pericolo"
        ? "⚠️ PERICOLO"
        : "📣 Nuova segnalazione";

    const body = `${sub} — ${zone}`;

    const message = {
      tokens,
      data: {
        title,
        body,
        reportId,
        tag: `report-${reportId}`,
        url: `/appsegnalazioni/?screen=dashboard&report=${reportId}`
      },
      webpush: {
        headers: {
          Urgency: "high"
        },
        notification: {
          requireInteraction: true,
          vibrate: [500, 200, 500, 200, 500],
          icon: "/appsegnalazioni/icon-192-fixed.png",
          badge: "/appsegnalazioni/icon-192-fixed.png",
          tag: `report-${reportId}`,
          renotify: true
        },
        fcmOptions: {
          link: `https://omniaturismoroseto.github.io/appsegnalazioni/?screen=dashboard&report=${reportId}`
        }
      }
    };

    const response = await admin.messaging().sendEachForMulticast(message);
    console.log("Inviate:", response.successCount, "Errori:", response.failureCount);
  }
);
