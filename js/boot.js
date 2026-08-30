import { _activateStationMode, registerChrome, registerScreens, render, renderPage, requestGPS, stationDevicesRef } from "./core.js";
import { _resizeMap, initMap, refreshMarkers, renderHeader, renderMapLegend } from "./map.js";
import { _showOnboarding, renderConsigliPage, renderDone, renderForecastPage, renderHome, renderInstallPage, renderLogin, renderMinoreBivio, renderMinoreDone, renderMinoreForm, renderOrdinanzePage, renderPartnerPage, renderSubmit } from "./pages-public.js";
import { renderDashboard } from "./pages-operator.js";
import { fetchMeteoMarine } from "./meteo.js";
import { STATION_APP } from "./core.js";
import { avviaAutoAggiornamento } from "./autoupdate.js";

// Questa e' l'app segnalazioni completa: mappa, pagine pubbliche, dashboard
// operatori. Le dichiara qui, non dentro core.js, cosi' l'app di postazione
// (boot-postazione.js) puo' dichiararne molte meno e non scaricare nemmeno il
// codice di cio' che non usera' mai.
registerChrome({renderHeader,renderMapLegend,refreshMarkers,initMap,resizeMap:_resizeMap});
registerScreens({
  home:renderHome,
  login:renderLogin,
  submit:renderSubmit,
  done:renderDone,
  forecast:renderForecastPage,
  consigli:renderConsigliPage,
  ordinanze:renderOrdinanzePage,
  partner:renderPartnerPage,
  install:renderInstallPage,
  minore:renderMinoreBivio,
  "minore-perso":function(page){renderMinoreForm(page,"perso");},
  "minore-trovato":function(page){renderMinoreForm(page,"trovato");},
  "minore-done":renderMinoreDone,
  dashboard:renderDashboard
});

// Il GPS serve alla mappa e alla postazione piu' vicina: roba dell'app
// pubblica. Un tablet di postazione ha una posizione fissa e nota, e non deve
// vedersi chiedere un permesso che non gli serve.
// Un dispositivo arrivato qui con ?app=postazione sta girando su un APK
// precedente, che carica ancora questa pagina invece di postazione.html: anche
// lui deve poter ricevere gli aggiornamenti senza che qualcuno lo riavvii.
if(STATION_APP)avviaAutoAggiornamento();

setTimeout(function(){try{requestGPS();}catch(e){}},0);
setTimeout(function(){try{_showOnboarding();}catch(e){}},800);


// Tutti i file sono ora caricati: da qui in poi render()/renderPage() possono
// disegnare in sicurezza (vedi la guardia window._appReady in js/core.js).
window._appReady=true;

setTimeout(function(){try{fetchMeteoMarine(false);}catch(e){}},300);

try{
  var _bootDeviceId=null;try{_bootDeviceId=localStorage.getItem("omnia_device_id");}catch(e){}
  if(_bootDeviceId){
    stationDevicesRef.child(_bootDeviceId).once("value").then(function(snap){
      var d=snap.val();
      if(d&&d.enabled&&d.station)_activateStationMode(_bootDeviceId,String(d.station));
      else render(window.currentRole==="operator"?"dashboard":"home");
    }).catch(function(){render(window.currentRole==="operator"?"dashboard":"home");});
  }else{
    render(window.currentRole==="operator" ? "dashboard" : "home");
  }
  // Segna l'avvio riuscito: da qui in poi un errore runtime minore non deve
  // più far sparire l'app dietro una pagina d'errore a piena schermo (vedi
  // il listener "error" globale in cima a index.html).
  try{document.getElementById("page").dataset.appStarted="1";}catch(e){}

  [250,700,1200].forEach(function(t){
    setTimeout(function(){
      _resizeMap();
    }, t);
  });
}catch(e2){
  _sentryCapture(e2);
  document.body.innerHTML='<div style="padding:20px;font-family:sans-serif">'
    +'<h2 style="color:red">Errore render</h2>'
    +'<pre style="background:#f5f5f5;padding:10px;font-size:11px;white-space:pre-wrap">'+e2.toString()+'\n'+e2.stack+'</pre>'
    +'</div>';
}



