// ===================== ONBOARDING AL PRIMO AVVIO =====================
function _showOnboarding(){
  var OB_KEY='omnia_onboarding_v1';
  try{ if(localStorage.getItem(OB_KEY)==='1') return; }catch(e){}

  var slides=[
    {
      icon:'⚓',
      title:'Benvenuto in Omnia Segnalazioni',
      text:'Il sistema digitale di coordinamento per il servizio di salvataggio Adriatic Lifeguard Service.\nRoseto degli Abruzzi — stagione 2026.',
      color:'#1a5fa8'
    },
    {
      icon:'🗺️',
      title:'Mappa Interattiva',
      text:'Visualizza in tempo reale le postazioni bagnino (P.10–P.35), i defibrillatori DAE, la Guardia Costiera, i Carabinieri, la Guardia di Finanza e i Vigili del Fuoco e tante altre info utili.',
      color:'#1a7a3a'
    },
    {
      icon:'🚨',
      title:'Come fare una Segnalazione',
      text:'1️⃣  Tocca il pulsante rosso 🔴 SEGNALA sulla home\n2️⃣  Scegli il tipo: Persona in difficoltà, Medusa, DAE, Anomalia...\n3️⃣  La tua posizione GPS viene rilevata automaticamente\n4️⃣  Aggiungi una nota se necessario (es. "bagnante anziano")\n5️⃣  Tocca INVIA — l\'operatore riceve la notifica in tempo reale',
      color:'#cc0000'
    },
    {
      icon:'🌊',
      title:'Meteo & Bandiere',
      text:'Consulta previsioni meteo marine aggiornate e lo stato delle bandiere per ogni postazione:\n\n🟢 VERDE — Servizio attivo, condizioni buone\n🟡 GIALLA — Servizio attivo, condizioni a rischio\n🔴 ROSSA — Pericolo / servizio sospeso\n\n⚠️ Vento GARBINO (da W/SW): pericolo massimo — vietato l\'uso di gonfiabili.',
      color:'#b87000'
    },
    {
      icon:'📋',
      title:'Ordinanze & Guide',
      text:'Accedi alle ordinanze in vigore vigenti, ai consigli di sicurezza per i bagnini e ai partner istituzionali del servizio.',
      color:'#5a2d82'
    },
    {
      icon:'🏊',
      title:'Consigli del Bagnino',
      text:'La sezione CONSIGLI raccoglie guide pratiche per i bagnini:\n\n• Tecniche di salvataggio in mare\n• Gestione delle emergenze mediche in spiaggia\n• Regole sugli spazi minimi (5 m dalla battigia)\n• Segnalazioni corrette con bandiera e fischietto\n• Normativa vigente sull\'assistente bagnanti\n\nToccala dal menu principale della home.',
      color:'#006a8e'
    }
  ];

  var cur=0;

  // Overlay
  var overlay=document.createElement('div');
  overlay.id='_ob_overlay';
  overlay.style.cssText='position:fixed;inset:0;z-index:99999;background:linear-gradient(160deg,#0d3d7a 0%,#1a5fa8 60%,#0a2a55 100%);display:flex;flex-direction:column;align-items:center;justify-content:space-between;padding:0;overflow:hidden;touch-action:pan-y;';

  // Skip button
  var skipBtn=document.createElement('button');
  skipBtn.textContent='Salta';
  skipBtn.style.cssText='position:absolute;top:16px;right:16px;background:rgba(255,255,255,.18);border:none;color:#fff;font-size:13px;font-weight:600;padding:6px 14px;border-radius:20px;cursor:pointer;z-index:2;';
  overlay.appendChild(skipBtn);

  // Slides container
  var slidesWrap=document.createElement('div');
  slidesWrap.style.cssText='flex:1;display:flex;align-items:center;justify-content:center;width:100%;padding:16px 24px 0;box-sizing:border-box;';

  var slideEl=document.createElement('div');
  slideEl.style.cssText='display:flex;flex-direction:column;align-items:center;text-align:center;gap:16px;max-width:360px;width:100%;animation:_ob_fadein .35s ease;';

  function renderSlide(){
    var s=slides[cur];
    slideEl.innerHTML='';
    slideEl.style.animation='none';
    void slideEl.offsetWidth; // force reflow
    slideEl.style.animation='_ob_fadein .35s ease';

    var iconEl=document.createElement('div');
    iconEl.textContent=s.icon;
    iconEl.style.cssText='font-size:72px;filter:drop-shadow(0 4px 12px rgba(0,0,0,.3));';

    var titleEl=document.createElement('h2');
    titleEl.textContent=s.title;
    titleEl.style.cssText='color:#fff;font-size:22px;font-weight:900;margin:0;line-height:1.25;';

    var textEl=document.createElement('p');
    textEl.style.cssText='color:rgba(255,255,255,.88);font-size:14px;line-height:1.6;margin:0;white-space:pre-line;';
    textEl.textContent=s.text;

    // Accent bar
    var bar=document.createElement('div');
    bar.style.cssText='width:48px;height:4px;border-radius:2px;background:'+s.color+';opacity:.8;';

    slideEl.appendChild(iconEl);
    slideEl.appendChild(bar);
    slideEl.appendChild(titleEl);
    slideEl.appendChild(textEl);
  }

  slidesWrap.appendChild(slideEl);
  overlay.appendChild(slidesWrap);

  // Bottom area: dots + button
  var bottom=document.createElement('div');
  bottom.style.cssText='width:100%;padding:20px 24px 36px;box-sizing:border-box;display:flex;flex-direction:column;align-items:center;gap:20px;';

  // Dots
  var dotsEl=document.createElement('div');
  dotsEl.style.cssText='display:flex;gap:8px;align-items:center;';

  function renderDots(){
    dotsEl.innerHTML='';
    slides.forEach(function(_,i){
      var d=document.createElement('div');
      d.style.cssText='border-radius:50%;transition:all .25s;cursor:pointer;'+(i===cur?'width:24px;height:8px;border-radius:4px;background:#fff;':'width:8px;height:8px;background:rgba(255,255,255,.35);');
      d.addEventListener('click',function(){ cur=i; renderSlide(); renderDots(); updateBtn(); });
      dotsEl.appendChild(d);
    });
  }

  // Button
  var nextBtn=document.createElement('button');
  nextBtn.style.cssText='width:100%;max-width:320px;padding:15px 0;background:#fff;color:#1a5fa8;border:none;border-radius:14px;font-size:16px;font-weight:800;cursor:pointer;box-shadow:0 4px 18px rgba(0,0,0,.25);letter-spacing:.3px;';

  function updateBtn(){
    nextBtn.textContent=cur===slides.length-1?'Inizia →':'Avanti →';
  }

  function dismiss(){
    try{localStorage.setItem(OB_KEY,'1');}catch(e){}
    overlay.style.transition='opacity .4s';
    overlay.style.opacity='0';
    setTimeout(function(){ if(overlay.parentNode) overlay.parentNode.removeChild(overlay); },400);
  }

  nextBtn.addEventListener('click',function(){
    if(cur<slides.length-1){ cur++; renderSlide(); renderDots(); updateBtn(); }
    else { dismiss(); }
  });
  skipBtn.addEventListener('click', dismiss);

  // Swipe support
  var _sx=null;
  overlay.addEventListener('touchstart',function(e){ _sx=e.changedTouches[0].clientX; },{passive:true});
  overlay.addEventListener('touchend',function(e){
    if(_sx===null) return;
    var dx=e.changedTouches[0].clientX-_sx; _sx=null;
    if(Math.abs(dx)<40) return;
    if(dx<0 && cur<slides.length-1){ cur++; renderSlide(); renderDots(); updateBtn(); }
    else if(dx>0 && cur>0){ cur--; renderSlide(); renderDots(); updateBtn(); }
  },{passive:true});

  bottom.appendChild(dotsEl);
  bottom.appendChild(nextBtn);
  overlay.appendChild(bottom);

  // CSS animation
  if(!document.getElementById('_ob_style')){
    var st=document.createElement('style'); st.id='_ob_style';
    st.textContent='@keyframes _ob_fadein{from{opacity:0;transform:translateY(18px)}to{opacity:1;transform:translateY(0)}}';
    document.head.appendChild(st);
  }

  renderSlide(); renderDots(); updateBtn();
  document.body.appendChild(overlay);
}
// ===================== FINE ONBOARDING =====================

// Pop-up che invita a chiamare il 112 PRIMA di allertare il servizio (solo per le emergenze).
// Mostra due scelte: chiamare subito il 112, oppure proseguire con la segnalazione.
// onProceed viene eseguito solo se l'utente sceglie di continuare.
function _emergency112Prompt(onProceed){
  // Evita doppioni se già aperto
  if(document.getElementById("emg112Overlay"))return;
  const ov=document.createElement("div");ov.id="emg112Overlay";
  ov.style.cssText="position:fixed;inset:0;z-index:99999;background:rgba(0,0,0,.55);display:flex;align-items:center;justify-content:center;padding:20px";
  const box=document.createElement("div");
  box.style.cssText="background:#fff;border-radius:18px;max-width:420px;width:100%;padding:22px 20px;box-shadow:0 12px 40px rgba(0,0,0,.35);text-align:center";
  box.innerHTML=
     '<div style="font-size:44px;line-height:1;margin-bottom:10px">\uD83D\uDEA8</div>'
    +'<h3 style="font-size:18px;font-weight:900;color:#b91c1c;margin:0 0 8px">\u00c8 un\u2019emergenza?</h3>'
    +'<p style="font-size:13.5px;color:#333;line-height:1.5;margin:0 0 18px">Se c\u2019\u00e8 pericolo immediato per la vita o l\u2019incolumit\u00e0 di una persona, <b>chiama subito il 112</b> prima di procedere. Poi puoi allertare anche il servizio di salvataggio con questa segnalazione.</p>';
  const callBtn=document.createElement("a");
  callBtn.href="tel:112";
  callBtn.style.cssText="display:flex;align-items:center;justify-content:center;gap:8px;background:#b91c1c;color:#fff;font-size:17px;font-weight:900;padding:14px;border-radius:12px;text-decoration:none;margin-bottom:10px;box-shadow:0 3px 10px rgba(185,29,29,.35)";
  callBtn.innerHTML="\uD83D\uDCDE Chiama subito il 112";
  const goBtn=document.createElement("button");
  goBtn.style.cssText="display:block;width:100%;background:#f0f0f0;color:#333;font-size:14px;font-weight:700;padding:12px;border:none;border-radius:12px;cursor:pointer";
  goBtn.textContent="Ho gi\u00e0 chiamato \u2013 prosegui con la segnalazione";
  goBtn.addEventListener("click",function(){
    ov.remove();
    if(typeof onProceed==="function")onProceed();
  });
  box.appendChild(callBtn);
  box.appendChild(goBtn);
  ov.appendChild(box);
  document.body.appendChild(ov);
}

function renderHome(page){
  fetchMeteoMarine(false);
  

  const emergencyBox=document.createElement("div");
  emergencyBox.style.cssText="margin-bottom:14px";
  emergencyBox.innerHTML=
    '<button type="button" style="display:block;width:100%;text-align:center;background:#b30000;color:white;font-weight:800;padding:18px;border:none;border-radius:14px;font-size:16px;box-shadow:0 4px 14px rgba(0,0,0,0.2)">🚨 IN CASO DI PERICOLO CHIAMA IL 112 IMMEDIATAMENTE 🚨</button>';
  emergencyBox.querySelector("button").addEventListener("click",callEmergency112);
  page.appendChild(emergencyBox);

  // legenda bandiere
  const flagBox=document.createElement("div");
  flagBox.style.cssText="background:var(--bg);border:1px solid var(--border);border-radius:var(--radius-lg);padding:12px 14px;margin-bottom:14px";
  flagBox.innerHTML=
    `<p style="font-size:10px;font-weight:700;color:var(--text3);letter-spacing:.07em;text-transform:uppercase;margin-bottom:10px">Significato delle bandiere</p>`+
    `<div style="display:grid;gap:8px">`+
    `<div style="display:flex;align-items:center;gap:10px"><div style="width:13px;height:20px;background:#27ae60;border-radius:3px;flex-shrink:0;border:1px solid rgba(0,0,0,.12)"></div><div><span style="font-size:13px;font-weight:700;color:#27ae60">VERDE</span><span style="font-size:12px;color:var(--text2)"> &mdash; Servizio di Salvataggio attivo, mare calmo, bagno sicuro</span></div></div>`+
    `<div style="display:flex;align-items:center;gap:10px"><div style="width:13px;height:20px;background:#F5C800;border-radius:3px;flex-shrink:0;border:1px solid rgba(0,0,0,.12)"></div><div><span style="font-size:13px;font-weight:700;color:#F5C800">GIALLA</span><span style="font-size:12px;color:var(--text2)"> &mdash; Mare mosso, prestare attenzione</span></div></div>`+
    `<div style="display:flex;align-items:center;gap:10px"><div style="width:13px;height:20px;background:#e74c3c;border-radius:3px;flex-shrink:0;border:1px solid rgba(0,0,0,.12)"></div><div><span style="font-size:13px;font-weight:700;color:#e74c3c">ROSSA</span><span style="font-size:12px;color:var(--text2)"> &mdash; Mancanza Servizio di Salvataggio, pericolo, divieto di balneazione</span></div></div>`+
    `</div>`;
  page.appendChild(flagBox);


  (function(){
    var ns=document.createElement("div");
    if(nearestStation){
      var fc2=FLAG_COLORS[flagsData[nearestStation.num]||"verde"];
      var svc=isServiceActive();
      var fn=(flagsData[nearestStation.num]||"verde").toUpperCase();
      ns.style.cssText="border-radius:var(--radius-lg);margin-bottom:14px;background:"+(svc?"#f0fdf4":"#fef2f2")+";border:1px solid "+(svc?"#bbf7d0":"#fecaca")+";overflow:hidden";
      // Info row
      var infoRow=document.createElement("div");
      infoRow.style.cssText="display:flex;align-items:center;gap:10px;padding:12px 14px 10px";
      infoRow.innerHTML='<span style="font-size:22px">\uD83D\uDCCD</span>'
        +'<div style="flex:1;min-width:0">'
        +'<p style="font-size:14px;font-weight:700;color:var(--text);margin:0 0 2px">P.'+nearestStation.num+' \u2013 '+nearestStation.name+'</p>'
        +'<p style="font-size:12px;color:var(--text2);margin:0">A <strong>'+fmtDist(nearestDist)+'</strong> da te &nbsp;\u00b7&nbsp; Bandiera <span style="font-weight:700;color:'+fc2+'">'+fn+'</span>'+(svc?'':' &nbsp;\u00b7&nbsp; <span style="color:#b91c1c;font-weight:700">FUORI SERVIZIO</span>')+'</p>'
        +'</div>';
      ns.appendChild(infoRow);
      // Buttons row
      var btnRow=document.createElement("div");
      btnRow.style.cssText="display:grid;grid-template-columns:1fr 1fr;gap:0;border-top:1px solid "+(svc?"#bbf7d0":"#fecaca");
      // Segnala qui
      var btnSeg=document.createElement("button");
      btnSeg.style.cssText="padding:11px 8px;background:transparent;border:none;border-right:1px solid "+(svc?"#bbf7d0":"#fecaca")+";font-size:13px;font-weight:600;color:"+(svc?"#166534":"#991b1b")+";cursor:pointer";
      btnSeg.innerHTML='\uD83D\uDEA8 Segnala qui';
      btnSeg.addEventListener("click",function(){
        currentRole="public";
        activeStation="P."+nearestStation.num+" \u2013 "+nearestStation.name;
        _checkServiceOrEmergency(function(){render("submit");});
      });
      // Vai (apre navigatore)
      var btnNav=document.createElement("button");
      btnNav.style.cssText="padding:11px 8px;background:transparent;border:none;font-size:13px;font-weight:600;color:"+(svc?"#166534":"#991b1b")+";cursor:pointer";
      btnNav.innerHTML='\uD83E\uDDED Vai \u2192';
      btnNav.addEventListener("click",function(){
        var lat=nearestStation.lat;
        var lng=nearestStation.lng;
        var label=encodeURIComponent("P."+nearestStation.num+" - "+nearestStation.name);
        // Apre Google Maps o Apple Maps o qualsiasi navigatore
        var ua=navigator.userAgent||"";
        var url;
        if(/iPhone|iPad|iPod/i.test(ua)){
          url="maps://maps.apple.com/?daddr="+lat+","+lng+"&dirflg=d";
        } else {
          url="https://www.google.com/maps/dir/?api=1&destination="+lat+","+lng+"&travelmode=walking";
        }
        window.open(url,"_blank");
      });
      btnRow.appendChild(btnSeg);btnRow.appendChild(btnNav);
      ns.appendChild(btnRow);
    } else if(_gpsError){
      // Stato 3: errore GPS (permesso negato o timeout)
      ns.style.cssText="display:flex;align-items:center;gap:10px;padding:11px 14px;border-radius:var(--radius-lg);margin-bottom:14px;background:#fff7ed;border:1px solid #fed7aa;";
      var errIcon=document.createElement("span");errIcon.style.cssText="font-size:18px;flex-shrink:0";errIcon.textContent="\u26A0\uFE0F";
      var errBody=document.createElement("div");errBody.style.cssText="flex:1;min-width:0";
      var errTxt=document.createElement("p");errTxt.style.cssText="font-size:13px;color:#92400e;margin:0 0 4px;font-weight:600";errTxt.textContent="GPS non disponibile";
      var errSub=document.createElement("p");errSub.style.cssText="font-size:11px;color:#b45309;margin:0";errSub.textContent="Verifica che i permessi di posizione siano attivi per questo sito.";
      var errBtn=document.createElement("button");errBtn.style.cssText="margin-top:6px;padding:4px 12px;border-radius:20px;border:1px solid #f97316;background:transparent;font-size:12px;font-weight:600;color:#ea580c;cursor:pointer";errBtn.textContent="Riprova";
      errBtn.addEventListener("click",function(){_gpsWatchId=null;_gpsError=false;requestGPS();renderPage();});
      errBody.appendChild(errTxt);errBody.appendChild(errSub);errBody.appendChild(errBtn);
      ns.appendChild(errIcon);ns.appendChild(errBody);
    } else if(_gpsWatchId!==null){
      // Stato 2: GPS avviato, in attesa del fix
      ns.style.cssText="display:flex;align-items:center;gap:10px;padding:11px 14px;border-radius:var(--radius-lg);margin-bottom:14px;background:var(--bg2);border:1px solid var(--border);";
      var spnWrap=document.createElement("div");spnWrap.style.cssText="width:18px;height:18px;flex-shrink:0;position:relative";
      spnWrap.innerHTML='<div style="width:18px;height:18px;border-radius:50%;border:2.5px solid var(--border);border-top-color:#3b82f6;animation:_gpsSpinAnim 0.8s linear infinite"></div>';
      if(!document.getElementById("_gpsSpinStyle")){var ss=document.createElement("style");ss.id="_gpsSpinStyle";ss.textContent="@keyframes _gpsSpinAnim{to{transform:rotate(360deg)}}";document.head.appendChild(ss);}
      var spnTxt=document.createElement("span");spnTxt.style.cssText="font-size:13px;color:var(--text2)";spnTxt.textContent="Ricerca posizione in corso\u2026";
      ns.appendChild(spnWrap);ns.appendChild(spnTxt);
    } else {
      // Stato 1: GPS non ancora avviato
      ns.style.cssText="display:flex;align-items:center;gap:8px;padding:11px 14px;border-radius:var(--radius-lg);margin-bottom:14px;background:var(--bg2);border:1px solid var(--border);cursor:pointer";
      ns.innerHTML='<span style="font-size:18px">\uD83D\uDCCD</span><span style="font-size:13px;color:var(--text2)">Tocca per rilevare la postazione pi\u00f9 vicina</span>';
      ns.addEventListener("click",function(){requestGPS();renderPage();});
    }
    page.appendChild(ns);

    // Card DAE piu vicino
    if(nearestDAE&&nearestDAEDist){
      var daeCard=document.createElement("div");
      daeCard.style.cssText="border-radius:var(--radius-lg);margin-bottom:14px;background:#f0fdf4;border:1px solid #bbf7d0;overflow:hidden";
      var daeInfoRow=document.createElement("div");
      daeInfoRow.style.cssText="display:flex;align-items:center;gap:10px;padding:12px 14px 10px";
      daeInfoRow.innerHTML=
        '<div style="width:34px;height:34px;border-radius:6px;overflow:hidden;flex-shrink:0;box-shadow:0 1px 4px rgba(0,0,0,.25)">'
        +'<img src="data:image/jpeg;base64,'+DAE_B64+'" style="width:100%;height:100%;object-fit:cover;display:block;"/></div>'
        +'<div style="flex:1;min-width:0">'
        +'<p style="font-size:13px;font-weight:700;color:#14532d;margin:0 0 1px">'+nearestDAE.name+'</p>'
        +'<p style="font-size:12px;color:var(--text2);margin:0">Defibrillatore DAE &nbsp;\u00b7&nbsp; A <strong>'+fmtDist(nearestDAEDist)+'</strong> da te</p>'
        +'</div>';
      daeCard.appendChild(daeInfoRow);
      var daeBtnRow=document.createElement("div");
      daeBtnRow.style.cssText="border-top:1px solid #bbf7d0";
      var daeBtnNav=document.createElement("button");
      daeBtnNav.style.cssText="width:100%;padding:11px 8px;background:transparent;border:none;font-size:13px;font-weight:600;color:#166534;cursor:pointer";
      daeBtnNav.innerHTML='\uD83E\uDDED Indicazioni al DAE \u2192';
      daeBtnNav.addEventListener("click",function(){
        var ua=navigator.userAgent||"";
        var url;
        if(/iPhone|iPad|iPod/i.test(ua)){
          url="maps://maps.apple.com/?daddr="+nearestDAE.lat+","+nearestDAE.lng+"&dirflg=w";
        } else {
          url="https://www.google.com/maps/dir/?api=1&destination="+nearestDAE.lat+","+nearestDAE.lng+"&travelmode=walking";
        }
        window.open(url,"_blank");
      });
      daeBtnRow.appendChild(daeBtnNav);
      daeCard.appendChild(daeBtnRow);
      page.appendChild(daeCard);
    }

    if(!isServiceActive()){
      var rn=romeNow();
      var ob=document.createElement("div");
      ob.style.cssText="padding:10px 14px;border-radius:var(--radius);background:#fef2f2;border:1px solid #fecaca;margin-bottom:14px;font-size:13px;color:#991b1b;text-align:center;font-weight:500";
      ob.innerHTML='\u26A0\uFE0F Servizio non attivo ('+String(rn.h).padStart(2,"0")+':'+String(rn.m).padStart(2,"0")+') &middot; Orario: <strong>09:00 &ndash; 19:00</strong>';
      page.appendChild(ob);
    }
  })();
  // pulsante segnala
  const btns=document.createElement("div");btns.className="home-btns";
  const b1=document.createElement("button");b1.className="home-btn primary";
  b1.innerHTML=`<h3>\uD83D\uDEA8 Segnala un pericolo \u26A0\uFE0F</h3><p>Accesso pubblico &middot; senza registrazione</p>`;
  b1.addEventListener("click",()=>{_checkServiceOrEmergency(function(){currentRole="public";render("submit");});});
  btns.appendChild(b1);

  // Pulsante dedicato MINORE SMARRITO (accesso pubblico, sempre visibile)
  const bMin=document.createElement("button");bMin.className="home-btn";
  bMin.style.cssText="background:linear-gradient(135deg,#d81b8c 0%,#a30f66 100%);color:#fff;border:none";
  bMin.innerHTML=`<h3 style="color:#fff">\uD83D\uDEA8 Minore / persona smarrita</h3><p style="color:rgba(255,255,255,.9)">Ho perso o ho trovato una persona &middot; allerta immediata</p>`;
  bMin.addEventListener("click",()=>{_emergency112Prompt(function(){render("minore");});});
  btns.appendChild(bMin);
  page.appendChild(btns);

  // chiama + scrivi su WA
  const contacts=document.createElement("div");
  contacts.style.cssText="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:18px";
  const aCall=document.createElement("a");aCall.href="tel:"+PHONE;
  aCall.style.cssText="display:flex;align-items:center;justify-content:center;gap:7px;padding:13px 10px;border-radius:var(--radius);border:1px solid var(--border);background:var(--bg);text-decoration:none;font-size:13px;font-weight:600;color:var(--text)";
  aCall.innerHTML=`<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#27ae60" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 12a19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 3.6 1.27h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L7.91 8.91a16 16 0 0 0 6 6l.91-.91a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/></svg>Chiama Omnia`;
  const aWAMsg=document.createElement("a");aWAMsg.href=`https://wa.me/${WA_NOTIFY}`;aWAMsg.target="_blank";
  aWAMsg.style.cssText="display:flex;align-items:center;justify-content:center;gap:7px;padding:13px 10px;border-radius:var(--radius);border:1px solid var(--border);background:var(--bg);text-decoration:none;font-size:13px;font-weight:600;color:var(--text)";
  aWAMsg.innerHTML=`<svg width="18" height="18" viewBox="0 0 32 32" fill="#25D366"><path d="M16 .5C7.44.5.5 7.44.5 16c0 2.82.74 5.47 2.03 7.78L.5 31.5l7.93-2.08A15.43 15.43 0 0 0 16 31.5c8.56 0 15.5-6.94 15.5-15.5S24.56.5 16 .5zm0 28.18a12.6 12.6 0 0 1-6.43-1.76l-.46-.27-4.71 1.24 1.25-4.6-.3-.48A12.68 12.68 0 1 1 16 28.68zm6.95-9.5c-.38-.19-2.26-1.12-2.61-1.24-.35-.13-.6-.19-.86.19-.25.38-1 1.24-1.22 1.5-.22.25-.45.28-.83.1-.38-.19-1.61-.6-3.07-1.91-1.13-1.01-1.9-2.26-2.12-2.64-.22-.38-.02-.58.17-.77.17-.17.38-.44.57-.66.19-.22.25-.38.38-.63.13-.25.06-.47-.03-.66-.1-.19-.86-2.08-1.18-2.85-.31-.75-.63-.65-.86-.66h-.73c-.25 0-.66.1-1 .47-.35.38-1.32 1.29-1.32 3.14s1.35 3.64 1.54 3.9c.19.25 2.66 4.06 6.44 5.69.9.39 1.6.62 2.15.79.9.29 1.73.25 2.38.15.73-.11 2.26-.92 2.58-1.82.32-.9.32-1.67.22-1.82-.09-.16-.34-.25-.72-.44z"/></svg>Scrivi su WhatsApp`;
  contacts.appendChild(aCall);contacts.appendChild(aWAMsg);
  page.appendChild(contacts);

  const forecastBtn=document.createElement("button");
  forecastBtn.className="home-btn meteo-home-btn";
  forecastBtn.innerHTML=`<h3><span class="meteo-home-icons">🌊 ☀️ 🌧️</span>Previsioni Meteo</h3><p>Meteo mare e condizioni operative</p>`;
  forecastBtn.onclick=function(){render("forecast");};
  page.appendChild(forecastBtn);

  const consigliBtn=document.createElement("button");
  consigliBtn.className="home-btn consigli-home-btn";
  consigliBtn.innerHTML=`<h3>😎 I Consigli del Bagnino</h3><p>Sicurezza in acqua e in spiaggia</p>`;
  consigliBtn.onclick=function(){render("consigli");};
  page.appendChild(consigliBtn);

  const ordinanzeBtn=document.createElement("button");
  ordinanzeBtn.className="ordinanze-home-btn";
  ordinanzeBtn.innerHTML=`<h3>📋 Ordinanze in Vigore</h3><p>Divieti e normative vigenti in spiaggia</p>`;
  ordinanzeBtn.onclick=function(){render("ordinanze");};
  page.appendChild(ordinanzeBtn);

  // Pulsante installa app
  var installBtn=document.createElement("button");
  installBtn.className="ordinanze-home-btn";
  installBtn.style.cssText+="background:linear-gradient(135deg,#1a5fa8 0%,#0d3d7a 100%);";
  installBtn.innerHTML='<h3>\uD83D\uDCF2 Installa l\'App</h3><p>Aggiungila alla schermata Home del tuo dispositivo</p>';
  installBtn.onclick=function(){render("install");};
  page.appendChild(installBtn);

  var guideBtn=document.createElement("button");
  guideBtn.innerHTML='<span style="font-size:16px">📖</span> Rivedi la guida introduttiva';
  guideBtn.style.cssText="display:flex;align-items:center;justify-content:center;gap:8px;width:100%;padding:12px;margin-top:8px;background:#27ae60;color:#fff;border:none;border-radius:12px;font-size:14px;font-weight:700;cursor:pointer;box-shadow:0 3px 10px rgba(39,174,96,.3);";
  guideBtn.onclick=function(){
    try{localStorage.removeItem("omnia_onboarding_v1");}catch(e){}
    _showOnboarding();
  };
  page.appendChild(guideBtn);

  var partnerBtn=document.createElement("button");
  partnerBtn.className="partner-home-btn";
  partnerBtn.innerHTML="🤝 I nostri Partner";
  partnerBtn.onclick=function(){render("partner");};
  page.appendChild(partnerBtn);


  // segui omnia
  const followTitle=document.createElement("p");
  followTitle.style.cssText="font-size:11px;font-weight:700;color:var(--text3);letter-spacing:.07em;text-transform:uppercase;margin-bottom:10px";
  followTitle.textContent="Segui Omnia su";
  page.appendChild(followTitle);

  const social=document.createElement("div");
  social.style.cssText="display:grid;grid-template-columns:1fr 1fr 1fr;gap:10px;margin-bottom:4px";

  // WA canale
  const aWACh=document.createElement("a");
  aWACh.href="https://whatsapp.com/channel/0029VbCewQeCMY0PyZ6v5P3z";aWACh.target="_blank";
  aWACh.style.cssText="display:flex;flex-direction:column;align-items:center;gap:6px;padding:14px 8px;border-radius:var(--radius-lg);border:1px solid var(--border);background:var(--bg);text-decoration:none";
  aWACh.innerHTML=`<svg width="28" height="28" viewBox="0 0 32 32" fill="#25D366"><path d="M16 .5C7.44.5.5 7.44.5 16c0 2.82.74 5.47 2.03 7.78L.5 31.5l7.93-2.08A15.43 15.43 0 0 0 16 31.5c8.56 0 15.5-6.94 15.5-15.5S24.56.5 16 .5zm0 28.18a12.6 12.6 0 0 1-6.43-1.76l-.46-.27-4.71 1.24 1.25-4.6-.3-.48A12.68 12.68 0 1 1 16 28.68zm6.95-9.5c-.38-.19-2.26-1.12-2.61-1.24-.35-.13-.6-.19-.86.19-.25.38-1 1.24-1.22 1.5-.22.25-.45.28-.83.1-.38-.19-1.61-.6-3.07-1.91-1.13-1.01-1.9-2.26-2.12-2.64-.22-.38-.02-.58.17-.77.17-.17.38-.44.57-.66.19-.22.25-.38.38-.63.13-.25.06-.47-.03-.66-.1-.19-.86-2.08-1.18-2.85-.31-.75-.63-.65-.86-.66h-.73c-.25 0-.66.1-1 .47-.35.38-1.32 1.29-1.32 3.14s1.35 3.64 1.54 3.9c.19.25 2.66 4.06 6.44 5.69.9.39 1.6.62 2.15.79.9.29 1.73.25 2.38.15.73-.11 2.26-.92 2.58-1.82.32-.9.32-1.67.22-1.82-.09-.16-.34-.25-.72-.44z"/></svg><span style="font-size:11px;font-weight:600;color:var(--text2)">Canale WA</span>`;

  // Facebook
  const aFB=document.createElement("a");
  aFB.href="https://www.facebook.com/profile.php?id=61586744621945";aFB.target="_blank";
  aFB.style.cssText="display:flex;flex-direction:column;align-items:center;gap:6px;padding:14px 8px;border-radius:var(--radius-lg);border:1px solid var(--border);background:var(--bg);text-decoration:none";
  aFB.innerHTML=`<svg width="28" height="28" viewBox="0 0 32 32" fill="#1877F2"><path d="M32 16C32 7.163 24.837 0 16 0S0 7.163 0 16c0 7.988 5.845 14.606 13.5 15.806V20.625H9.438V16H13.5v-3.525c0-4.01 2.389-6.225 6.044-6.225 1.75 0 3.581.313 3.581.313v3.938h-2.018c-1.988 0-2.607 1.233-2.607 2.498V16h4.438l-.709 4.625H18.5v11.181C26.155 30.606 32 23.988 32 16z"/></svg><span style="font-size:11px;font-weight:600;color:var(--text2)">Facebook</span>`;

  // Instagram
  const aIG=document.createElement("a");
  aIG.href="https://www.instagram.com/omnialifeguard/";aIG.target="_blank";
  aIG.style.cssText="display:flex;flex-direction:column;align-items:center;gap:6px;padding:14px 8px;border-radius:var(--radius-lg);border:1px solid var(--border);background:var(--bg);text-decoration:none";
  aIG.innerHTML=`<svg width="28" height="28" viewBox="0 0 32 32"><defs><radialGradient id="ig" cx="30%" cy="107%" r="150%"><stop offset="0%" stop-color="#fdf497"/><stop offset="5%" stop-color="#fdf497"/><stop offset="45%" stop-color="#fd5949"/><stop offset="60%" stop-color="#d6249f"/><stop offset="90%" stop-color="#285AEB"/></radialGradient></defs><rect width="32" height="32" rx="8" fill="url(#ig)"/><circle cx="16" cy="16" r="6" fill="none" stroke="white" stroke-width="2.2"/><circle cx="23.5" cy="8.5" r="1.5" fill="white"/><rect x="3" y="3" width="26" height="26" rx="7" fill="none" stroke="white" stroke-width="2"/></svg><span style="font-size:11px;font-weight:600;color:var(--text2)">Instagram</span>`;

  social.appendChild(aWACh);social.appendChild(aFB);social.appendChild(aIG);
  page.appendChild(social);
}

// LOGIN

function renderSatelliteCard(page){
  const card=document.createElement("div");card.className="sat-card";
  const tabs=document.createElement("div");tabs.className="sat-tabs";
  const defs=[
    {id:"r",lbl:"🌧️ Radar",u:"https://embed.windy.com/embed2.html?lat=42.68&lon=14.02&detailLat=42.68&detailLon=14.02&width=650&height=290&zoom=7&level=surface&overlay=rain&product=ecmwf&menu=&message=true&marker=true&calendar=now&pressure=&type=map&location=coordinates&detail=&metricWind=kt&metricTemp=%C2%B0C&radarRange=-1"},
    {id:"s",lbl:"🛰️ Satellite",u:"https://embed.windy.com/embed2.html?lat=42.68&lon=14.02&detailLat=42.68&detailLon=14.02&width=650&height=290&zoom=6&level=surface&overlay=satellite&product=ecmwf&menu=&message=true&marker=true&calendar=now&pressure=&type=map&location=coordinates&detail=&metricWind=kt&metricTemp=%C2%B0C&radarRange=-1"},
    {id:"w",lbl:"💨 Vento",u:"https://embed.windy.com/embed2.html?lat=42.68&lon=14.02&detailLat=42.68&detailLon=14.02&width=650&height=290&zoom=7&level=surface&overlay=wind&product=ecmwf&menu=&message=true&marker=true&calendar=now&pressure=&type=map&location=coordinates&detail=&metricWind=kt&metricTemp=%C2%B0C&radarRange=-1"},
    {id:"o",lbl:"🌊 Onde",u:"https://embed.windy.com/embed2.html?lat=42.68&lon=14.02&detailLat=42.68&detailLon=14.02&width=650&height=290&zoom=7&level=surface&overlay=waves&product=ecmwf&menu=&message=true&marker=true&calendar=now&pressure=&type=map&location=coordinates&detail=&metricWind=kt&metricTemp=%C2%B0C&radarRange=-1"},
  ];
  var cur="r";
  const body=document.createElement("div");body.className="sat-body";
  const ifr=document.createElement("iframe");ifr.src=defs[0].u;ifr.allow="fullscreen";ifr.setAttribute("loading","lazy");body.appendChild(ifr);
  defs.forEach(function(d){
    var btn=document.createElement("button");btn.className="sat-tab"+(d.id==="r"?" active":"");btn.textContent=d.lbl;
    btn.addEventListener("click",function(){
      if(cur===d.id)return;cur=d.id;
      tabs.querySelectorAll(".sat-tab").forEach(function(b){b.classList.remove("active");});
      btn.classList.add("active");ifr.src=d.u;
    });tabs.appendChild(btn);
  });
  const foot=document.createElement("div");foot.className="sat-foot";
  foot.innerHTML='<span>Dati in tempo reale · animazione loop</span><a href="https://windy.com" target="_blank" style="color:var(--info-text);font-weight:700">Windy.com ↗</a>';
  card.appendChild(tabs);card.appendChild(body);card.appendChild(foot);
  page.appendChild(card);
}

function renderForecastPage(page){
  fetchMeteoMarine(true);

  const back=document.createElement("button");back.className="back-btn";
  back.textContent="← Torna alla home";back.onclick=function(){render("home");};
  page.appendChild(back);

  const hdr=document.createElement("div");
  hdr.className="forecast-intro";
  const updatedTxt=(meteoData&&meteoData.updatedAt)?fmt(meteoData.updatedAt):"aggiornamento in corso";
  hdr.innerHTML=
    '<div class="forecast-intro-top">'+
      '<div>'+
        '<h2>🌊 Previsioni meteomarine</h2>'+
        '<p>Roseto degli Abruzzi · vista operativa per spiaggia, mare e sicurezza balneare</p>'+
      '</div>'+
      '<div class="badge" style="background:var(--info-bg);color:var(--info-text);border:1px solid var(--info-border)">LIVE</div>'+
    '</div>'+
    '<div class="forecast-chip-row">'+
      '<div class="forecast-chip">📍 Adriatico centrale</div>'+
      '<div class="forecast-chip">⏱ '+updatedTxt+'</div>'+
      '<div class="forecast-chip">🧭 Vento · onde · pioggia</div>'+
    '</div>';
  page.appendChild(hdr);

  // Satellite in cima - NON modificato
  renderSatelliteCard(page);

  if(meteoLoading&&!meteoData){
    const b=document.createElement("div");b.className="meteo-card";
    b.innerHTML="<div style='padding:24px;text-align:center;color:var(--text3)'>⏳ Caricamento previsioni...</div>";
    page.appendChild(b);return;
  }
  if(meteoError&&!meteoData){
    const b=document.createElement("div");b.className="meteo-card";
    b.innerHTML="<div style='padding:16px;text-align:center;color:var(--danger-text)'>⚠️ "+meteoError+"</div>";
    page.appendChild(b);return;
  }

  const sec1=document.createElement("div");
  sec1.className="forecast-section-title";
  sec1.innerHTML='<h3>Quadro generale</h3><span style="font-size:11px;color:var(--text3)">Sintesi immediata</span>';
  page.appendChild(sec1);

  // Dati attuali + striscia ore
  renderMeteoCard(page);

  if(meteoData&&meteoData.hourly&&meteoData.hourly.length>4)  if(meteoData&&meteoData.hourly&&meteoData.hourly.length>4){
    var sec2=document.createElement("div");
    sec2.className="forecast-section-title";
    sec2.innerHTML='<h3>Evoluzione della giornata</h3><span style="font-size:11px;color:var(--text3)">Previsioni ora per ora</span>';
    page.appendChild(sec2);

    // Funzione sky icon da weather_code WMO
    function skyIcon(code,hr){
      var night=hr<6||hr>=21;
      if(code==null||code<=1) return night?"🌙":"☀️";
      if(code<=2) return night?"🌑":"🌤️";
      if(code<=3) return "⛅";
      if(code<=48) return "🌫️";
      if(code<=55) return "🌦️";
      if(code<=65) return "🌧️";
      if(code<=75) return "❄️";
      if(code<=82) return "🌦️";
      if(code<=86) return "🌨️";
      return "⛈️";
    }
    // Raggruppa per giorno e fascia oraria
    var dayMap={};
    meteoData.hourly.forEach(function(h){
      var d=new Date(h.time);
      var dk=d.toLocaleDateString("it-IT",{weekday:"long",day:"numeric",month:"long"});
      var hr=d.getHours();
      var slot=hr>=6&&hr<12?"mattina":hr>=12&&hr<18?"pomeriggio":hr>=18&&hr<24?"sera":"notte";
      if(!dayMap[dk])dayMap[dk]={mattina:[],pomeriggio:[],sera:[],notte:[]};
      dayMap[dk][slot].push(h);
    });
    function avgF(arr,field){
      var v=arr.map(function(h){return h[field];}).filter(function(x){return x!=null;});
      if(!v.length)return null;
      return v.reduce(function(a,b){return a+b;},0)/v.length;
    }
    function domDir(arr){
      var dirs=arr.map(function(h){return degToCompass(h.wind_direction_10m);}).filter(Boolean);
      if(!dirs.length)return"-";
      var f={};dirs.forEach(function(d){f[d]=(f[d]||0)+1;});
      return Object.keys(f).sort(function(a,b){return f[b]-f[a];})[0];
    }
    function domCode(arr){
      var codes=arr.map(function(h){return h.weather_code;}).filter(function(x){return x!=null;});
      if(!codes.length)return null;
      return Math.max.apply(null,codes);
    }
    var SLOT_META={
      mattina:{label:"Mattina",icon:"🌅",refHr:9,hours:"06–12"},
      pomeriggio:{label:"Pomeriggio",icon:"☀️",refHr:15,hours:"12–18"},
      sera:{label:"Sera",icon:"🌆",refHr:20,hours:"18–24"},
      notte:{label:"Notte",icon:"🌙",refHr:3,hours:"00–06"}
    };
    var SLOT_ORDER=["mattina","pomeriggio","sera","notte"];
    Object.keys(dayMap).forEach(function(dk,di){
      if(di>2)return; // max 3 giorni
      var slots=dayMap[dk];
      var filled=SLOT_ORDER.filter(function(s){return slots[s]&&slots[s].length>0;});
      if(!filled.length)return;
      // Card giorno
      var card=document.createElement("div");
      card.style.cssText="background:var(--bg);border:1px solid var(--border);border-radius:14px;overflow:hidden;margin-bottom:12px";
      // Header giorno
      var dHdr=document.createElement("div");
      dHdr.style.cssText="padding:11px 14px;background:var(--bg2);border-bottom:1px solid var(--border);display:flex;align-items:center;gap:8px";
      dHdr.innerHTML='<div style="font-size:14px;font-weight:800;color:var(--navy);text-transform:capitalize">'+dk+'</div>';
      card.appendChild(dHdr);
      // Fasce
      filled.forEach(function(slotKey,si){
        var hrs=slots[slotKey];
        var meta=SLOT_META[slotKey];
        var avgWave=avgF(hrs,"wave_height");
        var avgWind=avgF(hrs,"wind_speed_10m");
        var avgGusts=avgF(hrs,"wind_gusts_10m");
        var avgSea=avgF(hrs,"sea_surface_temperature");
        var avgPrec=avgF(hrs,"precipitation");
        var dir=domDir(hrs);
        var code=domCode(hrs);
        var sky=skyIcon(code,meta.refHr);
        var wndNd=knotsFromKmh(avgWind);
        var gustNd=knotsFromKmh(avgGusts);
        var wv=avgWave!=null?Number(avgWave):0;
        var fl=wv>2||wndNd>25?"rossa":wv>1||wndNd>15?"gialla":"verde";
        var fc2=FLAG_COLORS[fl];
        var isGarb=(dir==="O"||dir==="SO"||dir==="NO");
        var hasRain=avgPrec!=null&&avgPrec>0.1;
        var row=document.createElement("div");
        row.style.cssText="display:grid;grid-template-columns:88px 1fr;"+(si>0?"border-top:1px solid var(--border)":"");
        // Colonna sx
        var lc=document.createElement("div");
        lc.style.cssText="padding:14px 10px;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:3px;background:var(--bg2);border-right:1px solid var(--border)";
        lc.innerHTML=
          '<div style="font-size:10px;font-weight:700;color:var(--text3);text-transform:uppercase;letter-spacing:.05em">'+meta.label+'</div>'+
          '<div style="font-size:38px;line-height:1;margin:4px 0">'+sky+'</div>'+
          '<div style="font-size:10px;color:var(--text3)">'+meta.hours+'</div>';
        // Colonna dx
        var rc=document.createElement("div");
        rc.style.cssText="padding:12px 14px;display:flex;flex-direction:column;gap:7px";
        // Vento
        var windRow=document.createElement("div");
        windRow.style.cssText="display:flex;align-items:center;gap:6px;flex-wrap:wrap";
        windRow.innerHTML=
          '<span style="font-size:15px">💨</span>'+
          '<span style="font-size:17px;font-weight:800;color:var(--text)">'+wndNd+'</span>'+
          '<span style="font-size:12px;color:var(--text2)">nodi '+dir+'</span>'+
          (gustNd&&gustNd>wndNd?'<span style="font-size:11px;color:var(--text3)">· raffiche '+gustNd+' nd</span>':'')+
          (isGarb?'<span style="font-size:11px;font-weight:700;color:#92400e;background:#fef3c7;padding:2px 7px;border-radius:5px">⚠️ GARBINO</span>':'');
        // Mare
        var seaRow=document.createElement("div");
        seaRow.style.cssText="display:flex;align-items:center;gap:8px;flex-wrap:wrap";
        seaRow.innerHTML=
          '<span style="font-size:15px">🌊</span>'+
          '<span style="font-size:17px;font-weight:800;color:var(--text)">'+(avgWave!=null?Number(avgWave).toFixed(1):"-")+'</span>'+
          '<span style="font-size:12px;color:var(--text2)">m'+
          (avgSea!=null?' &nbsp;·&nbsp; 🌡️ '+Number(avgSea).toFixed(1)+'°C':'')+
          (hasRain?' &nbsp;·&nbsp; 💧 '+Number(avgPrec).toFixed(1)+'mm':'')+
          '</span>';
        // Bandiera
        rc.appendChild(windRow);
        rc.appendChild(seaRow);
        row.appendChild(lc);
        row.appendChild(rc);
        card.appendChild(row);
      });
      page.appendChild(card);
    });
  }
  const credit=document.createElement("div");
  credit.className="forecast-credit";
  credit.innerHTML='Dati previsionali: <a href="https://open-meteo.com" target="_blank">Open-Meteo</a> · Mappe live: <a href="https://windy.com" target="_blank">Windy</a>';
  page.appendChild(credit);
}

function renderPartnerPage(page){
  var back=document.createElement("button");back.className="back-btn";
  back.textContent="\u2190 Torna alla home";back.onclick=function(){render("home");};page.appendChild(back);
  var hdr=document.createElement("div");
  hdr.style.cssText="text-align:center;margin-bottom:20px";
  hdr.innerHTML='<h2 style="font-size:18px;font-weight:800;color:var(--navy);margin-bottom:4px">\uD83E\uDD1D I nostri Partner</h2>'
    +'<p style="font-size:12px;color:var(--text3)">Grazie a chi ci sostiene</p>';
  page.appendChild(hdr);
  var omniaBanner=document.createElement("div");
  omniaBanner.style.cssText="text-align:center;margin-bottom:24px;padding:16px;background:#fff;border-radius:16px;";
  omniaBanner.innerHTML='<img src="img/banner_omnia.gif" style="max-width:100%;height:auto;max-height:200px;object-fit:contain;" alt="Omnia Beach Services"/>';
  page.appendChild(omniaBanner);

  var t1=document.createElement("p");t1.className="partner-section-title";t1.textContent="Partner istituzionali";
  page.appendChild(t1);
  var g1=document.createElement("div");g1.className="partner-grid";
  g1.innerHTML='<div class="partner-card"><a href="https://www.comune.roseto.te.it/" target="_blank" style="display:flex;align-items:center;justify-content:center;width:100%;height:100%"><img src="img/logo_comune.jpg" alt="Comune di Roseto degli Abruzzi" title="Comune di Roseto degli Abruzzi"/></a></div><div class="partner-card"><a href="https://www.visitroseto.it/" target="_blank" style="display:flex;align-items:center;justify-content:center;width:100%;height:100%"><img src="img/logo_visitroseto.jpg" alt="Visit Roseto" title="Visit Roseto"/></a></div>';
  page.appendChild(g1);
  var t2=document.createElement("p");t2.className="partner-section-title";t2.textContent="Partner";
  page.appendChild(t2);
  var g2=document.createElement("div");g2.className="partner-grid";
  g2.innerHTML='<div class="partner-card"><a href="https://www.facebook.com/fidas.cuoregiulianova" target="_blank" style="display:flex;align-items:center;justify-content:center;width:100%;height:100%"><img src="img/logo_fidas.jpg" alt="FIDAS Cuore Giulianova" title="FIDAS Cuore Giulianova"/></a></div><div class="partner-card"><a href="https://www.cooperativabalneatori.info/home" target="_blank" style="display:flex;align-items:center;justify-content:center;width:100%;height:100%"><img src="img/logo_cooperativa.jpg" alt="Balneatori Pineto e Roseto" title="Balneatori Pineto e Roseto"/></a></div><div class="partner-card"><a href="https://rosetananuoto.it/" target="_blank" style="display:flex;align-items:center;justify-content:center;width:100%;height:100%"><img src="img/logo_rosetananuoto.jpg" alt="A.S.D. Rosetana Nuoto" title="A.S.D. Rosetana Nuoto"/></a></div><div class="partner-card"><a href="https://www.portiitaliani.com/porto-rose-roseto-degli-abruzzi/" target="_blank" style="display:flex;align-items:center;justify-content:center;width:100%;height:100%"><img src="img/logo_portoros.jpg" alt="Marina Portorose" title="Marina Portorose" style="max-width:100%;max-height:60px;object-fit:contain"/></a></div><div class="partner-card"><a href="https://www.pizzetta.it/" target="_blank" style="display:flex;align-items:center;justify-content:center;width:100%;height:100%"><img src="img/logo_pizzetta.jpg" alt="Pizzetta" title="Pizzetta"/></a></div><div class="partner-card"><a href="https://www.vellutogelateria.it/" target="_blank" style="display:flex;align-items:center;justify-content:center;width:100%;height:100%"><img src="img/logo_velluto.jpg" alt="Velluto – La Gelateria Vecchio Stile" title="Velluto – La Gelateria Vecchio Stile"/></a></div><div class="partner-card"><a href="https://www.fiatgiorgini.it/" target="_blank" style="display:flex;align-items:center;justify-content:center;width:100%;height:100%"><img src="img/logo_fiatgiorgini.jpg" alt="Giorgini Auto" title="Giorgini Auto"/></a></div><div class="partner-card"><a href="https://www.facebook.com/italo.ottici?locale=it_IT" target="_blank" style="display:flex;align-items:center;justify-content:center;width:100%;height:100%"><img src="img/logo_italoottici.jpg" alt="Italo Ottici dal 1959" title="Italo Ottici dal 1959"/></a></div>';
  page.appendChild(g2);
}


function renderOrdinanzePage(page){
  // Header
  var backBtn=document.createElement("button");
  backBtn.innerHTML="← Torna alla Home";
  backBtn.style.cssText="display:flex;align-items:center;gap:6px;background:none;border:none;color:var(--text2);font-size:13px;font-weight:600;cursor:pointer;padding:0 0 14px 0;";
  backBtn.onclick=function(){render("home");};
  page.appendChild(backBtn);

  var hdr=document.createElement("div");
  hdr.style.cssText="background:linear-gradient(135deg,#1a5fa8 0%,#0d3d7a 100%);border-radius:18px;padding:20px 18px 16px;margin-bottom:20px;";
  hdr.innerHTML='<div style="display:flex;align-items:center;gap:10px;margin-bottom:6px">'
    +'<h2 style="font-size:20px;font-weight:900;color:#fff;margin:0">📋 Ordinanze in Vigore</h2>'
    +'</div>'
    +'<p style="font-size:12px;color:rgba(255,255,255,.85);margin:0">Divieti e normative vigenti — Roseto degli Abruzzi e Pineto</p>';
  page.appendChild(hdr);


  // --- Ordinanza 23/2026 — Lavori Scogliere (ATTIVA — scade 23.05.2026) ---
  var cardLavori=document.createElement("div");
  cardLavori.className="ordinanza-card";
  cardLavori.style.cssText+="cursor:pointer;transition:box-shadow .2s;border-left:4px solid #f5c800;";
  cardLavori.onmouseenter=function(){this.style.boxShadow="0 6px 20px rgba(181,137,0,.25)";};
  cardLavori.onmouseleave=function(){this.style.boxShadow="";};
  cardLavori.innerHTML='<div class="ordinanza-card-header">'
    +'<span style="font-size:30px">⚓</span>'
    +'<div>'
    +'<span class="ordinanza-badge" style="background:#b8860b">CAPITANERIA DI PORTO</span>'
    +'<span style="margin-left:6px;background:#cc0000;color:#fff;font-size:10px;font-weight:700;padding:2px 8px;border-radius:20px;vertical-align:middle">IN CORSO</span>'
    +'<h3 style="margin-top:4px">Ordinanza N. 23/2026 — Realizzazione/Ripristino Scogliere · Roseto degli Abruzzi</h3>'
    +'</div>'
    +'</div>'
    +'<p>Disciplina i lavori di ripristino barriere sommerse e scogliere su 3 aree del litorale (Roseto Sud, Torrente Borsacchio, Cologna Spiaggia). Impresa: ditta Curti srl. Mezzi operanti: Motopontone IN MARE I° e MAGNUM. Per un raggio di 100 mt dai motopontoni è vietata navigazione, balneazione, pesca e immersione. Le aree sono segnalate da boe gialle con miraglio X visibili sulla mappa.</p>'
    +'<div class="ord-meta" style="display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:6px">'
    +'<span><strong>Comandante:</strong> T.V. (CP) Valeria Di Mattia &nbsp;·&nbsp; <strong>Prorogata fino al:</strong> 03.06.2026 (Ord. 37/2026)</span>'
    +'<span style="background:#b8860b;color:#fff;font-size:10px;font-weight:700;padding:3px 10px;border-radius:20px;">📥 Apri PDF</span>'
    +'</div>';
  cardLavori.onclick=function(){window.open("./ordinanza-lavori-2026.pdf","_blank");};
  page.appendChild(cardLavori);

  // --- Ordinanza N. 37/2026 — Proroga Ord. 23/2026 ---
  var cardProroga=document.createElement("div");
  cardProroga.className="ordinanza-card";
  cardProroga.style.cssText+="cursor:pointer;transition:box-shadow .2s;border-left:4px solid #f5c800;";
  cardProroga.onmouseenter=function(){this.style.boxShadow="0 6px 20px rgba(181,137,0,.25)";};
  cardProroga.onmouseleave=function(){this.style.boxShadow="";};
  cardProroga.innerHTML='<div class="ordinanza-card-header">'
    +'<span style="font-size:30px">📋</span>'
    +'<div>'
    +'<span class="ordinanza-badge" style="background:#b8860b">CAPITANERIA DI PORTO</span>'
    +'<span style="margin-left:6px;background:#cc0000;color:#fff;font-size:10px;font-weight:700;padding:2px 8px;border-radius:20px;vertical-align:middle">PROROGA</span>'
    +'<h3 style="margin-top:4px">Ordinanza N. 37/2026 — Proroga Ord. 23/2026 · Ripristino Scogliere Roseto</h3>'
    +'</div></div>'
    +'<p>Proroga dell\'Ord. 23/2026 fino al 03.06.2026. Lo specchio acqueo riservato alla balneazione è ridotto a 50 metri dalla battigia nelle aree di cantiere. Nulla osta Ufficio Demanio Regione Abruzzo. Restano valide tutte le prescrizioni dell\'Ord. 23/2026.</p>'
    +'<div class="ord-meta" style="display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:6px">'
    +'<span><strong>Firmata:</strong> 21.05.2026 &nbsp;·&nbsp; <strong>Valida fino al:</strong> 03.06.2026</span>'
    +'<span style="background:#b8860b;color:#fff;font-size:10px;font-weight:700;padding:3px 10px;border-radius:20px;">📥 Apri PDF</span>'
    +'</div>';
  cardProroga.onclick=function(){window.open("./ordinanza-proroga-37-2026.pdf","_blank");};
  page.appendChild(cardProroga);

  // --- Ordinanza Sicurezza Balneare 2026 — Capitaneria Giulianova ---
  var cardCapit=document.createElement("div");
  cardCapit.className="ordinanza-card";
  cardCapit.style.cssText+="cursor:pointer;transition:box-shadow .2s;border-left:4px solid #cc0000;";
  cardCapit.onmouseenter=function(){this.style.boxShadow="0 6px 20px rgba(204,0,0,.18)";};
  cardCapit.onmouseleave=function(){this.style.boxShadow="";};
  cardCapit.innerHTML='<div class="ordinanza-card-header">'
    +'<span style="font-size:30px">⚓</span>'
    +'<div>'
    +'<span class="ordinanza-badge" style="background:#cc0000">CAPITANERIA DI PORTO</span>'
    +'<span style="margin-left:6px;background:#cc0000;color:#fff;font-size:10px;font-weight:700;padding:2px 8px;border-radius:20px;vertical-align:middle">STAGIONE 2026</span>'
    +'<h3 style="margin-top:4px">Ordinanza N. 29/2026 — Sicurezza Balneare · Circondario Marittimo di Giulianova</h3>'
    +'</div>'
    +'</div>'
    +'<p>Disciplina il servizio di salvamento balneare per la stagione 2026 nei Comuni di Martinsicuro, Alba Adriatica, Tortoreto, Giulianova, Roseto degli Abruzzi, Pineto e Silvi. Servizio obbligatorio dal 23 maggio al 20 settembre, ore 09:00–19:00. Sostituisce l\'Ord. N. 46/2025.</p>'
    +'<div class="ord-meta" style="display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:6px">'
    +'<span><strong>Comandante:</strong> T.V. (CP) Valeria Di Mattia &nbsp;·&nbsp; <strong>Firmata:</strong> 08.05.2026</span>'
    +'<span style="background:#cc0000;color:#fff;font-size:10px;font-weight:700;padding:3px 10px;border-radius:20px;">📥 Apri PDF</span>'
    +'</div>';
  cardCapit.onclick=function(){window.open("./ordinanza-sicurezza-balneare-2026-giulianova.pdf","_blank");};
  page.appendChild(cardCapit);

  // --- Ordinanza Balneare 2026 Regione Abruzzo ---
  var cardOB=document.createElement("div");
  cardOB.className="ordinanza-card";
  cardOB.style.cssText+="cursor:pointer;transition:box-shadow .2s;";
  cardOB.onmouseenter=function(){this.style.boxShadow="0 6px 20px rgba(26,95,168,.18)";};
  cardOB.onmouseleave=function(){this.style.boxShadow="";};
  cardOB.innerHTML='<div class="ordinanza-card-header">'
    +'<span style="font-size:30px">📄</span>'
    +'<div>'
    +'<span class="ordinanza-badge" style="background:#1a5fa8">REGIONE ABRUZZO</span>'
    +'<h3 style="margin-top:4px">Ordinanza Balneare 2026</h3>'
    +'</div>'
    +'</div>'
    +'<p>Disciplina delle attività sulle spiagge del litorale abruzzese. Stagione balneare confermata dall\'11 marzo 2026 al 23 novembre 2026. Contiene norme su sicurezza, accesso, concessioni, livellamento arenile, divieti e sostenibilità.</p>'
    +'<div class="ord-meta" style="display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:6px">'
    +'<span><strong>Dipartimento:</strong> Territorio e Ambiente — Ufficio Demanio Marittimo &nbsp;·&nbsp; <strong>Firmata:</strong> 11.03.2026</span>'
    +'<span style="background:#1a5fa8;color:#fff;font-size:10px;font-weight:700;padding:3px 10px;border-radius:20px;">📥 Apri PDF</span>'
    +'</div>';
  cardOB.onclick=function(){window.open("./ordinanza-balneare-2026.pdf","_blank");};
  page.appendChild(cardOB);

  // --- Ordinanza Sindacale N.40/2023 — Animali in spiaggia ---
  var cardAnim2023=document.createElement("div");
  cardAnim2023.className="ordinanza-card";
  cardAnim2023.style.cssText+="cursor:pointer;transition:box-shadow .2s;";
  cardAnim2023.onmouseenter=function(){this.style.boxShadow="0 6px 20px rgba(26,95,168,.18)";};
  cardAnim2023.onmouseleave=function(){this.style.boxShadow="";};
  cardAnim2023.innerHTML='<div class="ordinanza-card-header">'
    +'<span style="font-size:30px">🐾</span>'
    +'<div>'
    +'<span class="ordinanza-badge" style="background:#2e7d32">COMUNE DI ROSETO</span>'
    +'<h3 style="margin-top:4px">Ordinanza N. 40 — Accesso alle spiagge e balneazione animali d\'affezione</h3>'
    +'</div>'
    +'</div>'
    +'<p>Aggiorna e sostituisce l\'Ord. N. 71/2021. Individua le spiagge libere autorizzate all\'accesso degli animali, gli orari di balneazione consentiti (fuori dalla fascia 9:30–18:30) e le norme igieniche per la stagione balneare 2023.</p>'
    +'<div class="ord-meta" style="display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:6px">'
    +'<span><strong>Sindaco:</strong> Dott. Mario Nugnes &nbsp;·&nbsp; <strong>Data:</strong> 05.07.2023</span>'
    +'<span style="background:#2e7d32;color:#fff;font-size:10px;font-weight:700;padding:3px 10px;border-radius:20px;">📥 Apri PDF</span>'
    +'</div>';
  cardAnim2023.onclick=function(){window.open("./ordinanza-animali-spiaggia-2023.pdf","_blank");};
  page.appendChild(cardAnim2023);

  // --- Ordinanza Sindacale N.71 — Animali in spiaggia ---
  var cardAnimali=document.createElement("div");
  cardAnimali.className="ordinanza-card";
  cardAnimali.style.cssText+="cursor:pointer;transition:box-shadow .2s;";
  cardAnimali.onmouseenter=function(){this.style.boxShadow="0 6px 20px rgba(26,95,168,.18)";};
  cardAnimali.onmouseleave=function(){this.style.boxShadow="";};
  cardAnimali.innerHTML='<div class="ordinanza-card-header">'
    +'<span style="font-size:30px">🐾</span>'
    +'<div>'
    +'<span class="ordinanza-badge" style="background:#2e7d32">COMUNE DI ROSETO</span>'
    +'<h3 style="margin-top:4px">Ordinanza N. 71 — Animali d\'Affezione in Spiaggia</h3>'
    +'</div>'
    +'</div>'
    +'<p>Disciplina per l\'accesso alle spiagge e la balneazione di cani e gatti. Orari consentiti, norme igieniche, aree dedicate e sanzioni per i proprietari o detentori degli animali.</p>'
    +'<div class="ord-meta" style="display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:6px">'
    +'<span><strong>Sindaco:</strong> Avv. Sabatino Di Girolamo &nbsp;·&nbsp; <strong>Data:</strong> 14.05.2021</span>'
    +'<span style="background:#2e7d32;color:#fff;font-size:10px;font-weight:700;padding:3px 10px;border-radius:20px;">📥 Apri PDF</span>'
    +'</div>';
  cardAnimali.onclick=function(){window.open("./ordinanza-animali-spiaggia-2021.pdf","_blank");};
  page.appendChild(cardAnimali);

  // --- Legge Regionale 19/2014 — Cani in spiaggia ---
  var cardLR=document.createElement("div");
  cardLR.className="ordinanza-card";
  cardLR.style.cssText+="cursor:pointer;transition:box-shadow .2s;";
  cardLR.onmouseenter=function(){this.style.boxShadow="0 6px 20px rgba(26,95,168,.18)";};
  cardLR.onmouseleave=function(){this.style.boxShadow="";};
  cardLR.innerHTML='<div class="ordinanza-card-header">'
    +'<span style="font-size:30px">🐾</span>'
    +'<div>'
    +'<span class="ordinanza-badge" style="background:#558b2f">REGIONE ABRUZZO</span>'
    +'<h3 style="margin-top:4px">L.R. 19/2014 — Norme per l\'accesso alle spiagge degli animali d\'affezione</h3>'
    +'</div>'
    +'</div>'
    +'<p>Disciplina regionale sull\'accesso di cani e gatti alle spiagge: certificazioni sanitarie, norme igieniche, balneazione, aree dedicate e cani da salvataggio.</p>'
    +'<div class="ord-meta" style="display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:6px">'
    +'<span><strong>Regione Abruzzo</strong> &nbsp;·&nbsp; <strong>Pubblicata:</strong> 28.04.2014 &nbsp;·&nbsp; B.U.R.A. n. 48</span>'
    +'<span style="background:#558b2f;color:#fff;font-size:10px;font-weight:700;padding:3px 10px;border-radius:20px;">📥 Apri PDF</span>'
    +'</div>';
  cardLR.onclick=function(){window.open("./lr19-2014-animali-spiaggia.pdf","_blank");};
  page.appendChild(cardLR);

  // --- Divieti balneazione ---
  var ordinanze=[
    {
      tipo:"divieto",
      titolo:"Divieto di balneazione — Foce Fiume Tordino",
      testo:"Zona permanentemente non adibita alla balneazione nel tratto prospiciente la foce del Fiume Tordino. Il perimetro è delimitato dai quattro vertici ufficiali riportati sul portale. L'area è segnalata sulla mappa.",
      autorita:"Capitaneria di Porto di Pescara",
      validita:"Permanente",
      icona:"⛔"
    },
    {
      tipo:"divieto",
      titolo:"Divieto di balneazione — Foce Fiume Vomano",
      testo:"Zona permanentemente non adibita alla balneazione nel tratto prospiciente la foce del Fiume Vomano. Il perimetro è delimitato dai quattro vertici ufficiali riportati sul portale. L'area è segnalata sulla mappa.",
      autorita:"Capitaneria di Porto di Pescara",
      validita:"Permanente",
      icona:"⛔"
    }
  ];

  ordinanze.forEach(function(o){
    var card=document.createElement("div");
    card.className="ordinanza-card";
    card.innerHTML='<div class="ordinanza-card-header">'
      +'<span style="font-size:26px">'+o.icona+'</span>'
      +'<div><span class="ordinanza-badge '+o.tipo+'">'+o.tipo.toUpperCase()+'</span>'
      +'<h3 style="margin-top:4px">'+o.titolo+'</h3></div>'
      +'</div>'
      +'<p>'+o.testo+'</p>';
    page.appendChild(card);
  });

  // Nota in fondo



}

function renderInstallPage(page){
  var back=document.createElement("button");back.className="back-btn";
  back.textContent="\u2190 Torna alla Home";back.onclick=function(){render("home");};page.appendChild(back);

  var hdr=document.createElement("div");
  hdr.style.cssText="background:linear-gradient(135deg,#1a5fa8 0%,#0d3d7a 100%);border-radius:18px;padding:20px 18px 16px;margin-bottom:20px;text-align:center;";
  hdr.innerHTML='<div style="font-size:40px;margin-bottom:8px">\uD83D\uDCF2</div>'
    +'<h2 style="font-size:20px;font-weight:900;color:#fff;margin:0 0 6px">Installa l\u2019app Omnia</h2>'
    +'<p style="font-size:12px;color:rgba(255,255,255,.85);margin:0">Aggiungila alla schermata Home per un accesso rapido,<br>anche senza aprire il browser.</p>';
  page.appendChild(hdr);

  // ─── ANDROID ───
  var cardA=document.createElement("div");
  cardA.style.cssText="background:var(--bg);border:1px solid var(--border);border-radius:16px;padding:18px 16px;margin-bottom:16px;";
  cardA.innerHTML='<div style="display:flex;align-items:center;gap:10px;margin-bottom:14px">'
    +'<span style="font-size:28px">\uD83E\uDD16</span>'
    +'<div><div style="font-size:15px;font-weight:800;color:var(--text1)">Android</div>'
    +'<div style="font-size:11px;color:var(--text2)">Chrome (consigliato)</div></div></div>'
    +'<ol style="margin:0;padding-left:20px;display:grid;gap:10px">'
    +'<li style="font-size:13px;color:var(--text1)">Apri <strong>adriaticlifeguardservice.it</strong> con <strong>Chrome</strong></li>'
    +'<li style="font-size:13px;color:var(--text1)">Tocca i <strong>tre puntini \u22ee</strong> in alto a destra</li>'
    +'<li style="font-size:13px;color:var(--text1)">Seleziona <strong>\u201cAggiungi a schermata Home\u201d</strong></li>'
    +'<li style="font-size:13px;color:var(--text1)">Conferma toccando <strong>\u201cAggiungi\u201d</strong></li>'
    +'<li style="font-size:13px;color:var(--text1)">\uD83C\uDF89 L\u2019icona Omnia apparir\u00e0 nella schermata Home</li>'
    +'</ol>'
    +'<div style="margin-top:12px;background:#e8f5e9;border-radius:10px;padding:10px 12px;">'
    +'<p style="font-size:11px;color:#2e7d32;margin:0">\u2139\uFE0F Su alcuni dispositivi il banner \u201cInstalla app\u201d appare automaticamente in basso alla pagina.</p>'
    +'</div>';
  page.appendChild(cardA);

  // ─── iOS / IPHONE ───
  var cardI=document.createElement("div");
  cardI.style.cssText="background:var(--bg);border:1px solid var(--border);border-radius:16px;padding:18px 16px;margin-bottom:16px;";
  cardI.innerHTML='<div style="display:flex;align-items:center;gap:10px;margin-bottom:14px">'
    +'<span style="font-size:28px">\uD83C\uDF4F</span>'
    +'<div><div style="font-size:15px;font-weight:800;color:var(--text1)">iPhone / iPad</div>'
    +'<div style="font-size:11px;color:var(--text2)">Safari (obbligatorio)</div></div></div>'
    +'<ol style="margin:0;padding-left:20px;display:grid;gap:10px">'
    +'<li style="font-size:13px;color:var(--text1)">Apri <strong>adriaticlifeguardservice.it</strong> con <strong>Safari</strong></li>'
    +'<li style="font-size:13px;color:var(--text1)">Tocca l\u2019icona <strong>Condividi</strong> \uD83D\uDCE4 in basso al centro (il quadrato con la freccia su)</li>'
    +'<li style="font-size:13px;color:var(--text1)">Scorri il menu e seleziona <strong>\u201cAggiungi a schermata Home\u201d</strong></li>'
    +'<li style="font-size:13px;color:var(--text1)">Tocca <strong>\u201cAggiungi\u201d</strong> in alto a destra</li>'
    +'<li style="font-size:13px;color:var(--text1)">\uD83C\uDF89 L\u2019icona Omnia apparir\u00e0 nella schermata Home</li>'
    +'</ol>'
    +'<div style="margin-top:12px;background:#fff3e0;border-radius:10px;padding:10px 12px;">'
    +'<p style="font-size:11px;color:#e65100;margin:0">\u26A0\uFE0F Su iPhone funziona <strong>solo con Safari</strong>. Chrome e altri browser non supportano l\u2019installazione su iOS.</p>'
    +'</div>';
  page.appendChild(cardI);

  // ─── Nota finale ───
  var nota=document.createElement("div");
  nota.style.cssText="background:var(--bg2);border-radius:12px;padding:14px 16px;margin-bottom:24px;";
  nota.innerHTML='<p style="font-size:12px;color:var(--text2);margin:0;line-height:1.6">'
    +'\uD83D\uDCA1 Una volta installata, l\u2019app funziona come un\u2019app nativa: si apre a schermo intero, rimane accessibile con connessione limitata e riceve notifiche push (se autorizzate).'
    +'</p>';
  page.appendChild(nota);
}

function renderConsigliPage(page){
  if(!document.getElementById("_consigliStyle")){
    var st=document.createElement("style");st.id="_consigliStyle";
    st.textContent=
      ".lightbox-overlay{position:fixed;inset:0;background:rgba(0,0,0,.92);z-index:10000;display:flex;align-items:center;justify-content:center;padding:12px;}"
      +".lightbox-overlay img{max-width:100%;max-height:100%;border-radius:10px;object-fit:contain;}"
      +".lightbox-close{position:absolute;top:14px;right:18px;font-size:32px;color:white;cursor:pointer;background:none;border:none;line-height:1;}";
    document.head.appendChild(st);
  }

  var back=document.createElement("button");back.className="back-btn";
  back.textContent="\u2190 Torna alla home";back.onclick=function(){render("home");};page.appendChild(back);

  var hdr=document.createElement("div");
  hdr.style.cssText="border-radius:16px;padding:18px 16px;margin-bottom:20px;background:linear-gradient(135deg,#ffd06b 0%,#ffb830 45%,#f5922d 100%);text-align:center";
  hdr.innerHTML='<div style="font-size:42px;margin-bottom:6px">😎</div>'
    +'<h2 style="font-size:20px;font-weight:900;color:#fff;margin:0 0 4px">I Consigli del Bagnino</h2>'
    +'<p style="font-size:12px;color:rgba(255,255,255,.9);margin:0">Leggi il consiglio · tocca 🖼️ per aprire la guida illustrata</p>';
  page.appendChild(hdr);

  var IMGS={
    "BANDIERE":"img/guida_bandiere.jpg",
    "NUOTO":"img/guida_nuoto.jpg",
    "VENTO":"img/guida_vento.jpg",
    "VENTO":"img/guida_vento.jpg",
    "MEDUSA":"img/guida_medusa.jpg",
    "RAGNOLO":"img/guida_ragnolo.jpg",
    "SOLE":"img/guida_sole.jpg",
  };

  function openLightbox(src){
    var ol=document.createElement("div");ol.className="lightbox-overlay";
    var img=document.createElement("img");img.src=src;
    var btn=document.createElement("button");btn.className="lightbox-close";btn.innerHTML="&times;";
    btn.onclick=function(){ol.remove();};
    ol.onclick=function(e){if(e.target===ol)ol.remove();};
    ol.appendChild(img);ol.appendChild(btn);
    document.body.appendChild(ol);
  }

  (function(){
    var card=document.createElement("div");
    card.style.cssText="background:var(--bg);border:1px solid var(--border);border-radius:var(--radius-lg);padding:14px 16px;margin-bottom:10px;border-left:4px solid #f5922d";
    var top=document.createElement("div");
    top.style.cssText="display:flex;align-items:flex-start;gap:12px";
    var iconEl=document.createElement("span");iconEl.style.cssText="font-size:26px;flex-shrink:0;line-height:1.2";iconEl.textContent="🌊";
    var body=document.createElement("div");body.style.cssText="flex:1;min-width:0";
    var titleEl=document.createElement("p");titleEl.style.cssText="font-size:14px;font-weight:700;color:#f5922d;margin:0 0 4px";titleEl.textContent="Rispetta le bandiere";
    var textEl=document.createElement("p");textEl.style.cssText="font-size:13px;color:var(--text2);margin:0;line-height:1.55";textEl.textContent="Verde: puoi fare il bagno. Gialla: mare mosso, fai attenzione. Rossa: divieto di balneazione, non entrare in acqua. Le bandiere sono aggiornate in tempo reale dai nostri bagnini.";
    body.appendChild(titleEl);body.appendChild(textEl);
    var imgBtn=document.createElement("button");
    imgBtn.title="Apri guida illustrata";
    imgBtn.style.cssText="flex-shrink:0;background:none;border:1.5px solid #f5922d;border-radius:8px;padding:6px 8px;cursor:pointer;font-size:18px;line-height:1;color:#f5922d;align-self:center";
    imgBtn.innerHTML="🖼️";
    imgBtn.onclick=function(){openLightbox(IMGS["BANDIERE"]); };
    top.appendChild(iconEl);top.appendChild(body);top.appendChild(imgBtn);
    card.appendChild(top);page.appendChild(card);
  })();

  (function(){
    var card=document.createElement("div");
    card.style.cssText="background:var(--bg);border:1px solid var(--border);border-radius:var(--radius-lg);padding:14px 16px;margin-bottom:10px;border-left:4px solid #f5922d";
    var top=document.createElement("div");
    top.style.cssText="display:flex;align-items:flex-start;gap:12px";
    var iconEl=document.createElement("span");iconEl.style.cssText="font-size:26px;flex-shrink:0;line-height:1.2";iconEl.textContent="🏊";
    var body=document.createElement("div");body.style.cssText="flex:1;min-width:0";
    var titleEl=document.createElement("p");titleEl.style.cssText="font-size:14px;font-weight:700;color:#f5922d;margin:0 0 4px";titleEl.textContent="Non nuotare mai da solo";
    var textEl=document.createElement("p");textEl.style.cssText="font-size:13px;color:var(--text2);margin:0;line-height:1.55";textEl.textContent="Entra in acqua sempre in presenza di altri o sotto la supervisione del bagnino. In caso di difficoltà, chiama subito aiuto alzando il braccio.";
    body.appendChild(titleEl);body.appendChild(textEl);
    var imgBtn=document.createElement("button");
    imgBtn.title="Apri guida illustrata";
    imgBtn.style.cssText="flex-shrink:0;background:none;border:1.5px solid #f5922d;border-radius:8px;padding:6px 8px;cursor:pointer;font-size:18px;line-height:1;color:#f5922d;align-self:center";
    imgBtn.innerHTML="🖼️";
    imgBtn.onclick=function(){openLightbox(IMGS["NUOTO"]); };
    top.appendChild(iconEl);top.appendChild(body);top.appendChild(imgBtn);
    card.appendChild(top);page.appendChild(card);
  })();

  (function(){
    var card=document.createElement("div");
    card.style.cssText="background:var(--bg);border:1px solid var(--border);border-radius:var(--radius-lg);padding:14px 16px;margin-bottom:10px;border-left:4px solid #f5922d";
    var top=document.createElement("div");
    top.style.cssText="display:flex;align-items:flex-start;gap:12px";
    var iconEl=document.createElement("span");iconEl.style.cssText="font-size:26px;flex-shrink:0;line-height:1.2";iconEl.textContent="💨";
    var body=document.createElement("div");body.style.cssText="flex:1;min-width:0";
    var titleEl=document.createElement("p");titleEl.style.cssText="font-size:14px;font-weight:700;color:#f5922d;margin:0 0 4px";titleEl.textContent="Vento forte e Garbino";
    var textEl=document.createElement("p");textEl.style.cssText="font-size:13px;color:var(--text2);margin:0;line-height:1.55";textEl.textContent="Il vento da ovest (Garbino) è insidioso: spinge silenziosamente verso il largo. Vietato l\'uso di materassini, gonfiabili e ciambelle con vento Garbino.";
    body.appendChild(titleEl);body.appendChild(textEl);
    var imgBtn=document.createElement("button");
    imgBtn.title="Apri guida illustrata";
    imgBtn.style.cssText="flex-shrink:0;background:none;border:1.5px solid #f5922d;border-radius:8px;padding:6px 8px;cursor:pointer;font-size:18px;line-height:1;color:#f5922d;align-self:center";
    imgBtn.innerHTML="🖼️";
    imgBtn.onclick=function(){openLightbox(IMGS["VENTO"]); };
    top.appendChild(iconEl);top.appendChild(body);top.appendChild(imgBtn);
    card.appendChild(top);page.appendChild(card);
  })();

  (function(){
    var card=document.createElement("div");
    card.style.cssText="background:var(--bg);border:1px solid var(--border);border-radius:var(--radius-lg);padding:14px 16px;margin-bottom:10px;border-left:4px solid #f5922d";
    var top=document.createElement("div");
    top.style.cssText="display:flex;align-items:flex-start;gap:12px";
    var iconEl=document.createElement("span");iconEl.style.cssText="font-size:26px;flex-shrink:0;line-height:1.2";iconEl.textContent="🚫";
    var body=document.createElement("div");body.style.cssText="flex:1;min-width:0";
    var titleEl=document.createElement("p");titleEl.style.cssText="font-size:14px;font-weight:700;color:#f5922d;margin:0 0 4px";titleEl.textContent="Niente materassini con vento forte";
    var textEl=document.createElement("p");textEl.style.cssText="font-size:13px;color:var(--text2);margin:0;line-height:1.55";textEl.textContent="Ciambelle, materassini e gonfiabili possono essere trascinati in mare aperto anche con vento moderato. Usali solo con mare calmo e vento assente.";
    body.appendChild(titleEl);body.appendChild(textEl);
    var imgBtn=document.createElement("button");
    imgBtn.title="Apri guida illustrata";
    imgBtn.style.cssText="flex-shrink:0;background:none;border:1.5px solid #f5922d;border-radius:8px;padding:6px 8px;cursor:pointer;font-size:18px;line-height:1;color:#f5922d;align-self:center";
    imgBtn.innerHTML="🖼️";
    imgBtn.onclick=function(){openLightbox(IMGS["VENTO"]); };
    top.appendChild(iconEl);top.appendChild(body);top.appendChild(imgBtn);
    card.appendChild(top);page.appendChild(card);
  })();

  (function(){
    var card=document.createElement("div");
    card.style.cssText="background:var(--bg);border:1px solid var(--border);border-radius:var(--radius-lg);padding:14px 16px;margin-bottom:10px;border-left:4px solid #f5922d";
    var top=document.createElement("div");
    top.style.cssText="display:flex;align-items:flex-start;gap:12px";
    var iconEl=document.createElement("span");iconEl.style.cssText="font-size:26px;flex-shrink:0;line-height:1.2";iconEl.textContent="☀️";
    var body=document.createElement("div");body.style.cssText="flex:1;min-width:0";
    var titleEl=document.createElement("p");titleEl.style.cssText="font-size:14px;font-weight:700;color:#f5922d;margin:0 0 4px";titleEl.textContent="Proteggiti dal sole";
    var textEl=document.createElement("p");textEl.style.cssText="font-size:13px;color:var(--text2);margin:0;line-height:1.55";textEl.textContent="Usa protezione solare adeguata, reintegra i liquidi frequentemente e fai una pausa dal sole nelle ore più calde (12:00–15:00). La disidratazione aumenta il rischio di malore in acqua.";
    body.appendChild(titleEl);body.appendChild(textEl);
    var imgBtn=document.createElement("button");
    imgBtn.title="Apri guida illustrata";
    imgBtn.style.cssText="flex-shrink:0;background:none;border:1.5px solid #f5922d;border-radius:8px;padding:6px 8px;cursor:pointer;font-size:18px;line-height:1;color:#f5922d;align-self:center";
    imgBtn.innerHTML="\uD83D\uDDBC\uFE0F";
    imgBtn.onclick=function(){openLightbox(IMGS["SOLE"]);};
    top.appendChild(iconEl);top.appendChild(body);top.appendChild(imgBtn);
    card.appendChild(top);page.appendChild(card);
  })();

  (function(){
    var card=document.createElement("div");
    card.style.cssText="background:var(--bg);border:1px solid var(--border);border-radius:var(--radius-lg);padding:14px 16px;margin-bottom:10px;border-left:4px solid #f5922d";
    var top=document.createElement("div");
    top.style.cssText="display:flex;align-items:flex-start;gap:12px";
    var iconEl=document.createElement("span");iconEl.style.cssText="font-size:26px;flex-shrink:0;line-height:1.2";iconEl.textContent="⏳";
    var body=document.createElement("div");body.style.cssText="flex:1;min-width:0";
    var titleEl=document.createElement("p");titleEl.style.cssText="font-size:14px;font-weight:700;color:#f5922d;margin:0 0 4px";titleEl.textContent="Attendi 3 ore dopo i pasti";
    var textEl=document.createElement("p");textEl.style.cssText="font-size:13px;color:var(--text2);margin:0;line-height:1.55";textEl.textContent="Non entrare in acqua subito dopo aver mangiato. Attendi almeno 2-3 ore dopo un pasto completo per evitare congestione. Anche uno spuntino leggero richiede almeno 1 ora.";
    body.appendChild(titleEl);body.appendChild(textEl);
    top.appendChild(iconEl);top.appendChild(body);
    card.appendChild(top);page.appendChild(card);
  })();

  (function(){
    var card=document.createElement("div");
    card.style.cssText="background:var(--bg);border:1px solid var(--border);border-radius:var(--radius-lg);padding:14px 16px;margin-bottom:10px;border-left:4px solid #f5922d";
    var top=document.createElement("div");
    top.style.cssText="display:flex;align-items:flex-start;gap:12px";
    var iconEl=document.createElement("span");iconEl.style.cssText="font-size:26px;flex-shrink:0;line-height:1.2";iconEl.textContent="👶";
    var body=document.createElement("div");body.style.cssText="flex:1;min-width:0";
    var titleEl=document.createElement("p");titleEl.style.cssText="font-size:14px;font-weight:700;color:#f5922d;margin:0 0 4px";titleEl.textContent="Bambini: sorveglianza costante";
    var textEl=document.createElement("p");textEl.style.cssText="font-size:13px;color:var(--text2);margin:0;line-height:1.55";textEl.textContent="I bambini devono essere sempre sorvegliati in acqua, anche in acque basse. Non distogliere mai l\'attenzione, anche solo per pochi secondi.";
    body.appendChild(titleEl);body.appendChild(textEl);
    top.appendChild(iconEl);top.appendChild(body);
    card.appendChild(top);page.appendChild(card);
  })();

  (function(){
    var card=document.createElement("div");
    card.style.cssText="background:var(--bg);border:1px solid var(--border);border-radius:var(--radius-lg);padding:14px 16px;margin-bottom:10px;border-left:4px solid #f5922d";
    var top=document.createElement("div");
    top.style.cssText="display:flex;align-items:flex-start;gap:12px";
    var iconEl=document.createElement("span");iconEl.style.cssText="font-size:26px;flex-shrink:0;line-height:1.2";iconEl.textContent="🆘";
    var body=document.createElement("div");body.style.cssText="flex:1;min-width:0";
    var titleEl=document.createElement("p");titleEl.style.cssText="font-size:14px;font-weight:700;color:#f5922d;margin:0 0 4px";titleEl.textContent="In caso di emergenza";
    var textEl=document.createElement("p");textEl.style.cssText="font-size:13px;color:var(--text2);margin:0;line-height:1.55";textEl.textContent="Se vedi qualcuno in difficoltà: chiama subito il bagnino o il 112. Non tuffarti per salvare qualcuno se non sei addestrato: potresti mettere a rischio anche te stesso.";
    body.appendChild(titleEl);body.appendChild(textEl);
    top.appendChild(iconEl);top.appendChild(body);
    card.appendChild(top);page.appendChild(card);
  })();

  (function(){
    var card=document.createElement("div");
    card.style.cssText="background:var(--bg);border:1px solid var(--border);border-radius:var(--radius-lg);padding:14px 16px;margin-bottom:10px;border-left:4px solid #f5922d";
    var top=document.createElement("div");
    top.style.cssText="display:flex;align-items:flex-start;gap:12px";
    var iconEl=document.createElement("span");iconEl.style.cssText="font-size:26px;flex-shrink:0;line-height:1.2";iconEl.textContent="🪼";
    var body=document.createElement("div");body.style.cssText="flex:1;min-width:0";
    var titleEl=document.createElement("p");titleEl.style.cssText="font-size:14px;font-weight:700;color:#f5922d;margin:0 0 4px";titleEl.textContent="Meduse: cosa fare";
    var textEl=document.createElement("p");textEl.style.cssText="font-size:13px;color:var(--text2);margin:0;line-height:1.55";textEl.textContent="Se vieni punto da una medusa: esci dall\'acqua, non strofinare la zona colpita, sciacqua con acqua di mare (non dolce), rimuovi i tentacoli con un oggetto rigido. Rivolgiti al bagnino per assistenza.";
    body.appendChild(titleEl);body.appendChild(textEl);
    var imgBtn=document.createElement("button");
    imgBtn.title="Apri guida illustrata";
    imgBtn.style.cssText="flex-shrink:0;background:none;border:1.5px solid #f5922d;border-radius:8px;padding:6px 8px;cursor:pointer;font-size:18px;line-height:1;color:#f5922d;align-self:center";
    imgBtn.innerHTML="🖼️";
    imgBtn.onclick=function(){openLightbox(IMGS["MEDUSA"]); };
    top.appendChild(iconEl);top.appendChild(body);top.appendChild(imgBtn);
    card.appendChild(top);page.appendChild(card);
  })();

  (function(){
    var card=document.createElement("div");
    card.style.cssText="background:var(--bg);border:1px solid var(--border);border-radius:var(--radius-lg);padding:14px 16px;margin-bottom:10px;border-left:4px solid #f5922d";
    var top=document.createElement("div");
    top.style.cssText="display:flex;align-items:flex-start;gap:12px";
    var iconEl=document.createElement("span");iconEl.style.cssText="font-size:26px;flex-shrink:0;line-height:1.2";iconEl.textContent="🐟";
    var body=document.createElement("div");body.style.cssText="flex:1;min-width:0";
    var titleEl=document.createElement("p");titleEl.style.cssText="font-size:14px;font-weight:700;color:#f5922d;margin:0 0 4px";titleEl.textContent="Puntura di Ragnolo (Tracina)";
    var textEl=document.createElement("p");textEl.style.cssText="font-size:13px;color:var(--text2);margin:0;line-height:1.55";textEl.textContent="Immergere immediatamente il piede in acqua molto calda per disattivare il veleno. Rimuovere le spine con una pinzetta. Rivolgiti subito al bagnino per assistenza.";
    body.appendChild(titleEl);body.appendChild(textEl);
    var imgBtn=document.createElement("button");
    imgBtn.title="Apri guida illustrata";
    imgBtn.style.cssText="flex-shrink:0;background:none;border:1.5px solid #f5922d;border-radius:8px;padding:6px 8px;cursor:pointer;font-size:18px;line-height:1;color:#f5922d;align-self:center";
    imgBtn.innerHTML="🖼️";
    imgBtn.onclick=function(){openLightbox(IMGS["RAGNOLO"]); };
    top.appendChild(iconEl);top.appendChild(body);top.appendChild(imgBtn);
    card.appendChild(top);page.appendChild(card);
  })();

  (function(){
    var card=document.createElement("div");
    card.style.cssText="background:var(--bg);border:1px solid var(--border);border-radius:var(--radius-lg);padding:14px 16px;margin-bottom:10px;border-left:4px solid #f5922d";
    var top=document.createElement("div");
    top.style.cssText="display:flex;align-items:flex-start;gap:12px";
    var iconEl=document.createElement("span");iconEl.style.cssText="font-size:26px;flex-shrink:0;line-height:1.2";iconEl.textContent="🔵";
    var body=document.createElement("div");body.style.cssText="flex:1;min-width:0";
    var titleEl=document.createElement("p");titleEl.style.cssText="font-size:14px;font-weight:700;color:#f5922d;margin:0 0 4px";titleEl.textContent="Nuota in parallelo alla riva";
    var textEl=document.createElement("p");textEl.style.cssText="font-size:13px;color:var(--text2);margin:0;line-height:1.55";textEl.textContent="Se sei in difficoltà con una corrente, non nuotare contro di essa: nuota in parallela alla riva finché esci dalla corrente, poi rientra verso la spiaggia.";
    body.appendChild(titleEl);body.appendChild(textEl);
    top.appendChild(iconEl);top.appendChild(body);
    card.appendChild(top);page.appendChild(card);
  })();

  var footer=document.createElement("p");
  footer.style.cssText="text-align:center;font-size:11px;color:var(--text3);margin:8px 0 24px";
  footer.textContent="Omnia Adriatic Lifeguard Service \u2014 Roseto degli Abruzzi";
  page.appendChild(footer);
}

function renderLogin(page){
  const back=document.createElement("button");back.className="back-btn";
  back.textContent="\u2190 Indietro";
  back.addEventListener("click",()=>render("home"));page.appendChild(back);

  const loginFormWrap=document.createElement("div");
  page.appendChild(loginFormWrap);

  const h=document.createElement("h2");
  h.style.cssText="font-size:18px;font-weight:600;margin-bottom:20px";
  h.textContent="Accesso operatori";loginFormWrap.appendChild(h);

  const lbE=document.createElement("label");lbE.textContent="Email";loginFormWrap.appendChild(lbE);
  const emailInp=document.createElement("input");emailInp.type="email";
  emailInp.placeholder="operatore@omnialifeguard.it";
  emailInp.autocomplete="email";loginFormWrap.appendChild(emailInp);

  const lbP=document.createElement("label");lbP.textContent="Password";loginFormWrap.appendChild(lbP);
  const passWrap=document.createElement("div");passWrap.style.cssText="position:relative";
  const passInp=document.createElement("input");passInp.type="password";
  passInp.placeholder="\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022";
  passInp.autocomplete="current-password";
  passInp.style.paddingRight="44px";
  passWrap.appendChild(passInp);
  var eyeBtn=document.createElement("button");eyeBtn.type="button";
  eyeBtn.style.cssText="position:absolute;right:10px;top:50%;transform:translateY(-50%);background:none;border:none;cursor:pointer;font-size:18px;color:var(--text2);padding:4px";
  eyeBtn.textContent="\uD83D\uDC41\uFE0F";
  eyeBtn.addEventListener("click",function(){
    if(passInp.type==="password"){passInp.type="text";eyeBtn.textContent="\uD83D\uDEAB";}
    else{passInp.type="password";eyeBtn.textContent="\uD83D\uDC41\uFE0F";}
  });
  passWrap.appendChild(eyeBtn);
  loginFormWrap.appendChild(passWrap);

  const err=document.createElement("p");
  err.style.cssText="color:var(--danger-text);font-size:12px;margin:4px 0 10px;display:none";
  err.textContent="Email o password non corretti";loginFormWrap.appendChild(err);

  const btn=document.createElement("button");btn.className="btn-primary";
  btn.textContent="Accedi";

  async function go(){
    const email=emailInp.value.trim();
    const pass=passInp.value;
    if(!email||!pass){err.style.display="block";err.textContent="Inserisci email e password";return;}
    btn.disabled=true;btn.textContent="Accesso in corso...";err.style.display="none";
    try{
      var _a=_getAuth();if(!_a)throw new Error("Auth non disponibile");
      const cred=await _a.signInWithEmailAndPassword(email,pass);
      currentRole="operator";newReportCount=0;
      _sentrySetTag("role","operator");
      try{localStorage.setItem("omnia_op_auth","1");}catch(e){}
      if(window._requestNotifPermission)_requestNotifPermission();
      if(window.Notification&&Notification.permission==="default")Notification.requestPermission();
      render("dashboard");
      // Se c'è già un'emergenza/pericolo aperto al momento dell'accesso, fai partire subito l'allarme
      setTimeout(_checkForActiveAlerts,300);
    }catch(e){
      btn.disabled=false;btn.textContent="Accedi";
      err.style.display="block";
      var msg="Email o password non corretti";
      if(e.code==="auth/invalid-email")msg="Email non valida";
      else if(e.code==="auth/user-not-found")msg="Utente non trovato";
      else if(e.code==="auth/wrong-password"||e.code==="auth/invalid-credential")msg="Password errata";
      else if(e.code==="auth/too-many-requests")msg="Troppi tentativi, riprova tra qualche minuto";
      else if(e.code==="auth/network-request-failed")msg="Errore di rete, controlla la connessione";
      else if(e.code==="auth/unauthorized-domain")msg="Dominio non autorizzato — aggiungi il dominio in Firebase Console → Auth → Impostazioni";
      else if(e.code)msg="Errore: "+e.code;
      err.textContent=msg+(e.code?" ["+e.code+"]":"")+(e.message?" - "+e.message.substring(0,80):"");
      console.error("Firebase Auth error:",e.code,e.message);
    }
  }

  passInp.addEventListener("keydown",e=>{if(e.key==="Enter")go();});
  emailInp.addEventListener("keydown",e=>{if(e.key==="Enter")passInp.focus();});
  btn.addEventListener("click",go);loginFormWrap.appendChild(btn);

  // Auto-fill email if remembered
  try{const saved=localStorage.getItem("omnia_op_email");if(saved)emailInp.value=saved;}catch(e){}

  // ---- Attivazione dispositivo di postazione (nessuna credenziale, solo abilitazione da remoto) ----
  const divider=document.createElement("div");
  divider.style.cssText="display:flex;align-items:center;gap:10px;margin:22px 0 14px;color:var(--text3);font-size:11px";
  divider.innerHTML='<span style="flex:1;height:1px;background:var(--border2)"></span>oppure<span style="flex:1;height:1px;background:var(--border2)"></span>';
  page.appendChild(divider);

  const toggleBtn=document.createElement("button");
  toggleBtn.type="button";
  toggleBtn.style.cssText="width:100%;background:var(--bg2);border:1px solid var(--border2);border-radius:var(--radius);padding:11px 14px;font-size:13px;font-weight:600;color:var(--text2);cursor:pointer";
  toggleBtn.textContent="📱 Questo è un dispositivo di postazione";
  page.appendChild(toggleBtn);

  const deviceWrap=document.createElement("div");
  deviceWrap.style.cssText="display:none;margin-top:14px";
  page.appendChild(deviceWrap);

  let _deviceStatusRef=null;
  toggleBtn.addEventListener("click",function(){
    const showingDevice=deviceWrap.style.display!=="none";
    if(showingDevice){
      deviceWrap.style.display="none";loginFormWrap.style.display="";divider.style.display="";
      toggleBtn.textContent="📱 Questo è un dispositivo di postazione";
      if(_deviceStatusRef){_deviceStatusRef.off();_deviceStatusRef=null;}
    }else{
      loginFormWrap.style.display="none";divider.style.display="none";
      toggleBtn.textContent="← Torna al login operatori";
      _renderDeviceActivation(deviceWrap,function(ref){_deviceStatusRef=ref;});
    }
  });
}

// Genera/recupera un identificativo persistente per questo dispositivo (nessun account, nessuna password)
function _getDeviceId(){
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

function _renderDeviceActivation(wrap,onRef){
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
        ref.set({requestedAt:Date.now(),enabled:false,userAgent:String(navigator.userAgent||"").slice(0,200)}).catch(function(e){
          reqBtn.disabled=false;reqBtn.textContent="Richiedi attivazione";
          console.error("Errore richiesta attivazione dispositivo:",e);
        });
      });
      box.style.cssText="padding:13px 15px;border-radius:var(--radius-lg);background:var(--bg2);border:1px solid var(--border)";
      box.appendChild(txt);box.appendChild(reqBtn);
    }
  });
}

function renderSubmit(page){
  let type="pericolo",sub="",zone=ZONES[0],notes="",author="",phone="",photo=null;
  let _submitGpsWarned=false;

  // Banner 112
  const banner112=document.createElement("div");
  banner112.style.cssText="display:flex;align-items:center;gap:10px;padding:13px 15px;background:#b91c1c;border-radius:var(--radius-lg);margin-bottom:16px;cursor:pointer";
  banner112.innerHTML='<span style="font-size:22px;flex-shrink:0">\uD83D\uDEA8</span>'
    +'<div style="flex:1;min-width:0">'
    +'<p style="font-size:12px;font-weight:800;color:white;letter-spacing:.02em;margin:0;line-height:1.4;text-align:center">'
    +'\u26a0\ufe0f IN CASO DI PERICOLO PER LA PROPRIA O ALTRUI INCOLUMIT\u00c0 CHIAMA IMMEDIATAMENTE IL 112 O IL SERVIZIO DI SALVATAGGIO PI\u00d9 VICINO \u26a0\ufe0f</p>'
    +'</div>'
    +'<a href="tel:112" onclick="event.stopPropagation()" '
    +'style="flex-shrink:0;background:white;color:#b91c1c;font-weight:900;font-size:15px;padding:8px 14px;border-radius:8px;text-decoration:none;white-space:nowrap">\uD83D\uDCDE 112</a>';
  banner112.addEventListener("click",function(){
    if(confirm("Stai per chiamare il 112. Continuare?")){window.location.href="tel:112";}
  });
  page.appendChild(banner112);

  const wrap=document.createElement("div");wrap.className="form-wrap";

  // Richiedi subito il GPS così la segnalazione include la posizione (e il link Maps)
  if(_userLat===null)requestGPS();
  const gpsBox=document.createElement("div");
  gpsBox.style.cssText="display:flex;align-items:center;gap:8px;padding:10px 13px;border-radius:var(--radius-lg);margin-bottom:16px;font-size:12.5px;line-height:1.4;background:var(--bg2);border:1px solid var(--border)";
  function _gpsBoxText(){
    if(_userLat!==null){
      gpsBox.style.background="#f0fdf4";gpsBox.style.borderColor="#bbf7d0";
      gpsBox.innerHTML='<span style="font-size:16px">\uD83D\uDCCD</span><span style="color:#166534">Posizione rilevata (~'+Math.round(_userGpsAcc||0)+'m): sar\u00e0 inclusa con il link alla mappa.</span>';
    }else{
      gpsBox.innerHTML='<span style="font-size:16px">\uD83D\uDCCD</span><span style="color:var(--text2)">Rilevamento posizione in corso\u2026 attiva il GPS se richiesto, cos\u00ec gli operatori vedono il punto esatto.</span>';
    }
  }
  _gpsBoxText();
  const _gpsPoll=setInterval(function(){_gpsBoxText();if(_userLat!==null)clearInterval(_gpsPoll);},1500);
  const back=document.createElement("button");back.className="back-btn";back.textContent="\u2190 Indietro";
  back.addEventListener("click",()=>render(currentRole==="operator"?"dashboard":"home"));wrap.appendChild(back);
  const h=document.createElement("h2");h.style.cssText="font-size:18px;font-weight:600;margin-bottom:20px";h.textContent="Nuova segnalazione";wrap.appendChild(h);
  wrap.appendChild(gpsBox);
  const lbT=document.createElement("label");lbT.textContent="Tipo segnalazione";wrap.appendChild(lbT);
  const tg=document.createElement("div");tg.className="type-grid";
  const typeBtns={};
  // Container chips dettaglio
  const subChipsWrap=document.createElement("div");
  subChipsWrap.style.cssText="display:flex;flex-direction:column;gap:0;border:1px solid var(--border2);border-radius:var(--radius);overflow:hidden;margin-top:2px";

  function setType(k){
    type=k;sub="";
    subChipsWrap.innerHTML="";
    TYPES[k].sub.forEach(function(s,i){
      const chip=document.createElement("button");
      chip.type="button";
      chip.textContent=s;
      const isLast=i===TYPES[k].sub.length-1;
      chip.style.cssText="width:100%;text-align:left;padding:11px 14px;background:var(--bg);border:none;"+(isLast?"":"border-bottom:1px solid var(--border);")+"font-size:14px;color:var(--text2);cursor:pointer;transition:background .12s,color .12s";
      chip.addEventListener("mouseenter",function(){if(sub!==s)chip.style.background="var(--bg2)";});
      chip.addEventListener("mouseleave",function(){if(sub!==s){chip.style.background="var(--bg)";chip.style.color="var(--text2)";}});
      chip.addEventListener("click",function(){
        sub=s;
        if(s==="Annegamento / soccorso")_openAnnegamentoAlert();
        Array.from(subChipsWrap.children).forEach(function(c){
          const active=c.textContent===s;
          const col=k==="emergenza"?"var(--danger-bg)":"var(--warning-bg)";
          const tc=k==="emergenza"?"var(--danger-text)":"var(--warning-text)";
          c.style.background=active?col:"var(--bg)";
          c.style.color=active?tc:"var(--text2)";
          c.style.fontWeight=active?"700":"400";
        });
      });
      subChipsWrap.appendChild(chip);
    });
    const map={emergenza:"danger",pericolo:"warning"};
    Object.entries(typeBtns).forEach(([bk,bb])=>{
      const c=map[bk];bb.style.background=bk===k?`var(--${c}-bg)`:"";
      bb.style.color=bk===k?`var(--${c}-text)`:"var(--text2)";
      bb.style.borderColor=bk===k?`var(--${c}-border)`:"var(--border2)";
      bb.style.fontWeight=bk===k?"600":"400";
    });
  }
  Object.entries(TYPES).forEach(([k,v])=>{
    const btn=document.createElement("button");btn.className="type-btn";btn.textContent=v.label;
    btn.addEventListener("click",()=>{
      // Per le EMERGENZE mostra prima l'invito a chiamare il 112; per il pericolo generico no.
      if(k==="emergenza")_emergency112Prompt(function(){setType(k);});
      else setType(k);
    });
    typeBtns[k]=btn;tg.appendChild(btn);
  });
  wrap.appendChild(tg);
  const lbS=document.createElement("label");lbS.textContent="Dettaglio";wrap.appendChild(lbS);
  wrap.appendChild(subChipsWrap);
  setType("pericolo");
  const lbZ=document.createElement("label");lbZ.textContent="Postazione";wrap.appendChild(lbZ);
  const zoneSel=document.createElement("select");
  ZONES.forEach(z=>{const o=document.createElement("option");o.value=z;o.textContent=z;zoneSel.appendChild(o);});
  const presel=activeStation||(nearestStation?`P.${nearestStation.num} \u2013 ${nearestStation.name}`:null);
  if(presel&&ZONES.includes(presel))zoneSel.value=presel;
  zone=zoneSel.value;zoneSel.addEventListener("change",()=>zone=zoneSel.value);wrap.appendChild(zoneSel);
  if(nearestStation&&!activeStation){
    const hint=document.createElement("p");hint.style.cssText="font-size:11px;color:var(--info-text);margin-top:4px";
    hint.textContent=`\uD83D\uDCCD Postazione pi\u00f9 vicina preselezionata (${fmtDist(nearestDist)})`;wrap.appendChild(hint);
  }
  const lbN=document.createElement("label");lbN.innerHTML="Descrizione <span style=\"font-size:11px;color:var(--text3);font-weight:400\">(opzionale)</span>";wrap.appendChild(lbN);
  const notesEl=document.createElement("textarea");notesEl.placeholder="Aggiungi dettagli (opzionale)...";notesEl.rows=3;
  notesEl.addEventListener("input",()=>notes=notesEl.value);wrap.appendChild(notesEl);
  const lbF=document.createElement("label");lbF.textContent="Foto (opzionale)";wrap.appendChild(lbF);
  const fileInp=document.createElement("input");fileInp.type="file";fileInp.accept="image/*";// capture removed - user can choose camera or gallery
  fileInp.style.cssText="font-size:12px;color:var(--text2);width:100%";
  const photoWrap=document.createElement("div");
  fileInp.addEventListener("change",()=>{
    const f=fileInp.files[0];if(!f)return;
    resizeImg(f,b=>{
      photo=b;photoWrap.innerHTML="";
      const img=document.createElement("img");img.src=b;img.className="photo-preview";
      const rm=document.createElement("button");rm.className="photo-remove";rm.textContent="\u2715 Rimuovi";
      rm.addEventListener("click",()=>{photo=null;photoWrap.innerHTML="";fileInp.value="";});
      photoWrap.appendChild(img);photoWrap.appendChild(rm);
    });
  });
  wrap.appendChild(fileInp);wrap.appendChild(photoWrap);
  const lbA=document.createElement("label");lbA.textContent="Nome (opzionale)";wrap.appendChild(lbA);
  const authorEl=document.createElement("input");authorEl.type="text";
  authorEl.placeholder=currentRole==="operator"?"Operatore":(stationMode?"Postazione P."+stationMode:"Nome");
  authorEl.addEventListener("input",()=>author=authorEl.value);wrap.appendChild(authorEl);
  // Telefono obbligatorio (solo pubblico — non per operatori né per dispositivi di postazione)
  if(currentRole!=="operator"&&!stationMode){
    const lbP=document.createElement("label");
    lbP.innerHTML="Telefono <span style=\"color:var(--red)\">*</span> <span style=\"font-size:11px;color:var(--text3);font-weight:400\">(obbligatorio)</span>";
    wrap.appendChild(lbP);
    const phoneEl=document.createElement("input");phoneEl.type="tel";
    phoneEl.placeholder="Es. 3281234567";phoneEl.id="segnalazione-phone";
    phoneEl.style.cssText="border-color:var(--border2)";
    phoneEl.addEventListener("input",function(){
      phone=phoneEl.value.trim();
      phoneEl.style.borderColor=phone.length>=9?"var(--verde)":"var(--border2)";
    });
    wrap.appendChild(phoneEl);
    const phoneHint=document.createElement("p");
    phoneHint.style.cssText="font-size:11px;color:var(--text3);margin-top:4px";
    phoneHint.textContent="Il numero di telefono sarà utilizzato esclusivamente per eventuali comunicazioni relative alla segnalazione inviata.";
    wrap.appendChild(phoneHint);
  }
  const privacyWrap=document.createElement("div");
  privacyWrap.style.cssText="margin-top:16px;padding:12px;border:1px solid var(--border);border-radius:var(--radius);background:var(--bg2)";
  privacyWrap.innerHTML=
    '<p style="font-size:12px;font-weight:700;color:var(--text);margin-bottom:8px">Informativa privacy</p>'
    +'<p style="font-size:11px;color:var(--text2);line-height:1.5;margin-bottom:8px">Ai sensi del Regolamento UE 2016/679 (GDPR), i dati personali forniti tramite questo servizio — inclusi numero di telefono, nome e, se il GPS del dispositivo è attivo e autorizzato, la posizione geografica al momento dell’invio — saranno trattati da Omnia Servizi al Turismo SRLS esclusivamente per la gestione della segnalazione, il coordinamento del soccorso, eventuali verifiche e il ricontatto dell’utente se necessario.</p>'
    +'<p style="font-size:11px;color:var(--text2);line-height:1.5;margin-bottom:8px">La posizione GPS, se rilevata, viene utilizzata per identificare la postazione di soccorso più vicina e facilitare l’intervento tempestivo. I dati sono accessibili esclusivamente al personale incaricato del servizio e conservati per il tempo strettamente necessario alla gestione della segnalazione.</p>'
    +'<label style="display:flex;gap:8px;align-items:flex-start;font-size:12px;color:var(--text);margin:0"><input type="checkbox" id="privacyCheck" style="margin-top:2px;flex-shrink:0"> <span>Ho letto l’informativa privacy e acconsento al trattamento dei dati personali, inclusa l’eventuale posizione GPS, per la gestione della segnalazione.</span></label>';
  wrap.appendChild(privacyWrap);

  const emergencyNote=document.createElement("p");
  emergencyNote.style.cssText="font-size:11px;color:var(--danger-text);text-align:center;margin-top:10px";
  emergencyNote.textContent="Per emergenze contingenti contattare immediatamente il 112 o il servizio di salvataggio più vicino.";
  wrap.appendChild(emergencyNote);

  const submitBtn=document.createElement("button");submitBtn.className="btn-primary";submitBtn.style.marginTop="18px";submitBtn.textContent="Invia segnalazione";
  submitBtn.addEventListener("click",()=>{
    notes=notesEl.value;zone=zoneSel.value;author=authorEl.value;
    var phoneEl2=document.getElementById("segnalazione-phone");
    if(phoneEl2)phone=phoneEl2.value.trim();
    if(!sub){alert("Seleziona il tipo di segnalazione.");return;}
    if(currentRole!=="operator"&&!stationMode&&phone.length<9){
      if(phoneEl2){phoneEl2.style.borderColor="var(--red)";phoneEl2.focus();}
      alert("Inserisci un numero di telefono valido per procedere.");return;
    }
    var privacyCheck=document.getElementById("privacyCheck");
    if(privacyCheck&&!privacyCheck.checked){
      alert("Devi leggere e accettare l’informativa privacy per procedere.");return;
    }
    if(_userLat===null&&!_submitGpsWarned){
      _submitGpsWarned=true;
      alert("\uD83D\uDCCD La posizione GPS non \u00e8 ancora pronta.\n\nAttendi qualche secondo che compaia \u201cposizione rilevata\u201d, cos\u00ec gli operatori ricevono il punto esatto sulla mappa. Oppure tocca di nuovo INVIA per procedere comunque senza posizione.");
      return;
    }
    submitBtn.disabled=true;submitBtn.textContent="Invio...";
    const r={id:Date.now(),type,sub,zone,notes,author,phone:phone||null,role:stationMode?"station":(currentRole||"public"),ts:new Date().toISOString(),status:"aperta",photo:photo||null,gps:(_userLat!==null)?{lat:_userLat,lng:_userLng,acc:_userGpsAcc}:null};
    addReport(r).then(()=>{if(!stationMode)sendWANotify(r);render("done");})
    .catch(e=>{submitBtn.disabled=false;submitBtn.textContent="Invia segnalazione";alert("Errore: "+e.message);});
  });
  wrap.appendChild(submitBtn);
  const wanote=document.createElement("p");wanote.style.cssText="font-size:11px;color:var(--text3);text-align:center;margin-top:10px";
  wanote.textContent="\uD83D\uDCAC Dopo l'invio si aprir\u00e0 WhatsApp per notificare gli operatori";
  wrap.appendChild(wanote);page.appendChild(wrap);
}

// DONE
function renderDone(page){
  const w=document.createElement("div");w.className="confirm-wrap";
  const ic=document.createElement("div");ic.className="confirm-icon";ic.textContent="\u2713";w.appendChild(ic);
  const h=document.createElement("h2");h.style.cssText="font-size:18px;font-weight:600;margin-bottom:8px";h.textContent="Segnalazione inviata";w.appendChild(h);
  const p=document.createElement("p");p.style.cssText="color:var(--text2);font-size:14px;margin-bottom:4px";p.textContent="Grazie. Gli operatori sono stati avvisati.";w.appendChild(p);
  if(!stationMode){
    const wn=document.createElement("p");wn.style.cssText="font-size:12px;color:var(--success-text);margin-bottom:20px";wn.textContent="\uD83D\uDCAC Notifica WhatsApp inviata";w.appendChild(wn);
  }
  const b1=document.createElement("button");b1.className="btn-primary";b1.textContent="Nuova segnalazione";b1.addEventListener("click",()=>render("submit"));w.appendChild(b1);
  const b2=document.createElement("button");b2.style.cssText="background:none;border:none;color:var(--text2);font-size:13px;margin-top:10px;width:100%;cursor:pointer";
  b2.textContent="\u2190 Torna alla home";b2.addEventListener("click",()=>{render("home");});w.appendChild(b2);page.appendChild(w);
}

// ============================================================
// MINORE SMARRITO — flusso dedicato (perso / trovato)
// ============================================================
const CHILD_PHOTO_TTL_MS=6*60*60*1000;   // foto minore cancellata 6h dopo la chiusura del caso
const CHILD_ESCALATE_MIN=10;             // oltre N minuti: scheda in escalation, ribadisce 112
let _lastChildKey=null;                  // chiave dell'ultimo caso inviato (per la schermata done)

// Banner intestazione 112 riutilizzabile
function _child112Banner(){
  const a=document.createElement("a");a.href="tel:112";
  a.style.cssText="display:flex;align-items:center;justify-content:center;gap:8px;background:#b91c1c;color:#fff;font-size:16px;font-weight:800;padding:13px;border-radius:12px;text-decoration:none;margin-bottom:16px;box-shadow:0 2px 8px rgba(185,29,29,.3)";
  a.innerHTML='\uD83D\uDCDE In caso di pericolo immediato chiama il 112';
  return a;
}

// Card "postazione di salvataggio più vicina + come arrivarci" (riutilizzabile)
function _nearestStationNavCard(){
  const ns=document.createElement("div");
  if(nearestStation){
    ns.style.cssText="border-radius:var(--radius-lg);margin-bottom:8px;background:#f0fdf4;border:1px solid #bbf7d0;overflow:hidden";
    const infoRow=document.createElement("div");
    infoRow.style.cssText="display:flex;align-items:center;gap:10px;padding:12px 14px 10px";
    infoRow.innerHTML='<span style="font-size:22px">\uD83C\uDFD6\uFE0F</span>'
      +'<div style="flex:1;min-width:0">'
      +'<p style="font-size:14px;font-weight:700;color:var(--text);margin:0 0 2px">P.'+nearestStation.num+' \u2013 '+nearestStation.name+'</p>'
      +'<p style="font-size:12px;color:var(--text2);margin:0">Postazione pi\u00f9 vicina'+(nearestDist?' &nbsp;\u00b7&nbsp; a <strong>'+fmtDist(nearestDist)+'</strong> da te':'')+'</p>'
      +'</div>';
    ns.appendChild(infoRow);
    const navBtn=document.createElement("button");
    navBtn.style.cssText="display:block;width:100%;padding:12px 8px;background:#166534;border:none;font-size:14px;font-weight:700;color:#fff;cursor:pointer";
    navBtn.innerHTML='\uD83E\uDDED Come arrivarci \u2192';
    navBtn.addEventListener("click",function(){
      const lat=nearestStation.lat,lng=nearestStation.lng;
      const ua=navigator.userAgent||"";
      const url=/iPhone|iPad|iPod/i.test(ua)
        ? "maps://maps.apple.com/?daddr="+lat+","+lng+"&dirflg=w"
        : "https://www.google.com/maps/dir/?api=1&destination="+lat+","+lng+"&travelmode=walking";
      window.open(url,"_blank");
    });
    ns.appendChild(navBtn);
  } else {
    ns.style.cssText="display:flex;align-items:center;gap:8px;padding:11px 14px;border-radius:var(--radius-lg);margin-bottom:8px;background:var(--bg2);border:1px solid var(--border);cursor:pointer";
    ns.innerHTML='<span style="font-size:18px">\uD83D\uDCCD</span><span style="font-size:13px;color:var(--text2)">Tocca per rilevare la postazione di salvataggio pi\u00f9 vicina</span>';
    ns.addEventListener("click",function(){requestGPS();});
    if(_userLat===null)requestGPS();
  }
  return ns;
}

// Schermata bivio: ho perso / ho trovato
function renderMinoreBivio(page){
  if(nearestStation===null)requestGPS();
  const w=document.createElement("div");w.style.cssText="padding:4px 2px";
  w.appendChild(_child112Banner());

  const h=document.createElement("h2");
  h.style.cssText="font-size:19px;font-weight:800;margin:0 0 6px;color:var(--text)";
  h.textContent="Minore / persona smarrita";w.appendChild(h);
  const p=document.createElement("p");
  p.style.cssText="font-size:13px;color:var(--text2);margin:0 0 16px;line-height:1.5";
  p.textContent="Scegli la situazione. L'allerta raggiunge subito il responsabile Omnia ALS.";w.appendChild(p);

  const mk=(grad,emoji,title,desc,scr)=>{
    const b=document.createElement("button");
    b.style.cssText="display:block;width:100%;text-align:left;border:none;border-radius:14px;padding:20px 18px;margin-bottom:12px;cursor:pointer;color:#fff;background:"+grad;
    b.innerHTML=`<div style="font-size:32px;margin-bottom:6px">${emoji}</div><div style="font-size:17px;font-weight:800;margin-bottom:3px">${title}</div><div style="font-size:12.5px;opacity:.9;line-height:1.4">${desc}</div>`;
    b.addEventListener("click",()=>render(scr));
    return b;
  };
  w.appendChild(mk("linear-gradient(135deg,#d81b8c,#a30f66)","\uD83D\uDE22","Ho perso una persona","Segnala ora la scomparsa: descrizione e ultimo punto in cui l'hai vista.","minore-perso"));
  w.appendChild(mk("linear-gradient(135deg,#1a7f4b,#0f5a34)","\uD83D\uDE4B","Ho trovato una persona","Hai trovato una persona smarrita: segnala dove ti trovi adesso.","minore-trovato"));

  // Dopo la segnalazione: recati alla postazione di salvataggio più vicina
  const guide=document.createElement("div");
  guide.style.cssText="margin-top:6px;padding:12px 14px;border-radius:12px;background:#eff6ff;border:1px solid #bfdbfe";
  guide.innerHTML='<p style="font-size:13px;font-weight:700;color:#1e3a8a;margin:0 0 4px">\uD83D\uDEA9 Dopo la segnalazione</p>'
    +'<p style="font-size:12.5px;color:#1e40af;margin:0;line-height:1.5">Recati alla postazione di salvataggio pi\u00f9 vicina: i bagnini ti aiuteranno e coordineranno la ricerca.</p>';
  w.appendChild(guide);
  w.appendChild(_nearestStationNavCard());

  const back=document.createElement("button");
  back.style.cssText="background:none;border:none;color:var(--text2);font-size:13px;margin-top:8px;width:100%;cursor:pointer";
  back.textContent="\u2190 Torna alla home";back.addEventListener("click",()=>render("home"));
  w.appendChild(back);
  page.appendChild(w);
}

// Form perso / trovato
function renderMinoreForm(page,direction){
  const perso=direction==="perso";
  const accent=perso?"#d81b8c":"#1a7f4b";
  const w=document.createElement("div");w.style.cssText="padding:4px 2px";
  w.appendChild(_child112Banner());

  const h=document.createElement("h2");
  h.style.cssText="font-size:18px;font-weight:800;margin:0 0 14px;color:var(--text)";
  h.textContent=perso?"\uD83D\uDE22 Ho perso una persona":"\uD83D\uDE4B Ho trovato una persona";
  w.appendChild(h);

  const fieldStyle="width:100%;padding:11px 13px;border:1px solid var(--border);border-radius:10px;font-size:15px;background:var(--bg);color:var(--text);margin-bottom:12px;box-sizing:border-box";
  const lab=(t)=>{const l=document.createElement("label");l.style.cssText="display:block;font-size:12.5px;font-weight:700;color:var(--text);margin:0 0 5px";l.textContent=t;return l;};

  w.appendChild(lab("Et\u00e0 approssimativa"));
  const ageEl=document.createElement("input");ageEl.type="text";ageEl.placeholder="es. circa 5 anni";ageEl.style.cssText=fieldStyle;w.appendChild(ageEl);

  w.appendChild(lab("Abbigliamento e colore costume"));
  const clothEl=document.createElement("textarea");clothEl.rows=2;clothEl.placeholder="es. maglietta gialla, costume rosso, sandali blu";clothEl.style.cssText=fieldStyle+";resize:vertical";w.appendChild(clothEl);

  w.appendChild(lab("Nome del bambino (facoltativo)"));
  const nameEl=document.createElement("input");nameEl.type="text";nameEl.placeholder="se conosciuto";nameEl.style.cssText=fieldStyle;w.appendChild(nameEl);

  // Dati di chi segnala (per essere ricontattato dagli operatori)
  const contactHead=document.createElement("p");
  contactHead.style.cssText="font-size:13px;font-weight:800;color:"+accent+";margin:8px 0 8px;padding-top:8px;border-top:1px solid var(--border)";
  contactHead.textContent=perso?"I tuoi dati (genitore / accompagnatore)":"I tuoi dati (chi ha trovato il bambino)";
  w.appendChild(contactHead);

  w.appendChild(lab("Il tuo nome e cognome"));
  const reporterEl=document.createElement("input");reporterEl.type="text";reporterEl.placeholder="es. Mario Rossi";reporterEl.style.cssText=fieldStyle;w.appendChild(reporterEl);

  w.appendChild(lab("Il tuo numero di telefono *"));
  const phoneEl=document.createElement("input");phoneEl.type="tel";phoneEl.inputMode="tel";phoneEl.placeholder="es. 333 1234567 (obbligatorio)";phoneEl.style.cssText=fieldStyle;w.appendChild(phoneEl);
  const phoneNote=document.createElement("p");phoneNote.style.cssText="font-size:11px;color:var(--text3);margin:-6px 0 14px;line-height:1.4";
  phoneNote.textContent="\u260E\uFE0F Obbligatorio: lascia un recapito raggiungibile, i bagnini potrebbero doverti richiamare subito.";w.appendChild(phoneNote);

  // Foto facoltativa
  w.appendChild(lab("Foto (facoltativa)"));
  let childPhoto=null;
  let _minoreGpsWarned=false;
  const photoWrap=document.createElement("div");photoWrap.style.cssText="margin-bottom:12px";
  const photoInput=document.createElement("input");photoInput.type="file";photoInput.accept="image/*";photoInput.style.cssText="font-size:13px;width:100%";
  const photoPrev=document.createElement("img");photoPrev.style.cssText="display:none;max-width:100%;border-radius:10px;margin-top:8px;max-height:180px";
  photoInput.addEventListener("change",e=>{const f=e.target.files[0];if(f)resizeImg(f,d=>{childPhoto=d;photoPrev.src=d;photoPrev.style.display="block";});});
  photoWrap.appendChild(photoInput);photoWrap.appendChild(photoPrev);w.appendChild(photoWrap);
  const photoNote=document.createElement("p");photoNote.style.cssText="font-size:11px;color:var(--text3);margin:-4px 0 14px;line-height:1.4";
  photoNote.textContent="\uD83D\uDD12 La foto di un minore \u00e8 un dato sensibile: resta visibile solo agli operatori durante la ricerca e viene eliminata automaticamente alla chiusura del caso.";w.appendChild(photoNote);

  // Posizione GPS
  const gpsBox=document.createElement("div");
  gpsBox.style.cssText="background:var(--bg2,#f1f5f9);border-radius:10px;padding:11px 13px;margin-bottom:16px;font-size:12.5px;color:var(--text2);line-height:1.5";
  const gpsLabel=perso?"Ultimo punto in cui l'hai visto":"Dove ti trovi adesso";
  function gpsText(){
    if(_userLat!==null)return "\uD83D\uDCCD "+gpsLabel+": posizione rilevata (~"+Math.round(_userGpsAcc||0)+"m)";
    return "\uD83D\uDCCD "+gpsLabel+": rilevamento posizione in corso\u2026 attiva il GPS se richiesto.";
  }
  gpsBox.textContent=gpsText();w.appendChild(gpsBox);
  if(_userLat===null)requestGPS();
  const _gpsPoll=setInterval(()=>{gpsBox.textContent=gpsText();if(_userLat!==null)clearInterval(_gpsPoll);},1500);

  // Informativa privacy dedicata (minore + foto = dati particolarmente sensibili)
  const privacyWrap=document.createElement("div");
  privacyWrap.style.cssText="margin-top:4px;padding:12px;border:1px solid var(--border);border-radius:var(--radius);background:var(--bg2)";
  privacyWrap.innerHTML=
    '<p style="font-size:12px;font-weight:700;color:var(--text);margin-bottom:8px">Informativa privacy &mdash; segnalazione minore</p>'
    +'<p style="font-size:11px;color:var(--text2);line-height:1.5;margin-bottom:8px">Ai sensi del Regolamento UE 2016/679 (GDPR), i dati forniti &mdash; et\u00e0, descrizione, eventuale nome, la posizione GPS se attiva e l\u2019eventuale fotografia &mdash; sono trattati da Omnia Servizi al Turismo SRLS al solo scopo di ricercare e ricongiungere il minore. La fotografia, in quanto dato di un minore, \u00e8 visibile solo agli operatori di salvataggio durante la ricerca ed \u00e8 <b>eliminata automaticamente alla chiusura del caso</b>; non viene conservata nell\u2019archivio delle segnalazioni. Il trattamento risponde a una necessit\u00e0 di tutela vitale del minore (art. 6 e art. 9 GDPR).</p>'
    +'<label style="display:flex;gap:8px;align-items:flex-start;font-size:12px;color:var(--text);margin:0"><input type="checkbox" id="minorePrivacyCheck" style="margin-top:2px;flex-shrink:0"> <span>Dichiaro di fornire questi dati per la ricerca del minore e acconsento al loro trattamento, inclusa l\u2019eventuale foto e posizione GPS, per le finalit\u00e0 indicate.</span></label>';
  w.appendChild(privacyWrap);

  // Submit
  const submit=document.createElement("button");
  submit.className="btn-primary";submit.style.cssText="margin-top:14px;background:"+accent;
  submit.textContent=perso?"\uD83D\uDEA8 DIRAMA ALLERTA":"\u2714 SEGNALA RITROVAMENTO";
  submit.addEventListener("click",()=>{
    const cloth=clothEl.value.trim();
    if(!cloth&&!ageEl.value.trim()){alert("Inserisci almeno l'et\u00e0 o l'abbigliamento per riconoscere il bambino.");return;}
    const reporterPhoneVal=phoneEl.value.trim();
    if(reporterPhoneVal.replace(/\D/g,"").length<8){alert("\u260E\uFE0F Inserisci un numero di telefono valido.\n\n\u00c8 obbligatorio: i bagnini devono poterti richiamare subito durante la ricerca.");phoneEl.focus();return;}
    var pc=document.getElementById("minorePrivacyCheck");
    if(pc&&!pc.checked){alert("Devi accettare l\u2019informativa privacy per inviare la segnalazione.");pc.focus();return;}
    if(_userLat===null&&!_minoreGpsWarned){
      _minoreGpsWarned=true;
      alert("\uD83D\uDCCD La posizione GPS non \u00e8 ancora pronta.\n\nPer aiutare i bagnini a localizzare il punto esatto, attendi qualche secondo che compaia \u201cposizione rilevata\u201d, oppure tocca di nuovo INVIA per procedere comunque senza posizione.");
      return;
    }
    submit.disabled=true;submit.textContent="Invio\u2026";
    const ruolo=perso?"Genitore/accompagnatore":"Chi ha trovato";
    const reporterName=reporterEl.value.trim();
    const reporterPhone=phoneEl.value.trim();
    const r={
      id:Date.now(),
      type:"emergenza",                    // eredita allarme sonoro, anello in mappa, banner operatori
      sub:perso?"Minore smarrito":"Minore ritrovato",
      zone:nearestStation?("P."+nearestStation.num+" \u2013 "+nearestStation.name):(_userLat!==null?"Posizione GPS (vedi link)":"Zona non specificata"),
      notes:[ageEl.value.trim()&&("Et\u00e0: "+ageEl.value.trim()),cloth&&("Abbigliamento: "+cloth),nameEl.value.trim()&&("Nome bambino: "+nameEl.value.trim())].filter(Boolean).join(" \u00b7 "),
      author:reporterName?(ruolo+": "+reporterName):ruolo,
      phone:reporterPhone||null,
      role:currentRole||"public",
      ts:new Date().toISOString(),status:"aperta",
      photo:childPhoto||null,
      gps:(_userLat!==null)?{lat:_userLat,lng:_userLng,acc:_userGpsAcc}:null,
      childCase:{
        direction:direction,
        age:ageEl.value.trim()||null,
        clothing:cloth||null,
        name:nameEl.value.trim()||null,
        reporterName:reporterName||null,
        reporterPhone:reporterPhone||null,
        matchedKey:null
      }
    };
    addReport(r).then(ref=>{
      _lastChildKey=ref&&ref.key?ref.key:null;
      sendWANotify(r);
      render("minore-done");
    }).catch(e=>{submit.disabled=false;submit.textContent=perso?"\uD83D\uDEA8 DIRAMA ALLERTA":"\u2714 SEGNALA RITROVAMENTO";alert("Errore: "+e.message);});
  });
  w.appendChild(submit);

  const back=document.createElement("button");
  back.style.cssText="background:none;border:none;color:var(--text2);font-size:13px;margin-top:12px;width:100%;cursor:pointer";
  back.textContent="\u2190 Indietro";back.addEventListener("click",()=>{clearInterval(_gpsPoll);render("minore");});
  w.appendChild(back);
  page.appendChild(w);
}

// Conferma invio
function renderMinoreDone(page){
  const w=document.createElement("div");w.className="confirm-wrap";
  const ic=document.createElement("div");ic.className="confirm-icon";ic.style.background="#d81b8c";ic.textContent="\uD83D\uDEA8";w.appendChild(ic);
  const h=document.createElement("h2");h.style.cssText="font-size:18px;font-weight:700;margin-bottom:8px";h.textContent="Allerta diramata";w.appendChild(h);
  const p=document.createElement("p");p.style.cssText="color:var(--text2);font-size:14px;margin-bottom:6px;line-height:1.5";
  p.textContent="Tutte le postazioni di salvataggio sono state avvisate e stanno cercando. Resta dove sei e tieni il telefono a portata.";w.appendChild(p);
  const call=document.createElement("a");call.href="tel:112";
  call.style.cssText="display:block;background:#b91c1c;color:#fff;font-size:16px;font-weight:800;padding:13px;border-radius:10px;text-decoration:none;margin:14px 0";
  call.textContent="\uD83D\uDCDE Chiama il 112";w.appendChild(call);
  const b2=document.createElement("button");b2.style.cssText="background:none;border:none;color:var(--text2);font-size:13px;margin-top:6px;width:100%;cursor:pointer";
  b2.textContent="\u2190 Torna alla home";b2.addEventListener("click",()=>render("home"));w.appendChild(b2);
  page.appendChild(w);
}
