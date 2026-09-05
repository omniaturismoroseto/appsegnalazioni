import { FLAG_COLORS, STATIONS, _openNoteModal, addReport, flagsData, fmt, render, setFlag, stationEmergenciesRef, stationMode, stationNotesData, zonaPostazione } from "./core.js";
import { renderChatPanel, createRadioRecorder } from "./chat.js";

// Le icone del pannello.
//
// Prima erano emoji dentro la scritta (🚨 💬 🎙️): grandi quanto la scritta
// accanto, cioe' invisibili a un braccio di distanza e sotto il sole - che e'
// esattamente la distanza e la luce in cui questo pannello viene guardato.
// Questi sono tracciati: prendono il colore del riquadro (currentColor) e
// crescono con lui, e la stessa forma torna grande e sbiadita dietro il
// riquadro, dove si riconosce prima ancora di leggere.
//
// Le emoji restano dove sono contenuto - i messaggi della chat, il testo delle
// segnalazioni - e li' continua a occuparsene twemoji.
const ICONE = {
  bandiera: '<path d="M6 3v18"/><path d="M6 4.5h12l-3 4.25L18 13H6z"/>',
  segnalazioni: '<path d="M6 9.5a6 6 0 0 1 12 0c0 4.5 2 5.5 2 5.5H4s2-1 2-5.5Z"/><path d="M10 18.5a2.2 2.2 0 0 0 4 0"/>',
  segnala: '<path d="M12 3.6 2.6 20.4h18.8L12 3.6Z"/><path d="M12 9.6v4.6"/><path d="M12 17.4h.01"/>',
  chat: '<path d="M3.5 5.5h13v8h-8l-5 4v-12Z"/><path d="M8.5 16.5v1h7l5 4v-12h-3"/>',
  radio: '<rect x="9" y="2.6" width="6" height="11" rx="3"/><path d="M5 11a7 7 0 0 0 14 0"/><path d="M12 18v3.2"/><path d="M8.2 21.4h7.6"/>',
  nota: '<path d="M5 3.5h9.5L19 8v12.5H5z"/><path d="M14 3.5V8h5"/><path d="M8.5 12.5h7"/><path d="M8.5 16.5h4.5"/>',
  meteo: '<circle cx="9" cy="7.4" r="3.3"/><path d="M9 1.4v1.3M9 12.1v1.3M3 7.4h1.3M13.7 7.4h1.3M4.8 3.2l.9.9M12.3 10.7l.9.9M13.2 3.2l-.9.9M5.7 10.7l-.9.9"/><path d="M2.6 17.4c1.6 0 1.6-1.3 3.2-1.3s1.6 1.3 3.2 1.3 1.6-1.3 3.2-1.3 1.6 1.3 3.2 1.3 1.6-1.3 3.2-1.3"/><path d="M2.6 21.2c1.6 0 1.6-1.3 3.2-1.3s1.6 1.3 3.2 1.3 1.6-1.3 3.2-1.3 1.6 1.3 3.2 1.3 1.6-1.3 3.2-1.3"/>',
  emergenza: '<path d="M12 3.4a4.6 4.6 0 0 0-4.6 4.6v5.4h9.2V8A4.6 4.6 0 0 0 12 3.4Z"/><path d="M4.4 16.6h15.2"/><path d="M6.4 20.2h11.2"/><path d="M2.6 8.4h1.6"/><path d="M19.8 8.4h1.6"/><path d="M5 4.1l1.1 1.1"/><path d="M19 4.1l-1.1 1.1"/>',
};

// Un contenitore con dentro l'SVG, non l'SVG nudo: la misura la decide il
// foglio di stile sul contenitore, e l'SVG la riempie. aria-hidden perche'
// l'icona ripete la parola che le sta accanto.
function _icona(nome, classe) {
  const el = document.createElement("span");
  el.className = classe;
  el.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" '
    + 'stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + ICONE[nome] + "</svg>";
  return el;
}

// L'intestazione di un riquadro: icona piu' parola, sulla stessa riga.
function _testa(nomeIcona, testo) {
  const t = document.createElement("span");
  t.className = "st-tile__testa";
  t.appendChild(_icona(nomeIcona, "st-tile__ico"));
  t.appendChild(document.createTextNode(testo));
  return t;
}

function _riga(classe, testo) {
  const s = document.createElement("span");
  s.className = classe;
  s.textContent = testo;
  return s;
}

// Il registratore e il pulsante vivono fuori dalla funzione di disegno: il
// pannello viene ridisegnato spesso, e un registratore ricreato a ogni giro
// perderebbe la trasmissione in corso. Qui ne esiste uno solo, e le scritte
// finiscono sempre sul pulsante attualmente a schermo.
let _radioTile=null;
let _radioLabel=null;
let _radioSub=null;
let _radio=null;

// Cambia solo le due scritte e la tinta, senza rifare il contenuto del
// riquadro: riscrivendolo si portava via anche l'icona e la filigrana, che
// sparivano per tutta la durata della trasmissione.
function _radioFace(bg,titolo,sotto){
  if(!_radioTile)return;
  _radioTile.style.setProperty("--st-tinta",bg);
  if(_radioLabel)_radioLabel.textContent=titolo;
  if(_radioSub)_radioSub.textContent=sotto;
}
function _radioIdle(sotto){_radioFace("#3f3f46","RADIO",sotto||"tieni premuto per parlare");}
function _radioIdleTraUnPo(sotto,ms){
  _radioIdle(sotto);
  setTimeout(function(){if(!_radio||!_radio.isRecording())_radioIdle();},ms||2500);
}
function _radioRecorder(){
  if(_radio)return _radio;
  _radio=createRadioRecorder({
    onStart:function(){_radioFace("#c0392b","STO TRASMETTENDO","rilascia per inviare · 0:00");},
    onTick:function(sec){
      const m=Math.floor(sec/60),r=sec%60;
      _radioFace("#c0392b","STO TRASMETTENDO","rilascia per inviare · "+m+":"+String(r).padStart(2,"0"));
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

  // Intestazione: numero, nome, orologio e, sotto lo stesso filo, chi e' in
  // turno. Erano due fasce impilate, con due bordi e due margini spesi per una
  // riga di testo. Il turno resta comunque su una riga sua: dentro
  // l'intestazione avrebbe dovuto dividersi lo spazio col nome e finiva
  // troncato proprio sui nomi lunghi.
  const hdr=document.createElement("div");hdr.className="st-hdr";
  hdr.appendChild(_riga("st-hdr__num","P."+num));
  hdr.appendChild(_riga("st-hdr__nome",stName));
  const hdrClock=_riga("st-hdr__clock",new Date().toLocaleTimeString("it-IT",{hour:"2-digit",minute:"2-digit"}));
  hdrClock.id="_stClock";
  hdr.appendChild(hdrClock);

  // Chi e' in turno qui adesso, secondo l'app dei turni. Compare da solo: non
  // c'e' niente da scegliere o confermare, e se manca il dato non compare
  // niente - una riga vuota direbbe meno di nessuna riga.
  const inTurno=_bagninoInTurno(num);
  if(inTurno){
    const turnoEl=document.createElement("span");
    turnoEl.className="st-turno";
    turnoEl.appendChild(_riga("st-turno__label","IN TURNO"));
    turnoEl.appendChild(_riga("st-turno__nome",inTurno));
    hdr.appendChild(turnoEl);
  }
  wrap.appendChild(hdr);

  const grid=document.createElement("div");
  grid.className="st-grid";

  // Tile BANDIERA
  const flagLabels={verde:"VERDE",gialla:"GIALLA",rossa:"ROSSA"};
  const flagTile=document.createElement("button");
  flagTile.type="button";
  flagTile.className="st-tile st-tile--bandiera st-wide";
  // Il colore della bandiera e' un dato, non uno stile: viaggia come variabile
  // e il foglio di stile lo usa come sfondo.
  flagTile.style.setProperty("--st-tinta",FLAG_COLORS[flagColor]);
  // La parola sta su una targa scura, non direttamente sul colore: in bianco
  // sul giallo era 1,6:1, cioe' illeggibile al sole - e proprio sul riquadro
  // piu' grande dello schermo.
  const targa=document.createElement("span");targa.className="st-bandiera__targa";
  targa.appendChild(_icona("bandiera","st-bandiera__ico"));
  const targaTesti=document.createElement("span");targaTesti.className="st-bandiera__testi";
  targaTesti.appendChild(_riga("st-bandiera__label","BANDIERA"));
  targaTesti.appendChild(_riga("st-bandiera__parola",flagLabels[flagColor]));
  targaTesti.appendChild(_riga("st-bandiera__hint","tocca per cambiare"));
  targa.appendChild(targaTesti);
  flagTile.appendChild(targa);

  const flagChooser=document.createElement("div");
  flagChooser.className="st-flagchooser st-wide";
  [["verde","VERDE"],["gialla","GIALLA"],["rossa","ROSSA"]].forEach(function([v,l]){
    const b=document.createElement("button");b.type="button";
    b.style.setProperty("--st-tinta",FLAG_COLORS[v]);
    if(v===flagColor)b.classList.add("is-attiva");
    // Stessa targa scura del riquadro grande, per la stessa ragione.
    const et=document.createElement("span");et.textContent=l;b.appendChild(et);
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
  repTile.appendChild(_icona("segnalazioni","st-tile__filigrana"));
  repTile.appendChild(_testa("segnalazioni","SEGNALAZIONI"));
  if(openReports.length){
    const ultima=openReports.slice().sort(function(a,b){return new Date(b.ts)-new Date(a.ts);})[0];
    repTile.appendChild(_riga("st-tile__anteprima",ultima.sub||"Segnalazione"));
    repTile.appendChild(_riga("st-tile__sub",
      openReports.length+" apert"+(openReports.length===1?"a":"e")+" · "+fmt(ultima.ts)));
  }else{
    repTile.appendChild(_riga("st-tile__big","0"));
    repTile.appendChild(_riga("st-tile__sub","nessuna aperta"));
  }
  // Una pagina sua, non piu' un elenco che si apriva sotto la griglia: li' le
  // schede erano di sola lettura e non c'era modo di dire "risolta".
  repTile.addEventListener("click",function(){render("segnalazioni-aperte");});

  const segTile=document.createElement("button");segTile.type="button";
  segTile.className="st-tile st-tile--segnala";
  segTile.style.setProperty("--st-tinta","#D62B1F");
  segTile.appendChild(_icona("segnala","st-tile__ico"));
  segTile.appendChild(_riga("st-tile__big","SEGNALA"));
  segTile.addEventListener("click",function(){window.activeStation=zoneStr;render("submit");});

  grid.appendChild(repTile);grid.appendChild(segTile);

  // Tile CHAT e RADIO: due porte sulla stessa schermata, dove convivono i
  // messaggi scritti e quelli vocali. La radio non e' un canale a parte - i
  // vocali viaggiano nella stessa chat e vengono riprodotti da soli sui
  // dispositivi di postazione (vedi ChatAudioService nel progetto Android).
  //
  // I due riquadri erano dello stesso grigio e della stessa forma: si
  // distinguevano solo leggendo, ed erano i due gesti piu' frequenti dopo
  // l'emergenza. Ora la chat ha un colore suo.
  const chatTile=document.createElement("button");chatTile.type="button";
  chatTile.className="st-tile";
  chatTile.style.setProperty("--st-tinta","#0F766E");
  chatTile.appendChild(_icona("chat","st-tile__filigrana"));
  chatTile.appendChild(_testa("chat","CHAT"));
  chatTile.appendChild(_riga("st-tile__sub","con tutte le postazioni"));
  chatTile.addEventListener("click",function(){window._stationChatOpen=true;render("station");});

  // La radio e' il pulsante, non una porta verso la chat: si tiene premuto e si
  // parla, come una ricetrasmittente. Il messaggio finisce comunque nella chat,
  // dove resta da riascoltare.
  const wtTile=document.createElement("button");wtTile.type="button";
  wtTile.className="st-tile st-tile--radio";
  wtTile.appendChild(_icona("radio","st-tile__filigrana"));
  const wtTesta=_testa("radio","RADIO");
  const wtSub=_riga("st-tile__sub","tieni premuto per parlare");
  wtTile.appendChild(wtTesta);wtTile.appendChild(wtSub);
  _radioTile=wtTile;
  // L'ultimo nodo della testa e' il testo della parola: e' quello che cambia in
  // "STO TRASMETTENDO", non l'icona che gli sta accanto.
  _radioLabel=wtTesta.lastChild;
  _radioSub=wtSub;
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

  // Strisce basse: nota di postazione e meteo. Sono due righe da leggere, non
  // bersagli da premere in fretta, e dentro la griglia si prendevano una riga
  // intera togliendola ai riquadri che invece si premono.
  const strisce=document.createElement("div");strisce.className="st-strisce";

  const noteBar=document.createElement("button");noteBar.type="button";
  noteBar.className="st-striscia st-note";
  if(!note)noteBar.classList.add("st-striscia--vuota");
  noteBar.appendChild(_icona("nota","st-striscia__ico"));
  const noteTesti=document.createElement("span");noteTesti.className="st-striscia__testi";
  noteTesti.appendChild(_riga("st-striscia__label","NOTA POSTAZIONE"));
  // Il taglio lo fa il foglio di stile con i puntini, non una sottostringa nel
  // codice: cosi' la nota si allunga o si accorcia con la larghezza dello
  // schermo invece di fermarsi sempre a quaranta caratteri.
  noteTesti.appendChild(_riga("st-striscia__val",note?String(note):"nessuna nota · tocca per aggiungere"));
  noteBar.appendChild(noteTesti);
  noteBar.addEventListener("click",function(){_openNoteModal(num,stName,note);});
  strisce.appendChild(noteBar);

  // METEO E DIARIO: in attesa dell'integrazione dati reale. Finche' non ha
  // niente da dire non si preme e non toglie spazio ai riquadri.
  const meteoBar=document.createElement("div");
  meteoBar.className="st-striscia st-meteo st-striscia--vuota";
  meteoBar.appendChild(_icona("meteo","st-striscia__ico"));
  const meteoTesti=document.createElement("span");meteoTesti.className="st-striscia__testi";
  meteoTesti.appendChild(_riga("st-striscia__label","METEO E DIARIO"));
  meteoTesti.appendChild(_riga("st-striscia__val","Dati non ancora collegati"));
  meteoBar.appendChild(meteoTesti);
  strisce.appendChild(meteoBar);

  wrap.appendChild(strisce);
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
  const emIco=_icona("emergenza","st-em__ico");
  const emLabel=document.createElement("span");emLabel.className="st-em__label";emLabel.textContent="EMERGENZA — tieni premuto";
  emBtn.appendChild(emFill);emBtn.appendChild(emIco);emBtn.appendChild(emLabel);
  emBar.appendChild(emBtn);

  const HOLD_MS=1500;
  let holdTimer=null,holdStart=0,sent=false;
  function holdCancel(){
    if(holdTimer){clearTimeout(holdTimer);holdTimer=null;}
    emFill.style.transition="width .15s linear";emFill.style.width="0%";
    emLabel.textContent="EMERGENZA — tieni premuto";
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
