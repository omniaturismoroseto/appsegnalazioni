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
import { _activateStationMode, registerScreens, render, stationDevicesRef } from "./core.js";
import { renderSegnalaFatto, renderSegnalaPostazione } from "./station-segnala.js";
import { renderProtocolloMinore } from "./station-minore.js";
import { avviaAutoAggiornamento } from "./autoupdate.js";

// La segnalazione della postazione e' una schermata sua, non quella pubblica:
// chi la usa e' un bagnino in servizio, non un bagnante. Da qui in poi questa
// app non importa piu' nulla dalle pagine pubbliche, quindi modificarle non
// puo' romperla.
//
// Il protocollo della persona smarrita e' registrato qui e solo qui: e' una
// procedura di servizio, non ha senso nell'app pubblica.
registerScreens({
  submit: renderSegnalaPostazione,
  "segnala-fatto": renderSegnalaFatto,
  "minore-protocollo": renderProtocolloMinore,
});

window._appReady = true;

// Un tablet di postazione resta acceso tutto il giorno: senza questo
// continuerebbe a far girare la versione con cui e' partito la mattina.
avviaAutoAggiornamento();

/**
 * Se siamo su un dispositivo amministrato, chi siamo ce lo dice il kiosk.
 *
 * L'identificativo generato a caso e salvato nel browser ha un difetto che si
 * paga nel tempo: **non sopravvive a una reinstallazione**. Ogni ripristino del
 * telefono lascia dietro una registrazione morta, con lo stesso numero di
 * postazione di quella viva, e dopo qualche anno di sostituzioni l'elenco dei
 * dispositivi smette di dire la verita'.
 *
 * L'identita' consegnata dal kiosk invece vive nel dispositivo amministrato e
 * resta la stessa. La si copia qui, cosi' tutto il resto dell'app continua a
 * leggerla da dove l'ha sempre letta e non cambia una riga.
 *
 * Su un dispositivo senza kiosk questa funzione non trova niente e si toglie di
 * mezzo in silenzio: un tablet normale, un browser, il telefono di un
 * coordinatore si comportano esattamente come prima.
 */
function _identitaDalKiosk() {
  try {
    var plugin = _componente();
    if (!plugin) { window._omniaLettura = { assente: true }; return Promise.resolve(); }

    // Due secondi e non uno di piu'.
    //
    // Da qui in poi c'e' l'avvio dell'app, e un'attesa senza scadenza
    // significa un pannello di postazione che non si apre mai perche' una
    // lettura di configurazione e' rimasta appesa. Sapere quale postazione
    // siamo e' comodo; avere l'app e' indispensabile.
    var scadenza = new Promise(function (ok) { setTimeout(ok, 2000); });
    return Promise.race([_leggi(plugin), scadenza]);
  } catch (e) {
    return Promise.resolve();
  }
}

/**
 * Trova il componente, per tutte le strade possibili.
 *
 * Capacitor ne offre due, e quale delle due funzioni dipende da come la pagina
 * e' stata caricata. Provarne una sola significa che, se e' quella sbagliata,
 * il dispositivo si comporta come se non fosse amministrato - senza dire niente
 * e senza che nessuno capisca perche'.
 */
function _componente() {
  var C = window.Capacitor;
  if (!C) return null;
  if (C.Plugins && C.Plugins.Gestito) return C.Plugins.Gestito;
  if (typeof C.registerPlugin === "function") {
    try { return C.registerPlugin("Gestito"); } catch (e) { return null; }
  }
  return null;
}

function _leggi(plugin) {
  try {
    return plugin.leggi().then(function (v) {
      window._omniaLettura = v || {};
      if (!v) return;
      if (v.postazione) window._omniaPostazioneGestita = String(v.postazione);
      if (!v.deviceId) return;
      try {
        if (localStorage.getItem("omnia_device_id") !== v.deviceId) {
          localStorage.setItem("omnia_device_id", v.deviceId);
        }
      } catch (e) { /* memoria locale non disponibile */ }
    }).catch(function () { /* nessun amministratore: si prosegue come sempre */ });
  } catch (e) {
    return Promise.resolve();
  }
}

_identitaDalKiosk().then(function () {
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
});
