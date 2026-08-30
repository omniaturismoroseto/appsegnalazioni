// Due canali chat separati, stesso componente parametrizzato:
//
// - "stations" (default): postazioni + operatori + admin, come una radio
//   (vedi tile "Chat" nel pannello postazione, tab "Chat" in dashboard).
//   Supporta anche i messaggi vocali (walkie-talkie).
// - "external": solo admin/coordinatore/CP/forze dell'ordine (tab "Chat
//   esterna" in dashboard) - mai raggiungibile da postazioni/operatori
//   normali, ne' lato interfaccia ne' lato dati (vedi database.rules.json).
//   Solo testo.
//
// Lo stato/listener Firebase di entrambi i canali vive in core.js
// (chatRef/chatMessages/chatResetAt e chatEsternaRef/chatEsternaMessages/
// chatEsternaResetAt) insieme agli altri; qui c'e' solo il disegno del
// pannello.
//
// Destinatario (solo canale "stations"): admin e coordinatore possono
// indirizzare un messaggio - testo o vocale - a TUTTE le postazioni (come
// e' sempre stato: campo "to" assente o "all") oppure a UNA SOLA postazione
// (campo "to" col numero, es. "14"). Le postazioni non hanno il selettore:
// per loro la chat resta la radio di sempre, aperta a tutti.
// Chi riceve: solo la postazione indirizzata, piu' admin/coordinatore che
// dal proprio pannello continuano a seguire tutto il traffico. Il filtro e'
// coerente su tre livelli - elenco messaggi (_chatMsgVisibleToMe qui sotto),
// riproduzione automatica del vocale (_chatMsgAddressedToMe, usata dal
// listener chatRef in core.js) e push (getAllChatTokens in
// functions/index.js, che per un messaggio diretto sceglie i soli
// dispositivi di quella postazione).
// NB: e' un filtro operativo, non un muro di sicurezza - le regole del DB
// concedono la lettura sull'intero nodo /chat/messages (la chat e' una
// query limitToLast, non si puo' filtrare per singolo messaggio lato
// regole), quindi il contenuto resta tecnicamente leggibile da chi ha gia'
// accesso al canale. Serve a non disturbare le altre postazioni, non a
// nascondere segreti.
//
// Messaggi vocali (solo canale "stations"): registrati con MediaRecorder
// (funziona sia nel PWA da browser sia nella WebView Android di Capacitor,
// nessun plugin nativo necessario per la registrazione in se') e salvati
// come audio in base64 direttamente dentro il messaggio - stesso schema
// gia' usato per le foto delle segnalazioni (vedi addReport in core.js),
// invece di introdurre Firebase Storage. Durata massima 60s per restare
// ben sotto il limite di dimensione (vedi database.rules.json).
import { IS_NATIVE_APP, STATIONS, _escapeHtml, chatEsternaMessages, chatEsternaRef, chatEsternaResetAt, chatMessages, chatRef, chatResetAt, render, stationMode } from "./core.js";
import { ROLE_LABELS } from "./admin.js";

const MAX_RECORDING_S=60;

// Destinatario scelto per il prossimo invio: "all" (tutte le postazioni,
// comportamento storico) o il numero di una postazione. Vive a livello di
// modulo e non dentro renderChatPanel perche' il pannello viene ridisegnato
// da capo ad ogni nuovo messaggio (vedi il listener chatRef in core.js):
// tenuta solo nel DOM, la scelta si azzererebbe da sola appena qualcuno
// scrive. Resta invece "appiccicata" finche' non la si cambia - per questo
// la barra e' ben visibile e ha il pulsante di ritorno a "tutte".
let _chatTarget="all";

// Solo admin e coordinatore possono indirizzare un messaggio, e solo sulla
// chat con le postazioni (la chat esterna e' gia' un canale ristretto, non
// ha postazioni a cui indirizzare). Ricontrollato lato regole del DB.
function _canTarget(channel){
  return channel==="stations"&&(window.userRole==="admin"||window.userRole==="coordinator");
}

// "Questo messaggio e' indirizzato a me?" - senza campo "to" (o con "all")
// e' per tutti, come ogni messaggio scritto finora. Usata anche da core.js
// per decidere se far partire da solo un vocale in arrivo: un messaggio
// diretto a un'altra postazione non deve suonare qui.
export function _chatMsgAddressedToMe(m){
  const to=m&&m.to;
  if(!to||to==="all")return true;
  return !!stationMode&&String(to)===String(stationMode);
}

// In elenco, oltre al destinatario, i messaggi diretti restano visibili ad
// admin e coordinatore: sono loro a mandarli e devono vedere anche quelli
// mandati dall'altro.
function _chatMsgVisibleToMe(m){
  return _chatMsgAddressedToMe(m)||window.isAdmin||window.userRole==="coordinator";
}

function _stationLabel(num){
  const st=STATIONS.find(function(s){return String(s.num)===String(num);});
  return "P."+num+(st?" — "+st.name:"");
}

// Configurazione dei due canali: cosa leggere/scrivere e come firmare i
// messaggi. Tutto qui dentro sono FUNZIONI, non i valori diretti: sia
// perche' i binding importati vanno riletti ad ogni render per restare
// aggiornati con l'ultimo valore del listener in core.js, sia perche'
// core.js e chat.js si importano a vicenda (grafo circolare, come il resto
// dell'app) - leggere chatRef/chatEsternaRef gia' qui a livello di modulo
// (invece che dentro una funzione, richiamata solo piu' tardi) e' esattamente
// il tipo di riferimento "troppo presto" che in passato ha gia' causato un
// "Cannot access before initialization".
const CHANNELS={
  stations:{
    getRef:()=>chatRef,
    getMessages:()=>chatMessages,
    getResetAt:()=>chatResetAt,
    supportsAudio:true,
    emptyToday:"Nessun messaggio ancora oggi. Scrivi il primo!",
    headerLabel:"💬 Chat interna — tutte le postazioni"
  },
  external:{
    getRef:()=>chatEsternaRef,
    getMessages:()=>chatEsternaMessages,
    getResetAt:()=>chatEsternaResetAt,
    supportsAudio:false,
    emptyToday:"Nessun messaggio ancora oggi.",
    headerLabel:"🌐 Chat esterna — admin, coordinatore, CP, forze dell'ordine"
  }
};

// Identificativo locale (non l'autorLabel, che due persone potrebbero
// condividere) per riconoscere "e' un messaggio mio": serve solo per non
// far ripartire da solo l'audio appena registrato da questo stesso
// dispositivo (vedi il listener chatRef in core.js).
export function _chatDeviceId(){
  try{
    let id=localStorage.getItem("omnia_chat_device_id");
    if(!id){
      id=(crypto&&crypto.randomUUID)?crypto.randomUUID():'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g,function(c){
        const r=Math.random()*16|0,v=c==="x"?r:(r&0x3|0x8);return v.toString(16);
      });
      localStorage.setItem("omnia_chat_device_id",id);
    }
    return id;
  }catch(e){return "unknown";}
}

function _stationSurname(){
  try{return localStorage.getItem("omnia_station_surname")||"";}catch(e){return "";}
}
function _promptStationSurname(){
  let name="";
  try{name=(prompt("Cognome del bagnino in turno a questa postazione:")||"").trim();}catch(e){}
  name=name.slice(0,30);
  try{if(name)localStorage.setItem("omnia_station_surname",name);}catch(e){}
  return name;
}

function _promptOwnName(){
  try{
    const saved=localStorage.getItem("omnia_chat_name");
    if(saved) return saved;
  }catch(e){}
  let name="";
  try{name=(prompt("Come vuoi firmarti in chat? (es. il tuo nome)")||"").trim();}catch(e){}
  if(!name) name="Operatore";
  name=name.slice(0,30);
  try{localStorage.setItem("omnia_chat_name",name);}catch(e){}
  return name;
}

// Firma del messaggio + valore del campo "role" salvato (diverso dal ruolo
// Firebase quando si tratta di postazione/operatore semplice, per
// compatibilita' con lo schema gia' in uso su /chat/messages).
function _chatAuthorAndRole(channel){
  if(channel==="external"){
    const roleLabel=ROLE_LABELS[window.userRole]||window.userRole||"?";
    return {authorLabel:_promptOwnName()+" ("+roleLabel+")", role:window.userRole||"operator"};
  }
  if(stationMode){
    let surname=_stationSurname();
    if(!surname)surname=_promptStationSurname();
    return {authorLabel:(surname?surname+" ":"")+"P."+stationMode, role:"station"};
  }
  return {authorLabel:_promptOwnName(), role:"operator"};
}

function _fmtChatTime(ts){
  try{return new Date(ts).toLocaleTimeString("it-IT",{hour:"2-digit",minute:"2-digit"});}catch(e){return "";}
}

function _visibleMessages(cfg){
  // Il filtro sui messaggi diretti vale prima di tutto il resto (sulla chat
  // esterna non ha effetto: li' nessun messaggio ha il campo "to").
  const all=Object.values(cfg.getMessages()||{}).filter(_chatMsgVisibleToMe).sort((a,b)=>a.ts-b.ts);
  // Per l'admin nessuna delle due chat si resetta mai: vede sempre tutto,
  // di default, senza bisogno di un pulsante per richiederlo.
  if(window.isAdmin)return all;
  return all.filter(m=>m.ts>=cfg.getResetAt());
}

function _renderMessages(list,cfg){
  const msgs=_visibleMessages(cfg);
  if(!msgs.length){
    list.innerHTML='<div style="text-align:center;color:var(--text3);font-size:12px;padding:20px">'+cfg.emptyToday+'</div>';
    return;
  }
  list.innerHTML=msgs.map(function(m){
    const isStation=m.role==="station";
    const bubbleColor=isStation?"var(--info-bg)":"var(--bg2)";
    const authorColor=isStation?"var(--info-text)":"var(--text2)";
    // audioData e' un data-URI: va ESCAPATO come tutto il resto prima di finire
    // in innerHTML, altrimenti un valore malevolo (le regole del DB ne limitano
    // lunghezza e prefisso, ma non i caratteri) potrebbe chiudere l'attributo
    // src e iniettare markup — XSS memorizzato verso gli altri operatori.
    // Messaggio diretto a una sola postazione: chi lo riceve legge "solo
    // per te", chi lo supervisiona (admin/coordinatore) vede a quale
    // postazione era indirizzato.
    const directTo=(m.to&&m.to!=="all")?String(m.to):"";
    const directBadge=directTo
      ? '<span style="font-size:9.5px;font-weight:700;background:var(--warning-bg);color:var(--warning-text);border-radius:5px;padding:1px 5px;margin-left:5px;white-space:nowrap">'
        +(String(stationMode||"")===directTo?"\uD83D\uDD12 solo per te":"\uD83D\uDD12 solo P."+_escapeHtml(directTo))
        +'</span>'
      : "";
    const body=m.type==="audio"
      ? '<audio controls preload="none" src="'+_escapeHtml(m.audioData||"")+'" style="width:220px;max-width:100%;height:32px;display:block;margin-top:2px"></audio>'
      : '<div style="font-size:13.5px;color:var(--text);white-space:pre-wrap;word-break:break-word">'+_escapeHtml(m.text||"")+'</div>';
    return '<div style="align-self:flex-start;max-width:85%;background:'+bubbleColor+';border-radius:10px;padding:8px 11px'+(directTo?';border-left:3px solid var(--warning-text)':'')+'">'
      +'<div style="font-size:11px;font-weight:700;color:'+authorColor+';margin-bottom:2px">'+_escapeHtml(m.authorLabel||"?")+directBadge+'</div>'
      +body
      +'<div style="font-size:10px;color:var(--text3);margin-top:3px;text-align:right">'+_fmtChatTime(m.ts)+'</div>'
      +'</div>';
  }).join("");
  list.scrollTop=list.scrollHeight;
}

function _sendChatEntry(cfg,channel,fields,onDone){
  const {authorLabel,role}=_chatAuthorAndRole(channel);
  const base={
    authorLabel,
    role,
    deviceId: _chatDeviceId(),
    ts: Date.now()
  };
  // Destinatario: il campo "to" si scrive solo quando serve davvero, cosi'
  // i messaggi a tutti restano identici a prima. Le regole del DB
  // ricontrollano il claim di chi scrive.
  if(_canTarget(channel)&&_chatTarget!=="all")base.to=String(_chatTarget);
  cfg.getRef().push(Object.assign(base,fields)).then(function(){
    onDone(null);
  }).catch(function(e){
    onDone(e);
  });
}

// ---- Radio premi-e-parla: registratore senza interfaccia ----
// L'interfaccia la costruisce chi lo usa (il pannello di postazione). Vive qui
// perche' un messaggio radio E' un messaggio della chat: stesso invio, stessi
// limiti di durata e di peso, e resta nella chat da riascoltare se non lo si e'
// sentito bene. Chi lo riceve lo sente da solo, dall'altoparlante, anche ad app
// chiusa (vedi ChatAudioService.java, che riproduce sul canale ALARM).
export function createRadioRecorder(handlers){
  handlers=handlers||{};
  const cfg=CHANNELS.stations;
  var rec=null,chunks=[],stream=null,startedAt=0,timerId=null,discard=false,busy=false;

  function fire(name,arg){try{if(handlers[name])handlers[name](arg);}catch(e){}}
  function supported(){return !!(navigator.mediaDevices&&window.MediaRecorder);}
  function cleanup(){
    if(timerId){clearInterval(timerId);timerId=null;}
    if(stream){stream.getTracks().forEach(function(t){t.stop();});stream=null;}
    rec=null;
  }

  return {
    supported:supported,
    isRecording:function(){return !!rec;},
    start:function(){
      if(rec||busy)return;
      if(!supported()){fire("onError","Microfono non disponibile su questo dispositivo");return;}
      busy=true;
      navigator.mediaDevices.getUserMedia({audio:true}).then(function(s){
        // Il dito puo' essere gia' stato alzato mentre Android chiedeva il
        // permesso del microfono: in quel caso non si apre una trasmissione
        // fantasma che nessuno ha voluto.
        if(!busy){s.getTracks().forEach(function(t){t.stop();});return;}
        stream=s;chunks=[];discard=false;
        const mime=(window.MediaRecorder.isTypeSupported&&window.MediaRecorder.isTypeSupported("audio/webm;codecs=opus"))?"audio/webm;codecs=opus":"";
        try{rec=mime?new MediaRecorder(s,{mimeType:mime,audioBitsPerSecond:32000}):new MediaRecorder(s);}
        catch(e){rec=new MediaRecorder(s);}
        rec.addEventListener("dataavailable",function(e){if(e.data&&e.data.size>0)chunks.push(e.data);});
        rec.addEventListener("stop",function(){
          const mimeType=(rec&&rec.mimeType)||"audio/webm";
          const elapsed=Date.now()-startedAt;
          cleanup();
          const parts=chunks;chunks=[];
          if(discard){busy=false;fire("onIdle");return;}
          // Sotto il mezzo secondo e' un tocco per sbaglio, non una chiamata.
          if(elapsed<700){busy=false;fire("onTooShort");return;}
          fire("onSending");
          const durationS=Math.max(1,Math.round(elapsed/1000));
          const reader=new FileReader();
          reader.onload=function(){
            const dataUri=reader.result;
            if(!dataUri||dataUri.length>440000){
              busy=false;fire("onError","Messaggio troppo lungo");return;
            }
            _sendChatEntry(cfg,"stations",{type:"audio",audioData:dataUri,audioDuration:durationS},function(err){
              busy=false;
              if(err)fire("onError","Invio fallito");
              else fire("onSent",durationS);
            });
          };
          reader.onerror=function(){busy=false;fire("onError","Errore nella registrazione");};
          reader.readAsDataURL(new Blob(parts,{type:mimeType}));
        });
        rec.start();
        startedAt=Date.now();
        fire("onStart");
        timerId=setInterval(function(){
          const el=Math.floor((Date.now()-startedAt)/1000);
          fire("onTick",el);
          if(el>=MAX_RECORDING_S){try{rec.stop();}catch(e){}}
        },250);
      }).catch(function(){
        busy=false;
        fire("onError","Permesso microfono negato");
      });
    },
    stopAndSend:function(){
      if(!rec){busy=false;fire("onIdle");return;}
      try{rec.stop();}catch(e){cleanup();busy=false;fire("onIdle");}
    },
    cancel:function(){
      discard=true;
      if(rec){try{rec.stop();}catch(e){cleanup();busy=false;fire("onIdle");}}
      else{cleanup();busy=false;fire("onIdle");}
    }
  };
}

// opts.isStation: true quando richiamata dal pannello di postazione (mostra
// il controllo "bagnino in turno"). opts.channel: "stations" (default) o
// "external" - vedi CHANNELS sopra.
export function renderChatPanel(page,opts){
  opts=opts||{};
  const channel=opts.channel==="external"?"external":"stations";
  const cfg=CHANNELS[channel];

  const wrap=document.createElement("div");
  wrap.style.cssText="display:flex;flex-direction:column;height:60vh;min-height:360px;border:1px solid var(--border);border-radius:var(--radius-lg);overflow:hidden;background:var(--bg)";

  const header=document.createElement("div");
  header.style.cssText="padding:10px 14px;background:var(--bg2);border-bottom:1px solid var(--border);display:flex;flex-direction:column;gap:4px";
  const headerTop=document.createElement("div");
  headerTop.style.cssText="display:flex;align-items:center;justify-content:space-between;gap:8px";
  headerTop.innerHTML='<span style="font-size:12px;font-weight:700;color:var(--text2)">'+cfg.headerLabel+'</span>'
    +(window.isAdmin?'<span style="font-size:10px;color:var(--text3)">storico completo, mai azzerato</span>':'');
  header.appendChild(headerTop);
  wrap.appendChild(header);

  const list=document.createElement("div");
  list.style.cssText="flex:1;overflow-y:auto;padding:12px;display:flex;flex-direction:column;gap:8px";
  wrap.appendChild(list);

  if(opts.isStation){
    // Riga "bagnino in turno", editabile in ogni momento (cambia col cambio turno).
    const shiftRow=document.createElement("div");
    shiftRow.style.cssText="font-size:11px;color:var(--text3);display:flex;align-items:center;gap:6px";
    const shiftLabel=document.createElement("span");
    function refreshShiftLabel(){
      const s=_stationSurname();
      shiftLabel.textContent=s?("Bagnino in turno: "+s):"Bagnino in turno: non impostato";
    }
    refreshShiftLabel();
    const changeBtn=document.createElement("button");changeBtn.type="button";
    changeBtn.style.cssText="font-size:11px;padding:2px 8px;color:var(--info-text);background:var(--info-bg);border-color:transparent";
    changeBtn.textContent="cambia";
    changeBtn.addEventListener("click",function(){_promptStationSurname();refreshShiftLabel();});
    shiftRow.appendChild(shiftLabel);shiftRow.appendChild(changeBtn);
    header.appendChild(shiftRow);
  }

  _renderMessages(list,cfg);

  // ---- Barra destinatario (solo admin/coordinatore, canale postazioni) ----
  // Resta visibile anche durante la registrazione di un vocale (che nasconde
  // solo inputRow): vale per il testo e per l'audio allo stesso modo.
  if(_canTarget(channel)){
    const targetRow=document.createElement("div");
    const targetLbl=document.createElement("span");
    targetLbl.style.cssText="font-size:11px;font-weight:700;flex-shrink:0";
    const targetSel=document.createElement("select");
    targetSel.style.cssText="flex:1;min-width:0;font-size:12px;padding:5px 8px";
    let optsHtml='<option value="all">\uD83D\uDCE2 Tutte le postazioni</option>';
    STATIONS.slice().sort(function(a,b){return a.num-b.num;}).forEach(function(s){
      optsHtml+='<option value="'+s.num+'">\uD83C\uDFAF Solo '+_escapeHtml(_stationLabel(s.num))+'</option>';
    });
    targetSel.innerHTML=optsHtml;
    targetSel.value=_chatTarget;
    // Postazione sparita dall'elenco (STATIONS_DATA modificato): torna a
    // "tutte" invece di restare su un valore che il <select> non ha piu'.
    if(targetSel.value!==_chatTarget){_chatTarget="all";targetSel.value="all";}
    const resetTargetBtn=document.createElement("button");resetTargetBtn.type="button";
    resetTargetBtn.title="Torna a inviare a tutte le postazioni";
    resetTargetBtn.style.cssText="flex-shrink:0;width:auto;font-size:11px;padding:4px 9px;color:var(--warning-text);background:var(--bg);border-color:transparent";
    resetTargetBtn.textContent="✕ tutte";
    const paintTargetRow=function(){
      const directed=_chatTarget!=="all";
      targetRow.style.cssText="display:flex;align-items:center;gap:8px;padding:8px 10px;border-top:1px solid var(--border);background:"
        +(directed?"var(--warning-bg)":"var(--bg2)");
      targetLbl.textContent=directed?"\uD83D\uDD12 Invia solo a:":"Invia a:";
      targetLbl.style.color=directed?"var(--warning-text)":"var(--text2)";
      resetTargetBtn.style.display=directed?"inline-block":"none";
    };
    targetSel.addEventListener("change",function(){
      _chatTarget=targetSel.value||"all";
      paintTargetRow();
    });
    resetTargetBtn.addEventListener("click",function(){
      _chatTarget="all";targetSel.value="all";paintTargetRow();
    });
    paintTargetRow();
    targetRow.appendChild(targetLbl);targetRow.appendChild(targetSel);targetRow.appendChild(resetTargetBtn);
    wrap.appendChild(targetRow);
  }

  // ---- Riga di digitazione (testo, + microfono se il canale lo supporta) ----
  const inputRow=document.createElement("div");
  inputRow.style.cssText="display:flex;gap:8px;padding:10px;border-top:1px solid var(--border);background:var(--bg)";
  const input=document.createElement("input");
  input.type="text";input.placeholder="Scrivi un messaggio...";input.maxLength=500;
  input.style.cssText="flex:1;padding:9px 12px;border:1px solid var(--border2);border-radius:var(--radius);font-size:14px";
  inputRow.appendChild(input);

  let micBtn=null;
  if(cfg.supportsAudio){
    micBtn=document.createElement("button");micBtn.type="button";
    micBtn.title="Registra messaggio vocale";
    micBtn.style.cssText="width:auto;padding:9px 13px;font-size:16px;background:var(--bg2)";
    micBtn.textContent="🎙️";
    inputRow.appendChild(micBtn);
  }

  const sendBtn=document.createElement("button");
  sendBtn.className="btn-primary";sendBtn.style.cssText="width:auto;padding:9px 16px";sendBtn.textContent="Invia";
  inputRow.appendChild(sendBtn);
  wrap.appendChild(inputRow);

  page.appendChild(wrap);
  input.focus();

  function send(){
    const text=input.value.trim();
    if(!text)return;
    input.value="";
    input.disabled=true;sendBtn.disabled=true;
    _sendChatEntry(cfg,channel,{text:text.slice(0,500)},function(err){
      input.disabled=false;sendBtn.disabled=false;
      if(err){alert("Errore invio messaggio: "+err.message);return;}
      input.focus();
    });
  }
  sendBtn.addEventListener("click",send);
  input.addEventListener("keydown",function(e){if(e.key==="Enter")send();});

  if(!cfg.supportsAudio)return;

  // ---- Riga di registrazione in corso (sostituisce inputRow mentre attiva) ----
  const recRow=document.createElement("div");
  recRow.style.cssText="display:none;align-items:center;gap:10px;padding:10px 14px;border-top:1px solid var(--border);background:var(--danger-bg)";
  const recDot=document.createElement("span");
  recDot.style.cssText="width:10px;height:10px;border-radius:50%;background:var(--danger-text);flex-shrink:0;animation:alertPulse 1s infinite alternate";
  const recTimer=document.createElement("span");
  recTimer.style.cssText="font-size:13px;font-weight:700;color:var(--danger-text);flex:1";
  recTimer.textContent="0:00";
  const cancelRecBtn=document.createElement("button");cancelRecBtn.type="button";
  cancelRecBtn.style.cssText="font-size:12px;padding:6px 10px;color:var(--text2);background:var(--bg)";
  cancelRecBtn.textContent="✕ Annulla";
  const stopRecBtn=document.createElement("button");stopRecBtn.type="button";
  stopRecBtn.className="btn-primary";stopRecBtn.style.cssText="width:auto;padding:6px 14px;background:var(--danger-text);border-color:var(--danger-text)";
  stopRecBtn.textContent="⏹ Invia";
  recRow.appendChild(recDot);recRow.appendChild(recTimer);recRow.appendChild(cancelRecBtn);recRow.appendChild(stopRecBtn);
  wrap.appendChild(recRow);

  if(!(navigator.mediaDevices&&window.MediaRecorder)){
    micBtn.disabled=true;
    micBtn.title="Registrazione audio non supportata su questo browser";
    micBtn.style.opacity=".4";
  }

  // ---- Registrazione vocale ----
  let mediaRecorder=null,recChunks=[],recStream=null,recStartedAt=0,recTimerId=null,recCancelled=false;

  function _fmtRecTime(sec){
    const m=Math.floor(sec/60),s=sec%60;
    return m+":"+String(s).padStart(2,"0");
  }

  function _stopStream(){
    if(recStream){recStream.getTracks().forEach(function(t){t.stop();});recStream=null;}
  }

  function startRecording(){
    navigator.mediaDevices.getUserMedia({audio:true}).then(function(stream){
      recStream=stream;recChunks=[];recCancelled=false;
      const mime=(window.MediaRecorder.isTypeSupported&&window.MediaRecorder.isTypeSupported("audio/webm;codecs=opus"))?"audio/webm;codecs=opus":"";
      try{
        mediaRecorder=mime?new MediaRecorder(stream,{mimeType:mime,audioBitsPerSecond:32000}):new MediaRecorder(stream);
      }catch(e){
        mediaRecorder=new MediaRecorder(stream);
      }
      mediaRecorder.addEventListener("dataavailable",function(e){if(e.data&&e.data.size>0)recChunks.push(e.data);});
      mediaRecorder.addEventListener("stop",function(){
        _stopStream();
        if(recCancelled){recChunks=[];return;}
        const durationS=Math.max(1,Math.round((Date.now()-recStartedAt)/1000));
        const blob=new Blob(recChunks,{type:mediaRecorder.mimeType||"audio/webm"});
        recChunks=[];
        const reader=new FileReader();
        reader.onload=function(){
          const dataUri=reader.result;
          if(!dataUri||dataUri.length>440000){
            alert("Messaggio vocale troppo lungo, riprova con uno più breve.");
            return;
          }
          _sendChatEntry(cfg,channel,{type:"audio",audioData:dataUri,audioDuration:durationS},function(err){
            if(err)alert("Errore invio messaggio vocale: "+err.message);
          });
        };
        reader.readAsDataURL(blob);
      });
      mediaRecorder.start();
      recStartedAt=Date.now();
      inputRow.style.display="none";recRow.style.display="flex";
      recTimer.textContent=_fmtRecTime(0);
      recTimerId=setInterval(function(){
        const elapsed=Math.floor((Date.now()-recStartedAt)/1000);
        recTimer.textContent=_fmtRecTime(elapsed);
        if(elapsed>=MAX_RECORDING_S)stopRecording(false);
      },250);
    }).catch(function(e){
      alert("Impossibile accedere al microfono: "+e.message);
    });
  }

  function stopRecording(cancelled){
    recCancelled=!!cancelled;
    if(recTimerId){clearInterval(recTimerId);recTimerId=null;}
    if(mediaRecorder&&mediaRecorder.state!=="inactive")mediaRecorder.stop();
    else _stopStream();
    inputRow.style.display="flex";recRow.style.display="none";
  }

  micBtn.addEventListener("click",function(){startRecording();});
  stopRecBtn.addEventListener("click",function(){stopRecording(false);});
  cancelRecBtn.addEventListener("click",function(){stopRecording(true);});
}

// ---- Walkie-talkie: arrivo di un messaggio vocale altrui ad app aperta ----
// Solo canale "stations" (l'unico con audio). Chiamata da core.js (listener
// chatRef) per ogni nuovo messaggio audio non mandato da questo stesso
// dispositivo. Lo riproduce subito da solo (come una radio) e mostra un
// popup con riascolta/rispondi/chiudi, come da richiesta. Su web funziona
// solo ad app aperta (in primo piano o in una scheda ancora attiva): un
// browser non puo' forzare altoparlante/autoplay ad app completamente
// chiusa, quello lo fa solo l'app Android nativa (vedi
// OmniaMessagingService.java + ChatAudioService.java).
export function _onIncomingChatAudio(msg,msgId){
  try{
    const old=document.getElementById("_chatIncomingPopup");
    if(old)old.remove();

    const overlay=document.createElement("div");
    overlay.id="_chatIncomingPopup";
    overlay.style.cssText="position:fixed;inset:0;background:rgba(0,0,0,.55);z-index:9997;display:flex;align-items:flex-end;justify-content:center";

    const modal=document.createElement("div");
    modal.style.cssText="background:var(--bg);border-radius:16px 16px 0 0;padding:20px 18px calc(20px + env(safe-area-inset-bottom));width:100%;max-width:480px;box-shadow:0 -4px 24px rgba(0,0,0,.25)";
    const directTo=(msg.to&&msg.to!=="all")?String(msg.to):"";
    modal.innerHTML='<div style="font-size:15px;font-weight:700;margin-bottom:4px">🎙️ Messaggio vocale'
      +(directTo?' <span style="font-size:11px;background:var(--warning-bg);color:var(--warning-text);border-radius:5px;padding:2px 6px">\uD83D\uDD12 solo per te</span>':'')
      +'</div>'
      +'<div style="font-size:13px;color:var(--text2);margin-bottom:14px">da '+_escapeHtml(msg.authorLabel||"?")+'</div>';

    const audio=document.createElement("audio");
    audio.src=msg.audioData||("https://europe-west1-app-segnalazioni-omnia-roseto.cloudfunctions.net/getChatAudio?id="+encodeURIComponent(msgId));
    audio.style.display="none";
    modal.appendChild(audio);

    const btnRow=document.createElement("div");
    btnRow.style.cssText="display:grid;grid-template-columns:1fr 1fr 1fr;gap:8px";
    const replayBtn=document.createElement("button");replayBtn.type="button";
    replayBtn.style.cssText="padding:12px 4px;font-size:13px";replayBtn.textContent="🔁 Riascolta";
    const replyBtn=document.createElement("button");replyBtn.type="button";
    replyBtn.className="btn-primary";replyBtn.style.cssText="padding:12px 4px;font-size:13px";replyBtn.textContent="💬 Rispondi";
    const closeBtn=document.createElement("button");closeBtn.type="button";
    closeBtn.style.cssText="padding:12px 4px;font-size:13px";closeBtn.textContent="✕ Chiudi";
    btnRow.appendChild(replayBtn);btnRow.appendChild(replyBtn);btnRow.appendChild(closeBtn);
    modal.appendChild(btnRow);
    overlay.appendChild(modal);
    document.body.appendChild(overlay);

    function close(){try{audio.pause();}catch(e){}overlay.remove();}
    replayBtn.addEventListener("click",function(){audio.currentTime=0;audio.play().catch(function(){});});
    closeBtn.addEventListener("click",close);
    replyBtn.addEventListener("click",function(){
      close();
      if(stationMode){window._stationChatOpen=true;render("station");}
      else{window.currentRole="operator";window.activeDashTab="chat";render("dashboard");}
    });

    // Dentro l'app la riproduzione la fa il servizio nativo (ChatAudioService,
    // canale ALARM: altoparlante, e funziona anche ad app chiusa). Suonare
    // anche qui farebbe sentire lo stesso messaggio due volte, sfasato. Il
    // popup resta comunque, con "Riascolta" per chi non ha capito bene.
    // Sul web invece si riproduce qui: l'autoplay passa quasi sempre, perche'
    // a questa schermata si arriva solo dopo login o attivazione, quindi un
    // tocco c'e' gia' stato. Se venisse bloccato resta il pulsante.
    if(!IS_NATIVE_APP)audio.play().catch(function(){});
  }catch(e){
    _sentryCapture(e);
  }
}

// Nota sul reset serale: i messaggi non vengono MAI cancellati dal database
// in nessuno dei due canali (vedi resetChatSerale e resetChatEsternaSerale
// in functions/index.js, che aggiornano solo un timestamp condiviso a
// testa). Postazioni/operatori/coordinatore/CP/forze dell'ordine vedono
// sempre e solo i messaggi da quel momento in poi nei canali a cui hanno
// accesso; SOLO l'admin (window.isAdmin, claim Firebase role:"admin") vede
// sempre tutto lo storico di entrambe, senza filtro e senza bisogno di
// premere nulla.
