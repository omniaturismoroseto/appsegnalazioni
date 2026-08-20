
// Tutti i file sono ora caricati: da qui in poi render()/renderPage() possono
// disegnare in sicurezza (vedi la guardia _appReady in js/core.js).
_appReady=true;

setTimeout(function(){try{fetchMeteoMarine(false);}catch(e){}},300);

try{
  var _bootDeviceId=null;try{_bootDeviceId=localStorage.getItem("omnia_device_id");}catch(e){}
  if(_bootDeviceId){
    stationDevicesRef.child(_bootDeviceId).once("value").then(function(snap){
      var d=snap.val();
      if(d&&d.enabled&&d.station)_activateStationMode(_bootDeviceId,String(d.station));
      else render(currentRole==="operator"?"dashboard":"home");
    }).catch(function(){render(currentRole==="operator"?"dashboard":"home");});
  }else{
    render(currentRole==="operator" ? "dashboard" : "home");
  }
  // Segna l'avvio riuscito: da qui in poi un errore runtime minore non deve
  // più far sparire l'app dietro una pagina d'errore a piena schermo (vedi
  // il listener "error" globale in cima a index.html).
  try{document.getElementById("page").dataset.appStarted="1";}catch(e){}

  [250,700,1200].forEach(function(t){
    setTimeout(function(){
      if(mapObj) mapObj.invalidateSize(true);
    }, t);
  });
}catch(e2){
  _sentryCapture(e2);
  document.body.innerHTML='<div style="padding:20px;font-family:sans-serif">'
    +'<h2 style="color:red">Errore render</h2>'
    +'<pre style="background:#f5f5f5;padding:10px;font-size:11px;white-space:pre-wrap">'+e2.toString()+'\n'+e2.stack+'</pre>'
    +'</div>';
}



