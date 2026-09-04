import { FLAG_COLORS, STATIONS, _escapeHtml, _openNoteModal, addReport, flagsData, fmt, render, setFlag, stationEmergenciesRef, stationMode, stationNotesData, zonaPostazione } from "./core.js";
import { renderChatPanel, createRadioRecorder } from "./chat.js";

// Il registratore e il pulsante vivono fuori dalla funzione di disegno: il
// pannello viene ridisegnato spesso, e un registratore ricreato a ogni giro
// perderebbe la trasmissione in corso. Qui ne esiste uno solo, e le scritte
// finiscono sempre sul pulsante attualmente a schermo.
let _radioTile=null;
let _radio=null;

function _radioFace(bg,titolo,sotto){
  if(!_radioTile)return;
  _radioTile.style.setProperty("--st-tinta",bg);
  _radioTile.innerHTML='<span class="st-tile__label">'+titolo+'</span><span class="st-tile__sub">'+sotto+'</span>';
}
function _radioIdle(sotto){_radioFace("#4a4a46","🎙️ COMUNICAZIONE RADIO",sotto||"tieni premuto per parlare");}
function _radioIdleTraUnPo(sotto,ms){
  _radioIdle(sotto);
  setTimeout(function(){if(!_radio||!_radio.isRecording())_radioIdle();},ms||2500);
}
function _radioRecorder(){
  if(_radio)return _radio;
  _radio=createRadioRecorder({
    onStart:function(){_radioFace("#c0392b","🔴 STO TRASMETTENDO","rilascia per inviare · 0:00");},
    onTick:function(sec){
      const m=Math.floor(sec/60),r=sec%60;
      _radioFace("#c0392b","🔴 STO TRASMETTENDO","rilascia per inviare · "+m+":"+String(r).padStart(2,"0"));
    },
    onSending:function(){_radioIdle("invio in corso…");},
    onSent:function(){_radioIdleTraUnPo("✓ inviato a tutte le postazioni");},
    onTooShort:function(){_radioIdleTraUnPo("tieni premuto mentre parli");},
    onError:function(msg){_radioIdleTraUnPo(msg,4000);},
    onIdle:function(){_radioIdle();}
  });
  return _radio;
}

// Il guscio Android (MainActivity.dispatchKeyEvent) intercetta i tasti laterali
// e li rilancia qui come eventi di finestra: sono gli stessi due momenti del
// dito sul pulsante, premuto parte e rilasciato invia. Fuori dall'app nativa
// questi eventi non arrivano mai e il pulsante a schermo resta l'unica via.
let _pttArmato=false;
function _armaTastoRadio(){
  if(_pttArmato)return;
  _pttArmato=true;
  // Il pannello si ridisegna da solo e _radioTile puo' essere un pulsante non
  // piu' a schermo: senza questo controllo il tasto trasmetterebbe anche dalla
  // chat o dall'app pubblica, dove nessuno se lo aspetta.
  window.addEventListener("omniaPttDown",function(){
    if(!_radioTile||!document.body.contains(_radioTile))return;
    _radioRecorder().start();
  });
  window.addEventListener("omniaPttUp",function(){
    if(_radio&&_radio.isRecording())_radio.stopAndSend();
  });
}
import { _renderDeviceActivation } from "./device.js";

// Schermata unica dell'app di postazione finche' il dispositivo non e' stato
// abilitato: nessuna via verso l'app pubblica, solo lo stato della richiesta.
// Il corpo e' lo stesso pannello usato nella pagina di login dell'app web, cosi'
// la logica di richiesta e attesa vive in un posto solo.
export function renderAttivazione(page){
  const wrap=document.createElement("div");
  wrap.style.cssText="max-width:520px;margin:0 auto;padding:18px 4px";

  const title=document.createElement("h2");
  title.style.cssText="font-size:19px;margin:0 0 6px";
  title.textContent="Dispositivo di postazione";
  wrap.appendChild(title);

  const sub=document.createElement("p");
  sub.style.cssText="font-size:13px;color:var(--text2);line-height:1.5;margin:0 0 16px";
  sub.textContent="Questo apparato non è ancora assegnato a una postazione. Invia la richiesta: il centro operativo la approva e il pannello si apre da solo, senza riavviare l'app.";
  wrap.appendChild(sub);

  // Contenitore dedicato: _renderDeviceActivation comincia svuotando cio che
  // riceve, quindi passargli il wrap cancellerebbe titolo e spiegazione.
  const box=document.createElement("div");
  wrap.appendChild(box);
  _renderDeviceActivation(box);
  page.appendChild(wrap);
}

export function _stationNeighborsClient(num){
  var ordered=STATIONS.slice().sort(function(a,b){return a.lat-b.lat;});
  var idx=ordered.findIndex(function(s){return String(s.num)===String(num);});
  if(idx===-1)return{north:[],south:[]};
  return{south:ordered.slice(Math.max(0,idx-2),idx),north:ordered.slice(idx+1,idx+3)};
}

export function _sendStationEmergency(num,zoneStr){
  const r={id:Date.now(),type:"emergenza",sub:"Allarme rapido",
    notes:"🚨 Allarme EMERGENZA inviato dal pulsante rapido della postazione",
    zone:zoneStr,author:"Postazione P."+num,phone:null,role:"station",quickAlert:true,
    ts:new Date().toISOString(),status:"aperta",photo:null,gps:null};
  return Promise.all([
    addReport(r),
    stationEmergenciesRef.push({station:String(num),ts:Date.now()})
  ]);
}

// Il nome vale solo se la copia dei turni e' di oggi: se il ponte col progetto
// dei turni si e' interrotto ieri sera, meglio non mostrare nessuno che
// mostrare il bagnino di ieri come se fosse in servizio adesso.
function _bagninoInTurno(num){
  const t=window.turniOggiData;
  if(!t||!t.postazioni)return null;
  const oggi=new Intl.DateTimeFormat("sv-SE",{timeZone:"Europe/Rome",year:"numeric",month:"2-digit",day:"2-digit"}).format(new Date());
  if(t.data!==oggi)return null;
  const p=t.postazioni[String(num)];
  return (p&&p.adesso)||null;
}

export function renderStationPanel(page){
  const num=stationMode;

  if(window._stationChatOpen){
    const chatWrap=document.createElement("div");chatWrap.className="st-chat";
    const back=document.createElement("button");back.className="back-btn";back.textContent="← Torna alla postazione";
    back.addEventListener("click",function(){window._stationChatOpen=false;render("station");});
    chatWrap.appendChild(back);
    renderChatPanel(chatWrap,{isStation:true});
    page.appendChild(chatWrap);
    return;
  }

  const st=STATIONS.find(s=>String(s.num)===String(num));
  const stName=st?st.name:"";
  const zoneStr=zonaPostazione(num);
  const flagColor=flagsData[num]||"verde";
  const note=stationNotesData[String(num)];
  const openReports=Object.values(window.reportsData||{}).filter(r=>r&&r.status==="aperta"&&r.zone===zoneStr);

  const wrap=document.createElement("div");wrap.className="st-wrap";

  // Header
  const hdr=document.createElement("div");hdr.className="st-hdr";
  const hdrTitle=document.createElement("span");hdrTitle.className="st-hdr__title";
  hdrTitle.textContent="P."+num+" · "+stName;
  const hdrClock=document.createElement("span");hdrClock.id="_stClock";hdrClock.className="st-hdr__clock";
  hdrClock.textContent=new Date().toLocaleTimeString("it-IT",{hour:"2-digit",minute:"2-digit"});
  hdr.appendChild(hdrTitle);hdr.appendChild(hdrClock);wrap.appendChild(hdr);

  // Chi e' in turno qui adesso, secondo l'app dei turni. Compare da solo: non
  // c'e' niente da scegliere o confermare, e se manca il dato non compare
  // niente - una riga vuota direbbe meno di nessuna riga.
  const inTurno=_bagninoInTurno(num);
  if(inTurno){
    const turnoEl=document.createElement("div");
    turnoEl.className="st-turno";
    turnoEl.innerHTML='<span class="st-turno__label">IN TURNO</span>'
      +'<span class="st-turno__nome">'+_escapeHtml(inTurno)+'</span>';
    wrap.appendChild(turnoEl);
  }

  const grid=document.createElement("div");
  grid.className="st-grid";

  // Tile BANDIERA
  const flagLabels={verde:"VERDE",gialla:"GIALLA",rossa:"ROSSA"};
  const flagTile=document.createElement("button");
  flagTile.type="button";
  flagTile.className="st-tile st-wide";
  // Il colore della bandiera e' un dato, non uno stile: viaggia come variabile
  // e il foglio di stile lo usa come sfondo.
  flagTile.style.setProperty("--st-tinta",FLAG_COLORS[flagColor]);
  flagTile.innerHTML='<span class="st-tile__label">BANDIERA</span>'
    +'<span><span class="st-tile__big">'+flagLabels[flagColor]+'</span>'
    +'<span class="st-tile__sub">tocca per cambiare</span></span>';
  const flagChooser=document.createElement("div");
  flagChooser.className="st-flagchooser st-wide";
  [["verde","VERDE"],["gialla","GIALLA"],["rossa","ROSSA"]].forEach(function([v,l]){
    const b=document.createElement("button");b.type="button";
    b.style.setProperty("--st-tinta",FLAG_COLORS[v]);
    if(v===flagColor)b.classList.add("is-attiva");
    b.textContent=l;
    b.addEventListener("click",function(){
      setFlag(num,v).catch(function(e){alert("Errore: "+e.message);});
      flagChooser.classList.remove("is-aperto");
    });
    flagChooser.appendChild(b);
  });
  flagTile.addEventListener("click",function(){
    flagChooser.classList.toggle("is-aperto");
  });
  grid.appendChild(flagTile);grid.appendChild(flagChooser);

  // Tile SEGNALAZIONI + SEGNALA
  //
  // Il numero da solo non diceva abbastanza: "1 aperta" costringeva ad aprire
  // l'elenco per sapere se era un cane sciolto o un annegamento. Il riquadro
  // mostra l'ultima arrivata, cosi' con un'occhiata si sa cosa c'e' in corso;
  // il conto resta, piu' piccolo, perche' serve a capire se ce n'e' altre.
  const repTile=document.createElement("button");repTile.type="button";
  repTile.className="st-tile";
  repTile.style.setProperty("--st-tinta","#1A3B8C");
  if(openReports.length){
    const ultima=openReports.slice().sort(function(a,b){return new Date(b.ts)-new Date(a.ts);})[0];
    repTile.innerHTML='<span class="st-tile__label">SEGNALAZIONI</span>'
      +'<span class="st-tile__anteprima">'+_escapeHtml(ultima.sub||"Segnalazione")+'</span>'
      +'<span class="st-tile__sub">'+openReports.length+' apert'+(openReports.length===1?"a":"e")
      +' · '+_escapeHtml(fmt(ultima.ts))+'</span>';
  }else{
    repTile.innerHTML='<span class="st-tile__label">SEGNALAZIONI</span>'
      +'<span><span class="st-tile__big">0</span>'
      +'<span class="st-tile__sub">nessuna aperta</span></span>';
  }
  // Una pagina sua, non piu' un elenco che si apriva sotto la griglia: li' le
  // schede erano di sola lettura e non c'era modo di dire "risolta".
  repTile.addEventListener("click",function(){render("segnalazioni-aperte");});

  const segTile=document.createElement("button");segTile.type="button";
  segTile.className="st-tile st-tile--segnala";
  segTile.style.setProperty("--st-tinta","#D62B1F");
  segTile.innerHTML='<span class="st-tile__label">🚨</span><span class="st-tile__big">SEGNALA</span>';
  segTile.addEventListener("click",function(){window.activeStation=zoneStr;render("submit");});

  grid.appendChild(repTile);grid.appendChild(segTile);

  // Fascia NOTA POSTAZIONE
  const noteBar=document.createElement("button");noteBar.type="button";
  noteBar.className="st-note";
  const noteBarLbl=document.createElement("span");noteBarLbl.className="st-note__label";noteBarLbl.textContent="NOTA POSTAZIONE";
  const noteBarVal=document.createElement("span");noteBarVal.className="st-note__val";
  noteBarVal.textContent=note?String(note).substring(0,40)+(note.length>40?"...":""):"nessuna nota · tocca per aggiungere";
  noteBar.appendChild(noteBarLbl);noteBar.appendChild(noteBarVal);
  noteBar.addEventListener("click",function(){_openNoteModal(num,stName,note);});
  grid.appendChild(noteBar);

  // Tile METEO E DIARIO (placeholder in attesa dell'integrazione dati reale)
  const meteoTile=document.createElement("div");
  meteoTile.className="st-tile";
  meteoTile.style.setProperty("--st-tinta","#0ea5e9");
  meteoTile.innerHTML='<span class="st-tile__label">METEO E DIARIO</span>'
    +'<span class="st-tile__sub">Dati non ancora collegati</span>';
  grid.appendChild(meteoTile);

  // Tile CHAT e COMUNICAZIONE RADIO: due porte sulla stessa schermata, dove
  // convivono i messaggi scritti e quelli vocali. La radio non e' un canale a
  // parte - i vocali viaggiano nella stessa chat e vengono riprodotti da soli
  // sui dispositivi di postazione (vedi ChatAudioService nel progetto Android).
  const chatTile=document.createElement("button");chatTile.type="button";
  chatTile.className="st-tile";
  chatTile.innerHTML='<span class="st-tile__label">💬 CHAT</span><span class="st-tile__sub">con tutte le postazioni</span>';
  chatTile.addEventListener("click",function(){window._stationChatOpen=true;render("station");});
  // La radio e' il pulsante, non una porta verso la chat: si tiene premuto e si
  // parla, come una ricetrasmittente. Il messaggio finisce comunque nella chat,
  // dove resta da riascoltare.
  const wtTile=document.createElement("button");wtTile.type="button";
  wtTile.className="st-tile st-tile--radio";
  _radioTile=wtTile;
  _armaTastoRadio();
  _radioIdle();
  wtTile.addEventListener("pointerdown",function(e){
    e.preventDefault();
    _radioRecorder().start();
  });
  // Nessun ascolto del rilascio sul pulsante: se ne occupa il registratore a
  // livello di finestra, perche' questo pannello si ridisegna da solo quando
  // cambiano bandiere, note o segnalazioni. Se capitava mentre si teneva
  // premuto, il pulsante spariva insieme al suo evento di rilascio e la
  // trasmissione restava aperta senza partire mai.
  wtTile.addEventListener("contextmenu",function(e){e.preventDefault();});
  grid.appendChild(chatTile);grid.appendChild(wtTile);

  wrap.appendChild(grid);
  page.appendChild(wrap);

  // Barra EMERGENZA fissa in basso, tieni-premuto per confermare l'invio
  let emBar=document.getElementById("_stEmergencyBar");
  if(!emBar){
    emBar=document.createElement("div");emBar.id="_stEmergencyBar";emBar.className="st-em";
    document.body.appendChild(emBar);
  }
  emBar.innerHTML="";
  const emBtn=document.createElement("button");emBtn.type="button";emBtn.className="st-em__btn";
  const emFill=document.createElement("div");emFill.className="st-em__fill";
  const emLabel=document.createElement("span");emLabel.className="st-em__label";emLabel.textContent="⚠️ EMERGENZA — tieni premuto";
  emBtn.appendChild(emFill);emBtn.appendChild(emLabel);
  emBar.appendChild(emBtn);

  const HOLD_MS=1500;
  let holdTimer=null,holdStart=0,sent=false;
  function holdCancel(){
    if(holdTimer){clearTimeout(holdTimer);holdTimer=null;}
    emFill.style.transition="width .15s linear";emFill.style.width="0%";
    emLabel.textContent="⚠️ EMERGENZA — tieni premuto";
  }
  function holdStart_(){
    if(sent)return;
    holdStart=Date.now();
    emFill.style.transition="width "+HOLD_MS+"ms linear";
    requestAnimationFrame(function(){emFill.style.width="100%";});
    emLabel.textContent="Rilascia per annullare…";
    holdTimer=setTimeout(function(){
      sent=true;
      emLabel.textContent="Invio in corso…";
      const {north,south}=_stationNeighborsClient(num);
      _sendStationEmergency(num,zoneStr).then(function(){
        const names=function(arr){return arr.map(function(s){return "P."+s.num;}).join(", ")||"nessuna";};
        emLabel.textContent="✅ Allarme inviato — nord: "+names(north)+" · sud: "+names(south)+" + admin/coordinatore";
        setTimeout(function(){sent=false;holdCancel();},4000);
      }).catch(function(e){
        emLabel.textContent="Errore invio: "+e.message;
        setTimeout(function(){sent=false;holdCancel();},4000);
      });
    },HOLD_MS);
  }
  emBtn.addEventListener("pointerdown",function(e){e.preventDefault();holdStart_();});
  emBtn.addEventListener("pointerup",function(){if(!sent)holdCancel();});
  emBtn.addEventListener("pointerleave",function(){if(!sent)holdCancel();});
  emBtn.addEventListener("pointercancel",function(){if(!sent)holdCancel();});

  if(!window._stClockInterval){
    window._stClockInterval=setInterval(function(){
      var el=document.getElementById("_stClock");
      if(el)el.textContent=new Date().toLocaleTimeString("it-IT",{hour:"2-digit",minute:"2-digit"});
    },15000);
  }
}

// BANDIERE
