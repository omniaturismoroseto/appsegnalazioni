import { STATION_APP, ALERT_COLORS, BOE_CANTIERE_23_2026, CC_POINT, COMUNE_POINT, DAE_POINTS, FINANZA_POINT, FLAG_COLORS, GM_POINT, IAT_POINT, PERMANENT_STATION_NOTES, PL_POINT, PORTOROSE_POINT, ROSETANA_POINT, STATIONS, VVF_POINT, ZONE_VIETATE, _escapeHtml, _syncUserMarker, boeCantiereMarkers, flagsData, fmtDist, haversine, nearestDAE, nearestDist, nearestStation, render, stationMode, stationNotesData, userMarker } from "./core.js";

// PRIMA DI PUBBLICARE: sostituisci con il Map ID creato in Google Cloud Console
// (Google Maps Platform > Map Management) con le Advanced Markers abilitate.
export const GOOGLE_MAPS_MAP_ID = "cbaae1ae9ce4c3d9f9d0f882";

// La costa di Roseto corre da nord-ovest a sud-est: con il nord in alto il
// litorale attraversa lo schermo in diagonale e nella mappa (alta 38vh sul
// telefono, vedi css/app.css) entrano cinque o sei postazioni. Ruotando la
// mappa di questo angolo la costa diventa orizzontale e sfrutta il lato lungo
// dello schermo: ci stanno quasi tutte le postazioni dalla 10 alla 33.
// 61 gradi e' la direzione del mare (perpendicolare alla costa) calcolata sul
// tratto continuo P.34 -> P.33 di public/stations-data.js: con questo heading
// il mare finisce in alto e la spiaggia in basso. Se le postazioni si
// spostano, ricalcola la rotta P.34 -> P.33 e sottrai 90.
export const COAST_HEADING = 61;
const HEADING_PREF_KEY = "omnia_map_heading";
// La costa orizzontale e' la vista normale dell'app: si apre cosi' senza che
// nessuno debba premere niente. Il nord in alto resta a un tocco di distanza,
// ma solo per chi lo chiede: vale quindi unicamente la scelta esplicita
// salvata, non l'assenza di scelta.
function _savedHeadingMode(){
  try{return localStorage.getItem(HEADING_PREF_KEY)==="north"?"north":"coast";}catch(e){return "coast";}
}
function _saveHeadingMode(mode){
  try{localStorage.setItem(HEADING_PREF_KEY,mode);}catch(e){/* memoria locale non disponibile */}
}

export function renderHeader(){
  const hdr=document.getElementById("hdr");hdr.innerHTML="";
  if(stationMode){hdr.style.display="none";return;}
  hdr.style.display="";
  const logoWrap=document.createElement("div");logoWrap.className="header-logo";
  logoWrap.addEventListener("click",()=>render("home"));
  var logoImg=document.createElement("img");
  logoImg.src="logo.png";
  logoImg.alt="OMNIA";
  logoImg.style.cssText="display:block;height:54px;width:auto;max-width:min(70vw,520px);object-fit:contain";
  logoImg.onerror=function(){
    this.onerror=null;
    this.outerHTML='<div><div style="font-size:22px;font-weight:900;color:white;letter-spacing:.04em;line-height:1">OMNIA</div><div style="font-size:7.5px;color:rgba(255,255,255,.8);letter-spacing:.07em;margin-top:1px">ADRIATIC SAFETY LIFEGUARD</div></div>';
  };
  logoWrap.appendChild(logoImg);hdr.appendChild(logoWrap);
  const btns=document.createElement("div");btns.className="header-btns";
  const sd=document.createElement("span");sd.className="sync-dot"+(window.fbReady?"":" off");sd.title=window.fbReady?"Sync Firebase attivo":"Connessione...";
  btns.appendChild(sd);

  const opWrap=document.createElement("div");opWrap.className="hbtn-wrap";
  const op=document.createElement("button");op.className="hbtn-op";
  if(window.currentRole==="operator"){
  op.textContent="🔓";
  op.title="Dashboard operatori";
  op.addEventListener("click",()=>render("dashboard"));
}else{
  op.textContent="🔐";
  op.title="Area Operatori";
  op.addEventListener("click",()=>render("login"));
}
  opWrap.appendChild(op);
  if(window.currentRole==="operator"&&window.newReportCount>0){
    const nb=document.createElement("span");nb.className="notif-badge";nb.textContent=window.newReportCount;opWrap.appendChild(nb);
  }
  if(!STATION_APP)btns.appendChild(opWrap);
  hdr.appendChild(btns);
}

// ============ HELPERS GOOGLE MAPS ============

// Costruisce un nodo DOM da una stringa HTML (richiesto da AdvancedMarkerElement.content)
function _el(html){
  var d=document.createElement("div");
  d.innerHTML=html.trim();
  return d.firstElementChild;
}
function _removeMarker(m){
  try{if(m)m.map=null;}catch(e){}
}
// Un'unica InfoWindow condivisa per i popup "a click" (postazioni, DAE, POI, zone
// vietate, corridoi): riproduce il comportamento di default di Leaflet, che chiude
// automaticamente il popup precedente quando se ne apre uno nuovo.
function _getSharedInfoWindow(){
  if(!window._sharedInfoWindow){
    window._sharedInfoWindow=new google.maps.InfoWindow();
    window._sharedInfoWindow.addListener("closeclick",function(){
      window._anyPopupOpen=false;
      if(window._refreshPending){setTimeout(function(){refreshMarkers();},50);}
    });
  }
  return window._sharedInfoWindow;
}
function _openSharedPopup(marker,html,maxWidth){
  var iw=_getSharedInfoWindow();
  iw.setContent(html);
  if(maxWidth)iw.setOptions({maxWidth:maxWidth});
  iw.open({map:window.mapObj,anchor:marker});
  window._anyPopupOpen=true;
}
function _openSharedPopupAt(latLng,html,maxWidth){
  var iw=_getSharedInfoWindow();
  iw.setContent(html);
  if(maxWidth)iw.setOptions({maxWidth:maxWidth});
  iw.setPosition(latLng);
  iw.open({map:window.mapObj});
  window._anyPopupOpen=true;
}
// Tooltip "al passaggio del mouse" (corridoi di lancio, limite 300mt) senza
// pulsante di chiusura, equivalente al bindTooltip di Leaflet.
function _getHoverInfoWindow(){
  if(!window._hoverInfoWindow){
    window._hoverInfoWindow=new google.maps.InfoWindow({disableAutoPan:true,headerDisabled:true});
  }
  return window._hoverInfoWindow;
}
function _bindHoverTooltip(line,html){
  line.addListener("mouseover",function(e){
    var iw=_getHoverInfoWindow();iw.setContent(html);iw.setPosition(e.latLng);iw.open({map:window.mapObj});
  });
  line.addListener("mousemove",function(e){
    _getHoverInfoWindow().setPosition(e.latLng);
  });
  line.addListener("mouseout",function(){
    _getHoverInfoWindow().close();
  });
}
// Simbolo ripetuto lungo una polyline per ottenere l'effetto tratteggiato
// (Google Maps non supporta un dashArray diretto come Leaflet).
function _dashIcon(scale){
  return {path:"M 0,-1 0,1",strokeOpacity:1,scale:scale||3};
}
export function _resizeMap(){
  if(!window.mapObj)return;
  try{google.maps.event.trigger(window.mapObj,"resize");}catch(e){}
}

// Le librerie Google Maps ("maps", "marker") non arrivano con il primo script:
// l'API scarica al volo altri moduli da maps.googleapis.com. Su rete mobile
// ballerina (i bagnini sono in spiaggia) basta una richiesta persa perche'
// importLibrary fallisca con Error: Could not load "map" — visto in produzione
// il 2026-08-26. Ritentiamo un paio di volte prima di arrenderci: il modulo
// mancante di solito arriva al secondo tentativo.
async function _loadMapsLibraries(){
  var lastErr;
  for(var i=0;i<3;i++){
    try{
      const lib=await google.maps.importLibrary("maps");
      await google.maps.importLibrary("marker");
      return lib.Map;
    }catch(err){
      lastErr=err;
      if(i<2)await new Promise(function(r){setTimeout(r,800*(i+1));});
    }
  }
  throw lastErr;
}
// Se anche i tentativi falliscono, meglio un messaggio con un pulsante
// "Riprova" che un rettangolo grigio muto al posto della mappa.
function _showMapError(el){
  if(!el||document.getElementById("map-error"))return;
  if(getComputedStyle(el).position==="static")el.style.position="relative";
  var box=document.createElement("div");
  box.id="map-error";
  box.style.cssText="position:absolute;inset:0;display:flex;flex-direction:column;"
    +"align-items:center;justify-content:center;gap:10px;padding:16px;text-align:center;"
    +"background:#e8e8e8;color:#333;font-size:13px;line-height:1.4;z-index:6";
  var txt=document.createElement("div");
  txt.innerHTML="<b>Mappa non caricata</b><br>Connessione assente o instabile.";
  var btn=document.createElement("button");
  btn.type="button";
  btn.textContent="Riprova";
  btn.style.cssText="padding:8px 18px;border:0;border-radius:6px;background:#D62B1F;"
    +"color:#fff;font-size:13px;font-weight:700;cursor:pointer";
  btn.addEventListener("click",function(){_hideMapError();initMap();});
  box.appendChild(txt);box.appendChild(btn);
  el.appendChild(box);
}
function _hideMapError(){
  var b=document.getElementById("map-error");
  if(b&&b.parentNode)b.parentNode.removeChild(b);
}

// MAPPA
export async function initMap(){
  var el=document.getElementById("main-map");
  if(!el)return;
  if(window.mapObj){ensureLocamareMarker();refreshMarkers();_resizeMap();return;}
  if(window._mapInitializing)return;
  window._mapInitializing=true;
  _hideMapError();
  try{
    const Map=await _loadMapsLibraries();
    el.style.width="100%";
    window.mapObj=new Map(el,{
      center:{lat:42.686,lng:14.010},
      zoom:13,
      heading:_savedHeadingMode()==="coast"?COAST_HEADING:0,
      mapId:GOOGLE_MAPS_MAP_ID,
      mapTypeId:"hybrid",
      streetViewControl:false,
      mapTypeControl:false,
      fullscreenControl:false,
      zoomControl:true,
      // Appena la mappa e' ruotata Google mostra il suo comando bussola/inclinazione,
      // che sul telefono cade proprio sopra la fila delle postazioni. La rotazione
      // la governa il pulsante 🧭 qui sotto, quindi il comando non serve.
      cameraControl:false,
      clickableIcons:false
    });
    // Il controllo nativo Mappa/Satellite di Google non viene disegnato sulle
    // mappe vettoriali (quelle con mapId, necessarie per gli Advanced Markers):
    // l'opzione mapTypeControl viene accettata ma ignorata silenziosamente,
    // quindi ricreiamo un pulsante equivalente a mano.
    addMapTypeToggle();
    addHeadingToggle();
    ensureLocamareMarker();
    addCCMarker();
    addPLMarker();
    addFinanzaMarker();
    addVVFMarker();
    addGuardiaMedicaMarker();
    addComuneMarker();
    addIATMarker();
    addRosetanaMarker();
    addPortoroseMarker();
    addZoneVietate();
    addDAEMarkers();
    refreshMarkers();
    _syncUserMarker();
    google.maps.event.addListenerOnce(window.mapObj,"idle",function(){
      [50,250,700].forEach(function(t){setTimeout(function(){_resizeMap();},t);});
    });
  }catch(err){
    // initMap viene chiamata senza await (core.js): senza questo catch un
    // errore diventerebbe solo una promise rejection non gestita, con la
    // mappa grigia e nessuna spiegazione per chi guarda lo schermo.
    _sentryCapture(err);
    _showMapError(el);
  }finally{
    window._mapInitializing=false;
  }
}
function addMapTypeToggle(){
  if(!window.mapObj||window._mapTypeToggleBtn)return;
  var el=document.getElementById("main-map");
  if(!el)return;
  if(getComputedStyle(el).position==="static")el.style.position="relative";
  var btn=document.createElement("button");
  btn.type="button";
  btn.style.cssText="position:absolute;top:10px;right:10px;z-index:5;padding:8px 14px;"
    +"background:#fff;border:0;border-radius:3px;box-shadow:0 1px 4px -1px rgba(0,0,0,.5);"
    +"font-family:Roboto,Arial,sans-serif;font-size:13px;font-weight:600;color:#1a1a1a;cursor:pointer;";
  function label(){return window.mapObj.getMapTypeId()==="hybrid" ? "🗺️ Mappa" : "🛰️ Satellite";}
  btn.textContent=label();
  btn.addEventListener("click",function(){
    window.mapObj.setMapTypeId(window.mapObj.getMapTypeId()==="hybrid" ? "roadmap" : "hybrid");
    btn.textContent=label();
  });
  el.appendChild(btn);
  window._mapTypeToggleBtn=btn;
}
// Alterna nord-in-alto e costa-in-orizzontale. La rotazione (heading) esiste
// solo sulle mappe vettoriali: se il mapId venisse ricreato come raster,
// setHeading verrebbe ignorato in silenzio, quindi il pulsante si nasconde da
// solo invece di restare li' a non fare niente.
function addHeadingToggle(){
  if(!window.mapObj||window._headingToggleBtn)return;
  var el=document.getElementById("main-map");
  if(!el)return;
  if(getComputedStyle(el).position==="static")el.style.position="relative";
  var btn=document.createElement("button");
  btn.type="button";
  btn.style.cssText="position:absolute;top:52px;right:10px;z-index:5;padding:8px 14px;"
    +"background:#fff;border:0;border-radius:3px;box-shadow:0 1px 4px -1px rgba(0,0,0,.5);"
    +"font-family:Roboto,Arial,sans-serif;font-size:13px;font-weight:600;color:#1a1a1a;cursor:pointer;";
  function isCoast(){return Math.round(window.mapObj.getHeading()||0)!==0;}
  function sync(){
    btn.textContent=isCoast()?"🧭 Nord":"🧭 Costa";
    btn.title=isCoast()?"Rimetti il nord in alto":"Gira la mappa con la costa in orizzontale";
  }
  sync();
  btn.addEventListener("click",function(){
    var coast=!isCoast();
    window.mapObj.setHeading(coast?COAST_HEADING:0);
    _saveHeadingMode(coast?"coast":"north");
    sync();
  });
  el.appendChild(btn);
  window._headingToggleBtn=btn;
  function checkSupport(){
    var rt=window.mapObj.getRenderingType&&window.mapObj.getRenderingType();
    if(!rt||rt==="UNINITIALIZED")return;
    if(rt!=="VECTOR"){
      btn.style.display="none";
      if(window.mapObj.getHeading())window.mapObj.setHeading(0);
    }
  }
  checkSupport();
  try{window.mapObj.addListener("renderingtype_changed",checkSupport);}catch(e){}
}
// Fonte delle segnalazioni per la mappa: un operatore/postazione autenticato
// vede i dati completi (window.reportsData), un visitatore pubblico la copia
// ripulita (window.reportsPublicData, solo type/zone/status) — vedi core.js e
// database.rules.json. Alla mappa servono comunque solo type/zone/status.
function _mapReportsData(){
  return (window.currentRole==="operator"||stationMode)
    ? (window.reportsData||{})
    : (window.reportsPublicData||{});
}
export function getMarkerColor(s){
  const open=Object.values(_mapReportsData()).filter(r=>r.status==="aperta");
  const zl=`P.${s.num} – ${s.name}`;
  const zr=open.filter(r=>r.zone===zl);
  const flagColor=FLAG_COLORS[flagsData[s.num]||"verde"];
  if(zr.some(r=>r.type==="emergenza"))return{bg:flagColor,ring:true,ringColor:ALERT_COLORS.emergenza};
  if(zr.some(r=>r.type==="pericolo"))return{bg:flagColor,ring:true,ringColor:ALERT_COLORS.pericolo};
  if(stationNotesData[String(s.num)])return{bg:flagColor,ring:true,ringColor:"#1a1a1a",note:stationNotesData[String(s.num)]};
  return{bg:flagColor,ring:false,flag:flagsData[s.num]||"verde"};
}
export function refreshMarkers(){
  if(!window.mapObj)return;
  // Se un popup è aperto non distruggere i marker - aggiornali al momento della chiusura
  if(window._anyPopupOpen){window._refreshPending=true;return;}
  window._refreshPending=false;
  window.mapMarkers.forEach(function(m){_removeMarker(m);});
  window.mapMarkers=[];
  const open=Object.values(_mapReportsData()).filter(r=>r.status==="aperta");
  STATIONS.forEach(s=>{
    const zl=`P.${s.num} – ${s.name}`;
    const zr=open.filter(r=>r.zone===zl);
    const mc=getMarkerColor(s);
    const isNearest=nearestStation&&nearestStation.num===s.num;
    const shadow=mc.ring?`box-shadow:0 0 0 3px ${mc.ringColor||mc.bg},0 0 0 5px white;`:`box-shadow:0 1px 4px rgba(0,0,0,.4);`;
    const nearRing=isNearest?`outline:3px solid #1d4ed8;outline-offset:2px;`:"";
    const content=_el(`<div style="width:26px;height:26px;border-radius:50%;background:${mc.bg};border:2.5px solid white;color:white;font-size:8.5px;font-weight:700;line-height:21px;text-align:center;${shadow}${nearRing}">${s.num}</div>`);
    // Popup con info postazione e distanza
    (function(station, zoneLabel, alerts, markerColor){
      var m=new google.maps.marker.AdvancedMarkerElement({position:{lat:station.lat,lng:station.lng},map:window.mapObj,content:content});
      m.addListener("gmp-click",function(){
        // Cerca posizione utente dal userMarker
        var userPos=null;
        if(userMarker){try{userPos=userMarker.position;}catch(e){}}
        var distStr="";
        if(userPos){
          var dm=Math.round(haversine(userPos.lat,userPos.lng,station.lat,station.lng));
          distStr="<br><span style=\"color:#555;font-size:12px\">📍 "+fmtDist(dm)+" da te</span>";
        } else if(nearestStation&&nearestStation.num===station.num&&nearestDist){
          distStr="<br><span style=\"color:#555;font-size:12px\">📍 "+fmtDist(nearestDist)+" da te</span>";
        }
        // Colore bandiera
        var flagName=flagsData[station.num]||"verde";
        var flagCol=FLAG_COLORS[flagName];
        var flagStr="<br><span style=\"font-size:12px\">Bandiera <span style=\"font-weight:700;color:"+flagCol+"\">"+flagName.toUpperCase()+"</span></span>";
        // Alert aperti
        var alertStr=alerts.length>0?"<br><span style=\"color:"+markerColor+";font-size:12px\">"+alerts.length+" segnalaz. aperte</span>":"";
        var noteStr="";
        // Nota permanente di pericolo
        var permNote=PERMANENT_STATION_NOTES[String(station.num)];
        if(permNote){
          noteStr+='<div style="margin:6px 0;padding:7px 10px;background:#7c2d12;border-radius:6px;color:#fff;font-size:12px;line-height:1.4">'
            +'<span style="font-weight:700;display:block;margin-bottom:2px">⚠️ Avviso permanente</span>'
            +_escapeHtml(permNote)+'</div>';
        }
        if(stationNotesData[String(station.num)]){
          noteStr+='<div style="margin:6px 0;padding:7px 10px;background:#1a1a1a;border-radius:6px;color:white;font-size:12px;line-height:1.4">'
            +'<span style="font-weight:700;display:block;margin-bottom:2px">⚠️ Nota operatore</span>'
            +_escapeHtml(stationNotesData[String(station.num)])+'</div>';
        }
        var content=
            "<div class=\"omnia-popup\" style=\"font-family:sans-serif\">"
            +"<b style=\"font-size:14px\">P."+station.num+" – "+station.name+"</b>"
            +noteStr+distStr+flagStr+alertStr
            +"<br><button onclick=\"window._segnalaPostazione('"+zoneLabel+"')\" "
            +"style=\"margin-top:8px;width:100%;padding:7px;background:#D62B1F;color:white;border:none;border-radius:6px;font-size:13px;font-weight:600;cursor:pointer\">"
            +"🚨 Segnala qui</button>"
            +"</div>";
        _openSharedPopup(m,content,220);
      });
      window.mapMarkers.push(m);
    })(s, zl, zr, mc.bg);
  });
  // Aggiorna anche i marker DAE (evidenzia il più vicino)
  addDAEMarkers();
}
export function renderMapLegend(){
  const leg=document.getElementById("map-legend");leg.style.display="flex";
  leg.innerHTML=
    `<span><span class="ldot" style="background:#27ae60"></span>Verde</span>`+
    `<span><span class="ldot" style="background:#F5C800"></span>Gialla</span>`+
    `<span><span class="ldot" style="background:#e74c3c"></span>Rossa</span>`+
    `<span style="border-left:1px solid var(--border);padding-left:11px"><span class="ldot" style="background:#D81B8C"></span>Emergenza</span>`+
    `<span><span class="ldot" style="background:#1a1a1a"></span>Pericolo</span>`+
    `<span style="margin-left:auto;color:var(--text3);font-size:10px">● sei tu</span>`;
}


export function addDAEMarkers(){
  if(!window.mapObj)return;
  window.daeMarkers.forEach(function(m){_removeMarker(m);});
  window.daeMarkers=[];
  DAE_POINTS.forEach(function(d){
    var isNear=nearestDAE&&nearestDAE.name===d.name;
    var nearStyle=isNear?"outline:3px solid #1d4ed8;outline-offset:3px;border-radius:6px;":"";
    var content=_el('<div style="width:22px;height:22px;border-radius:4px;overflow:hidden;box-shadow:0 1px 4px rgba(0,0,0,.5);border:1.5px solid #fff;'+nearStyle+'">'
        +'<img src="img/dae.jpg" style="width:100%;height:100%;object-fit:cover;display:block;"/></div>');
    var m=new google.maps.marker.AdvancedMarkerElement({position:{lat:d.lat,lng:d.lng},map:window.mapObj,content:content});
    var availHtml=d.avail?'<div style="font-size:11px;font-weight:600;color:#555;margin-bottom:8px">'+d.avail+'</div>':'';
    var popHtml=
      '<div class="omnia-popup" style="font-family:sans-serif;min-width:180px">'
      +'<div style="font-size:13px;font-weight:700;color:#1a6b1a;margin-bottom:6px">'
      +'❤️‍🩹 '+d.name+'</div>'
      +'<div style="font-size:12px;color:#333;margin-bottom:4px">Defibrillatore DAE disponibile</div>'
      +availHtml
      +'<a href="https://www.google.com/maps/dir/?api=1&destination='+d.lat+','+d.lng+'&travelmode=walking"'
      +' target="_blank" style="display:block;text-align:center;background:#1a6b1a;color:#fff;text-decoration:none;padding:7px 10px;border-radius:7px;font-size:12px;font-weight:700">🦭 Indicazioni</a>'
      +'</div>';
    m.addListener("gmp-click",function(){_openSharedPopup(m,popHtml);});
    window.daeMarkers.push(m);
  });
  addBoeCantiereMarkers();
  addCorridoiLancio();
  addLimitLine();
}

export var _boePopupOpen=false;
export function addBoeCantiereMarkers(){
  if(!window.mapObj)return;
  // Layer statico: se già creato non ricrearlo (la rimozione chiuderebbe popup/tooltip ad ogni refresh)
  if(boeCantiereMarkers.length>0)return;
  if(_boePopupOpen)return;
  BOE_CANTIERE_23_2026.forEach(function(b){
    var content=_el('<div style="width:18px;height:18px;border-radius:50%;background:#f5c800;border:2px solid #b8860b;'
        +'box-shadow:0 1px 4px rgba(0,0,0,.5);display:flex;align-items:center;justify-content:center;">'
        +'<span style="font-size:9px;font-weight:900;color:#7a5700;line-height:1">✕</span></div>');
    var m=new google.maps.marker.AdvancedMarkerElement({position:{lat:b.lat,lng:b.lng},map:window.mapObj,content:content});
    var popHtml='<div class="omnia-popup" style="font-family:sans-serif;min-width:210px;line-height:1.5">'
      +'<div style="font-size:13px;font-weight:700;color:#b8860b;margin-bottom:4px">⚓ Cantiere Marittimo</div>'
      +'<div style="font-size:11px;font-weight:700;color:#333;margin-bottom:2px">Ordinanza N. 23/2026</div>'
      +'<div style="font-size:11px;color:#555;margin-bottom:2px">Ufficio Circondariale Marittimo di Giulianova</div>'
      +'<div style="font-size:11px;color:#333;margin-bottom:2px"><strong>'+b.area+'</strong> — Segnalamento '+b.pres+'</div>'
      +'<div style="font-size:11px;color:#333;margin-bottom:2px">BOA '+b.boa+' — Boa ad asta gialla con miraglio X</div>'
      +'<div style="font-size:10px;color:#888;margin-bottom:6px">Divieto balneazione, navigazione e pesca nel raggio di 100 mt dai motopontoni</div>'
      +'<div style="font-size:10px;font-weight:700;color:#cc0000">Validità: prorogata fino al 03.06.2026 (Ord. 37/2026)</div>'
      +'</div>';
    // Popup indipendente (non condiviso): resta aperto anche se se ne apre un altro altrove.
    var iw=new google.maps.InfoWindow({content:popHtml,maxWidth:240});
    m.addListener("gmp-click",function(){iw.open({map:window.mapObj,anchor:m});_boePopupOpen=true;});
    iw.addListener("closeclick",function(){_boePopupOpen=false;});
    boeCantiereMarkers.push(m);
  });
}

export var _corridoiMarkers=[];
var CORRIDOI_LANCIO=[
  {
    name:"Corridoio di lancio - Circolo Velico Roseto Azzurra",
    edge1:[[42.68402939139368,14.013749995523458],[42.6852465560769,14.017083788178457]],
    edge2:[[42.68418535460102,14.01372011238795],[42.68551090544365,14.016919534152802]]
  },
  {
    name:"Corridoio di lancio - Roseto Sud",
    edge1:[[42.67319602506359,14.02225978436671],[42.67481262649763,14.025272419391557]],
    edge2:[[42.6730174912171,14.022223830731905],[42.67454815759895,14.025299396024877]]
  },
  {
    name:"Corridoio di lancio - Roseto Nord",
    edge1:[[42.6886054,14.0106452],[42.6901689,14.0136439]],
    edge2:[[42.6883324,14.0109526],[42.6898325,14.0139242]]
  },
  {
    name:"Corridoio di lancio - Cologna Spiaggia",
    edge1:[[42.7201652,13.9902031],[42.7212754,13.9934033]],
    edge2:[[42.7198746,13.9903385],[42.7209926,13.9934928]]
  }
];
function _toLatLngPath(edge){
  return edge.map(function(p){return {lat:p[0],lng:p[1]};});
}
export function addCorridoiLancio(){
  if(!window.mapObj)return;
  // Layer statico: se già creato non ricrearlo (la rimozione chiuderebbe il tooltip aperto ad ogni refresh)
  if(_corridoiMarkers.length>0)return;
  CORRIDOI_LANCIO.forEach(function(c){
    [c.edge1,c.edge2].forEach(function(edge){
      var path=_toLatLngPath(edge);
      var ln=new google.maps.Polyline({
        path:path,strokeOpacity:0,strokeColor:"#f97316",
        icons:[{icon:_dashIcon(4),offset:"0",repeat:"20px"}],
        map:window.mapObj,clickable:true,zIndex:5
      });
      _bindHoverTooltip(ln,
        '<div style="font-size:12px;font-weight:700;color:#f97316">⛵ '+c.name+'</div>'
        +'<div style="font-size:11px;color:#333">Divieto balneazione - Riservato natanti (Ord. 29/2026)</div>');
      _corridoiMarkers.push(ln);
      var dotContent=_el('<div style="width:12px;height:12px;border-radius:50%;background:#f97316;border:0;"></div>');
      var dot=new google.maps.marker.AdvancedMarkerElement({position:path[1],map:window.mapObj,content:dotContent});
      _corridoiMarkers.push(dot);
    });
  });
}


export var _limitLines=[];
export function addLimitLine(){
  if(!window.mapObj)return;
  // Layer statico: se già creato non ricrearlo (la rimozione chiuderebbe il tooltip aperto ad ogni refresh)
  if(_limitLines.length>0)return;

  // Calcola punto a 'dist' metri in direzione 'bearing' (gradi da nord)
  function offsetPt(lat,lng,dist,bearing){
    var R=6371000,br=bearing*Math.PI/180;
    var lat1=lat*Math.PI/180,lng1=lng*Math.PI/180;
    var lat2=Math.asin(Math.sin(lat1)*Math.cos(dist/R)+Math.cos(lat1)*Math.sin(dist/R)*Math.cos(br));
    var lng2=lng1+Math.atan2(Math.sin(br)*Math.sin(dist/R)*Math.cos(lat1),Math.cos(dist/R)-Math.sin(lat1)*Math.sin(lat2));
    return [lat2*180/Math.PI,lng2*180/Math.PI];
  }

  var ttHtml='<div style="font-family:sans-serif;font-size:12px;font-weight:700;color:#f97316">'
    +'⚓ Limite 300 mt dalla battigia</div>'
    +'<div style="font-size:11px;color:#333">Divieto navigazione, sosta e ancoraggio natanti (Ord. 29/2026)</div>';

  // Unica linea continua: tutte le postazioni ordinate per lat (sud→nord)
  var allSt=STATIONS.slice().sort(function(a,b){return a.lat-b.lat;});
  // Punto extra a sud: limite nord zona Foce Vomano
  allSt.unshift({lat:42.6572,lng:14.0363,num:0,name:"Foce Vomano"});
  // Punto extra a nord: limite sud zona Foce Tordino
  allSt.push({lat:42.73836,lng:13.98111,num:0,name:"Foce Tordino"});

  // Bearing seaward calcolato sull'intera linea costiera
  function coastBearing(group){
    var first=group[0],last=group[group.length-1];
    var dlat=(last.lat-first.lat)*111111;
    var dlng=(last.lng-first.lng)*81657;
    return Math.atan2(dlng,dlat)*180/Math.PI+90;
  }

  var bearing=coastBearing(allSt);
  var pts=allSt.map(function(s){return offsetPt(s.lat,s.lng,300,bearing);});
  var path=pts.map(function(p){return {lat:p[0],lng:p[1]};});
  var line=new google.maps.Polyline({
    path:path,strokeOpacity:0,strokeColor:"#f97316",
    icons:[{icon:_dashIcon(2),offset:"0",repeat:"17px"}],
    map:window.mapObj,clickable:true,zIndex:4
  });
  _bindHoverTooltip(line,ttHtml);
  _limitLines.push(line);
}

export function addGuardiaMedicaMarker(){
  if(!window.mapObj||window.guardiaMedicaMarker)return;
  var content=_el('<div style="width:25px;height:30px;border-radius:5px;overflow:hidden;'
      +'box-shadow:0 2px 6px rgba(0,0,0,.5);border:2px solid #c62828;background:#fff;'
      +'display:flex;align-items:center;justify-content:center;padding:1px;box-sizing:border-box;">'
      +'<img src="img/gm.jpg" style="width:100%;height:100%;object-fit:contain;display:block;"/></div>');
  window.guardiaMedicaMarker=new google.maps.marker.AdvancedMarkerElement({position:{lat:GM_POINT.lat,lng:GM_POINT.lng},map:window.mapObj,content:content});
  var htmlPopup='<div class="omnia-popup" style="font-family:sans-serif;min-width:240px;line-height:1.5">'
    +'<div style="font-size:14px;font-weight:700;color:#c62828;margin-bottom:6px">Guardia Medica - Roseto degli Abruzzi</div>'
    +'<div style="font-size:11px;color:#333;margin-bottom:2px"><strong>Indirizzo:</strong> Vicolo Monte Grappa, 1 - 64026 Roseto degli Abruzzi (TE)</div>'
    +'<div style="font-size:11px;color:#333;margin-bottom:4px"><strong>Tel.:</strong> <a href="tel:0861440620" style="color:#c62828;text-decoration:none;font-weight:700">0861 440620</a></div>'
    +'<div style="font-size:11px;color:#333;margin-bottom:2px;margin-top:4px"><strong>Orari:</strong><br>'
    +'Lun: 20:00–00:00<br>'
    +'Mar–Ven: 00:00–08:00 / 20:00–00:00<br>'
    +'Sab: 00:00–08:00 / 10:00–20:00<br>'
    +'Dom: 08:00–20:00</div>'
    +'<div style="font-size:10px;color:#888;margin-bottom:8px">L\'orario può variare</div>'
    +'<a href="https://www.google.com/maps/dir/?api=1&destination=42.6789,14.0128&travelmode=walking" target="_blank" '
    +'style="display:block;text-align:center;background:#c62828;color:#fff;text-decoration:none;padding:8px 10px;border-radius:8px;font-size:12px;font-weight:700">🧭 Apri indicazioni</a>'
    +'</div>';
  window.guardiaMedicaMarker.addListener("gmp-click",function(){_openSharedPopup(window.guardiaMedicaMarker,htmlPopup,270);});
}

export function addVVFMarker(){
  if(!window.mapObj||window.vvfMarker)return;
  var content=_el('<div style="width:36px;height:36px;border-radius:50%;overflow:hidden;box-shadow:0 2px 6px rgba(0,0,0,.5);border:2px solid #fff;background:#CC0000;">'
      +'<img src="img/vvf.png" style="width:100%;height:100%;object-fit:contain;display:block;"/></div>');
  window.vvfMarker=new google.maps.marker.AdvancedMarkerElement({position:{lat:VVF_POINT.lat,lng:VVF_POINT.lng},map:window.mapObj,content:content});
  var htmlPopup='<div class="omnia-popup" style="font-family:sans-serif;min-width:240px;line-height:1.5">'
    +'<div style="font-size:13px;font-weight:700;color:#CC0000;margin-bottom:4px">Vigili del Fuoco</div>'
    +'<div style="font-size:11px;color:#555;margin-bottom:6px">Distaccamento e Nucleo Sommozzatori<br>Roseto degli Abruzzi (TE)</div>'
    +'<div style="font-size:11px;color:#333;margin-bottom:2px"><strong>Tel.:</strong> <a href="tel:0858992222" style="color:#CC0000;text-decoration:none;font-weight:700">085 899 2222</a></div>'
    +'<div style="font-size:11px;color:#333;margin-bottom:8px"><strong>Sito:</strong> <a href="http://www.vigilfuoco.it/" target="_blank" style="color:#CC0000;text-decoration:none">www.vigilfuoco.it</a></div>'
    +'<a href="https://www.google.com/maps/dir/?api=1&destination=42.660998759620824,14.026752032971247&travelmode=driving" target="_blank" '
    +'style="display:block;text-align:center;background:#CC0000;color:#fff;text-decoration:none;padding:8px 10px;border-radius:8px;font-size:12px;font-weight:700">🧭 Apri indicazioni</a>'
    +'</div>';
  window.vvfMarker.addListener("gmp-click",function(){_openSharedPopup(window.vvfMarker,htmlPopup,270);});
}

export function addFinanzaMarker(){
  if(!window.mapObj||window.finanzaMarker)return;
  var content=_el('<div style="width:36px;height:36px;border-radius:50%;overflow:hidden;'
      +'box-shadow:0 2px 6px rgba(0,0,0,.5);border:2px solid #f5c800;background:#fff;">'
      +'<img src="img/finanza.png" style="width:100%;height:100%;object-fit:contain;display:block;"/></div>');
  window.finanzaMarker=new google.maps.marker.AdvancedMarkerElement({position:{lat:FINANZA_POINT.lat,lng:FINANZA_POINT.lng},map:window.mapObj,content:content});
  var htmlPopup='<div class="omnia-popup" style="font-family:sans-serif;min-width:240px;line-height:1.5">'
    +'<div style="font-size:14px;font-weight:700;color:#2e7d32;margin-bottom:6px">Guardia di Finanza - Roseto degli Abruzzi</div>'
    +'<div style="font-size:11px;color:#333;margin-bottom:2px"><strong>Indirizzo:</strong> Via Fonte Dell\'Olmo, Snc - 64026 Roseto degli Abruzzi (TE)</div>'
    +'<div style="font-size:11px;color:#333;margin-bottom:2px"><strong>Tel.:</strong> <a href="tel:0858990110" style="color:#2e7d32;text-decoration:none">085 899 0110</a></div>'
    +'<div style="font-size:11px;color:#333;margin-bottom:2px;margin-top:4px"><strong>Orari:</strong><br>'
    +'Lun–Gio: 08:00–14:00 / 15:00–18:00<br>Ven: 08:00–14:00<br>Sab–Dom: Chiuso</div>'
    +'<div style="font-size:10px;color:#888;margin-bottom:8px">L\'orario può variare</div>'
    +'<a href="https://www.google.com/maps/dir/?api=1&destination=42.66237,14.02528&travelmode=walking" target="_blank" '
    +'style="display:block;text-align:center;background:#2e7d32;color:#fff;text-decoration:none;padding:8px 10px;border-radius:8px;font-size:12px;font-weight:700">Apri indicazioni</a>'
    +'</div>';
  window.finanzaMarker.addListener("gmp-click",function(){_openSharedPopup(window.finanzaMarker,htmlPopup,270);});
}

export function addCCMarker(){
  if(!window.mapObj||window.ccMarker)return;
  var content=_el('<div style="width:36px;height:36px;border-radius:50%;overflow:hidden;'
      +'box-shadow:0 2px 6px rgba(0,0,0,.5);border:2px solid #fff;background:#fff;">'
      +'<img src="img/cc.png" style="width:100%;height:100%;object-fit:contain;display:block;"/></div>');
  window.ccMarker=new google.maps.marker.AdvancedMarkerElement({position:{lat:CC_POINT.lat,lng:CC_POINT.lng},map:window.mapObj,content:content,zIndex:100});
  var ccHtml='<div class="omnia-popup" style="font-family:sans-serif;min-width:220px;line-height:1.45">'
    +'<div style="font-size:14px;font-weight:700;color:#1a237e;margin-bottom:6px">Carabinieri - Comando Stazione di Roseto degli Abruzzi</div>'
    +'<div style="font-size:11px;color:#333;margin-bottom:2px"><strong>Indirizzo:</strong> Via Gramsci, 34 - 64026 Roseto degli Abruzzi (TE)</div>'
    +'<div style="font-size:11px;color:#333;margin-bottom:2px"><strong>Emergenze:</strong> <a href="tel:112" style="color:#1a237e;text-decoration:none;font-weight:700">112</a></div>'
    +'<div style="font-size:11px;color:#333;margin-bottom:2px"><strong>Tel. locale:</strong> <a href="tel:0858990131" style="color:#1a237e;text-decoration:none">085 899 0131</a></div>'
    +'<div style="font-size:12px;color:#333;margin-bottom:8px"><strong>Orari sportello:</strong> Tutti i giorni 08:30–13:00 / 15:00–19:00</div>'
    +'<a href="https://www.google.com/maps/dir/?api=1&destination=42.6690839,14.0202191"'
    +' target="_blank" style="display:block;text-align:center;background:#1a237e;color:#fff;'
    +'text-decoration:none;padding:8px 10px;border-radius:8px;font-size:12px;font-weight:700">Apri indicazioni</a>'
    +'</div>';
  window.ccMarker.addListener("gmp-click",function(){_openSharedPopup(window.ccMarker,ccHtml,270);});
}

export function addPLMarker(){
  if(!window.mapObj||window.plMarker)return;
  var content=_el('<div style="width:36px;height:36px;border-radius:50%;overflow:hidden;'
      +'box-shadow:0 2px 6px rgba(0,0,0,.5);border:2px solid #fff;background:#fff;">'
      +'<img src="img/pl.jpg" style="width:100%;height:100%;object-fit:contain;display:block;"/></div>');
  window.plMarker=new google.maps.marker.AdvancedMarkerElement({position:{lat:PL_POINT.lat,lng:PL_POINT.lng},map:window.mapObj,content:content,zIndex:-100});
  var plHtml='<div class="omnia-popup" style="font-family:sans-serif;min-width:220px;line-height:1.45">'
    +'<div style="font-size:14px;font-weight:700;color:#1a237e;margin-bottom:6px">Polizia Locale - Roseto degli Abruzzi</div>'
    +'<div style="font-size:11px;color:#333;margin-bottom:2px"><strong>Indirizzo:</strong> Via Calabria, 17 - 64026 Roseto degli Abruzzi (TE)</div>'
    +'<div style="font-size:11px;color:#333;margin-bottom:2px"><strong>Tel.:</strong> <a href="tel:0858995192" style="color:#1a237e;text-decoration:none;font-weight:700">085 899 5192</a></div>'
    +'<div style="font-size:11px;color:#333;margin-bottom:8px"><strong>Orari:</strong> Lun–Sab 08:00–14:00</div>'
    +'<a href="https://www.google.com/maps/dir/?api=1&destination=42.66890816262959,14.020188423768815"'
    +' target="_blank" style="display:block;text-align:center;background:#1a237e;color:#fff;'
    +'text-decoration:none;padding:8px 10px;border-radius:8px;font-size:12px;font-weight:700">Apri indicazioni</a>'
    +'</div>';
  window.plMarker.addListener("gmp-click",function(){_openSharedPopup(window.plMarker,plHtml,270);});
}

export function addComuneMarker(){
  if(!window.mapObj||window.comuneMarker)return;
  var content=_el('<div style="width:25px;height:30px;border-radius:5px;overflow:hidden;box-shadow:0 2px 6px rgba(0,0,0,.5);border:2px solid #1565c0;background:#fff;display:flex;align-items:center;justify-content:center;padding:2px;box-sizing:border-box;">'
      +'<img src="img/stemma.jpg" style="width:25px;height:30px;object-fit:contain;display:block;"/></div>');
  window.comuneMarker=new google.maps.marker.AdvancedMarkerElement({position:{lat:COMUNE_POINT.lat,lng:COMUNE_POINT.lng},map:window.mapObj,content:content});
  var htmlPopup='<div class="omnia-popup" style="font-family:sans-serif;min-width:240px;line-height:1.5">'
    +'<div style="font-size:13px;font-weight:700;color:#1565c0;margin-bottom:4px">Comune di Roseto degli Abruzzi</div>'
    +'<div style="font-size:11px;color:#333;margin-bottom:1px"><strong>Indirizzo:</strong> Piazza della Repubblica - 64026 Roseto degli Abruzzi (TE)</div>'
    +'<div style="font-size:11px;color:#333;margin-bottom:2px"><strong>Tel.:</strong> <a href="tel:085894531" style="color:#1565c0;text-decoration:none">085 894531</a></div>'
    +'<div style="font-size:11px;color:#333;margin-bottom:2px"><strong>Email:</strong> <a href="mailto:protocollo@comune.roseto.te.it" style="color:#1565c0;text-decoration:none">protocollo@comune.roseto.te.it</a></div>'
    +'<div style="font-size:11px;color:#333;margin-bottom:2px"><strong>Sito:</strong> <a href="https://www.comune.roseto.te.it/" target="_blank" style="color:#1565c0">www.comune.roseto.te.it</a></div>'
    +'<div style="font-size:11px;color:#333;margin-bottom:2px;margin-top:4px"><strong>Orari sportello:</strong><br>'
    +'Lun: 08:30–12:30<br>Mar: 08:30–12:30 / 16:30–17:30<br>Mer: Chiuso<br>Gio: 08:30–12:30 / 16:30–17:30<br>Ven: 08:30–12:30<br>Sab: 09:00–11:45<br>Dom: Chiuso</div>'
    +'<a href="https://www.google.com/maps/dir/?api=1&destination=42.6796819,14.0110622&travelmode=walking" target="_blank" '
    +'style="display:block;text-align:center;background:#1565c0;color:white;padding:6px;border-radius:6px;font-size:11px;font-weight:600;text-decoration:none">'
    +'🧭 Apri indicazioni</a></div>';
  window.comuneMarker.addListener("gmp-click",function(){_openSharedPopup(window.comuneMarker,htmlPopup,270);});
}

export function addIATMarker(){
  if(!window.mapObj||window.iatMarker)return;
  var content=_el('<div style="width:22px;height:22px;border-radius:4px;overflow:hidden;box-shadow:0 2px 6px rgba(0,0,0,.5);border:2px solid #e6b800;background:#f5c800;">'
      +'<img src="img/iat.jpg" style="width:100%;height:100%;object-fit:cover;display:block;"/></div>');
  window.iatMarker=new google.maps.marker.AdvancedMarkerElement({position:{lat:IAT_POINT.lat,lng:IAT_POINT.lng},map:window.mapObj,content:content});
  var htmlPopup='<div class="omnia-popup" style="font-family:sans-serif;min-width:240px;line-height:1.5">'
    +'<div style="font-size:13px;font-weight:700;color:#b8860b;margin-bottom:4px">IAT Roseto degli Abruzzi</div>'
    +'<div style="font-size:10px;color:#888;margin-bottom:3px">Ufficio Informazioni e Accoglienza Turistica</div>'
    +'<div style="font-size:11px;color:#333;margin-bottom:1px"><strong>Indirizzo:</strong> Piazza della Libertà, 37/38 - 64026 Roseto degli Abruzzi (TE)</div>'
    +'<div style="font-size:11px;color:#333;margin-bottom:2px"><strong>Tel.:</strong> <a href="tel:0858991157" style="color:#1565c0;text-decoration:none">0858991157</a></div>'
    +'<div style="font-size:11px;color:#333;margin-bottom:2px"><strong>Facebook:</strong> <a href="https://www.facebook.com/iatrosetodegliabruzzi/" target="_blank" style="color:#1877f2">iatrosetodegliabruzzi</a></div>'
    +'<div style="font-size:11px;color:#333;margin-bottom:2px;margin-top:4px"><strong>Orari:</strong><br>'
    +'Lun: 14:00–19:00<br>Mar: Chiuso<br>Mer: Chiuso<br>Gio: 09:00–12:00<br>Ven: 09:00–14:00<br>Sab: 09:00–14:00<br>Dom: 10:00–12:00</div>'
    +'<a href="https://www.google.com/maps/dir/?api=1&destination=42.6775099,14.0139231&travelmode=walking" target="_blank" '
    +'style="display:block;text-align:center;background:#e6b800;color:#1a1a1a;padding:6px;border-radius:6px;font-size:11px;font-weight:600;text-decoration:none">'
    +'🧭 Apri indicazioni</a></div>';
  window.iatMarker.addListener("gmp-click",function(){_openSharedPopup(window.iatMarker,htmlPopup,270);});
}

export function addZoneVietate(){
  if(!window.mapObj)return;
  window.zoneVietateMarkers.forEach(function(m){
    try{if(m instanceof google.maps.marker.AdvancedMarkerElement)m.map=null;else m.setMap(null);}catch(e){}
  });
  window.zoneVietateMarkers=[];
  ZONE_VIETATE.forEach(function(z){
    var path=z.latlngs.map(function(p){return {lat:p[0],lng:p[1]};});
    var popup='<div class="omnia-popup" style="font-family:sans-serif;min-width:230px;line-height:1.5">'
      +'<div style="background:#cc0000;color:#fff;font-weight:700;font-size:12px;padding:6px 10px;border-radius:6px 6px 0 0;margin:-1px -1px 8px -1px">⛔ '+z.name+'</div>'
      +'<div style="font-size:11px;color:#333;margin-bottom:6px">'+z.desc+'</div>'
      +'</div>';
    var poly=new google.maps.Polygon({
      paths:path,strokeOpacity:0,fillColor:"#ff0000",fillOpacity:0.18,
      map:window.mapObj,clickable:true
    });
    var border=new google.maps.Polyline({
      path:path.concat([path[0]]),strokeOpacity:0,strokeColor:"#cc0000",
      icons:[{icon:_dashIcon(3),offset:"0",repeat:"14px"}],
      map:window.mapObj,clickable:true
    });
    poly.addListener("click",function(e){_openSharedPopupAt(e.latLng,popup,270);});
    border.addListener("click",function(e){_openSharedPopupAt(e.latLng,popup,270);});
    var bounds=new google.maps.LatLngBounds();
    path.forEach(function(p){bounds.extend(p);});
    var center=bounds.getCenter();
    var labelContent=_el('<div style="background:rgba(180,0,0,0.82);color:#fff;font-size:10px;font-weight:700;padding:2px 5px;border-radius:4px;white-space:nowrap;box-shadow:0 1px 4px rgba(0,0,0,.5);">⛔ DIVIETO BALNEAZIONE</div>');
    var labelMarker=new google.maps.marker.AdvancedMarkerElement({position:center,map:window.mapObj,content:labelContent});
    labelMarker.addListener("gmp-click",function(){_openSharedPopup(labelMarker,popup,270);});
    window.zoneVietateMarkers.push(poly,border,labelMarker);
  });
}

export function addPortoroseMarker(){
  if(!window.mapObj||window.portoroseMarker)return;
  var content=_el('<div style="height:22px;padding:1px 3px;border-radius:4px;overflow:hidden;box-shadow:0 2px 6px rgba(0,0,0,.5);border:2px solid #1a3b8c;background:#fff;display:flex;align-items:center;justify-content:center;">'
      +'<img src="img/portorose.jpg" style="height:16px;width:auto;object-fit:contain;display:block;"/></div>');
  window.portoroseMarker=new google.maps.marker.AdvancedMarkerElement({position:{lat:PORTOROSE_POINT.lat,lng:PORTOROSE_POINT.lng},map:window.mapObj,content:content});
  var htmlPopup='<div class="omnia-popup" style="font-family:sans-serif;min-width:240px;line-height:1.5">'
    +'<div style="text-align:center;margin-bottom:8px;padding-bottom:8px;border-bottom:1px solid #e0e0e0">'
    +'<img src="img/portorose_popup.jpg" style="height:30px;width:auto;object-fit:contain;display:inline-block;"/></div>'
    +'<div style="font-size:11px;color:#333;margin-bottom:2px"><strong>Indirizzo:</strong> Via Tamigi, 1 — Roseto degli Abruzzi (TE)</div>'
    +'<div style="font-size:11px;color:#333;margin-bottom:2px"><strong>Tel.:</strong> <a href="tel:+393298034310" style="color:#1a3b8c;text-decoration:none">329 803 4310</a></div>'
    +'<div style="font-size:11px;color:#333;margin-bottom:2px"><strong>Sito:</strong> <a href="https://www.portiitaliani.com/porto-rose-roseto-degli-abruzzi/" target="_blank" style="color:#1a3b8c;text-decoration:none">portiitaliani.com</a></div>'
    +'<div style="font-size:11px;color:#333;margin-bottom:4px;margin-top:4px"><strong>Orari:</strong> tutti i giorni<br>'
    +'08:30–13:00 / 15:00–19:00</div>'
    +'<a href="https://www.google.com/maps/dir/?api=1&destination=42.6565304172608,14.035017344909056&travelmode=walking" target="_blank" '
    +'style="display:block;text-align:center;background:#1a3b8c;color:white;padding:7px;border-radius:7px;font-size:11px;font-weight:700;text-decoration:none">'
    +'⛵ Apri indicazioni</a></div>';
  window.portoroseMarker.addListener("gmp-click",function(){_openSharedPopup(window.portoroseMarker,htmlPopup,270);});
}
export function addRosetanaMarker(){
  if(!window.mapObj||window.rosetanaMarker)return;
  var content=_el('<div style="width:30px;height:30px;border-radius:50%;overflow:hidden;box-shadow:0 2px 6px rgba(0,0,0,.5);border:2px solid #1a6bb5;background:#fff;">'
      +'<img src="img/rosetana.jpg" style="width:100%;height:100%;object-fit:cover;display:block;"/></div>');
  window.rosetanaMarker=new google.maps.marker.AdvancedMarkerElement({position:{lat:ROSETANA_POINT.lat,lng:ROSETANA_POINT.lng},map:window.mapObj,content:content});
  var htmlPopup='<div class="omnia-popup" style="font-family:sans-serif;min-width:250px;line-height:1.5">'
    +'<div style="display:flex;align-items:center;gap:8px;margin-bottom:6px">'
    +'<div style="width:36px;height:36px;border-radius:50%;overflow:hidden;flex-shrink:0;border:2px solid #1a6bb5">'
    +'<img src="img/rosetana.jpg" style="width:100%;height:100%;object-fit:cover;display:block;"/></div>'
    +'<div><div style="font-size:13px;font-weight:700;color:#1a6bb5">A.S.D. Rosetana Nuoto</div>'
    +'<div style="font-size:10px;color:#888">Piscina Comunale “Giuseppe Celommi”</div></div></div>'
    +'<div style="font-size:11px;color:#333;margin-bottom:2px"><strong>Indirizzo:</strong> Via Fonte dell’Olmo, 10 — Roseto degli Abruzzi (TE)</div>'
    +'<div style="font-size:11px;color:#333;margin-bottom:2px"><strong>Tel.:</strong> <a href="tel:0858931454" style="color:#1a6bb5;text-decoration:none">085 893 1454</a></div>'
    +'<div style="font-size:11px;color:#333;margin-bottom:2px"><strong>Sito:</strong> <a href="https://rosetananuoto.it" target="_blank" style="color:#1a6bb5;text-decoration:none">rosetananuoto.it</a></div>'
    +'<div style="font-size:11px;color:#333;margin-bottom:2px"><strong>Facebook:</strong> <a href="https://www.facebook.com/rosetananuoto75" target="_blank" style="color:#1877f2;text-decoration:none">@rosetananuoto75</a></div>'
    +'<div style="font-size:11px;color:#333;margin-bottom:4px;margin-top:4px"><strong>Orari:</strong><br>'
    +'Lun–Mer: 06:45–22:00<br>Gio–Ven: 07:00–22:00<br>Sab: 08:30–12:30<br>Dom: 08:30–12:30</div>'
    +'<a href="https://maps.app.goo.gl/Tia4pBeTuoSRmBW2A" target="_blank" '
    +'style="display:block;text-align:center;background:#1a6bb5;color:white;padding:7px;border-radius:7px;font-size:11px;font-weight:700;text-decoration:none">'
    +'🧭 Apri indicazioni</a></div>';
  window.rosetanaMarker.addListener("gmp-click",function(){_openSharedPopup(window.rosetanaMarker,htmlPopup,280);});
}

export function ensureLocamareMarker(){
  if(!window.mapObj || window.locamareMarker) return;

  const locamareContent = _el(`<div style="width:40px;height:40px;border-radius:50%;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,.5);border:2px solid #153E8C;background:#fff;padding:2px;box-sizing:border-box;"><img src="cp.png" style="width:100%;height:100%;object-fit:contain;display:block;"/></div>`);

  window.locamareMarker = new google.maps.marker.AdvancedMarkerElement({position:{lat:42.669431107568684,lng:14.024105577318382},map:window.mapObj,content:locamareContent});

  const locamarePopup = `
    <div class="omnia-popup" style="font-family:sans-serif;min-width:220px;line-height:1.45">
      <div style="font-size:14px;font-weight:700;color:#153E8C;margin-bottom:6px">
        Ufficio LOCAMARE Marittimo di Roseto degli Abruzzi
      </div>
      <div style="font-size:11px;color:#333;margin-bottom:2px">
        <strong>Indirizzo:</strong> Lungomare Trieste, 1 - 64026 Roseto degli Abruzzi (TE)
      </div>
      <div style="font-size:11px;color:#333;margin-bottom:2px">
        <strong>Telefono:</strong> <a href="tel:0858942437" style="color:#153E8C;text-decoration:none">085 8942437</a>
      </div>
      <div style="font-size:12px;color:#333;margin-bottom:8px">
        <strong>Email MIT:</strong> <a href="mailto:lcroseto@mit.gov.it" style="color:#153E8C;text-decoration:none">lcroseto@mit.gov.it</a>
      </div>
      <a href="https://www.google.com/maps/dir/?api=1&destination=42.669431107568684,14.024105577318382"
         target="_blank"
         style="display:block;text-align:center;background:#153E8C;color:#fff;text-decoration:none;padding:8px 10px;border-radius:8px;font-size:12px;font-weight:700">
         Apri indicazioni
      </a>
    </div>
  `;

  window.locamareMarker.addListener("gmp-click",function(){_openSharedPopup(window.locamareMarker,locamarePopup,270);});
}


// RENDER
