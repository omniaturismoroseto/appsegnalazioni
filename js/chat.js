// Chat interna condivisa tra tutte le postazioni e gli operatori: un unico
// canale (come una radio), niente conversazioni private. Lo stato/listener
// Firebase vive in core.js (chatRef, chatMessages) insieme agli altri; qui
// c'e' solo il disegno del pannello, riusato sia da pages-operator.js
// (tab "Chat" in dashboard) sia da pages-station.js (tile "Chat").
import { _escapeHtml, chatMessages, chatRef, stationMode } from "./core.js";

function _chatAuthorLabel(){
  if(stationMode) return "P."+stationMode;
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

function _renderMessages(list){
  const msgs=Object.values(chatMessages||{}).sort((a,b)=>a.ts-b.ts);
  if(!msgs.length){
    list.innerHTML='<div style="text-align:center;color:var(--text3);font-size:12px;padding:20px">Nessun messaggio ancora. Scrivi il primo!</div>';
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

export function renderChatPanel(page){
  const wrap=document.createElement("div");
  wrap.style.cssText="display:flex;flex-direction:column;height:60vh;min-height:360px;border:1px solid var(--border);border-radius:var(--radius-lg);overflow:hidden;background:var(--bg)";

  const header=document.createElement("div");
  header.style.cssText="padding:10px 14px;background:var(--bg2);border-bottom:1px solid var(--border);font-size:12px;font-weight:700;color:var(--text2)";
  header.textContent="💬 Chat interna — tutte le postazioni";
  wrap.appendChild(header);

  const list=document.createElement("div");
  list.style.cssText="flex:1;overflow-y:auto;padding:12px;display:flex;flex-direction:column;gap:8px";
  _renderMessages(list);
  wrap.appendChild(list);

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
