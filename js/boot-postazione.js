// Avvio dell'app dedicata ai dispositivi di postazione.
//
// Qui si dichiara pochissimo, ed e' il punto: importando solo core.js (che a sua
// volta tira dentro il pannello di postazione e la chat) questo pacchetto non
// contiene la mappa, le pagine pubbliche, la dashboard operatori o il meteo -
// oltre 200 KB di codice che un tablet in postazione non esegue mai. Le
// schermate "station" e "attivazione" sono gia' registrate da core.js, perche'
// sono le uniche comuni a entrambe le app.
//
// Niente mappa significa anche niente GPS e niente intestazione: la cornice
// registrata resta quella vuota di core.js, che non fa nulla.
import { _activateStationMode, render, stationDevicesRef } from "./core.js";

window._appReady = true;

try {
  // Il dispositivo si riconosce dall'identificativo salvato in locale. Se il
  // centro operativo lo ha gia' abilitato si apre direttamente il pannello;
  // altrimenti - e in ogni caso di errore - resta la richiesta di attivazione,
  // che e' l'unica altra cosa che questa app sa fare.
  var _bootDeviceId = null;
  try { _bootDeviceId = localStorage.getItem("omnia_device_id"); } catch (e) { /* memoria locale non disponibile */ }

  if (_bootDeviceId) {
    stationDevicesRef.child(_bootDeviceId).once("value").then(function (snap) {
      var d = snap.val();
      if (d && d.enabled && d.station) _activateStationMode(_bootDeviceId, String(d.station));
      else render("attivazione");
    }).catch(function () {
      render("attivazione");
    });
  } else {
    render("attivazione");
  }

  // Da qui in poi un errore runtime minore non deve piu' far sparire l'app
  // dietro la pagina d'errore a piena schermo (vedi il listener "error" in cima
  // alla pagina).
  try { document.getElementById("page").dataset.appStarted = "1"; } catch (e) { /* niente da fare */ }
} catch (e2) {
  _sentryCapture(e2);
  document.body.innerHTML = '<div style="padding:20px;font-family:sans-serif">'
    + '<h2 style="color:red">Errore di avvio</h2>'
    + '<pre style="background:#f5f5f5;padding:10px;font-size:11px;white-space:pre-wrap">' + e2.toString() + '\n' + e2.stack + '</pre>'
    + '</div>';
}
