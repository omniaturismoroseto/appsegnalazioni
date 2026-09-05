// Identità e attivazione di un dispositivo di postazione. Sta in un modulo suo
// perché serve a due mondi diversi: la pagina di login dell'app pubblica e
// l'app dedicata alle postazioni. Tenerlo in pages-public.js costringeva
// quest'ultima a caricarsi tutte le pagine pubbliche - oltre 120 KB - solo per
// mostrare un pulsante di richiesta attivazione.
import { _activateStationMode, stationDevicesRef } from "./core.js";

// Genera/recupera un identificativo persistente per questo dispositivo (nessun account, nessuna password)
export function _getDeviceId(){
  try{
    var id=localStorage.getItem("omnia_device_id");
    if(id)return id;
    id=(crypto&&crypto.randomUUID)?crypto.randomUUID():'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g,function(c){
      var r=Math.random()*16|0,v=c==="x"?r:(r&0x3|0x8);return v.toString(16);
    });
    localStorage.setItem("omnia_device_id",id);
    return id;
  }catch(e){return null;}
}

export function _renderDeviceActivation(wrap,onRef){
  wrap.innerHTML="";
  const deviceId=_getDeviceId();
  if(!deviceId){
    const p=document.createElement("p");p.style.cssText="font-size:12.5px;color:var(--danger-text)";
    p.textContent="Impossibile identificare questo dispositivo (memoria locale non disponibile).";
    wrap.appendChild(p);return;
  }
  const box=document.createElement("div");
  box.style.cssText="padding:13px 15px;border-radius:var(--radius-lg);background:var(--bg2);border:1px solid var(--border);font-size:13px;line-height:1.5";
  box.textContent="Verifica dello stato del dispositivo…";
  wrap.appendChild(box);

  // Dice se questo dispositivo e' amministrato da un kiosk e cosa gli ha
  // detto. Su un tablet normale resta scritto che non lo e', ed e' giusto:
  // e' un'informazione, non un errore.
  //
  // Senza questa riga, un'identita' che non arriva e' indistinguibile da un
  // dispositivo non amministrato - e sono due cose molto diverse da cercare.
  const stato=document.createElement("div");
  stato.style.cssText="font-size:11.5px;color:var(--text2);margin-top:8px";
  const _l=window._omniaLettura;
  stato.textContent = !_l ? "Kiosk: non ancora letto"
    : _l.assente ? "Kiosk: assente su questo dispositivo"
    : (_l.deviceId||_l.postazione)
      ? "Kiosk: postazione "+(_l.postazione||"non indicata")+" · identita' "+(_l.deviceId?"ricevuta":"non ricevuta")
      : "Kiosk: presente ma non ha ancora indicato la postazione";
  wrap.appendChild(stato);

  const ref=stationDevicesRef.child(deviceId);
  if(onRef)onRef(ref);
  ref.on("value",function(snap){
    const data=snap.val();
    box.innerHTML="";
    if(data&&data.enabled&&data.station){
      box.style.cssText="padding:13px 15px;border-radius:var(--radius-lg);background:#f0fdf4;border:1px solid #bbf7d0;color:#166534;font-size:13px;line-height:1.5;font-weight:600";
      box.textContent="✅ Dispositivo attivato per la postazione "+data.station+" — apertura del pannello…";
      ref.off();
      _activateStationMode(deviceId,String(data.station));
    }else if(data){
      box.style.cssText="padding:13px 15px;border-radius:var(--radius-lg);background:var(--warning-bg);border:1px solid var(--warning-border);color:var(--warning-text);font-size:13px;line-height:1.5";
      box.textContent="⏳ Richiesta inviata. In attesa che il centro operativo attivi questo dispositivo per una postazione.";
    }else{
      const txt=document.createElement("p");
      txt.style.cssText="font-size:12.5px;color:var(--text2);line-height:1.5;margin-bottom:10px";
      txt.textContent="Richiedi l'attivazione di questo dispositivo come pannello dedicato di una postazione. Un operatore dovrà approvarla dal centro operativo.";
      const reqBtn=document.createElement("button");reqBtn.className="btn-primary";
      reqBtn.textContent="Richiedi attivazione";
      reqBtn.addEventListener("click",function(){
        reqBtn.disabled=true;reqBtn.textContent="Invio richiesta…";
        // Se il kiosk ci ha detto quale postazione siamo, la richiesta parte
        // gia' col numero scritto: chi approva deve solo confermare, e non puo'
        // scriverne uno diverso da quello scelto nella pagina del kiosk.
        var _richiesta={requestedAt:Date.now(),enabled:false,userAgent:String(navigator.userAgent||"").slice(0,200)};
        var _post=window._omniaPostazioneGestita;
        if(_post)_richiesta.station=String(_post);
        ref.set(_richiesta).catch(function(e){
          reqBtn.disabled=false;reqBtn.textContent="Richiedi attivazione";
          console.error("Errore richiesta attivazione dispositivo:",e);
        });
      });
      box.style.cssText="padding:13px 15px;border-radius:var(--radius-lg);background:var(--bg2);border:1px solid var(--border)";
      box.appendChild(txt);box.appendChild(reqBtn);
    }
  });
}
