// Chat interna condivisa tra tutte le postazioni e gli operatori: un unico
// canale (come una radio), niente conversazioni private. Lo stato/listener
// Firebase vive in core.js (chatRef, chatMessages, chatResetAt) insieme agli
// altri; qui c'e' solo il disegno del pannello, riusato sia da
// pages-operator.js (tab "Chat" in dashboard) sia da pages-station.js
// (tile "Chat").
//
// Messaggi vocali (walkie-talkie): registrati con MediaRecorder (funziona
// sia nel PWA da browser sia nella WebView Android di Capacitor, nessun
// plugin nativo necessario per la registrazione in se') e salvati come
// audio in base64 direttamente dentro il messaggio - stesso schema gia'
// usato per le foto delle segnalazioni (vedi addReport in core.js), invece
// di introdurre Firebase Storage. Durata massima 60s per restare ben sotto
// il limite di dimensione (vedi database.rules.json).
import { _escapeHtml, chatMessages, chatRef, chatResetAt, stationMode } from "./core.js";

const MAX_RECORDING_S=60;

let _showFullHistory=false; // reimpostato ad ogni apertura del pannello (vedi renderChatPanel)

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

function _chatAuthorLabel(){
  if(stationMode){
    let surname=_stationSurname();
    if(!surname)surname=_promptStationSurname();
    return (surname?surname+" ":"")+"P."+stationMode;
  }
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

function _fmtChatTime(ts){
  try{return new Date(ts).toLocaleTimeString("it-IT",{hour:"2-digit",minute:"2-digit"});}catch(e){return "";}
}

function _visibleMessages(){
  const all=Object.values(chatMessages||{}).sort((a,b)=>a.ts-b.ts);
  if(_showFullHistory)return all;
  return all.filter(m=>m.ts>=chatResetAt);
}

function _renderMessages(list){
  const msgs=_visibleMessages();
  if(!msgs.length){
    list.innerHTML='<div style="text-align:center;color:var(--text3);font-size:12px;padding:20px">'
      +(_showFullHistory?"Nessun messaggio nello storico.":"Nessun messaggio ancora oggi. Scrivi il primo!")
      +'</div>';
    return;
  }
  list.innerHTML=msgs.map(function(m){
    const isStation=m.role==="station";
    const bubbleColor=isStation?"var(--info-bg)":"var(--bg2)";
    const authorColor=isStation?"var(--info-text)":"var(--text2)";
    const body=m.type==="audio"
      ? '<audio controls preload="none" src="'+(m.audioData||"")+'" style="width:220px;max-width:100%;height:32px;display:block;margin-top:2px"></audio>'
      : '<div style="font-size:13.5px;color:var(--text);white-space:pre-wrap;word-break:break-word">'+_escapeHtml(m.text||"")+'</div>';
    return '<div style="align-self:flex-start;max-width:85%;background:'+bubbleColor+';border-radius:10px;padding:8px 11px">'
      +'<div style="font-size:11px;font-weight:700;color:'+authorColor+';margin-bottom:2px">'+_escapeHtml(m.authorLabel||"?")+'</div>'
      +body
      +'<div style="font-size:10px;color:var(--text3);margin-top:3px;text-align:right">'+_fmtChatTime(m.ts)+'</div>'
      +'</div>';
  }).join("");
  list.scrollTop=list.scrollHeight;
}

function _sendChatEntry(fields,onDone){
  chatRef.push(Object.assign({
    authorLabel: _chatAuthorLabel(),
    role: stationMode ? "station" : "operator",
    ts: Date.now()
  },fields)).then(function(){
    onDone(null);
  }).catch(function(e){
    onDone(e);
  });
}

// opts.isStation: true quando richiamata dal pannello di postazione (mostra
// il controllo "bagnino in turno" invece del toggle storico completo, che
// resta riservato alla dashboard operatori/admin - vedi nota in fondo al
// file sul perche' non e' un controllo di sicurezza vero e proprio).
export function renderChatPanel(page,opts){
  opts=opts||{};
  _showFullHistory=false;

  const wrap=document.createElement("div");
  wrap.style.cssText="display:flex;flex-direction:column;height:60vh;min-height:360px;border:1px solid var(--border);border-radius:var(--radius-lg);overflow:hidden;background:var(--bg)";

  const header=document.createElement("div");
  header.style.cssText="padding:10px 14px;background:var(--bg2);border-bottom:1px solid var(--border);display:flex;flex-direction:column;gap:4px";
  const headerTop=document.createElement("div");
  headerTop.style.cssText="display:flex;align-items:center;justify-content:space-between;gap:8px";
  headerTop.innerHTML='<span style="font-size:12px;font-weight:700;color:var(--text2)">💬 Chat interna — tutte le postazioni</span>';
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
  }else{
    // Dashboard operatori/admin: possono rivedere lo storico completo, non
    // solo i messaggi di oggi (le postazioni vedono sempre e solo "oggi").
    const histRow=document.createElement("div");
    histRow.style.cssText="display:flex;align-items:center;gap:6px";
    const histBtn=document.createElement("button");histBtn.type="button";
    histBtn.style.cssText="font-size:11px;padding:2px 8px;color:var(--text2);background:var(--bg3);border-color:transparent";
    function refreshHistBtn(){histBtn.textContent=_showFullHistory?"↩ solo messaggi di oggi":"🕘 mostra storico completo";}
    refreshHistBtn();
    histBtn.addEventListener("click",function(){_showFullHistory=!_showFullHistory;refreshHistBtn();_renderMessages(list);});
    histRow.appendChild(histBtn);
    header.appendChild(histRow);
  }

  _renderMessages(list);

  // ---- Riga di digitazione (testo + microfono) ----
  const inputRow=document.createElement("div");
  inputRow.style.cssText="display:flex;gap:8px;padding:10px;border-top:1px solid var(--border);background:var(--bg)";
  const input=document.createElement("input");
  input.type="text";input.placeholder="Scrivi un messaggio...";input.maxLength=500;
  input.style.cssText="flex:1;padding:9px 12px;border:1px solid var(--border2);border-radius:var(--radius);font-size:14px";
  const micBtn=document.createElement("button");micBtn.type="button";
  micBtn.title="Registra messaggio vocale";
  micBtn.style.cssText="width:auto;padding:9px 13px;font-size:16px;background:var(--bg2)";
  micBtn.textContent="🎙️";
  const sendBtn=document.createElement("button");
  sendBtn.className="btn-primary";sendBtn.style.cssText="width:auto;padding:9px 16px";sendBtn.textContent="Invia";
  inputRow.appendChild(input);inputRow.appendChild(micBtn);inputRow.appendChild(sendBtn);
  wrap.appendChild(inputRow);

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

  page.appendChild(wrap);
  input.focus();

  if(!(navigator.mediaDevices&&window.MediaRecorder)){
    micBtn.disabled=true;
    micBtn.title="Registrazione audio non supportata su questo browser";
    micBtn.style.opacity=".4";
  }

  function send(){
    const text=input.value.trim();
    if(!text)return;
    input.value="";
    input.disabled=true;sendBtn.disabled=true;
    _sendChatEntry({text:text.slice(0,500)},function(err){
      input.disabled=false;sendBtn.disabled=false;
      if(err){alert("Errore invio messaggio: "+err.message);return;}
      input.focus();
    });
  }
  sendBtn.addEventListener("click",send);
  input.addEventListener("keydown",function(e){if(e.key==="Enter")send();});

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
          _sendChatEntry({type:"audio",audioData:dataUri,audioDuration:durationS},function(err){
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

// Nota sul reset serale: i messaggi non vengono MAI cancellati dal database
// (vedi resetChatSerale in functions/index.js, che aggiorna solo un
// timestamp condiviso). Le postazioni vedono sempre e solo i messaggi da
// quel momento in poi; dalla dashboard operatori chiunque puo' comunque
// premere "mostra storico completo" per rivedere tutto. Non e' un vero
// controllo di accesso per un "ruolo admin" - il sistema di login attuale
// non distingue un admin da un operatore qualsiasi (stesso claim
// Firebase per tutti), quindi in pratica "riservato all'admin" qui
// significa "riservato a chi ha accesso alla dashboard operatori".
