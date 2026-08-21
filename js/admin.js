// Pannello "🛠️ Admin" nella dashboard operatori: gestione account (elenco,
// crea, promuovi/rimuovi admin, elimina). Visibile solo se window.isAdmin
// e' vero (claim Firebase role:"admin" - vedi core.js e le Cloud Function
// promoteToAdmin/demoteAdmin/listOperatorAccounts/createOperatorAccount/
// deleteOperatorAccount in functions/index.js).
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
    window.isAdmin=res.claims&&res.claims.role==="admin";
    renderPage();
  });
}

function _fmtDate(iso){
  if(!iso)return "mai";
  try{return new Date(iso).toLocaleString("it-IT",{day:"2-digit",month:"2-digit",year:"numeric",hour:"2-digit",minute:"2-digit"});}catch(e){return iso;}
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
  passInput.style.cssText="margin-bottom:10px";
  const createBtn=document.createElement("button");createBtn.type="button";
  createBtn.className="btn-primary";createBtn.style.cssText="width:auto;padding:8px 16px;font-size:13px";
  createBtn.textContent="Crea account";
  const createMsg=document.createElement("div");createMsg.style.cssText="font-size:12px;margin-top:8px";
  newBox.appendChild(emailInput);newBox.appendChild(passInput);newBox.appendChild(createBtn);newBox.appendChild(createMsg);
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
        const card=document.createElement("div");
        card.className="report-card";
        card.innerHTML='<div class="report-top"><div class="report-body">'
          +'<strong style="font-size:13.5px">'+(acc.email||acc.uid)+'</strong>'
          +(acc.isAdmin?' <span class="badge" style="background:var(--info-bg);color:var(--info-text)">ADMIN</span>':'')
          +(acc.disabled?' <span class="badge" style="background:var(--danger-bg);color:var(--danger-text)">DISATTIVATO</span>':'')
          +'<div class="report-meta">Creato: '+_fmtDate(acc.createdAt)+' &middot; Ultimo accesso: '+_fmtDate(acc.lastSignIn)+'</div>'
          +'</div></div>';
        const actions=document.createElement("div");
        actions.style.cssText="display:flex;gap:6px;margin-top:8px;flex-wrap:wrap";

        const toggleBtn=document.createElement("button");toggleBtn.type="button";
        toggleBtn.className="action-btn";
        toggleBtn.textContent=acc.isAdmin?"Rimuovi admin":"Rendi admin";
        toggleBtn.addEventListener("click",function(){
          toggleBtn.disabled=true;
          _callAdminFn(acc.isAdmin?"demoteAdmin":"promoteToAdmin",{email:acc.email}).then(function(){
            refreshList();
          }).catch(function(e){alert("Errore: "+e.message);toggleBtn.disabled=false;});
        });
        actions.appendChild(toggleBtn);

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
    _callAdminFn("createOperatorAccount",{email,password}).then(function(){
      emailInput.value="";passInput.value="";
      createMsg.textContent="✅ Account creato.";createMsg.style.color="var(--success-text)";
      createBtn.disabled=false;
      refreshList();
    }).catch(function(e){
      createMsg.textContent="Errore: "+e.message;createMsg.style.color="var(--danger-text)";
      createBtn.disabled=false;
    });
  });
}
