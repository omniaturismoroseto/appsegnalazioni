// Pannello "🛠️ Admin" nella dashboard operatori: gestione account (elenco,
// crea, cambia ruolo, elimina). Visibile solo se window.isAdmin e' vero
// (claim Firebase role:"admin" - vedi core.js). Ruoli disponibili oltre al
// normale "Operatore": admin, coordinator, cp (Capitaneria di Porto),
// forze_ordine - vedi setAccountRole/listOperatorAccounts/
// createOperatorAccount/deleteOperatorAccount in functions/index.js.
// promoteToAdmin resta solo per il bootstrap del primissimo admin (vedi
// _promoteSelfBootstrap sotto).
import { _getAuth, renderPage } from "./core.js";

const FN_BASE="https://europe-west1-app-segnalazioni-omnia-roseto.cloudfunctions.net/";

// Le Cloud Function "onCall" usano un protocollo preciso ma documentato e
// richiamabile anche con un fetch semplice (senza SDK Functions, che
// questa app non carica - vedi _activateStationMode per lo stesso schema):
// corpo {data:...}, header Authorization col token dell'utente per le
// funzioni che controllano request.auth (qui serve sempre, sono tutte
// riservate agli admin).
async function _callAdminFn(name,data){
  const a=_getAuth();
  const user=a&&a.currentUser;
  if(!user)throw new Error("Sessione non valida, rifai il login");
  const idToken=await user.getIdToken();
  const resp=await fetch(FN_BASE+name,{
    method:"POST",
    headers:{"Content-Type":"application/json","Authorization":"Bearer "+idToken},
    body:JSON.stringify({data:data||{}})
  });
  const j=await resp.json();
  if(j.error)throw new Error(j.error.message||"Errore");
  return j.result;
}

// Bootstrap del primo admin (vedi bottone "Diventa admin" in
// renderDashboard, pages-operator.js): promuove SE STESSI, funziona solo
// se non esiste ancora nessun admin (controllo lato server). Dopo il
// successo, aggiorna subito window.isAdmin forzando un refresh del token -
// altrimenti la sessione corrente resterebbe col claim vecchio in cache
// fino a un'ora.
export function _promoteSelfBootstrap(email){
  return _callAdminFn("promoteToAdmin",{email}).then(function(res){
    return _refreshAdminClaim().then(function(){return res;});
  });
}

export function _refreshAdminClaim(){
  const a=_getAuth();
  const user=a&&a.currentUser;
  if(!user)return Promise.resolve();
  return user.getIdTokenResult(true).then(function(res){
    window.userRole=(res.claims&&res.claims.role)||null;
    window.isAdmin=window.userRole==="admin";
    renderPage();
  });
}

function _fmtDate(iso){
  if(!iso)return "mai";
  try{return new Date(iso).toLocaleString("it-IT",{day:"2-digit",month:"2-digit",year:"numeric",hour:"2-digit",minute:"2-digit"});}catch(e){return iso;}
}

// Tipi di account oltre al normale "Operatore" (nessun ruolo speciale).
// Le funzioni specifiche per ciascuno restano da definire; per ora l'unica
// regola gia' attiva e' che CP e forze dell'ordine non vedono mai la chat
// (ne' testo ne' vocali) - vedi database.rules.json e pages-operator.js.
const ROLE_LABELS={
  admin:"Admin",
  coordinator:"Coordinatore",
  cp:"Capitaneria di Porto",
  forze_ordine:"Forze dell'ordine"
};
function _roleOptionsHtml(selected){
  let html='<option value=""'+(!selected?" selected":"")+'>Operatore</option>';
  Object.keys(ROLE_LABELS).forEach(function(k){
    html+='<option value="'+k+'"'+(selected===k?" selected":"")+'>'+ROLE_LABELS[k]+'</option>';
  });
  return html;
}

export function renderAdminPanel(page){
  const wrap=document.createElement("div");

  const newBox=document.createElement("div");
  newBox.style.cssText="background:var(--bg2);border-radius:var(--radius-lg);padding:14px;margin-bottom:14px";
  newBox.innerHTML='<h3 style="font-size:13px;font-weight:700;margin-bottom:10px">➕ Nuovo account operatore</h3>';
  const emailInput=document.createElement("input");
  emailInput.type="email";emailInput.placeholder="email@esempio.it";
  emailInput.style.cssText="margin-bottom:8px";
  const passInput=document.createElement("input");
  passInput.type="password";passInput.placeholder="Password (minimo 6 caratteri)";
  passInput.style.cssText="margin-bottom:8px";
  const roleSelect=document.createElement("select");
  roleSelect.innerHTML=_roleOptionsHtml(null);
  roleSelect.style.cssText="margin-bottom:10px";
  const createBtn=document.createElement("button");createBtn.type="button";
  createBtn.className="btn-primary";createBtn.style.cssText="width:auto;padding:8px 16px;font-size:13px";
  createBtn.textContent="Crea account";
  const createMsg=document.createElement("div");createMsg.style.cssText="font-size:12px;margin-top:8px";
  newBox.appendChild(emailInput);newBox.appendChild(passInput);newBox.appendChild(roleSelect);newBox.appendChild(createBtn);newBox.appendChild(createMsg);
  wrap.appendChild(newBox);

  const list=document.createElement("div");
  list.className="reports-list";
  list.innerHTML='<div style="text-align:center;color:var(--text3);font-size:12px;padding:20px">Caricamento account...</div>';
  wrap.appendChild(list);

  page.appendChild(wrap);

  function refreshList(){
    list.innerHTML='<div style="text-align:center;color:var(--text3);font-size:12px;padding:20px">Caricamento account...</div>';
    _callAdminFn("listOperatorAccounts").then(function(res){
      const accounts=(res.accounts||[]).sort(function(a,b){return (a.email||"").localeCompare(b.email||"");});
      if(!accounts.length){list.innerHTML='<div class="empty">Nessun account trovato.</div>';return;}
      list.innerHTML="";
      accounts.forEach(function(acc){
        const roleLabel=acc.role?ROLE_LABELS[acc.role]||acc.role:null;
        const card=document.createElement("div");
        card.className="report-card";
        card.innerHTML='<div class="report-top"><div class="report-body">'
          +'<strong style="font-size:13.5px">'+(acc.email||acc.uid)+'</strong>'
          +(roleLabel?' <span class="badge" style="background:var(--info-bg);color:var(--info-text)">'+roleLabel.toUpperCase()+'</span>':'')
          +(acc.disabled?' <span class="badge" style="background:var(--danger-bg);color:var(--danger-text)">DISATTIVATO</span>':'')
          +'<div class="report-meta">Creato: '+_fmtDate(acc.createdAt)+' &middot; Ultimo accesso: '+_fmtDate(acc.lastSignIn)+'</div>'
          +'</div></div>';
        const actions=document.createElement("div");
        actions.style.cssText="display:flex;align-items:center;gap:6px;margin-top:8px;flex-wrap:wrap";

        const roleSel=document.createElement("select");
        roleSel.style.cssText="font-size:12px;padding:4px 8px";
        roleSel.innerHTML=_roleOptionsHtml(acc.role);
        roleSel.addEventListener("change",function(){
          roleSel.disabled=true;
          _callAdminFn("setAccountRole",{uid:acc.uid,role:roleSel.value||null}).then(function(){
            refreshList();
          }).catch(function(e){alert("Errore: "+e.message);roleSel.disabled=false;refreshList();});
        });
        actions.appendChild(roleSel);

        const delBtn=document.createElement("button");delBtn.type="button";
        delBtn.className="action-btn del";delBtn.textContent="Elimina";
        delBtn.addEventListener("click",function(){
          if(!confirm("Eliminare definitivamente l'account "+(acc.email||acc.uid)+"?"))return;
          delBtn.disabled=true;
          _callAdminFn("deleteOperatorAccount",{uid:acc.uid}).then(function(){
            refreshList();
          }).catch(function(e){alert("Errore: "+e.message);delBtn.disabled=false;});
        });
        actions.appendChild(delBtn);

        card.appendChild(actions);
        list.appendChild(card);
      });
    }).catch(function(e){
      list.innerHTML='<div class="empty">Errore nel caricamento: '+e.message+'</div>';
    });
  }
  refreshList();

  createBtn.addEventListener("click",function(){
    const email=emailInput.value.trim();
    const password=passInput.value;
    if(!email||!password){createMsg.textContent="Inserisci email e password.";createMsg.style.color="var(--danger-text)";return;}
    createBtn.disabled=true;createMsg.textContent="";
    _callAdminFn("createOperatorAccount",{email,password,role:roleSelect.value||null}).then(function(){
      emailInput.value="";passInput.value="";roleSelect.value="";
      createMsg.textContent="✅ Account creato.";createMsg.style.color="var(--success-text)";
      createBtn.disabled=false;
      refreshList();
    }).catch(function(e){
      createMsg.textContent="Errore: "+e.message;createMsg.style.color="var(--danger-text)";
      createBtn.disabled=false;
    });
  });
}
