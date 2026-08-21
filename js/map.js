import { ALERT_COLORS, BOE_CANTIERE_23_2026, CC_B64, CC_POINT, COMUNE_POINT, DAE_B64, DAE_POINTS, FINANZA_B64, FINANZA_POINT, FLAG_COLORS, GM_B64, GM_POINT, IAT_B64, IAT_POINT, PERMANENT_STATION_NOTES, PL_B64, PL_POINT, PORTOROSE_B64, PORTOROSE_POINT, PORTOROSE_POPUP_B64, ROSETANA_B64, ROSETANA_POINT, STATIONS, STEMMA_B64, VVF_B64, VVF_POINT, ZONE_VIETATE, _escapeHtml, boeCantiereMarkers, flagsData, fmtDist, haversine, nearestDAE, nearestDist, nearestStation, render, stationMode, stationNotesData, userMarker } from "./core.js";

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
  btns.appendChild(opWrap);
  hdr.appendChild(btns);
}

// MAPPA
export function initMap(){
  var el=document.getElementById("main-map");
  if(!el)return;
  if(window.mapObj){ensureLocamareMarker();refreshMarkers();window.mapObj.invalidateSize(true);return;}
  if(el._leaflet_id){try{if(el._leaflet&&el._leaflet.remove)el._leaflet.remove();}catch(e){}delete el._leaflet_id;delete el._leaflet;}
  el.style.width="100%";
  window.mapObj=L.map(el,{zoomControl:true,preferCanvas:true,updateWhenIdle:true,tap:true}).setView([42.686,14.010],13);
  L.tileLayer(
    "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
    {
      attribution:"",
      maxZoom:20,
      updateWhenIdle:true,
      keepBuffer:3
    }
  ).addTo(window.mapObj);
  // Layer etichette strade e nomi vie
  L.tileLayer(
    "https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Transportation/MapServer/tile/{z}/{y}/{x}",
    {
      attribution:"",
      maxZoom:20,
      opacity:1,
      updateWhenIdle:true
    }
  ).addTo(window.mapObj);
  L.tileLayer(
    "https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}",
    {
      attribution:"",
      maxZoom:20,
      opacity:1,
      updateWhenIdle:true
    }
  ).addTo(window.mapObj);
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
  window.mapObj.whenReady(function(){
    [50,250,700].forEach(function(t){setTimeout(function(){if(window.mapObj)window.mapObj.invalidateSize(true);},t);});
  });
  // Quando si chiude un popup, aggiorna i marker se era in coda
  window.mapObj.on("popupclose",function(){
    if(window._refreshPending){setTimeout(function(){refreshMarkers();},50);}
  });
  window.mapObj.on("load",function(){setTimeout(function(){if(window.mapObj)window.mapObj.invalidateSize(true);},150);});
}
export function getMarkerColor(s){
  const open=Object.values(window.reportsData).filter(r=>r.status==="aperta");
  const zl=`P.${s.num} \u2013 ${s.name}`;
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
  var _anyOpen=window.mapMarkers.some(function(m){try{return m.isPopupOpen();}catch(e){return false;}})
    ||window.daeMarkers.some(function(m){try{return m.isPopupOpen();}catch(e){return false;}});
  if(_anyOpen){window._refreshPending=true;return;}
  window._refreshPending=false;
  window.mapMarkers.forEach(function(m){try{m.remove();}catch(e){}});
  window.mapMarkers=[];
  const open=Object.values(window.reportsData).filter(r=>r.status==="aperta");
  STATIONS.forEach(s=>{
    const zl=`P.${s.num} \u2013 ${s.name}`;
    const zr=open.filter(r=>r.zone===zl);
    const mc=getMarkerColor(s);
    const isNearest=nearestStation&&nearestStation.num===s.num;
    const shadow=mc.ring?`box-shadow:0 0 0 3px ${mc.ringColor||mc.bg},0 0 0 5px white;`:`box-shadow:0 1px 4px rgba(0,0,0,.4);`;
    const nearRing=isNearest?`outline:3px solid #1d4ed8;outline-offset:2px;`:"";
    const icon=L.divIcon({className:"",
      html:`<div style="width:26px;height:26px;border-radius:50%;background:${mc.bg};border:2.5px solid white;color:white;font-size:8.5px;font-weight:700;line-height:21px;text-align:center;${shadow}${nearRing}">${s.num}</div>`,
      iconSize:[26,26],iconAnchor:[13,13]});
    // Popup con info postazione e distanza
    (function(station, zoneLabel, alerts, markerColor){
      var m=L.marker([station.lat,station.lng],{icon}).addTo(window.mapObj);
      m.on("click",function(){
        // Cerca posizione utente dal userMarker
        var userPos=null;
        if(userMarker){try{userPos=userMarker.getLatLng();}catch(e){}}
        var distStr="";
        if(userPos){
          var dm=Math.round(haversine(userPos.lat,userPos.lng,station.lat,station.lng));
          distStr="<br><span style=\"color:#555;font-size:12px\">\uD83D\uDCCD "+fmtDist(dm)+" da te</span>";
        } else if(nearestStation&&nearestStation.num===station.num&&nearestDist){
          distStr="<br><span style=\"color:#555;font-size:12px\">\uD83D\uDCCD "+fmtDist(nearestDist)+" da te</span>";
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
            +'<span style="font-weight:700;display:block;margin-bottom:2px">\u26a0\ufe0f Nota operatore</span>'
            +_escapeHtml(stationNotesData[String(station.num)])+'</div>';
        }
        var popup=L.popup({maxWidth:220,keepInView:true,autoPanPadding:[20,20]})
          .setContent(
            "<div style=\"font-family:sans-serif;padding:2px\">"
            +"<b style=\"font-size:14px\">P."+station.num+" \u2013 "+station.name+"</b>"
            +noteStr+distStr+flagStr+alertStr
            +"<br><button onclick=\"window._segnalaPostazione('"+zoneLabel+"')\" "
            +"style=\"margin-top:8px;width:100%;padding:7px;background:#D62B1F;color:white;border:none;border-radius:6px;font-size:13px;font-weight:600;cursor:pointer\">"
            +"\uD83D\uDEA8 Segnala qui</button>"
            +"</div>"
          );
        m.bindPopup(popup).openPopup();
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
    `<span style="margin-left:auto;color:var(--text3);font-size:10px">\u25cf sei tu</span>`;
}


export function addDAEMarkers(){
  if(!window.mapObj)return;
  window.daeMarkers.forEach(function(m){try{m.remove();}catch(e){}});
  window.daeMarkers=[];
  DAE_POINTS.forEach(function(d){
    var isNear=nearestDAE&&nearestDAE.name===d.name;
    var nearStyle=isNear?"outline:3px solid #1d4ed8;outline-offset:3px;border-radius:6px;":"";
    var daeIcon=L.divIcon({
      className:"",
      html:'<div style="width:22px;height:22px;border-radius:4px;overflow:hidden;box-shadow:0 1px 4px rgba(0,0,0,.5);border:1.5px solid #fff;'+nearStyle+'">'
          +'<img src="data:image/jpeg;base64,'+DAE_B64+'" style="width:100%;height:100%;object-fit:cover;display:block;"/></div>',
      iconSize:[22,22],iconAnchor:[11,11],popupAnchor:[0,-13]
    });
    var m=L.marker([d.lat,d.lng],{icon:daeIcon}).addTo(window.mapObj);
    var availHtml=d.avail?'<div style="font-size:11px;font-weight:600;color:#555;margin-bottom:8px">'+d.avail+'</div>':'';
    var popHtml=
      '<div style="font-family:sans-serif;min-width:180px">'
      +'<div style="font-size:13px;font-weight:700;color:#1a6b1a;margin-bottom:6px">'
      +'\u2764\ufe0f\u200d\ud83e\ude79 '+d.name+'</div>'
      +'<div style="font-size:12px;color:#333;margin-bottom:4px">Defibrillatore DAE disponibile</div>'
      +availHtml
      +'<a href="https://www.google.com/maps/dir/?api=1&destination='+d.lat+','+d.lng+'&travelmode=walking"'
      +' target="_blank" style="display:block;text-align:center;background:#1a6b1a;color:#fff;text-decoration:none;padding:7px 10px;border-radius:7px;font-size:12px;font-weight:700">\ud83e\uddad Indicazioni</a>'
      +'</div>';
    m.bindPopup(popHtml);
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
    var boaIcon=L.divIcon({
      className:"",
      html:'<div style="width:18px;height:18px;border-radius:50%;background:#f5c800;border:2px solid #b8860b;'
          +'box-shadow:0 1px 4px rgba(0,0,0,.5);display:flex;align-items:center;justify-content:center;">'
          +'<span style="font-size:9px;font-weight:900;color:#7a5700;line-height:1">✕</span></div>',
      iconSize:[18,18],iconAnchor:[9,9],popupAnchor:[0,-12]
    });
    var m=L.marker([b.lat,b.lng],{icon:boaIcon}).addTo(window.mapObj);
    var popHtml='<div style="font-family:sans-serif;min-width:210px;line-height:1.5">'
      +'<div style="font-size:13px;font-weight:700;color:#b8860b;margin-bottom:4px">⚓ Cantiere Marittimo</div>'
      +'<div style="font-size:11px;font-weight:700;color:#333;margin-bottom:2px">Ordinanza N. 23/2026</div>'
      +'<div style="font-size:11px;color:#555;margin-bottom:2px">Ufficio Circondariale Marittimo di Giulianova</div>'
      +'<div style="font-size:11px;color:#333;margin-bottom:2px"><strong>'+b.area+'</strong> — Segnalamento '+b.pres+'</div>'
      +'<div style="font-size:11px;color:#333;margin-bottom:2px">BOA '+b.boa+' — Boa ad asta gialla con miraglio X</div>'
      +'<div style="font-size:10px;color:#888;margin-bottom:6px">Divieto balneazione, navigazione e pesca nel raggio di 100 mt dai motopontoni</div>'
      +'<div style="font-size:10px;font-weight:700;color:#cc0000">Validità: prorogata fino al 03.06.2026 (Ord. 37/2026)</div>'
      +'</div>';
    m.bindPopup(popHtml,{maxWidth:240,keepInView:true,autoClose:false,closeOnClick:false});
    m.on("popupopen",function(){_boePopupOpen=true;});
    m.on("popupclose",function(){_boePopupOpen=false;});
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
export function addCorridoiLancio(){
  if(!window.mapObj)return;
  // Layer statico: se già creato non ricrearlo (la rimozione chiuderebbe il tooltip aperto ad ogni refresh)
  if(_corridoiMarkers.length>0)return;
  var ds={color:"#f97316",weight:7,opacity:0.9,dashArray:"1,12",lineCap:"round",lineJoin:"round",interactive:true};
  CORRIDOI_LANCIO.forEach(function(c){
    [c.edge1,c.edge2].forEach(function(edge){
      var ln=L.polyline(edge,ds).addTo(window.mapObj);
      ln.bindTooltip(
        '<div style="font-size:12px;font-weight:700;color:#f97316">⛵ '+c.name+'</div>'
        +'<div style="font-size:11px;color:#333">Divieto balneazione - Riservato natanti (Ord. 29/2026)</div>',
        {sticky:true,opacity:0.95});
      _corridoiMarkers.push(ln);
      var dot=L.circleMarker(edge[1],{radius:6,color:"#f97316",fillColor:"#f97316",fillOpacity:1,weight:0,interactive:false}).addTo(window.mapObj);
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

  var lineStyle={color:'#f97316',weight:2.5,opacity:0.8,dashArray:'10,7',interactive:true};
  var ttHtml='<div style="font-family:sans-serif;font-size:12px;font-weight:700;color:#f97316">'
    +'\u2693 Limite 300 mt dalla battigia</div>'
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
  var line=L.polyline(pts,lineStyle).addTo(window.mapObj);
  line.bindTooltip(ttHtml,{sticky:true,opacity:0.95});
  _limitLines.push(line);
}

export function addGuardiaMedicaMarker(){
  if(!window.mapObj||window.guardiaMedicaMarker)return;
  var gmIcon=L.divIcon({
    className:"",
    html:'<div style="width:25px;height:30px;border-radius:5px;overflow:hidden;'
        +'box-shadow:0 2px 6px rgba(0,0,0,.5);border:2px solid #c62828;background:#fff;'
        +'display:flex;align-items:center;justify-content:center;padding:1px;box-sizing:border-box;">'
        +'<img src="data:image/jpeg;base64,'+GM_B64+'" style="width:100%;height:100%;object-fit:contain;display:block;"/></div>',
    iconSize:[25,30],iconAnchor:[12,15],popupAnchor:[0,-16]
  });
  window.guardiaMedicaMarker=L.marker([GM_POINT.lat,GM_POINT.lng],{icon:gmIcon}).addTo(window.mapObj);
  var htmlPopup='<div style="font-family:sans-serif;min-width:240px;line-height:1.5">'
    +'<div style="font-size:14px;font-weight:700;color:#c62828;margin-bottom:6px">Guardia Medica - Roseto degli Abruzzi</div>'
    +'<div style="font-size:11px;color:#333;margin-bottom:2px"><strong>Indirizzo:</strong> Vicolo Monte Grappa, 1 - 64026 Roseto degli Abruzzi (TE)</div>'
    +'<div style="font-size:11px;color:#333;margin-bottom:4px"><strong>Tel.:</strong> <a href="tel:0861440620" style="color:#c62828;text-decoration:none;font-weight:700">0861 440620</a></div>'
    +'<div style="font-size:11px;color:#333;margin-bottom:2px;margin-top:4px"><strong>Orari:</strong><br>'
    +'Lun: 20:00\u201300:00<br>'
    +'Mar\u2013Ven: 00:00\u201308:00 / 20:00\u201300:00<br>'
    +'Sab: 00:00\u201308:00 / 10:00\u201320:00<br>'
    +'Dom: 08:00\u201320:00</div>'
    +'<div style="font-size:10px;color:#888;margin-bottom:8px">L\'orario pu\u00f2 variare</div>'
    +'<a href="https://www.google.com/maps/dir/?api=1&destination=42.6789,14.0128&travelmode=walking" target="_blank" '
    +'style="display:block;text-align:center;background:#c62828;color:#fff;text-decoration:none;padding:8px 10px;border-radius:8px;font-size:12px;font-weight:700">\uD83E\uDDED Apri indicazioni</a>'
    +'</div>';
  window.guardiaMedicaMarker.bindPopup(htmlPopup,{maxWidth:270,keepInView:true,autoPanPadding:[20,20]});
}

export function addVVFMarker(){
  if(!window.mapObj||window.vvfMarker)return;
  var vvfIcon=L.divIcon({
    className:'',
    html:'<div style="width:36px;height:36px;border-radius:50%;overflow:hidden;box-shadow:0 2px 6px rgba(0,0,0,.5);border:2px solid #fff;background:#CC0000;">'
        +'<img src="data:image/png;base64,'+VVF_B64+'" style="width:100%;height:100%;object-fit:contain;display:block;"/></div>',
    iconSize:[36,36],iconAnchor:[18,18],popupAnchor:[0,-20]
  });
  window.vvfMarker=L.marker([VVF_POINT.lat,VVF_POINT.lng],{icon:vvfIcon}).addTo(window.mapObj);
  var htmlPopup='<div style="font-family:sans-serif;min-width:240px;line-height:1.5">'
    +'<div style="font-size:13px;font-weight:700;color:#CC0000;margin-bottom:4px">Vigili del Fuoco</div>'
    +'<div style="font-size:11px;color:#555;margin-bottom:6px">Distaccamento e Nucleo Sommozzatori<br>Roseto degli Abruzzi (TE)</div>'
    +'<div style="font-size:11px;color:#333;margin-bottom:2px"><strong>Tel.:</strong> <a href="tel:0858992222" style="color:#CC0000;text-decoration:none;font-weight:700">085 899 2222</a></div>'
    +'<div style="font-size:11px;color:#333;margin-bottom:8px"><strong>Sito:</strong> <a href="http://www.vigilfuoco.it/" target="_blank" style="color:#CC0000;text-decoration:none">www.vigilfuoco.it</a></div>'
    +'<a href="https://www.google.com/maps/dir/?api=1&destination=42.660998759620824,14.026752032971247&travelmode=driving" target="_blank" '
    +'style="display:block;text-align:center;background:#CC0000;color:#fff;text-decoration:none;padding:8px 10px;border-radius:8px;font-size:12px;font-weight:700">🧭 Apri indicazioni</a>'
    +'</div>';
  window.vvfMarker.bindPopup(htmlPopup,{maxWidth:270,keepInView:true,autoPanPadding:[20,20]});
}

export function addFinanzaMarker(){
  if(!window.mapObj||window.finanzaMarker)return;
  var finanzaIcon=L.divIcon({
    className:"",
    html:'<div style="width:36px;height:36px;border-radius:50%;overflow:hidden;'
        +'box-shadow:0 2px 6px rgba(0,0,0,.5);border:2px solid #f5c800;background:#fff;">'
        +'<img src="data:image/png;base64,'+FINANZA_B64+'" style="width:100%;height:100%;object-fit:contain;display:block;"/></div>',
    iconSize:[36,36],iconAnchor:[18,18],popupAnchor:[0,-20]
  });
  window.finanzaMarker=L.marker([FINANZA_POINT.lat,FINANZA_POINT.lng],{icon:finanzaIcon}).addTo(window.mapObj);
  var htmlPopup='<div style="font-family:sans-serif;min-width:240px;line-height:1.5">'
    +'<div style="font-size:14px;font-weight:700;color:#2e7d32;margin-bottom:6px">Guardia di Finanza - Roseto degli Abruzzi</div>'
    +'<div style="font-size:11px;color:#333;margin-bottom:2px"><strong>Indirizzo:</strong> Via Fonte Dell\'Olmo, Snc - 64026 Roseto degli Abruzzi (TE)</div>'
    +'<div style="font-size:11px;color:#333;margin-bottom:2px"><strong>Tel.:</strong> <a href="tel:0858990110" style="color:#2e7d32;text-decoration:none">085 899 0110</a></div>'
    +'<div style="font-size:11px;color:#333;margin-bottom:2px;margin-top:4px"><strong>Orari:</strong><br>'
    +'Lun\u2013Gio: 08:00\u201314:00 / 15:00\u201318:00<br>Ven: 08:00\u201314:00<br>Sab\u2013Dom: Chiuso</div>'
    +'<div style="font-size:10px;color:#888;margin-bottom:8px">L\'orario pu\u00f2 variare</div>'
    +'<a href="https://www.google.com/maps/dir/?api=1&destination=42.66237,14.02528&travelmode=walking" target="_blank" '
    +'style="display:block;text-align:center;background:#2e7d32;color:#fff;text-decoration:none;padding:8px 10px;border-radius:8px;font-size:12px;font-weight:700">Apri indicazioni</a>'
    +'</div>';
  window.finanzaMarker.bindPopup(htmlPopup,{maxWidth:270,keepInView:true,autoPanPadding:[20,20]});
}

export function addCCMarker(){
  if(!window.mapObj||window.ccMarker)return;
  var ccIcon=L.divIcon({
    className:"",
    html:'<div style="width:36px;height:36px;border-radius:50%;overflow:hidden;'
        +'box-shadow:0 2px 6px rgba(0,0,0,.5);border:2px solid #fff;background:#fff;">'
        +'<img src="data:image/png;base64,'+CC_B64+'" style="width:100%;height:100%;object-fit:contain;display:block;"/></div>',
    iconSize:[36,36],iconAnchor:[18,18],popupAnchor:[0,-18]
  });
  window.ccMarker=L.marker([CC_POINT.lat,CC_POINT.lng],{icon:ccIcon,zIndexOffset:100}).addTo(window.mapObj);
  var ccHtml='<div style="font-family:sans-serif;min-width:220px;line-height:1.45">'
    +'<div style="font-size:14px;font-weight:700;color:#1a237e;margin-bottom:6px">Carabinieri - Comando Stazione di Roseto degli Abruzzi</div>'
    +'<div style="font-size:11px;color:#333;margin-bottom:2px"><strong>Indirizzo:</strong> Via Gramsci, 34 - 64026 Roseto degli Abruzzi (TE)</div>'
    +'<div style="font-size:11px;color:#333;margin-bottom:2px"><strong>Emergenze:</strong> <a href="tel:112" style="color:#1a237e;text-decoration:none;font-weight:700">112</a></div>'
    +'<div style="font-size:11px;color:#333;margin-bottom:2px"><strong>Tel. locale:</strong> <a href="tel:0858990131" style="color:#1a237e;text-decoration:none">085 899 0131</a></div>'
    +'<div style="font-size:12px;color:#333;margin-bottom:8px"><strong>Orari sportello:</strong> Tutti i giorni 08:30–13:00 / 15:00–19:00</div>'
    +'<a href="https://www.google.com/maps/dir/?api=1&destination=42.6690839,14.0202191"'
    +' target="_blank" style="display:block;text-align:center;background:#1a237e;color:#fff;'
    +'text-decoration:none;padding:8px 10px;border-radius:8px;font-size:12px;font-weight:700">Apri indicazioni</a>'
    +'</div>';
  window.ccMarker.bindPopup(ccHtml,{maxWidth:270,keepInView:true,autoPanPadding:[20,20]});
}

export function addPLMarker(){
  if(!window.mapObj||window.plMarker)return;
  var plIcon=L.divIcon({
    className:"",
    html:'<div style="width:36px;height:36px;border-radius:50%;overflow:hidden;'
        +'box-shadow:0 2px 6px rgba(0,0,0,.5);border:2px solid #fff;background:#fff;">'
        +'<img src="data:image/png;base64,'+PL_B64+'" style="width:100%;height:100%;object-fit:contain;display:block;"/></div>',
    iconSize:[36,36],iconAnchor:[18,18],popupAnchor:[0,-18]
  });
  window.plMarker=L.marker([PL_POINT.lat,PL_POINT.lng],{icon:plIcon,zIndexOffset:-100}).addTo(window.mapObj);
  var plHtml='<div style="font-family:sans-serif;min-width:220px;line-height:1.45">'
    +'<div style="font-size:14px;font-weight:700;color:#1a237e;margin-bottom:6px">Polizia Locale - Roseto degli Abruzzi</div>'
    +'<div style="font-size:11px;color:#333;margin-bottom:2px"><strong>Indirizzo:</strong> Via Calabria, 17 - 64026 Roseto degli Abruzzi (TE)</div>'
    +'<div style="font-size:11px;color:#333;margin-bottom:2px"><strong>Tel.:</strong> <a href="tel:0858995192" style="color:#1a237e;text-decoration:none;font-weight:700">085 899 5192</a></div>'
    +'<div style="font-size:11px;color:#333;margin-bottom:8px"><strong>Orari:</strong> Lun–Sab 08:00–14:00</div>'
    +'<a href="https://www.google.com/maps/dir/?api=1&destination=42.66890816262959,14.020188423768815"'
    +' target="_blank" style="display:block;text-align:center;background:#1a237e;color:#fff;'
    +'text-decoration:none;padding:8px 10px;border-radius:8px;font-size:12px;font-weight:700">Apri indicazioni</a>'
    +'</div>';
  window.plMarker.bindPopup(plHtml,{maxWidth:270,keepInView:true,autoPanPadding:[20,20]});
}

export function addComuneMarker(){
  if(!window.mapObj||window.comuneMarker)return;
  var comuneIcon=L.divIcon({
    className:"",
    html:'<div style="width:25px;height:30px;border-radius:5px;overflow:hidden;box-shadow:0 2px 6px rgba(0,0,0,.5);border:2px solid #1565c0;background:#fff;display:flex;align-items:center;justify-content:center;padding:2px;box-sizing:border-box;">'
        +'<img src="data:image/png;base64,'+STEMMA_B64+'" style="width:25px;height:30px;object-fit:contain;display:block;"/></div>',
    iconSize:[25,30],iconAnchor:[12,15],popupAnchor:[0,-16]
  });
  window.comuneMarker=L.marker([COMUNE_POINT.lat,COMUNE_POINT.lng],{icon:comuneIcon}).addTo(window.mapObj);
  var htmlPopup='<div style="font-family:sans-serif;min-width:240px;line-height:1.5">'
    +'<div style="font-size:13px;font-weight:700;color:#1565c0;margin-bottom:4px">Comune di Roseto degli Abruzzi</div>'
    +'<div style="font-size:11px;color:#333;margin-bottom:1px"><strong>Indirizzo:</strong> Piazza della Repubblica - 64026 Roseto degli Abruzzi (TE)</div>'
    +'<div style="font-size:11px;color:#333;margin-bottom:2px"><strong>Tel.:</strong> <a href="tel:085894531" style="color:#1565c0;text-decoration:none">085 894531</a></div>'
    +'<div style="font-size:11px;color:#333;margin-bottom:2px"><strong>Email:</strong> <a href="mailto:protocollo@comune.roseto.te.it" style="color:#1565c0;text-decoration:none">protocollo@comune.roseto.te.it</a></div>'
    +'<div style="font-size:11px;color:#333;margin-bottom:2px"><strong>Sito:</strong> <a href="https://www.comune.roseto.te.it/" target="_blank" style="color:#1565c0">www.comune.roseto.te.it</a></div>'
    +'<div style="font-size:11px;color:#333;margin-bottom:2px;margin-top:4px"><strong>Orari sportello:</strong><br>'
    +'Lun: 08:30\u201312:30<br>Mar: 08:30\u201312:30 / 16:30\u201317:30<br>Mer: Chiuso<br>Gio: 08:30\u201312:30 / 16:30\u201317:30<br>Ven: 08:30\u201312:30<br>Sab: 09:00\u201311:45<br>Dom: Chiuso</div>'
    +'<a href="https://www.google.com/maps/dir/?api=1&destination=42.6796819,14.0110622&travelmode=walking" target="_blank" '
    +'style="display:block;text-align:center;background:#1565c0;color:white;padding:6px;border-radius:6px;font-size:11px;font-weight:600;text-decoration:none">'
    +'\uD83E\uDDED Apri indicazioni</a></div>';
  window.comuneMarker.bindPopup(htmlPopup,{maxWidth:270,keepInView:true,autoPanPadding:[20,20]});
}

export function addIATMarker(){
  if(!window.mapObj||window.iatMarker)return;
  var iatIcon=L.divIcon({
    className:"",
    html:'<div style="width:22px;height:22px;border-radius:4px;overflow:hidden;box-shadow:0 2px 6px rgba(0,0,0,.5);border:2px solid #e6b800;background:#f5c800;">'
        +'<img src="data:image/jpeg;base64,'+IAT_B64+'" style="width:100%;height:100%;object-fit:cover;display:block;"/></div>',
    iconSize:[22,22],iconAnchor:[11,11],popupAnchor:[0,-13]
  });
  window.iatMarker=L.marker([IAT_POINT.lat,IAT_POINT.lng],{icon:iatIcon}).addTo(window.mapObj);
  var htmlPopup='<div style="font-family:sans-serif;min-width:240px;line-height:1.5">'
    +'<div style="font-size:13px;font-weight:700;color:#b8860b;margin-bottom:4px">IAT Roseto degli Abruzzi</div>'
    +'<div style="font-size:10px;color:#888;margin-bottom:3px">Ufficio Informazioni e Accoglienza Turistica</div>'
    +'<div style="font-size:11px;color:#333;margin-bottom:1px"><strong>Indirizzo:</strong> Piazza della Libert\u00e0, 37/38 - 64026 Roseto degli Abruzzi (TE)</div>'
    +'<div style="font-size:11px;color:#333;margin-bottom:2px"><strong>Tel.:</strong> <a href="tel:0858991157" style="color:#1565c0;text-decoration:none">0858991157</a></div>'
    +'<div style="font-size:11px;color:#333;margin-bottom:2px"><strong>Facebook:</strong> <a href="https://www.facebook.com/iatrosetodegliabruzzi/" target="_blank" style="color:#1877f2">iatrosetodegliabruzzi</a></div>'
    +'<div style="font-size:11px;color:#333;margin-bottom:2px;margin-top:4px"><strong>Orari:</strong><br>'
    +'Lun: 14:00\u201319:00<br>Mar: Chiuso<br>Mer: Chiuso<br>Gio: 09:00\u201312:00<br>Ven: 09:00\u201314:00<br>Sab: 09:00\u201314:00<br>Dom: 10:00\u201312:00</div>'
    +'<a href="https://www.google.com/maps/dir/?api=1&destination=42.6775099,14.0139231&travelmode=walking" target="_blank" '
    +'style="display:block;text-align:center;background:#e6b800;color:#1a1a1a;padding:6px;border-radius:6px;font-size:11px;font-weight:600;text-decoration:none">'
    +'\uD83E\uDDED Apri indicazioni</a></div>';
  window.iatMarker.bindPopup(htmlPopup,{maxWidth:270,keepInView:true,autoPanPadding:[20,20]});
}

export function addZoneVietate(){
  if(!window.mapObj)return;
  window.zoneVietateMarkers.forEach(function(m){if(m&&m.remove)m.remove();});
  window.zoneVietateMarkers=[];
  ZONE_VIETATE.forEach(function(z){
    var rect=L.polygon(z.latlngs,{
      color:"#cc0000",
      weight:2,
      opacity:0.85,
      fillColor:"#ff0000",
      fillOpacity:0.18,
      dashArray:"6,4"
    }).addTo(window.mapObj);
    var bounds=rect.getBounds();
    var center=[
      (bounds.getNorth()+bounds.getSouth())/2,
      (bounds.getEast()+bounds.getWest())/2
    ];
    var labelIcon=L.divIcon({
      className:"",
      html:'<div style="background:rgba(180,0,0,0.82);color:#fff;font-size:10px;font-weight:700;padding:2px 5px;border-radius:4px;white-space:nowrap;box-shadow:0 1px 4px rgba(0,0,0,.5);">⛔ DIVIETO BALNEAZIONE</div>',
      iconAnchor:[72,10]
    });
    var labelMarker=L.marker(center,{icon:labelIcon,interactive:true}).addTo(window.mapObj);
    var popup='<div style="font-family:sans-serif;min-width:230px;line-height:1.5">'
      +'<div style="background:#cc0000;color:#fff;font-weight:700;font-size:12px;padding:6px 10px;border-radius:6px 6px 0 0;margin:-1px -1px 8px -1px">⛔ '+z.name+'</div>'
      +'<div style="font-size:11px;color:#333;margin-bottom:6px">'+z.desc+'</div>'
      +''
      +'</div>';
    rect.bindPopup(popup,{maxWidth:270,keepInView:true});
    labelMarker.bindPopup(popup,{maxWidth:270,keepInView:true});
    window.zoneVietateMarkers.push(rect,labelMarker);
  });
}

export function addPortoroseMarker(){
  if(!window.mapObj||window.portoroseMarker)return;
  var portoroseIcon=L.divIcon({
    className:"",
    html:'<div style="height:22px;padding:1px 3px;border-radius:4px;overflow:hidden;box-shadow:0 2px 6px rgba(0,0,0,.5);border:2px solid #1a3b8c;background:#fff;display:flex;align-items:center;justify-content:center;">'
        +'<img src="data:image/jpeg;base64,'+PORTOROSE_B64+'" style="height:16px;width:auto;object-fit:contain;display:block;"/></div>',
    iconSize:[78,26],iconAnchor:[39,13],popupAnchor:[0,-15]
  });
  window.portoroseMarker=L.marker([PORTOROSE_POINT.lat,PORTOROSE_POINT.lng],{icon:portoroseIcon}).addTo(window.mapObj);
  var htmlPopup='<div style="font-family:sans-serif;min-width:240px;line-height:1.5">'
    +'<div style="text-align:center;margin-bottom:8px;padding-bottom:8px;border-bottom:1px solid #e0e0e0">'
    +'<img src="data:image/jpeg;base64,'+PORTOROSE_POPUP_B64+'" style="height:30px;width:auto;object-fit:contain;display:inline-block;"/></div>'
    +'<div style="font-size:11px;color:#333;margin-bottom:2px"><strong>Indirizzo:</strong> Via Tamigi, 1 — Roseto degli Abruzzi (TE)</div>'
    +'<div style="font-size:11px;color:#333;margin-bottom:2px"><strong>Tel.:</strong> <a href="tel:+393298034310" style="color:#1a3b8c;text-decoration:none">329 803 4310</a></div>'
    +'<div style="font-size:11px;color:#333;margin-bottom:2px"><strong>Sito:</strong> <a href="https://www.portiitaliani.com/porto-rose-roseto-degli-abruzzi/" target="_blank" style="color:#1a3b8c;text-decoration:none">portiitaliani.com</a></div>'
    +'<div style="font-size:11px;color:#333;margin-bottom:4px;margin-top:4px"><strong>Orari:</strong> tutti i giorni<br>'
    +'08:30–13:00 / 15:00–19:00</div>'
    +'<a href="https://www.google.com/maps/dir/?api=1&destination=42.6565304172608,14.035017344909056&travelmode=walking" target="_blank" '
    +'style="display:block;text-align:center;background:#1a3b8c;color:white;padding:7px;border-radius:7px;font-size:11px;font-weight:700;text-decoration:none">'
    +'⛵ Apri indicazioni</a></div>';
  window.portoroseMarker.bindPopup(htmlPopup,{maxWidth:270,keepInView:true,autoPanPadding:[20,20]});
}
export function addRosetanaMarker(){
  if(!window.mapObj||window.rosetanaMarker)return;
  var rosetanaIcon=L.divIcon({
    className:"",
    html:'<div style="width:30px;height:30px;border-radius:50%;overflow:hidden;box-shadow:0 2px 6px rgba(0,0,0,.5);border:2px solid #1a6bb5;background:#fff;">'
        +'<img src="data:image/jpeg;base64,'+ROSETANA_B64+'" style="width:100%;height:100%;object-fit:cover;display:block;"/></div>',
    iconSize:[30,30],iconAnchor:[15,15],popupAnchor:[0,-17]
  });
  window.rosetanaMarker=L.marker([ROSETANA_POINT.lat,ROSETANA_POINT.lng],{icon:rosetanaIcon}).addTo(window.mapObj);
  var htmlPopup='<div style="font-family:sans-serif;min-width:250px;line-height:1.5">'
    +'<div style="display:flex;align-items:center;gap:8px;margin-bottom:6px">'
    +'<div style="width:36px;height:36px;border-radius:50%;overflow:hidden;flex-shrink:0;border:2px solid #1a6bb5">'
    +'<img src="data:image/jpeg;base64,'+ROSETANA_B64+'" style="width:100%;height:100%;object-fit:cover;display:block;"/></div>'
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
  window.rosetanaMarker.bindPopup(htmlPopup,{maxWidth:280,keepInView:true,autoPanPadding:[20,20]});
}

export function ensureLocamareMarker(){
  if(!window.mapObj || window.locamareMarker) return;

  const locamareIcon = L.divIcon({
    className:"",
    html:`<div style="width:40px;height:40px;border-radius:50%;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,.5);border:2px solid #153E8C;background:#fff;padding:2px;box-sizing:border-box;"><img src="logo.png" style="width:100%;height:100%;object-fit:contain;display:block;"/></div>`,
    iconSize:[40,40],
    iconAnchor:[20,20],
    popupAnchor:[0,-20]
  })

  window.locamareMarker = L.marker([42.669431107568684,14.024105577318382], {icon: locamareIcon}).addTo(window.mapObj);

  const locamarePopup = `
    <div style="font-family:sans-serif;min-width:220px;line-height:1.45">
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

  window.locamareMarker.bindPopup(locamarePopup,{maxWidth:270,keepInView:true,autoPanPadding:[20,20]});
}


// RENDER

