// Tab "📍 Postazioni" della dashboard, solo per l'admin: periodo di
// attivazione della stagione e elenco delle postazioni (numero, nome,
// coordinate), con inserimento e modifica.
//
// Scrive su /config/stagione e /config/postazioni, che le regole del database
// lasciano scrivere solo a chi ha il claim role:"admin" e leggere a tutti:
// le leggono la mappa pubblica, i tablet di postazione e le Cloud Function
// (bandiere automatiche, allarmi alle postazioni vicine). Vedi core.js per
// come il client le usa e public/stations-data.js per l'elenco di riserva.
import { STATIONS, _escapeHtml, haversine, inStagione, postazioniDaDb, postazioniRef, romeNow, stagioneData, stagioneRef } from "./core.js";

// Oltre questa distanza dalle altre postazioni una coordinata e' quasi
// certamente sbagliata (tipico: latitudine e longitudine scambiate, che
// portano Roseto in Arabia Saudita). Il litorale gestito e' lungo pochi km.
const DISTANZA_MAX_M=30000;

// "42.67120, 14.02308" (come lo copia Google Maps), "42.6712 14.02308",
// oppure con la virgola decimale all'italiana "42,6712; 14,02308".
export function leggiCoordinate(testo){
  const t=String(testo||"").trim();
  if(!t)return null;
  let parti;
  if(t.indexOf(".")>=0)parti=t.split(/[\s,;]+/);
  else if(t.indexOf(";")>=0)parti=t.split(/\s*;\s*/).map(function(p){return p.replace(",",".");});
  else parti=t.split(/\s+/).map(function(p){return p.replace(",",".");});
  parti=parti.filter(function(p){return p!=="";});
  if(parti.length!==2)return null;
  const lat=Number(parti[0]),lng=Number(parti[1]);
  if(!isFinite(lat)||!isFinite(lng))return null;
  return {lat:lat,lng:lng};
}

// Controlla una postazione prima di salvarla. `altre` sono le postazioni gia'
// esistenti (esclusa quella che si sta modificando). Ritorna {errore} oppure
// {postazione:{num,name,lat,lng}}.
export function validaPostazione(dati,altre,nuova){
  const num=Number(String(dati.num||"").trim());
  if(!Number.isInteger(num)||num<1||num>999)return {errore:"Il numero deve essere un intero tra 1 e 999."};
  if(nuova&&altre.some(function(s){return s.num===num;}))return {errore:"Esiste gia' la postazione P."+num+"."};
  const name=String(dati.name||"").trim().replace(/\s+/g," ");
  if(!name)return {errore:"Inserisci il nome della postazione."};
  if(name.length>80)return {errore:"Nome troppo lungo (massimo 80 caratteri)."};
  const c=leggiCoordinate(dati.coord);
  if(!c)return {errore:"Coordinate non valide: scrivi latitudine e longitudine, es. 42.67120, 14.02308"};
  if(c.lat<-90||c.lat>90||c.lng<-180||c.lng>180)return {errore:"Coordinate fuori scala (latitudine tra -90 e 90, longitudine tra -180 e 180)."};
  if(altre.length){
    const vicina=Math.min.apply(null,altre.map(function(s){return haversine(c.lat,c.lng,s.lat,s.lng);}));
    if(vicina>DISTANZA_MAX_M)return {errore:"Coordinate a "+Math.round(vicina/1000)+" km dalla postazione piu' vicina: controlla di non aver scambiato latitudine e longitudine."};
  }
  return {postazione:{num:num,name:name,lat:Math.round(c.lat*1e6)/1e6,lng:Math.round(c.lng*1e6)/1e6}};
}

function _nodo(lista){
  const o={};
  lista.forEach(function(s){o[String(s.num)]={name:s.name,lat:s.lat,lng:s.lng};});
  return o;
}

// Finche' l'elenco in uso e' quello del file di riserva, il nodo nel database
// non esiste: scrivere solo la postazione toccata lascerebbe un elenco con
// una postazione sola, e tutte le altre sparirebbero dalla mappa. La prima
// scrittura copia quindi l'elenco intero; dalla seconda in poi si tocca solo
// la voce interessata, cosi' due admin al lavoro insieme non si sovrascrivono.
function _salva(postazione){
  if(postazioniDaDb)return postazioniRef.child(String(postazione.num)).set({name:postazione.name,lat:postazione.lat,lng:postazione.lng});
  const lista=STATIONS.filter(function(s){return s.num!==postazione.num;}).concat([postazione]);
  return postazioniRef.set(_nodo(lista));
}
function _elimina(num){
  if(postazioniDaDb)return postazioniRef.child(String(num)).remove();
  return postazioniRef.set(_nodo(STATIONS.filter(function(s){return s.num!==num;})));
}

function _fmtData(iso){
  if(!iso)return "";
  const p=iso.split("-");
  return p.length===3?p[2]+"/"+p[1]+"/"+p[0]:iso;
}

function _box(titolo){
  const box=document.createElement("div");
  box.style.cssText="background:var(--bg2);border-radius:var(--radius-lg);padding:14px;margin-bottom:14px";
  box.innerHTML='<h3 style="font-size:13px;font-weight:700;margin-bottom:10px">'+titolo+'</h3>';
  return box;
}
function _msg(el,testo,ok){
  el.textContent=testo;
  el.style.color=ok?"var(--success-text)":"var(--danger-text)";
}

function _renderStagione(wrap){
  const box=_box("📅 Periodo di attivazione");
  const s=stagioneData||{};
  box.insertAdjacentHTML("beforeend",
    '<p style="font-size:12px;color:var(--text2);margin-bottom:10px;line-height:1.45">'
    +'Prima dell\'inizio e dopo la fine la home dell\'app mostra un banner di saluti e ringraziamenti per la stagione conclusa, '
    +'il servizio risulta non attivo e le bandiere automatiche delle 09:00 restano rosse.</p>');
  const riga=document.createElement("div");
  riga.style.cssText="display:grid;grid-template-columns:1fr 1fr;gap:8px";
  riga.innerHTML='<div><label style="margin-top:0">Inizio</label><input type="date" data-k="inizio"></div>'
    +'<div><label style="margin-top:0">Fine</label><input type="date" data-k="fine"></div>';
  box.appendChild(riga);
  const inizio=riga.querySelector('[data-k="inizio"]'),fine=riga.querySelector('[data-k="fine"]');
  inizio.value=s.inizio||"";fine.value=s.fine||"";
  const lab=document.createElement("label");lab.textContent="Messaggio del banner (facoltativo)";
  const msg=document.createElement("textarea");
  msg.rows=3;msg.maxLength=500;msg.value=s.messaggio||"";
  msg.placeholder="Lasciato vuoto: «La stagione balneare è terminata. Grazie per averci accompagnato: vi aspettiamo la prossima estate!»";
  box.appendChild(lab);box.appendChild(msg);
  const stato=document.createElement("p");
  stato.style.cssText="font-size:12px;margin:10px 0;font-weight:600";
  function aggiornaStato(){
    const oggi=romeNow().date;
    const att=inStagione({inizio:inizio.value,fine:fine.value},oggi);
    stato.textContent=att?"🟢 Oggi la stagione è attiva: il banner non si vede.":"🔴 Oggi è fuori stagione: il banner di fine stagione è visibile.";
    stato.style.color=att?"var(--success-text)":"var(--danger-text)";
  }
  inizio.addEventListener("input",aggiornaStato);fine.addEventListener("input",aggiornaStato);
  aggiornaStato();
  box.appendChild(stato);
  const btn=document.createElement("button");btn.type="button";
  btn.className="btn-primary";btn.style.cssText="width:auto;padding:8px 16px;font-size:13px";
  btn.textContent="Salva periodo";
  const esito=document.createElement("div");esito.style.cssText="font-size:12px;margin-top:8px";
  box.appendChild(btn);box.appendChild(esito);
  btn.addEventListener("click",function(){
    if(!inizio.value||!fine.value){_msg(esito,"Inserisci sia la data di inizio sia quella di fine.");return;}
    if(fine.value<inizio.value){_msg(esito,"La fine non può venire prima dell'inizio.");return;}
    const dati={inizio:inizio.value,fine:fine.value};
    const t=msg.value.trim();if(t)dati.messaggio=t;
    btn.disabled=true;
    stagioneRef.set(dati).then(function(){
      _msg(esito,"✅ Periodo salvato: dal "+_fmtData(dati.inizio)+" al "+_fmtData(dati.fine)+".",true);
    }).catch(function(e){_msg(esito,"Errore: "+e.message);}).then(function(){btn.disabled=false;});
  });
  wrap.appendChild(box);
}

function _renderNuova(wrap,ridisegna){
  const box=_box("➕ Nuova postazione");
  const griglia=document.createElement("div");
  griglia.style.cssText="display:grid;grid-template-columns:80px 1fr;gap:8px";
  const num=document.createElement("input");num.type="number";num.min="1";num.max="999";num.placeholder="N.";
  const prossimo=STATIONS.reduce(function(m,s){return Math.max(m,s.num);},0)+1;
  num.value=String(prossimo);
  const nome=document.createElement("input");nome.type="text";nome.placeholder="Nome (es. Lido Azzurra)";nome.maxLength=80;
  griglia.appendChild(num);griglia.appendChild(nome);
  const coord=document.createElement("input");coord.type="text";
  coord.placeholder="Coordinate: 42.67120, 14.02308";coord.style.cssText="margin-top:8px";
  const aiuto=document.createElement("p");
  aiuto.style.cssText="font-size:11px;color:var(--text3);margin:4px 0 10px";
  aiuto.textContent="Su Google Maps: tieni premuto sul punto e copia le coordinate che compaiono in alto.";
  const btn=document.createElement("button");btn.type="button";
  btn.className="btn-primary";btn.style.cssText="width:auto;padding:8px 16px;font-size:13px";
  btn.textContent="Aggiungi postazione";
  const esito=document.createElement("div");esito.style.cssText="font-size:12px;margin-top:8px";
  box.appendChild(griglia);box.appendChild(coord);box.appendChild(aiuto);box.appendChild(btn);box.appendChild(esito);
  btn.addEventListener("click",function(){
    const v=validaPostazione({num:num.value,name:nome.value,coord:coord.value},STATIONS,true);
    if(v.errore){_msg(esito,v.errore);return;}
    btn.disabled=true;
    _salva(v.postazione).then(function(){
      ridisegna("✅ Aggiunta P."+v.postazione.num+" – "+v.postazione.name+".");
    }).catch(function(e){_msg(esito,"Errore: "+e.message);btn.disabled=false;});
  });
  wrap.appendChild(box);
}

function _renderElenco(wrap,ridisegna){
  const box=_box("📍 Postazioni ("+STATIONS.length+")");
  if(!postazioniDaDb){
    box.insertAdjacentHTML("beforeend",
      '<p style="font-size:12px;color:var(--warning-text);background:var(--warning-bg);border-radius:var(--radius);padding:8px 10px;margin-bottom:10px;line-height:1.45">'
      +'Elenco predefinito dell\'app: al primo salvataggio viene copiato per intero nel database e da quel momento si gestisce solo da qui.</p>');
  }
  const tabella=document.createElement("div");
  tabella.style.cssText="display:grid;gap:6px";
  STATIONS.slice().sort(function(a,b){return a.num-b.num;}).forEach(function(s){
    tabella.appendChild(_riga(s,ridisegna));
  });
  box.appendChild(tabella);
  wrap.appendChild(box);
}

function _riga(s,ridisegna){
  const riga=document.createElement("div");
  riga.style.cssText="background:var(--bg);border:1px solid var(--border);border-radius:var(--radius);padding:9px 11px";
  function vista(){
    riga.innerHTML='<div style="display:flex;align-items:center;gap:10px">'
      +'<span style="font-weight:800;font-size:13px;min-width:44px">P.'+s.num+'</span>'
      +'<div style="flex:1;min-width:0">'
      +'<div style="font-size:13px;font-weight:600;overflow-wrap:anywhere">'+_escapeHtml(s.name)+'</div>'
      +'<a href="https://www.google.com/maps?q='+s.lat+','+s.lng+'" target="_blank" rel="noopener" style="font-size:11.5px;color:var(--info-text);text-decoration:none;font-variant-numeric:tabular-nums">'+s.lat.toFixed(5)+', '+s.lng.toFixed(5)+'</a>'
      +'</div></div>';
    const azioni=document.createElement("div");
    azioni.style.cssText="display:flex;gap:6px;margin-top:6px;justify-content:flex-end";
    const mod=document.createElement("button");mod.type="button";mod.className="action-btn resolve";mod.textContent="Modifica";
    mod.addEventListener("click",modifica);
    const del=document.createElement("button");del.type="button";del.className="action-btn del";del.textContent="Elimina";
    del.addEventListener("click",function(){
      if(STATIONS.length<=1){alert("Deve restare almeno una postazione.");return;}
      if(!confirm("Eliminare P."+s.num+" – "+s.name+"?\n\nSparisce dalla mappa, dagli elenchi e dagli allarmi. I tablet assegnati a questa postazione vanno riassegnati dal tab Dispositivi."))return;
      del.disabled=true;
      _elimina(s.num).then(function(){ridisegna("🗑️ Eliminata P."+s.num+".");})
        .catch(function(e){alert("Errore: "+e.message);del.disabled=false;});
    });
    azioni.appendChild(mod);azioni.appendChild(del);
    riga.appendChild(azioni);
  }
  function modifica(){
    riga.innerHTML='<div style="font-weight:800;font-size:13px;margin-bottom:6px">P.'+s.num+'</div>';
    const nome=document.createElement("input");nome.type="text";nome.value=s.name;nome.maxLength=80;
    const coord=document.createElement("input");coord.type="text";coord.value=s.lat+", "+s.lng;coord.style.cssText="margin-top:6px";
    const nota=document.createElement("p");
    nota.style.cssText="font-size:11px;color:var(--text3);margin:4px 0 0";
    nota.textContent="Il numero non si cambia: bandiere, note e tablet sono legati a lui. Per rinumerare, aggiungi la nuova ed elimina la vecchia.";
    const esito=document.createElement("div");esito.style.cssText="font-size:12px;margin-top:6px";
    const azioni=document.createElement("div");
    azioni.style.cssText="display:flex;gap:6px;margin-top:8px;justify-content:flex-end";
    const annulla=document.createElement("button");annulla.type="button";annulla.className="action-btn";annulla.textContent="Annulla";
    annulla.addEventListener("click",vista);
    const salva=document.createElement("button");salva.type="button";salva.className="action-btn resolve";salva.style.fontWeight="700";salva.textContent="Salva";
    salva.addEventListener("click",function(){
      const altre=STATIONS.filter(function(x){return x.num!==s.num;});
      const v=validaPostazione({num:s.num,name:nome.value,coord:coord.value},altre,false);
      if(v.errore){_msg(esito,v.errore);return;}
      salva.disabled=true;
      _salva(v.postazione).then(function(){ridisegna("✅ Salvata P."+s.num+".");})
        .catch(function(e){_msg(esito,"Errore: "+e.message);salva.disabled=false;});
    });
    azioni.appendChild(annulla);azioni.appendChild(salva);
    riga.appendChild(nome);riga.appendChild(coord);riga.appendChild(nota);riga.appendChild(esito);riga.appendChild(azioni);
    nome.focus();
  }
  vista();
  return riga;
}

export function renderPostazioniAdmin(page){
  const wrap=document.createElement("div");
  page.appendChild(wrap);
  // Dopo un salvataggio il listener in core.js ha gia' aggiornato STATIONS
  // (la scrittura locale arriva subito), quindi basta ridisegnare il
  // pannello con in cima l'esito.
  function ridisegna(avviso){
    wrap.innerHTML="";
    if(avviso){
      const a=document.createElement("div");
      a.style.cssText="font-size:12.5px;font-weight:600;color:var(--success-text);background:var(--success-bg);border-radius:var(--radius);padding:8px 12px;margin-bottom:12px";
      a.textContent=avviso;
      wrap.appendChild(a);
    }
    _renderStagione(wrap);
    _renderNuova(wrap,ridisegna);
    _renderElenco(wrap,ridisegna);
  }
  ridisegna();
}
