// Chat interna condivisa tra tutte le postazioni e gli operatori: un unico
// canale (come una radio), niente conversazioni private. Lo stato/listener
// Firebase vive in core.js (chatRef, chatMessages, chatResetAt) insieme agli
// altri; qui c'e' solo il disegno del pannello, riusato sia da
// pages-operator.js (tab "Chat" in dashboard) sia da pages-station.js
// (tile "Chat").
import { _escapeHtml, chatMessages, chatRef, chatResetAt, stationMode } from "./core.js";

let _showFullHistory=false; // reimpostato ad ogni apertura del pannello (vedi renderChatPanel)

function _stationSurname(){
  try{return localStorage.getItem("omnia_station_surname")||"";}catch(e){return "";}
}
function _promptStationSurname(){
  let name=(prompt("Cognome del bagnino in turno a questa postazione:")||"").trim();
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
  let name=(prompt("Come vuoi firmarti in chat? (es. il tuo nome)")||"").trim();
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
    return '<div style="align-self:flex-start;max-width:85%;background:'+bubbleColor+';border-radius:10px;padding:8px 11px">'
      +'<div style="font-size:11px;font-weight:700;color:'+authorColor+';margin-bottom:2px">'+_escapeHtml(m.authorLabel||"?")+'</div>'
      +'<div style="font-size:13.5px;color:var(--text);white-space:pre-wrap;word-break:break-word">'+_escapeHtml(m.text||"")+'</div>'
      +'<div style="font-size:10px;color:var(--text3);margin-top:3px;text-align:right">'+_fmtChatTime(m.ts)+'</div>'
      +'</div>';
  }).join("");
  list.scrollTop=list.scrollHeight;
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

  const inputRow=document.createElement("div");
  inputRow.style.cssText="display:flex;gap:8px;padding:10px;border-top:1px solid var(--border);background:var(--bg)";
  const input=document.createElement("input");
  input.type="text";input.placeholder="Scrivi un messaggio...";input.maxLength=500;
  input.style.cssText="flex:1;padding:9px 12px;border:1px solid var(--border2);border-radius:var(--radius);font-size:14px";
  const sendBtn=document.createElement("button");
  sendBtn.className="btn-primary";sendBtn.style.cssText="width:auto;padding:9px 16px";sendBtn.textContent="Invia";
  inputRow.appendChild(input);inputRow.appendChild(sendBtn);
  wrap.appendChild(inputRow);

  page.appendChild(wrap);
  input.focus();

  function send(){
    const text=input.value.trim();
    if(!text)return;
    input.value="";
    input.disabled=true;sendBtn.disabled=true;
    chatRef.push({
      text: text.slice(0,500),
      authorLabel: _chatAuthorLabel(),
      role: stationMode ? "station" : "operator",
      ts: Date.now()
    }).then(function(){
      input.disabled=false;sendBtn.disabled=false;input.focus();
    }).catch(function(e){
      input.disabled=false;sendBtn.disabled=false;
      alert("Errore invio messaggio: "+e.message);
    });
  }
  sendBtn.addEventListener("click",send);
  input.addEventListener("keydown",function(e){if(e.key==="Enter")send();});
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
