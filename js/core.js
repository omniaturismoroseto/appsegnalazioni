import { renderStationPanel, renderAttivazione } from "./pages-station.js";
import { _chatDeviceId, _chatMsgAddressedToMe, _onIncomingChatAudio, aggiornaListaChat } from "./chat.js";

// Quanto resta disponibile la foto di un minore prima della cancellazione
// automatica. Vive qui e non tra le pagine pubbliche perche' e' una regola di
// conservazione dei dati, non un dettaglio di una schermata.
// Nomi leggibili dei ruoli. Stanno nelle fondamenta perche' li usano sia il
// pannello admin sia la chat, e non sono un pezzo di nessuna delle due.
export const ROLE_LABELS={
  admin:"Admin",
  coordinator:"Coordinatore",
  cp:"Capitaneria di Porto",
  forze_ordine:"Forze dell'ordine"
};

export const CHILD_PHOTO_TTL_MS=6*60*60*1000;   // foto minore cancellata 6h dopo la chiusura del caso

// ---- Cornice e schermate: le mette chi avvia l'app, non core.js ----
// L'app pubblica ha mappa, intestazione e una ventina di pagine; l'app di
// postazione non ha nulla di tutto questo e non deve nemmeno scaricarlo. Invece
// di importare qui i moduli di entrambe, core.js espone un registro: chi parte
// (boot.js o boot-postazione.js) dichiara cosa esiste. Cio' che non e' stato
// dichiarato semplicemente non fa nulla, invece di far esplodere il render.
const chrome={
  renderHeader:function(){},
  renderMapLegend:function(){},
  refreshMarkers:function(){},
  initMap:function(){},
  resizeMap:function(){}
};
export function registerChrome(parts){
  Object.keys(parts||{}).forEach(function(k){
    if(typeof parts[k]==="function")chrome[k]=parts[k];
  });
}
export function refreshMarkers(){chrome.refreshMarkers();}
export function renderHeader(){chrome.renderHeader();}

const screens={};
export function registerScreens(map){
  Object.keys(map||{}).forEach(function(k){
    if(typeof map[k]==="function")screens[k]=map[k];
  });
}
// Le schermate che entrambe le app hanno sempre: il pannello di postazione e
// la richiesta di attivazione.
registerScreens({station:renderStationPanel,attivazione:renderAttivazione});

  // Il pacchetto Sentry vero si carica in modo differito (per non rallentare
  // l'avvio): nei primissimi istanti window.Sentry esiste già come "guscio"
  // ma alcuni metodi (setTag) potrebbero non esserci ancora — un try/catch
  // evita che questo blocchi l'esecuzione del resto dell'app.
  _sentrySetTag("role","public"); // valore di default, aggiornato al login/attivazione postazione
  history.replaceState({screen:"home"}, "", "");
// Sblocca AudioContext al primo tocco utente (richiesto da browser mobile)
export function _unlockAudio(){
  if(_alertCtx){try{if(_alertCtx.state==="suspended")_alertCtx.resume();}catch(e){}return;}
  try{
    _alertCtx=new(window.AudioContext||window.webkitAudioContext)();
    // Test tone silenzioso per sbloccare
    var o=_alertCtx.createOscillator();var g=_alertCtx.createGain();
    g.gain.value=0;o.connect(g);g.connect(_alertCtx.destination);
    o.start();o.stop(_alertCtx.currentTime+0.001);
  }catch(e){}
}
document.addEventListener("touchstart",_unlockAudio,{once:true,passive:true});
document.addEventListener("click",_unlockAudio,{once:true,passive:true});

// Debug: mostra subito che startApp è partito
export var dbg=document.getElementById("page");
if(dbg)dbg.innerHTML='<p style="padding:10px;font-size:12px;color:#888">Avvio app...</p>';

export const firebaseConfig={
  apiKey:"AIzaSyDcLeex_9o0BqgAs2lEEXTiVYG_zRSiXQA",
  authDomain:"app-segnalazioni-omnia-roseto.firebaseapp.com",
  databaseURL:"https://app-segnalazioni-omnia-roseto-default-rtdb.europe-west1.firebasedatabase.app",
  projectId:"app-segnalazioni-omnia-roseto",
  storageBucket:"app-segnalazioni-omnia-roseto.firebasestorage.app",
  messagingSenderId:"699028105579",
  appId:"1:699028105579:web:cdc0a432083b7fe18d442e"
};
export const FCM_VAPID_KEY = "BHJrW95NpOuHuRHcx9uLFrAxOfL6mhhM8JsuYycCFfY0Y9F8LB9skDgKfZ2nYzSjxs_qsgVziMe9zADuH0kvB_E";

// App Check (reCAPTCHA v3): allega un token di attestazione a ogni richiesta
// verso Realtime Database e Cloud Functions, così l'infrastruttura può
// distinguere i client legittimi (questa app) da bot/script. Va attivato UNA
// volta, subito dopo initializeApp e prima di qualsiasi uso di Auth/DB, quindi
// lo chiamiamo dentro _getRealDb/_getAuth. Finché non si attiva "Enforce" in
// Firebase Console il token viene solo raccolto (modalità osservazione): se il
// caricamento fallisse, l'app continua a funzionare identica.
const APP_CHECK_SITE_KEY = "6LePypQtAAAAAE8ssXg685Ai7ThaUivjhxfAQLUZ";
var _appCheckActivated = false;
function _activateAppCheckOnce(fbSdk){
  if(_appCheckActivated) return;
  _appCheckActivated = true;
  try{
    if(fbSdk && typeof fbSdk.appCheck === "function"){
      fbSdk.appCheck().activate(APP_CHECK_SITE_KEY, true); // true = refresh automatico del token
      console.log("App Check attivato (reCAPTCHA v3)");
    }
  }catch(e){ console.warn("App Check non attivato:", e); }
}

// Firebase Auth - inizializzazione diretta
export var auth=null;
export function _getAuth(){
  if(auth)return auth;
  // firebaseSdk catturato prima della sovrascrittura del wrapper
  var fbSdk=firebaseSdk;
  if(!fbSdk||typeof fbSdk.auth!=="function"){
    // Fallback: prova window.firebase se firebaseSdk non funziona
    fbSdk=window.firebase;
  }
  if(!fbSdk||typeof fbSdk.auth!=="function"){
    console.error("Firebase SDK non disponibile");
    return null;
  }
  try{
    // Usa app già inizializzata o creane una nuova
    var app=fbSdk.apps&&fbSdk.apps.length>0?fbSdk.apps[0]:fbSdk.initializeApp(firebaseConfig);
    _activateAppCheckOnce(fbSdk);
    auth=fbSdk.auth(app);
    console.log("Firebase Auth inizializzato OK");
    return auth;
  }catch(e){
    console.error("Errore init Firebase Auth:",e);
    return null;
  }
}


export var _realDbInstance=null;
export function _getRealDb(){
  if(_realDbInstance)return _realDbInstance;
  var fbSdk=firebaseSdk;
  if(!fbSdk||typeof fbSdk.database!=="function")fbSdk=window.firebase;
  if(!fbSdk||typeof fbSdk.database!=="function"){console.error("Firebase Database SDK non disponibile");return null;}
  try{
    var app=fbSdk.apps&&fbSdk.apps.length>0?fbSdk.apps[0]:fbSdk.initializeApp(firebaseConfig);
    _activateAppCheckOnce(fbSdk);
    _realDbInstance=fbSdk.database(app);
    return _realDbInstance;
  }catch(e){console.error("Errore init Firebase Database:",e);return null;}
}

// ---- Modalità postazione: scambia il deviceId abilitato con una sessione Auth reale ----
// (custom token rilasciato dalla Cloud Function getStationToken, scoped alla propria postazione)
// Chiamata diretta via fetch (protocollo "callable" v2) invece dell'SDK Functions:
// l'SDK risultava inaffidabile nel rispettare la regione europe-west1 in questo contesto.
export async function _activateStationMode(deviceId,station){
  try{
    var resp=await fetch("https://europe-west1-app-segnalazioni-omnia-roseto.cloudfunctions.net/getStationToken",{
      method:"POST",
      headers:{"Content-Type":"application/json"},
      body:JSON.stringify({data:{deviceId:deviceId}})
    });
    var j=await resp.json();
    if(j.error)throw new Error(j.error.message||"Errore attivazione dispositivo");
    var token=j.result&&j.result.token;
    if(!token)throw new Error("Token mancante nella risposta");
    var _a=_getAuth();
    if(!_a)throw new Error("Auth non disponibile");
    await _a.signInWithCustomToken(token);
    stationMode=String((j.result&&j.result.station)||station);
    _sentrySetTag("role","station");_sentrySetTag("station",stationMode);
    render("station");
    _registerStationPush(deviceId);
  }catch(e){
    console.error("Errore attivazione modalità postazione:",e);
    stationMode=null;
    render(window.currentRole==="operator"?"dashboard":"home");
  }
}

// ---- Gestisce una push ricevuta ad app aperta (schermo acceso): banner + suono in loop ----
// Funziona per i dispositivi di postazione destinatari dell'allarme mirato E per
// admin/coordinatore se hanno attivato le notifiche sul proprio telefono.
export function _handleStationPush(payload){
  var d=(payload&&payload.data)||{};
  if(d.type!=="station_emergency")return;
  var origin=String(d.station||"");
  _startAlertSound({_key:"stEm_"+origin+"_"+Date.now(),type:"emergenza",sub:"Allarme rapido postazione",zone:"P."+origin});
}
export function _ensureStationPushForegroundHandler(){
  if(window._stFgMsgHandlerSet||!_fcmMessaging)return;
  window._stFgMsgHandlerSet=true;
  _fcmMessaging.onMessage(_handleStationPush);
}

// Plugin push nativo, disponibile solo dentro l'app Android (Capacitor lo inietta
// nella WebView anche quando questa carica il sito remoto). Fuori dall'app - PWA
// o browser - restituisce null e si usa la via web.
function _capacitorPush(){
  try{
    var C=window.Capacitor;
    if(!C||typeof C.isNativePlatform!=="function"||!C.isNativePlatform())return null;
    return (C.Plugins&&C.Plugins.PushNotifications)||null;
  }catch(e){return null;}
}

// Chiede permesso e token FCM al plugin nativo. Il token non torna dal register():
// arriva sull'evento "registration", quindi si aspetta quello, con un tetto di
// tempo per non restare appesi in silenzio se non arriva mai.
async function _stationPushTokenNative(PN){
  var perm=await PN.checkPermissions();
  if(!perm||perm.receive!=="granted")perm=await PN.requestPermissions();
  if(!perm||perm.receive!=="granted")throw new Error("permesso notifiche negato");
  var handles=[];
  try{
    return await new Promise(function(resolve,reject){
      var done=false;
      var timer=setTimeout(function(){
        if(done)return;done=true;
        reject(new Error("nessun token FCM entro 20 secondi"));
      },20000);
      function finish(fn,arg){if(done)return;done=true;clearTimeout(timer);fn(arg);}
      Promise.resolve(PN.addListener("registration",function(t){
        finish(resolve,t&&t.value);
      })).then(function(h){handles.push(h);}).catch(function(){});
      Promise.resolve(PN.addListener("registrationError",function(e){
        finish(reject,new Error((e&&(e.error||e.message))||"registrazione FCM fallita"));
      })).then(function(h){handles.push(h);}).catch(function(){});
      Promise.resolve(PN.register()).catch(function(e){finish(reject,e);});
    });
  }finally{
    handles.forEach(function(h){try{if(h&&h.remove)h.remove();}catch(e){}});
  }
}

// ---- Registra il token push del dispositivo di postazione (dopo il sign-in col custom token) ----
// Senza pushToken la postazione e' esclusa dagli allarmi: sendStationEmergency
// sceglie i destinatari con "enabled && pushToken", quindi un dispositivo senza
// token viene saltato in silenzio. Dentro l'app il token va chiesto al plugin
// nativo, perche' la WebView di Android non implementa le Web Push (non esiste
// PushManager) e getToken() con vapidKey fallisce sempre.
// pushKind registra da quale strada e' arrivato il token, cosi' si puo' capire
// dal database cosa e' successo su un dispositivo senza doverci mettere le mani.
export async function _registerStationPush(deviceId){
  try{
    var PN=_capacitorPush();
    if(PN){
      var nativeToken=await _stationPushTokenNative(PN);
      if(!nativeToken)throw new Error("token nativo vuoto");
      await stationDevicesRef.child(deviceId).update({ pushToken: nativeToken, pushKind: "native", chatDeviceId: _chatDeviceId(), lastSeen: Date.now() });
      console.log("✅ Push postazione registrata (nativa)");
      return;
    }
    if (!("serviceWorker" in navigator) || !("Notification" in window)) return;
    if (!_fcmApp){
      try{_fcmApp = firebaseSdk.initializeApp(firebaseConfig, "fcmApp");}
      catch(e){_fcmApp = firebaseSdk.app("fcmApp");}
    }
    if (!_fcmMessaging) _fcmMessaging = firebaseSdk.messaging(_fcmApp);
    _ensureStationPushForegroundHandler();
    let permission = Notification.permission;
    if (permission !== "granted") permission = await Notification.requestPermission();
    if (permission !== "granted"){console.log("Notifiche postazione: permesso negato");return;}
    const registration = await navigator.serviceWorker.register(
      "/appsegnalazioni/firebase-messaging-sw.js", { scope: "/appsegnalazioni/" }
    );
    const token = await _fcmMessaging.getToken({ vapidKey: FCM_VAPID_KEY, serviceWorkerRegistration: registration });
    if (!token) return;
    await stationDevicesRef.child(deviceId).update({ pushToken: token, pushKind: "web", chatDeviceId: _chatDeviceId(), lastSeen: Date.now() });
    console.log("✅ Push postazione registrata (web)");
  }catch(e){
    console.error("Errore registrazione push postazione:",e);
    _sentryCapture(e);
  }
}

// ---- Registra il token push di un contatto emergenza (admin/coordinatore) sul dispositivo corrente ----
export async function _registerContactPush(roleKey,btnEl){
  if (!("serviceWorker" in navigator) || !("Notification" in window)) { alert("Notifiche non supportate su questo browser/dispositivo."); return; }
  if(btnEl){btnEl.disabled=true;btnEl.textContent="Attivazione…";}
  try{
    if (!_fcmApp){
      try{_fcmApp = firebaseSdk.initializeApp(firebaseConfig, "fcmApp");}
      catch(e){_fcmApp = firebaseSdk.app("fcmApp");}
    }
    if (!_fcmMessaging) _fcmMessaging = firebaseSdk.messaging(_fcmApp);
    _ensureStationPushForegroundHandler();
    let permission = Notification.permission;
    if (permission !== "granted") permission = await Notification.requestPermission();
    if (permission !== "granted"){ alert("Permesso notifiche negato."); return; }
    const registration = await navigator.serviceWorker.register(
      "/appsegnalazioni/firebase-messaging-sw.js", { scope: "/appsegnalazioni/" }
    );
    const token = await _fcmMessaging.getToken({ vapidKey: FCM_VAPID_KEY, serviceWorkerRegistration: registration });
    if (!token){ alert("Impossibile ottenere il token di notifica."); return; }
    await emergencyContactsRef.child(roleKey).update({ pushToken: token });
    alert("Notifiche di emergenza attivate su questo dispositivo.");
  }catch(e){
    alert("Errore: "+e.message);
  }finally{
    if(btnEl){btnEl.disabled=false;btnEl.textContent="🔔 Attiva su questo dispositivo";}
  }
}
export const _realDb=_getRealDb();
export const reportsRef=_realDb.ref("reports");
// Copia pubblica e ripulita (solo type/zone/status) alimentata dalla Cloud
// Function mirrorReportPublic: e' l'UNICA fonte di segnalazioni leggibile dai
// visitatori non autenticati, per la mappa. /reports vero contiene dati
// personali ed e' ora riservato agli operatori/postazioni autenticati.
export const reportsPublicRef=_realDb.ref("reportsPublic");
export const flagsRef=_realDb.ref("flags");
export const stationNotesRef=_realDb.ref("stationNotes");
export const stationDevicesRef=_realDb.ref("stationDevices");
export const stationEmergenciesRef=_realDb.ref("stationEmergencies");
export const emergencyContactsRef=_realDb.ref("config/emergencyContacts");
export const chatRef=_realDb.ref("chat/messages");
// Canale separato per admin/coordinatore/CP/forze dell'ordine: mai
// raggiungibile da postazioni o operatori normali (vedi database.rules.json,
// e window.userRole lato client per nascondere anche il tab).
export const chatEsternaRef=_realDb.ref("chatEsterna/messages");
export let _fcmApp = null;
export let _fcmMessaging = null;
export let _fcmToken = null;

export function _safeTokenKey(token){
  return btoa(token).replace(/\+/g,"-").replace(/\//g,"_").replace(/=+$/g,"");
}

export async function enableOperatorPush(){
  if (!("serviceWorker" in navigator) || !("Notification" in window)) {
    console.log("Push non supportate");
    return;
  }

  if (!_fcmApp){
    _fcmApp = firebaseSdk.initializeApp(firebaseConfig, "fcmApp");
  }

  if (!_fcmMessaging){
    _fcmMessaging = firebaseSdk.messaging(_fcmApp);
  }

  let permission = Notification.permission;
  if (permission !== "granted"){
    permission = await Notification.requestPermission();
  }

  if (permission !== "granted"){
    console.log("Permesso negato");
    return;
  }

  const registration = await navigator.serviceWorker.register(
    "/appsegnalazioni/firebase-messaging-sw.js",
    { scope: "/appsegnalazioni/" }
  );

  const token = await _fcmMessaging.getToken({
    vapidKey: FCM_VAPID_KEY,
    serviceWorkerRegistration: registration
  });

  if (!token){
    console.log("Token non ottenuto");
    return;
  }

  _fcmToken = token;
  localStorage.setItem("omnia_fcm_token", token);

  const tokenKey = _safeTokenKey(token);

  await _realDb.ref("operatorTokens/" + tokenKey).set({
    token: token,
    enabled: true,
    role: "operator",
    uid: (auth&&auth.currentUser)?auth.currentUser.uid:null,
    // Identita' con cui questo dispositivo firma i messaggi in chat: serve al
    // server per non rimandargli la push di un vocale che ha mandato lui.
    chatDeviceId: _chatDeviceId(),
    lastSeen: Date.now()
  });

  console.log("✅ PUSH ATTIVO");
}

export async function disableOperatorPush(){
  try{
    if(!_fcmToken){
      const savedToken = localStorage.getItem("omnia_fcm_token");
      if(savedToken) _fcmToken = savedToken;
    }

    if(!_fcmToken) return;

    const tokenKey = _safeTokenKey(_fcmToken);

    await _realDb.ref("operatorTokens/" + tokenKey).update({
      enabled: false,
      lastDisabled: Date.now()
    });

    console.log("🔕 PUSH DISATTIVATO");
  }catch(e){
    console.log("Errore disableOperatorPush", e);
  }
}

export const PHONE="+393284769641";
export const WA_NOTIFY="393284769641";
export const WA_CHANNEL="https://whatsapp.com/channel/0029VbCewQeCMY0PyZ6v5P3z";
// PIN removed - using Firebase Authentication
export const RED="#D62B1F",NAVY="#1A3B8C";
export const FLAG_COLORS={verde:"#27ae60",gialla:"#F5C800",rossa:"#e74c3c"};
export const ALERT_COLORS={emergenza:"#D81B8C",pericolo:"#1a1a1a"};
export const LOGO_SRC=null;

export const STATIONS=STATIONS_DATA;
// Note permanenti di pericolo — non eliminabili dall'operatore
export const PERMANENT_STATION_NOTES={"10":"⚠️Zona soggetta a correnti che trascinano verso il Pontile. Prestare sempre la massima attenzione ed ascolta i richiami del personale ALS⚠️"};
export const ZONES=STATIONS.map(s=>`P.${s.num} \u2013 ${s.name}`);
ZONES.push("Spiaggia libera / Area non concessionata");
export const TYPES={
  emergenza:{label:"Emergenza",sub:["Annegamento / soccorso","Persona dispersa","Infortunio","Malore in spiaggia"]},
  pericolo: {label:"Pericolo", sub:["Vento Forte","Correnti pericolose","Mare molto mosso","Cane libero senza padrone","Oggetti pericolosi in acqua o spiaggia"]},

};

export let suppressHistory=false;

// Modal globale per inserimento note — non distrutto dal re-render
export function _openNoteModal(stationNum, stationName, existingNote){
  var existing=document.getElementById("_noteModal");
  if(existing)existing.remove();
  var overlay=document.createElement("div");
  overlay.className="note-modal-overlay";
  overlay.id="_noteModal";
  var modal=document.createElement("div");
  modal.className="note-modal";
  modal.innerHTML='<h3>\u26a0\ufe0f Nota pericolo &mdash; P.'+stationNum+'</h3>'
    +'<p>'+stationName+'</p>';
  var ta=document.createElement("textarea");
  ta.placeholder="Es: Secca pericolosa, corrente laterale...";
  ta.value=existingNote||"";
  modal.appendChild(ta);
  var btns=document.createElement("div");
  btns.className="note-modal-btns";
  var cancelBtn=document.createElement("button");
  cancelBtn.textContent="Annulla";
  cancelBtn.style.cssText="padding:12px;border-radius:var(--radius);border:1px solid var(--border2);background:var(--bg2);font-size:14px;cursor:pointer";
  cancelBtn.addEventListener("click",function(){overlay.remove();});
  var saveBtn=document.createElement("button");
  saveBtn.style.cssText="padding:12px;border-radius:var(--radius);border:none;background:#1a1a1a;color:white;font-size:14px;font-weight:700;cursor:pointer";
  saveBtn.textContent="Salva nota";
  saveBtn.addEventListener("click",function(){
    var txt=ta.value.trim();
    if(!txt){alert("Scrivi una nota prima di salvare.");return;}
    stationNotesData[String(stationNum)]=txt; // aggiorna locale immediatamente
    stationNotesRef.child(String(stationNum)).set(txt); // scrivi SOLO questa nota
    try{var _sn=JSON.parse(localStorage.getItem("fb_stationNotes")||"{}");_sn[String(stationNum)]=txt;localStorage.setItem("fb_stationNotes",JSON.stringify(_sn));}catch(e){}
    overlay.remove();
    refreshMarkers();
    if(currentScreen==="home")renderPage();
    if(currentScreen==="dashboard"&&window.activeDashTab==="note")renderPage();
  });
  btns.appendChild(cancelBtn);
  btns.appendChild(saveBtn);
  modal.appendChild(btns);
  overlay.appendChild(modal);
  overlay.addEventListener("click",function(e){if(e.target===overlay)overlay.remove();});
  document.body.appendChild(overlay);
  setTimeout(function(){ta.focus();},80);
}

export function _openAnnegamentoAlert(){
  var existing=document.getElementById("_annModal");
  if(existing)existing.remove();
  var overlay=document.createElement("div");
  overlay.className="ann-overlay";
  overlay.id="_annModal";
  var modal=document.createElement("div");
  modal.className="ann-modal";
  modal.innerHTML=
    '<div style="font-size:48px;margin-bottom:12px">\uD83D\uDEA8</div>'
    +'<h2>VAI SUBITO DAL BAGNINO PI\u00d9 VICINO!!!</h2>';
  var callBtn=document.createElement("a");
  callBtn.href="tel:+393284769641";
  callBtn.className="ann-call";
  callBtn.innerHTML="\uD83D\uDCDE CHIAMA OMNIA";
  callBtn.addEventListener("click",function(){setTimeout(function(){overlay.remove();},300);});
  var closeBtn=document.createElement("button");
  closeBtn.className="ann-close";
  closeBtn.textContent="Chiudi";
  closeBtn.addEventListener("click",function(){overlay.remove();});
  modal.appendChild(callBtn);
  modal.appendChild(closeBtn);
  overlay.appendChild(modal);
  overlay.addEventListener("click",function(e){if(e.target===overlay)overlay.remove();});
  document.body.appendChild(overlay);
}

export function _refreshNotePanel(){
  // Aggiorna solo i dot e badge senza toccare eventuali modal aperti
  var panel=document.getElementById("_notePanelRows");
  if(!panel)return;
  STATIONS.forEach(function(s){
    var dot=document.getElementById("_noteDot_"+s.num);
    var badge=document.getElementById("_noteBadge_"+s.num);
    var addBtn=document.getElementById("_noteAddBtn_"+s.num);
    var delBtn=document.getElementById("_noteDelBtn_"+s.num);
    var permNote=PERMANENT_STATION_NOTES[String(s.num)];
    var note=stationNotesData[String(s.num)];
    if(dot)dot.style.background=note?"#1a1a1a":FLAG_COLORS[flagsData[s.num]||"verde"];
    if(badge){badge.textContent=note?String(note).substring(0,40)+(note.length>40?"...":""):"";
      badge.style.display=note?"inline-block":"none";}
    if(addBtn)addBtn.style.display=note?"none":"inline-block";
    if(delBtn)delBtn.style.display=note?"inline-block":"none";
  });
}

export let currentScreen="home";
export let stationMode=null;

// L'APK di postazione carica il sito con ?app=postazione. Un tablet in
// dotazione a una postazione non e' un telefono qualunque: non deve mai
// mostrare l'app pubblica - niente mappa, niente segnalazioni del bagnante,
// niente login operatori. Prima dell'attivazione mostra solo la richiesta di
// abilitazione, dopo soltanto il pannello di postazione. Il flag vale per la
// sessione anche se un giro di navigazione perdesse il parametro dall'URL.
// Vero solo dentro l'APK: fuori (browser, PWA) il ponte nativo non esiste.
export const IS_NATIVE_APP=(function(){
  try{
    return !!(window.Capacitor&&typeof window.Capacitor.isNativePlatform==="function"&&window.Capacitor.isNativePlatform());
  }catch(e){return false;}
})();

export const STATION_APP=(function(){
  try{
    if(window.__OMNIA_STATION_APP__===true)return true;
    if(new URLSearchParams(location.search).get("app")==="postazione"){
      try{sessionStorage.setItem("omnia_station_app","1");}catch(e){}
      return true;
    }
    return sessionStorage.getItem("omnia_station_app")==="1";
  }catch(e){return false;}
})();

// Il foglio di stile si aggancia a questa classe per dare al pannello tutta la
// larghezza dello schermo e togliere il pie di pagina, che su un apparato di
// servizio non ha destinatario. Va messa QUI e non piu' in alto: STATION_APP
// non esiste ancora prima di questo punto, e un riferimento anticipato
// falliva in silenzio dentro un try/catch, lasciando il pannello incolonnato
// come su un telefono.
if(STATION_APP&&document.body)document.body.classList.add("postazione");
export var _savedAuth=false;try{_savedAuth=localStorage.getItem("omnia_op_auth")==="1";}catch(e){}
window.currentRole=_savedAuth?"operator":null;
if(_savedAuth)_sentrySetTag("role","operator");
if(_savedAuth){if(window._requestNotifPermission)setTimeout(function(){try{_requestNotifPermission();}catch(e){}},500);}
if(_savedAuth){setTimeout(function(){enableOperatorPush().catch(console.error);},1200);}
// Se già autenticato, rimanda alla dashboard dopo init variabili

window.onpopstate=function(event){
  suppressHistory=true;
  currentScreen=(event.state&&event.state.screen)?event.state.screen:"home";
  render(currentScreen);
  suppressHistory=false;
};
window.activeFilter="aperte";
window.activeStation=null;
window.activeDashTab="segnalazioni";
window._stationChatOpen=false;
window.isAdmin=false;
window.userRole=null;
window.mapObj=null;
window.mapMarkers=[];
export let userMarker=null;
window.locamareMarker=null;
export let nearestStation=null,nearestDist=null;
window.fbReady=false;
window.newReportCount=0;
window.reportsData={};        // segnalazioni COMPLETE (solo utenti autenticati)
window.reportsPublicData={};  // copia ripulita per la mappa dei visitatori pubblici
export let flagsData={},stationNotesData={},stationDevicesData={};
window.meteoData=null;
window.meteoLoading=false;
window.meteoError="";
window.meteoLastFetch=0;
export const DAE_POINTS=[
  {name:"DAE Palazzo del Mare",lat:42.66946,lng:14.02375,avail:"\uD83D\uDFE2 Disponibile sempre — area pubblica"},
  {name:"DAE Lido La Paranzella",lat:42.67685,lng:14.01753,avail:"\uD83D\uDFE1 Disponibile durante gli orari di apertura della struttura"},
  {name:"DAE Pineta della Stazione",lat:42.67823,lng:14.01595,avail:"\uD83D\uDFE2 Disponibile sempre — area pubblica"},
  {name:"DAE Lido Azzurra",lat:42.68292,lng:14.01305,avail:"\uD83D\uDFE1 Disponibile durante gli orari di apertura della struttura"},
  {name:"DAE Lido Lauretta",lat:42.6821083,lng:14.0138762,avail:"\uD83D\uDFE1 Disponibile durante gli orari di apertura della struttura"},
  {name:"DAE Circolo Velico Roseto \u2018Azzurra\u2019",lat:42.68371300961265,lng:14.01269821440046,avail:"\uD83D\uDFE1 Disponibile durante gli orari di apertura della struttura"},
  {name:"DAE Marisella Beach",lat:42.67985958963062,lng:14.015282689815031,avail:"\uD83D\uDFE1 Disponibile durante gli orari di apertura della struttura"},
  {name:"DAE Camping Surabaja",lat:42.6991711,lng:13.9995760,avail:"\uD83D\uDFE1 Disponibile durante gli orari di apertura della struttura"},
  {name:"DAE Lido Aragosta",lat:42.68732,lng:14.00986,avail:"\uD83D\uDFE1 Disponibile durante gli orari di apertura della struttura"},
  {name:"DAE Camping Nino",lat:42.72520,lng:13.98673,avail:"\uD83D\uDFE1 Disponibile durante gli orari di apertura della struttura"},
  {name:"DAE Piscina Comunale",lat:42.662819177556976,lng:14.024564011122939,avail:"\uD83D\uDFE1 Disponibile durante gli orari di apertura della struttura"},
  {name:"DAE Marina Portorose",lat:42.65608600443248,lng:14.035242756582138,avail:"\uD83D\uDFE1 Disponibile durante gli orari di apertura della struttura"},
  {name:"DAE Stadio F. Dell'Olmo",lat:42.66077666015441,lng:14.023894393468256,avail:"\uD83D\uDFE1 Disponibile durante gli orari di apertura della struttura"},
  {name:"DAE Palasport \"Palamaggetti\"",lat:42.66403739190729,lng:14.021786505098797,avail:"\uD83D\uDFE1 Disponibile durante gli orari di apertura della struttura"},
  {name:"DAE Campo Sportivo Patrizi",lat:42.66543467452833,lng:14.022759241487085,avail:"\uD83D\uDFE1 Disponibile durante gli orari di apertura della struttura"},
  {name:"DAE Caserma P.M. Carabinieri",lat:42.66927068547406,lng:14.020179243873345,avail:"\uD83D\uDFE1 Disponibile durante gli orari di apertura della struttura"},
  {name:"DAE Biblioteca Comunale",lat:42.67465964197287,lng:14.015204520771245,avail:"\uD83D\uDFE1 Disponibile durante gli orari di apertura della struttura"},
  {name:"DAE Piazza Dante",lat:42.6779620311171,lng:14.01313855322865,avail:"\uD83D\uDFE2 Disponibile sempre — area pubblica"},
  {name:"DAE Municipio",lat:42.67980800645777,lng:14.01138374685731,avail:"\uD83D\uDFE1 Disponibile durante gli orari di apertura della struttura"},
  {name:"DAE Palestra Scuola D'Annunzio",lat:42.68092052485413,lng:14.009747107159825,avail:"\uD83D\uDFE1 Disponibile durante gli orari di apertura della struttura"},
  {name:"DAE Palestra Comunale C. Spiaggia",lat:42.725137403043696,lng:13.979321332221287,avail:"\uD83D\uDFE1 Disponibile durante gli orari di apertura della struttura"},
  {name:"DAE Impianto Sportivo Silvino D'Ascanio Cologna Spiaggia",lat:42.7264785549411,lng:13.970143208634301,avail:"\uD83D\uDFE1 Disponibile durante gli orari di apertura della struttura"},
  {name:"DAE Stadio Comunale Cologna Paese",lat:42.692374913751216,lng:13.95068608107302,avail:"\uD83D\uDFE1 Disponibile durante gli orari di apertura della struttura"},
  {name:"DAE Campo Sportivo S. Lucia",lat:42.64889647136678,lng:13.976121201716504,avail:"\uD83D\uDFE1 Disponibile durante gli orari di apertura della struttura"},
];
window.daeMarkers=[];
// Boe cantiere Ordinanza 23/2026 — Realizzazione/Ripristino Scogliere
export var boeCantiereMarkers=[];
export const BOE_CANTIERE_23_2026=[
  {area:"AREA 1",pres:"13-26-TA",boa:1,lat:42.6655,lng:14.0323},
  {area:"AREA 1",pres:"13-26-TA",boa:2,lat:42.6594,lng:14.0376},
  {area:"AREA 2",pres:"16-26-TA",boa:1,lat:42.7090,lng:14.0012},
  {area:"AREA 2",pres:"16-26-TA",boa:2,lat:42.6962,lng:14.0090},
  {area:"AREA 3",pres:"15-26-TA",boa:1,lat:42.7331,lng:13.9867},
  {area:"AREA 3",pres:"15-26-TA",boa:2,lat:42.7204,lng:13.9938},
];
export const CC_POINT={name:"Carabinieri - Comando Stazione di Roseto degli Abruzzi",lat:42.6690839,lng:14.0202191};
export const PL_POINT={name:"Polizia Locale - Roseto degli Abruzzi",lat:42.66890816262959,lng:14.020188423768815};
export const COMUNE_POINT={name:"Comune di Roseto degli Abruzzi",lat:42.6796819,lng:14.0110622};
export const IAT_POINT={name:"IAT Roseto degli Abruzzi",lat:42.6775099,lng:14.0139231};
window.iatMarker=null;
window.comuneMarker=null;
window.rosetanaMarker=null;
window.portoroseMarker=null;
export const PORTOROSE_POINT={name:"Porto Marina Portorose",lat:42.6565304172608,lng:14.035017344909056};

export const ZONE_VIETATE=[
  {
    name:"Zona vietata — Foce Fiume Tordino",
    latlngs:[
      [42.74011111111111,13.98053055555556],
      [42.73835833333334,13.98111388888889],
      [42.73894026756044,13.98471909490045],
      [42.74090363248578,13.98410427675384]
    ],
    desc:"Acque non adibite alla balneazione — area ufficiale foce Fiume Tordino."
  },
  {
    name:"Zona vietata — Foce Fiume Vomano",
    latlngs:[
      [42.65720000000000,14.03630000000000],
      [42.65477222222222,14.03790833333333],
      [42.65582173682781,14.04131048524463],
      [42.65842631760071,14.03956013632299]
    ],
    desc:"Acque non adibite alla balneazione — area ufficiale foce Fiume Vomano."
  }
];
window.zoneVietateMarkers=[];
export const ROSETANA_POINT={name:"A.S.D. Rosetana Nuoto",lat:42.662512393390266,lng:14.024429076819649};
window.ccMarker=null;
window.plMarker=null;
window.finanzaMarker=null;
window.guardiaMedicaMarker=null;
window.vvfMarker=null;
export const VVF_POINT={lat:42.660998759620824,lng:14.026752032971247};
export const FINANZA_POINT={name:"Guardia di Finanza - Comando Tenenza Roseto degli Abruzzi",lat: 42.6623998529502,lng: 14.027125530549077};
export const GM_POINT={name:"Guardia Medica - Roseto degli Abruzzi",lat: 42.68070522681696,lng: 14.00866337714191};
export const SPECIAL_POINTS = [
  GM_POINT,
  FINANZA_POINT,
  CC_POINT,
  COMUNE_POINT,
  IAT_POINT
];
  
window.prevReportKeys=new Set();
window._reportsPrimed=false; // true dopo il primo snapshot del listener /reports (vedi _onReportsSnapshot)
export var _alertInterval=null;
export var _alertCtx=null;
export var _alertBanner=null;
export var _alertReportKey=null;


export const METEO_POINT={lat:42.68657,lng:14.01179,name:"Roseto degli Abruzzi"};
export function _purgeExpiredChildPhotos(){
  try{
    Object.keys(window.reportsData||{}).forEach(function(k){
      var r=window.reportsData[k];
      if(r&&r.childCase&&r.photo&&r.childResolvedAt){
        if(Date.now()-new Date(r.childResolvedAt).getTime()>CHILD_PHOTO_TTL_MS){
          reportsRef.child(k).update({photo:null});
        }
      }
    });
  }catch(e){}
}
// Avanzamento automatico dei timer dei casi minore aperti nella dashboard
setInterval(function(){
  if(currentScreen!=="dashboard"||window.currentRole!=="operator")return;
  var hasOpenChild=Object.values(window.reportsData||{}).some(function(r){return r&&r.childCase&&r.status==="aperta";});
  if(hasOpenChild)renderPage();
},30000);
stationNotesRef.on("value",function(snap){
  var raw=snap.val()||{};
  stationNotesData={};
  Object.keys(raw).forEach(function(k){stationNotesData[k]=raw[k];});
  try{localStorage.setItem("fb_stationNotes",JSON.stringify(raw));}catch(e){}
  refreshMarkers();
  if(currentScreen==="home")renderPage();
  if(currentScreen==="station")renderPage();
  // Note tab: no auto-rerender to avoid losing keyboard/input
  if(currentScreen==="dashboard"&&window.activeDashTab==="note")_refreshNotePanel();
});

flagsRef.on("value",snap=>{
  const fsnap=snap.val()||{};
  flagsData={};
  STATIONS.forEach(s=>{flagsData[s.num]=fsnap[String(s.num)]||fsnap[s.num]||"verde";});
  refreshMarkers();
  if(currentScreen==="home")renderPage();
  if(currentScreen==="station")renderPage();
  if(currentScreen==="dashboard"&&window.activeDashTab==="bandiere")renderPage();
});

// Segnalazioni COMPLETE (con dati personali): leggibili solo da operatori/
// postazioni autenticati (vedi database.rules.json). Il listener /reports e'
// percio' attaccato/staccato in base allo stato di autenticazione, dentro
// onAuthStateChanged piu' sotto — NON qui a livello globale, altrimenti per un
// visitatore pubblico fallirebbe con permission_denied.
function _onReportsSnapshot(snap){
  const snapData=snap.val()||{};
  const newKeys=new Set(Object.keys(snapData));
  // Conta i "nuovi" arrivi solo DOPO il primo snapshot di questo listener,
  // altrimenti al primo caricamento tutte le segnalazioni gia' aperte
  // verrebbero contate come nuove (la copia pubblica puo' aver gia' messo
  // window.fbReady a true prima, quindi non ci si puo' basare su quello).
  if(window._reportsPrimed&&window.currentRole==="operator"){
    let added=0;
    newKeys.forEach(k=>{if(!window.prevReportKeys.has(k)&&snapData[k]&&snapData[k].status==="aperta")added++;});
    if(added>0)window.newReportCount+=added;
  }
  window.prevReportKeys=newKeys;
  window._reportsPrimed=true;
  window.reportsData=snapData;
  window.fbReady=true;
  if(window.currentRole==="operator"){
    _purgeExpiredChildPhotos();
    renderHeader();
    // Controlla SEMPRE se c'è un'emergenza/pericolo aperto e fa partire l'allarme:
    // così suona anche se l'operatore è entrato DOPO la creazione della segnalazione
    // (non dipende dal rilevarla come "appena aggiunta").
    _checkForActiveAlerts();
  }
  refreshMarkers();
  if(currentScreen==="dashboard")renderPage();
  if(currentScreen==="home")renderPage();
  if(currentScreen==="station")renderPage();
  renderHeader();
}

// Copia pubblica ripulita (solo type/zone/status): SEMPRE leggibile, alimenta
// la mappa dei visitatori non autenticati. Per operatore/postazione la mappa
// usa invece i dati completi di window.reportsData (vedi map.js).
reportsPublicRef.on("value",function(snap){
  window.reportsPublicData=snap.val()||{};
  window.fbReady=true;
  refreshMarkers();
  if(currentScreen==="home")renderPage();
});

export let chatMessages={};
var _seenChatIds=null; // null finche' non arriva il primo snapshot: evita di "riprodurre" tutto lo storico al caricamento
chatRef.limitToLast(200).on("value",function(snap){
  const val=snap.val()||{};
  const ids=Object.keys(val);
  if(_seenChatIds===null){
    _seenChatIds=new Set(ids);
  }else{
    ids.forEach(function(id){
      if(_seenChatIds.has(id))return;
      _seenChatIds.add(id);
      const m=val[id];
      // Walkie-talkie: un nuovo messaggio vocale non mio si riproduce da
      // solo (vedi _onIncomingChatAudio in chat.js) - ma solo se non e'
      // il mio stesso messaggio appena inviato (deviceId, non l'autorLabel,
      // che due persone potrebbero condividere) e solo se e' indirizzato a
      // me: un vocale mandato da admin/coordinatore a una sola postazione
      // (campo "to") non deve partire da solo sugli altri dispositivi,
      // nemmeno su quello di chi lo vede comunque in elenco.
      if(m&&m.type==="audio"&&m.deviceId!==_chatDeviceId()&&_chatMsgAddressedToMe(m))_onIncomingChatAudio(m,id);
    });
  }
  chatMessages=val;
  // Ridisegna solo se la chat e' davvero la schermata visibile in questo
  // momento (tab "chat" in dashboard, o pannello chat aperto in postazione):
  // stesso schema degli altri listener qui sopra, per non ridisegnare pagine
  // che non c'entrano ad ogni nuovo messaggio.
  const chatVisible=(currentScreen==="dashboard"&&window.activeDashTab==="chat")
    ||(currentScreen==="station"&&window._stationChatOpen);
  // Prima si prova ad aggiornare la sola lista: ridisegnare tutta la pagina
  // ricostruirebbe anche i lettori audio, interrompendo un vocale in ascolto.
  // renderPage() resta come ripiego, se la chat non e' quella a schermo.
  if(chatVisible&&!aggiornaListaChat())renderPage();
});

// Ogni sera (vedi resetChatSerale in functions/index.js) la chat riparte
// pulita: i messaggi restano tutti nello storico (non vengono cancellati),
// ma di default se ne mostrano solo quelli successivi a questo momento.
export const chatResetAtRef=_realDb.ref("chat/resetAt");
export let chatResetAt=0;
chatResetAtRef.on("value",function(snap){
  chatResetAt=snap.val()||0;
  const chatVisible=(currentScreen==="dashboard"&&window.activeDashTab==="chat")
    ||(currentScreen==="station"&&window._stationChatOpen);
  if(chatVisible)renderPage();
});

// Chat esterna (solo testo): stesso schema della chat con le postazioni,
// ma reset alle 23:59 invece che alle 20:00 (vedi resetChatEsternaSerale).
// Per postazioni/operatori normali questi listener falliscono in silenzio
// (permission_denied, vedi database.rules.json) - non hanno mai accesso.
export let chatEsternaMessages={};
chatEsternaRef.limitToLast(200).on("value",function(snap){
  chatEsternaMessages=snap.val()||{};
  if(currentScreen==="dashboard"&&window.activeDashTab==="chatEsterna")renderPage();
});
export const chatEsternaResetAtRef=_realDb.ref("chatEsterna/resetAt");
export let chatEsternaResetAt=0;
chatEsternaResetAtRef.on("value",function(snap){
  chatEsternaResetAt=snap.val()||0;
  if(currentScreen==="dashboard"&&window.activeDashTab==="chatEsterna")renderPage();
});

// Valida sessione Firebase Auth in background al caricamento
// Se il token è scaduto o il localStorage è stato manipolato, revoca l'accesso
(function(){
  try{
    var _ao=_getAuth();
    if(_ao){
      _ao.onAuthStateChanged(function(user){
        if(!user&&window.currentRole==="operator"){
          // Nessuna sessione Firebase valida: localStorage non attendibile
          window.currentRole=null;
          try{localStorage.removeItem("omnia_op_auth");}catch(e){}
          console.warn("Sessione operatore non valida: accesso revocato");
          if(currentScreen==="dashboard")render("home");
          else renderHeader();
        }
        // Le segnalazioni COMPLETE (/reports, con dati personali) e l'elenco
        // dispositivi (stationDevices) sono leggibili solo con sessione valida:
        // ci si iscrive qui, mai per i visitatori pubblici (che usano la copia
        // ripulita /reportsPublic per la sola mappa).
        stationDevicesRef.off();
        reportsRef.off();
        if(user){
          window._reportsPrimed=false; // nuova sessione: non contare come "nuove" le segnalazioni gia' aperte
          reportsRef.on("value",_onReportsSnapshot);
          stationDevicesRef.on("value",function(snap){
            stationDevicesData=snap.val()||{};
            if(currentScreen==="dashboard"&&window.activeDashTab==="dispositivi")renderPage();
          });
          // Ruolo vero: vive nel custom claim del token (role:"admin"/
          // "coordinator"/"cp"/"forze_ordine", assente per un operatore
          // normale), non in una variabile locale - forceRefresh(true)
          // perché dopo una promozione/rimozione appena fatta il token in
          // cache potrebbe ancora avere il claim vecchio (dura fino a
          // un'ora altrimenti).
          user.getIdTokenResult(true).then(function(res){
            window.userRole=(res.claims&&res.claims.role)||null;
            window.isAdmin=window.userRole==="admin";
            if(currentScreen==="dashboard")renderPage();
          }).catch(function(){window.userRole=null;window.isAdmin=false;});
        }else{
          stationDevicesData={};
          window.reportsData={};
          window._reportsPrimed=false;
          window.userRole=null;
          window.isAdmin=false;
          refreshMarkers(); // la mappa torna a usare la copia pubblica /reportsPublic
        }
      });
    }
  }catch(e){console.warn("onAuthStateChanged init error:",e);}
})();

export function onNewReport(){
  renderHeader();
  _checkForActiveAlerts();
  // La notifica push di sistema è ora inviata dalla Cloud Function (sendPushOnNewReport),
  // che funziona anche ad app chiusa e con il testo corretto. Qui NON generiamo più una
  // notifica locale, per evitare doppioni e messaggi datati. Resta solo l'allarme sonoro
  // gestito da _checkForActiveAlerts() quando l'app è in primo piano.
}

// DATA HELPERS
export function getReports(){
  return Object.entries(window.reportsData).map(([k,v])=>({...v,_key:k})).sort((a,b)=>b.id-a.id);
}
export function getFlags(){return{...flagsData};}
export function addReport(r){
  var newRef=reportsRef.push();
  return newRef.set(r).then(function(){return {key:newRef.key};});
}
export function resolveReport(key){
  if(_alertReportKey===key)_stopAlertSound();
  setTimeout(_checkForActiveAlerts,500);
  // Caso minore: alla chiusura azzera la foto (dato sensibile) e marca lo stato come "ricongiunto"
  var rep=window.reportsData&&window.reportsData[key];
  var upd={status:"risolta"};
  if(rep&&rep.childCase){
    upd.photo=null;
    upd.childResolvedAt=new Date().toISOString();
  }
  return reportsRef.child(key).update(upd);
}
export function deleteReport(key){
  if(_alertReportKey===key)_stopAlertSound();
  setTimeout(_checkForActiveAlerts,500);
  return reportsRef.child(key).remove();
}
export function saveFlags(obj){
  const clean={};STATIONS.forEach(s=>{clean[String(s.num)]=obj[s.num]||"verde";});
  return flagsRef.set(clean);
}
export function setFlag(num,val){return flagsRef.child(String(num)).set(val);}

// UTILS
// Escaping HTML completo (& prima di tutti gli altri) per inserire testo utente
// dentro stringhe HTML costruite a mano (es. popup mappa) senza rischio XSS.
export function _escapeHtml(s){
  return String(s)
    .replace(/&/g,"&amp;")
    .replace(/</g,"&lt;")
    .replace(/>/g,"&gt;")
    .replace(/"/g,"&quot;")
    .replace(/'/g,"&#39;");
}
export function fmt(iso){
  const d=new Date(iso);
  return d.toLocaleTimeString("it-IT",{hour:"2-digit",minute:"2-digit"})+" \u00b7 "+
         d.toLocaleDateString("it-IT",{day:"2-digit",month:"2-digit"});
}
export function fmtDist(m){return m<1000?m+"m":(m/1000).toFixed(1)+"km";}
export function resizeImg(file,cb){
  const i=new Image(),u=URL.createObjectURL(file);
  i.onload=()=>{
    const M=500;let w=i.width,h=i.height;
    if(w>M){h=Math.round(h*M/w);w=M;}
    const c=document.createElement("canvas");c.width=w;c.height=h;
    c.getContext("2d").drawImage(i,0,0,w,h);
    cb(c.toDataURL("image/jpeg",0.55));URL.revokeObjectURL(u);
  };i.src=u;
}
export function haversine(lat1,lng1,lat2,lng2){
  const R=6371000,dLat=(lat2-lat1)*Math.PI/180,dLng=(lng2-lng1)*Math.PI/180;
  const a=Math.sin(dLat/2)**2+Math.cos(lat1*Math.PI/180)*Math.cos(lat2*Math.PI/180)*Math.sin(dLng/2)**2;
  return R*2*Math.atan2(Math.sqrt(a),Math.sqrt(1-a));
}
export function findNearest(lat,lng){
  let best=null,bestDist=Infinity;
  STATIONS.forEach(s=>{const d=haversine(lat,lng,s.lat,s.lng);if(d<bestDist){bestDist=d;best=s;}});
  return{station:best,dist:Math.round(bestDist)};
}
export function findNearestDAE(lat,lng){
  var best=null,bestDist=Infinity;
  DAE_POINTS.forEach(function(d){
    var dist=haversine(lat,lng,d.lat,d.lng);
    if(dist<bestDist){bestDist=dist;best=d;}
  });
  return{dae:best,dist:Math.round(bestDist)};
}
export var nearestDAE=null,nearestDAEDist=null;
window._gpsWatchId=null;
window._gpsError=false; // true se GPS negato o in timeout
window._refreshPending=false;
export var _userLat=null,_userLng=null,_userGpsAcc=null;

export function _checkServiceOrEmergency(callback){
  if(isServiceActive()){callback();return;}
  // Servizio non attivo: mostra popup con 112
  var overlay=document.createElement("div");
  overlay.style.cssText="position:fixed;inset:0;background:rgba(0,0,0,.7);z-index:9999;display:flex;align-items:center;justify-content:center;padding:20px";
  var box=document.createElement("div");
  box.style.cssText="background:#b91c1c;border-radius:16px;padding:28px 24px;max-width:320px;width:100%;text-align:center;box-shadow:0 8px 32px rgba(0,0,0,.4)";
  box.innerHTML=
    '<div style="font-size:48px;margin-bottom:12px">\uD83D\uDEA8</div>'
    +'<p style="font-size:17px;font-weight:900;color:white;margin-bottom:8px;letter-spacing:.02em">SERVIZIO NON ATTIVO</p>'
    +'<p style="font-size:13px;color:rgba(255,255,255,.85);margin-bottom:20px">Per emergenze chiama il 112</p>'
    +'<a href="tel:112" style="display:block;background:white;color:#b91c1c;font-size:20px;font-weight:900;padding:14px;border-radius:10px;text-decoration:none;margin-bottom:12px">\uD83D\uDCDE CHIAMA IL 112</a>'
    +'<button id="_svcPopupClose" style="background:rgba(255,255,255,.2);border:none;color:white;font-size:13px;padding:8px 18px;border-radius:8px;cursor:pointer">Annulla</button>';
  overlay.appendChild(box);
  document.body.appendChild(overlay);
  document.getElementById("_svcPopupClose").addEventListener("click",function(){overlay.remove();});
  overlay.addEventListener("click",function(e){if(e.target===overlay)overlay.remove();});
}

// Ora e data correnti nel fuso orario di Roma (indipendente dal dispositivo)
export function romeNow(){
  try{
    var parts=new Intl.DateTimeFormat("en-GB",{timeZone:"Europe/Rome",year:"numeric",month:"2-digit",day:"2-digit",hour:"2-digit",minute:"2-digit",hour12:false}).formatToParts(new Date());
    var o={};parts.forEach(function(p){o[p.type]=p.value;});
    return {h:parseInt(o.hour,10),m:parseInt(o.minute,10),date:o.year+"-"+o.month+"-"+o.day};
  }catch(e){
    var d=new Date();
    return {h:d.getHours(),m:d.getMinutes(),date:d.getFullYear()+"-"+String(d.getMonth()+1).padStart(2,"0")+"-"+String(d.getDate()).padStart(2,"0")};
  }
}
export function isServiceActive(){var h=romeNow().h;return h>=9&&h<19;}

// --- Bandiere automatiche: GESTITE LATO SERVER ---
// Il cambio automatico (tutte VERDI alle 09:00, tutte ROSSE alle 19:00, ora di Roma)
// è eseguito da un processo schedulato (GitHub Actions) che scrive direttamente su
// Firebase, INDIPENDENTEMENTE da qualsiasi dispositivo, cache o impostazione utente.
// Vedi il workflow ".github/workflows/bandiere.yml" nel repository.
// Il client si limita a LEGGERE e mostrare le bandiere; l'operatore può comunque
// modificarle manualmente durante la giornata dall'editor Bandiere.

export function playBeep(){
  try{
    const ctx=new(window.AudioContext||window.webkitAudioContext)();
    [880,1100].forEach((f,i)=>{
      const o=ctx.createOscillator(),g=ctx.createGain();
      o.connect(g);g.connect(ctx.destination);
      o.frequency.value=f;g.gain.value=0.25;
      o.start(ctx.currentTime+i*0.22);o.stop(ctx.currentTime+i*0.22+0.15);
    });
  }catch(e){}
}

export function _playAlertTone(type){
  try{
    if(!_alertCtx)_alertCtx=new(window.AudioContext||window.webkitAudioContext)();
    if(_alertCtx.state==="suspended")_alertCtx.resume();
    var freqs=type==="emergenza"?[880,1320,880,660]:[660,880,660];
    freqs.forEach(function(f,i){
      var o=_alertCtx.createOscillator(),g=_alertCtx.createGain();
      o.connect(g);g.connect(_alertCtx.destination);
      o.frequency.value=f;o.type=type==="emergenza"?"square":"triangle";
      g.gain.setValueAtTime(0.35,_alertCtx.currentTime+i*0.18);
      g.gain.exponentialRampToValueAtTime(0.001,_alertCtx.currentTime+i*0.18+0.15);
      o.start(_alertCtx.currentTime+i*0.18);o.stop(_alertCtx.currentTime+i*0.18+0.16);
    });
  }catch(e){}
}

// Vero quando sul dispositivo sta succedendo qualcosa che non va interrotta:
// un allarme che suona, una trasmissione radio in corso, un vocale in ascolto.
// La usa l'aggiornamento automatico per scegliere quando ricaricare.
export function _appOccupata(){
  try{
    if(_alertReportKey)return true;
    if(window._radioTransmitting)return true;
    if(document.getElementById("_chatIncomingPopup"))return true;
    if(window._anyPopupOpen)return true;
  }catch(e){}
  return false;
}

export function _stopAlertSound(){
  if(_alertInterval){clearInterval(_alertInterval);_alertInterval=null;}
  if(_alertBanner&&_alertBanner.parentNode){_alertBanner.parentNode.removeChild(_alertBanner);}
  _alertBanner=null;_alertReportKey=null;
}

export function _startAlertSound(report){
  if(_alertReportKey===report._key)return;
  _stopAlertSound();
  _alertReportKey=report._key;
  var type=report.type;
  // Resume AudioContext se sospeso (mobile)
  if(_alertCtx&&_alertCtx.state==="suspended")_alertCtx.resume().then(function(){_playAlertTone(type);});
  else _playAlertTone(type);
  _alertInterval=setInterval(function(){
    if(_alertCtx&&_alertCtx.state==="suspended")_alertCtx.resume().then(function(){_playAlertTone(type);});
    else _playAlertTone(type);
  },type==="emergenza"?4000:7000);
  var banner=document.createElement("div");
  banner.className="alert-banner "+type;banner.id="_alertBanner";
  var icon=type==="emergenza"?"\uD83D\uDEA8":"\u26A0\uFE0F";
  var label=type==="emergenza"?"EMERGENZA":"PERICOLO";
  banner.innerHTML='<span style="font-size:20px;flex-shrink:0">'+icon+'</span>'
    +'<span class="alert-banner-text">'+label+': '+report.sub+' &mdash; '+report.zone+'</span>';
  var stopBtn=document.createElement("button");stopBtn.className="alert-banner-btn";stopBtn.textContent="\u2714 Visto";
  stopBtn.addEventListener("click",function(e){e.stopPropagation();_stopAlertSound();});
  banner.appendChild(stopBtn);
  banner.addEventListener("click",function(){render("dashboard");});
  document.body.appendChild(banner);
  _alertBanner=banner;
}

export function _checkForActiveAlerts(){
  if(window.currentRole!=="operator")return;
  var open=getReports().filter(function(r){return r.status==="aperta";});
  var urgent=open.filter(function(r){return r.type==="emergenza"||r.type==="pericolo";});
  if(urgent.length===0){_stopAlertSound();return;}
  var top=urgent.find(function(r){return r.type==="emergenza";})||urgent[0];
  _startAlertSound(top);
}
export function sendWANotify(r){
  const em={emergenza:"\uD83D\uDEA8 EMERGENZA",pericolo:"\u26A0\uFE0F PERICOLO"};
  const photoNote=r.photo?"\n\uD83D\uDCF7 Foto allegata (visualizza in dashboard)":"";
  const gpsNote=r.gps?"\nPosizione: https://www.google.com/maps?q="+r.gps.lat.toFixed(6)+","+r.gps.lng.toFixed(6)+(r.gps.acc?" (~"+Math.round(r.gps.acc)+"m)":""):"";
  const txt=`${em[r.type]} \u2014 ${r.sub}\n\uD83D\uDCCD ${r.zone}\n${r.notes}${r.author?"\n\uD83D\uDC64 "+r.author:""}${r.phone?"\n\uD83D\uDCDE "+r.phone:""}${gpsNote}${photoNote}\n\uD83D\uDD50 ${fmt(r.ts)}\n\n\u2014 Omnia Adriatic Lifeguard Service`;
  window.open(`https://wa.me/${WA_NOTIFY}?text=${encodeURIComponent(txt)}`,"_blank");
}

// GPS
function _createUserMarker(lat,lng){
  var wrap=document.createElement("div");
  wrap.innerHTML='<div style="width:16px;height:16px;border-radius:50%;background:#1d4ed8;border:3px solid white;box-shadow:0 0 0 4px rgba(29,78,216,.3)"></div>';
  var m=new google.maps.marker.AdvancedMarkerElement({position:{lat,lng},map:window.mapObj,content:wrap.firstElementChild,zIndex:1000});
  m.addListener("gmp-click",function(){
    new google.maps.InfoWindow({content:"<b>Sei qui</b>"}).open({map:window.mapObj,anchor:m});
  });
  return m;
}
// Crea/aggiorna il marker "sei qui" e centra la mappa la prima volta.
// Richiamata sia da _onGPSPosition sia da initMap (vedi map.js): la mappa
// Google carica in modo asincrono, quindi una posizione GPS puo' arrivare
// prima che window.mapObj esista - senza questo secondo aggancio il pallino
// blu resterebbe "perso" finche' non arriva un altro fix GPS.
export function _syncUserMarker(){
  if(!window.mapObj||_userLat==null||_userLng==null)return;
  var lat=_userLat,lng=_userLng;
  if(userMarker){
    try{userMarker.position={lat,lng};}catch(e){
      try{userMarker.map=null;}catch(e2){}
      userMarker=_createUserMarker(lat,lng);
    }
  } else {
    userMarker=_createUserMarker(lat,lng);
    // Prima volta: centra la mappa sulla posizione + postazione vicina
    if(nearestStation){
      var bounds=new google.maps.LatLngBounds();
      bounds.extend({lat,lng});
      bounds.extend({lat:nearestStation.lat,lng:nearestStation.lng});
      window.mapObj.fitBounds(bounds,50);
      google.maps.event.addListenerOnce(window.mapObj,"bounds_changed",function(){
        if(window.mapObj.getZoom()>16)window.mapObj.setZoom(16);
      });
    }
  }
  // Aggiorna marcatore postazione più vicina (anello blu)
  refreshMarkers();
}
export function _onGPSPosition(pos){
  var lat=pos.coords.latitude,lng=pos.coords.longitude;
  _userLat=lat;_userLng=lng;_userGpsAcc=pos.coords.accuracy||null;
  var res=findNearest(lat,lng);
  nearestStation=res.station;nearestDist=res.dist;
  var daeResult=findNearestDAE(lat,lng);
  nearestDAE=daeResult.dae;nearestDAEDist=daeResult.dist;
  _syncUserMarker();
  if(currentScreen==="home"||currentScreen==="minore")renderPage();
}

export function requestGPS(){
  if(!navigator.geolocation)return;
  // Se già in ascolto, non riavviare
  if(window._gpsWatchId!==null)return;
  window._gpsError=false;
  window._gpsWatchId=navigator.geolocation.watchPosition(
    _onGPSPosition,
    function(e){
      // code 1=permesso negato, 2=non disponibile, 3=timeout
      if(e.code===3){
        // Timeout: segnale assente momentaneamente, riprova silenziosamente
        // window._gpsWatchId rimane attivo, watchPosition riproverà da solo
        return;
      }
      nearestStation=null;
      window._gpsError=true;
      if(currentScreen==="home"||currentScreen==="minore")renderPage();
    },
    {enableHighAccuracy:true,timeout:30000,maximumAge:30000}
  );
}



window._segnalaPostazione=function(zoneLabel){
  _checkServiceOrEmergency(function(){window.currentRole="public";window.activeStation=zoneLabel||null;render("submit");});
};


export function callEmergency112(){
  var ok = confirm("Stai per chiamare il numero di emergenza 112. Vuoi continuare?");
  if(ok){
    window.location.href = "tel:112";
  }
}

// HEADER
// Diventa true solo a fine caricamento (impostato in js/boot.js, l'ultimo file
// caricato). I file .js esterni si caricano ognuno con una richiesta di rete,
// quindi tra un file e l'altro il browser può eseguire callback asincrone già
// in coda (es. un errore GPS) — questa guardia evita che provino a disegnare
// una schermata prima che tutte le funzioni di rendering siano definite.
window._appReady=false;
export function render(screen){
  if(!window._appReady)return;
  // Un dispositivo di postazione può usare i propri sotto-flussi (es. "Segnala"),
  // ma non può mai raggiungere l'home pubblica, il login operatori o la dashboard
  // generale: quelle vengono sempre rimandate al pannello di postazione.
  if(stationMode&&(screen==="home"||screen==="login"||screen==="dashboard"))screen="station";
  // Nell'app di postazione non ancora abilitata ogni strada porta alla
  // schermata di attivazione: e' l'unica cosa che quel dispositivo puo' fare
  // finche' il centro operativo non gli assegna una postazione. Vale anche per
  // i rientri di ripiego (boot.js, o un'attivazione fallita), che altrimenti
  // scaricherebbero l'utente sull'home pubblica.
  if(STATION_APP&&!stationMode)screen="attivazione";
  currentScreen=screen;
  if(!suppressHistory){
    try{
      if(!history.state || history.state.screen!==screen){
        history.pushState({screen:screen},"","");
      }
    }catch(e){}
  }
  renderHeader();
  const showMap=["home","dashboard","login"].includes(screen);
  const mapEl=document.getElementById("main-map");
  if(mapEl)mapEl.style.display=showMap?"block":"none";
  const legendEl=document.getElementById("map-legend");
  if(legendEl)legendEl.style.display=showMap?"flex":"none";
  if(showMap){
    if(!window.mapObj){chrome.initMap();}
    else{chrome.refreshMarkers();[200,600].forEach(function(t){setTimeout(function(){chrome.resizeMap();},t);});}
    chrome.renderMapLegend();
    if(!nearestStation)requestGPS();
  } else if(screen==="forecast"){
    // Richiedi GPS anche nella pagina meteo per la bandiera della postazione
    if(!nearestStation)requestGPS();
  }
  renderPage();
}
export function renderPage(){
  if(!window._appReady)return;
  const page=document.getElementById("page");page.innerHTML="";
  const _emBar=document.getElementById("_stEmergencyBar");
  if(_emBar)_emBar.style.display=(currentScreen==="station")?"":"none";
  if(currentScreen==="dashboard"&&window.currentRole!=="operator"){render("login");return;}
  const disegna=screens[currentScreen];
  // Schermata non registrata: in questa app non esiste (l'app di postazione non
  // ha home, meteo o dashboard). Meglio non disegnare nulla che rompersi.
  if(disegna)disegna(page);
}

// HOME
