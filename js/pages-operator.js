import { FLAG_COLORS, STATIONS, TYPES, WA_NOTIFY, _getAuth, _openNoteModal, _registerContactPush, currentScreen, deleteReport, emergencyContactsRef, flagsData, fmt, getFlags, getReports, render, renderPage, resolveReport, saveFlags, setFlag, stationDevicesData, stationDevicesRef, stationNotesData, stationNotesRef } from "./core.js";
import { refreshMarkers } from "./map.js";
import { CHILD_ESCALATE_MIN } from "./pages-public.js";

export function renderDashboard(page){
  const reports=getReports(),open=reports.filter(r=>r.status==="aperta");
  const tb=document.createElement("div");tb.className="dash-toolbar";
  const ti=document.createElement("div");
  const sd=window.fbReady?`<span class="sync-dot" title="Sync attivo"></span>`:`<span class="sync-dot off" title="Connessione..."></span>`;
  ti.innerHTML=`<h1 style="font-size:16px;font-weight:600;margin-bottom:2px">Dashboard Operatori ${sd}</h1><p style="font-size:11px;color:var(--text2)">Roseto degli Abruzzi &middot; P.10 \u2013 P.35</p>`;
  const logoutBtn=document.createElement("button");
  logoutBtn.style.cssText="font-size:12px;padding:5px 12px;color:var(--danger-text);background:var(--danger-bg);border-color:transparent;border-radius:var(--radius)";
  logoutBtn.innerHTML="\uD83D\uDD13 Esci";
  logoutBtn.addEventListener("click",function(){
    if(confirm("Vuoi uscire dall\u2019area operatori?")){
      window.currentRole=null;window.newReportCount=0;
      _sentrySetTag("role","public");
      try{localStorage.removeItem("omnia_op_auth");}catch(e){}
      try{var _ao=_getAuth();if(_ao)_ao.signOut();}catch(e){}
      window.currentRole=null;
      render("home");
    }
  });
  ti.appendChild(logoutBtn);
  tb.appendChild(ti);
  const ac=document.createElement("div");ac.className="dash-actions";
  const newBtn=document.createElement("button");newBtn.className="btn-primary";newBtn.style.cssText="width:auto;font-size:12px;padding:6px 14px";newBtn.textContent="+ Segnala";
  newBtn.addEventListener("click",()=>render("submit"));ac.appendChild(newBtn);tb.appendChild(ac);page.appendChild(tb);
  const sg=document.createElement("div");sg.className="stats-grid";
  [{label:"APERTE",value:open.length,color:""},{label:"EMERGENZE",value:open.filter(r=>r.type==="emergenza").length,color:"var(--danger-text)"},
   {label:"PERICOLI",value:open.filter(r=>r.type==="pericolo").length,color:"var(--warning-text)"}]
  .forEach(s=>{const sc=document.createElement("div");sc.className="stat-card";sc.innerHTML=`<p class="stat-label">${s.label}</p><p class="stat-value"${s.color?` style="color:${s.color}"`:""}>${s.value}</p>`;sg.appendChild(sc);});
  page.appendChild(sg);
  const tabBar=document.createElement("div");tabBar.className="tab-bar";
  [["segnalazioni","Segnalazioni"],["bandiere","Bandiere"],["note","\u26a0\ufe0f Note"],["dispositivi","\ud83d\udcf1 Dispositivi"]].forEach(([k,l])=>{
    const btn=document.createElement("button");btn.className="tab-btn"+(window.activeDashTab===k?" active":"");btn.textContent=l;
    btn.addEventListener("click",()=>{window.activeDashTab=k;renderPage();});tabBar.appendChild(btn);
  });
  page.appendChild(tabBar);
  if(window.activeDashTab==="bandiere"){renderBandiere(page);return;}
  if(window.activeDashTab==="note"){renderNote(page);return;}
  if(window.activeDashTab==="dispositivi"){renderDispositivi(page);return;}
  if(window.activeStation){
    const bar=document.createElement("div");bar.className="zone-filter-bar";
    bar.innerHTML=`<span style="font-size:12px;flex:1;color:var(--text2)">Filtro: ${window.activeStation}</span>`;
    const clr=document.createElement("button");clr.style.cssText="font-size:11px;padding:2px 8px;color:var(--danger-text);background:var(--danger-bg);border-color:transparent";clr.textContent="\u2715 rimuovi";
    clr.addEventListener("click",()=>{window.activeStation=null;renderPage();});bar.appendChild(clr);page.appendChild(bar);
  }
  const ft=document.createElement("div");ft.className="filters";
  [["aperte","Aperte"],["emergenza","Emergenze"],["pericolo","Pericoli"],["tutte","Tutte"]].forEach(([k,l])=>{
    const b=document.createElement("button");b.className="filter-btn"+(window.activeFilter===k?" active":"");b.textContent=l;
    b.addEventListener("click",()=>{window.activeFilter=k;renderPage();});ft.appendChild(b);
  });
  page.appendChild(ft);
  let filtered=window.activeFilter==="tutte"?reports:window.activeFilter==="aperte"?open:reports.filter(r=>r.type===window.activeFilter);
  if(window.activeStation)filtered=filtered.filter(r=>r.zone===window.activeStation);
  if(!filtered.length){const em=document.createElement("p");em.className="empty";em.textContent="Nessuna segnalazione";page.appendChild(em);return;}
  const list=document.createElement("div");list.className="reports-list";
  filtered.forEach(r=>{
    const res=r.status==="risolta";
    const card=document.createElement("div");card.className=`report-card ${res?"resolved":r.type}`;
    const top=document.createElement("div");top.className="report-top";
    const body=document.createElement("div");body.className="report-body";
    const hr=document.createElement("div");hr.style.cssText="display:flex;align-items:center;gap:6px;flex-wrap:wrap;margin-bottom:5px";
    const bdg=document.createElement("span");bdg.className=`badge badge-${r.type}`;bdg.textContent=TYPES[r.type].label.toUpperCase();hr.appendChild(bdg);
    const subEl=document.createElement("span");subEl.style.cssText="font-size:13px;font-weight:600";subEl.textContent=r.sub;hr.appendChild(subEl);
    if(res){const t=document.createElement("span");t.className="tag-resolved";t.textContent="\u2713 risolta";hr.appendChild(t);}
    if(r.role==="public"){const t=document.createElement("span");t.className="tag-public";t.textContent="pubblico";hr.appendChild(t);}
    body.appendChild(hr);
    // --- Caso MINORE: badge, timer, incrocio perso/trovato ---
    if(r.childCase){
      const dir=r.childCase.direction;
      const cb=document.createElement("span");
      cb.style.cssText="font-size:11px;font-weight:800;padding:2px 8px;border-radius:999px;color:#fff;background:"+(dir==="perso"?"#d81b8c":"#1a7f4b");
      cb.textContent=dir==="perso"?"\uD83D\uDC66 MINORE SMARRITO":"\uD83D\uDE4B MINORE RITROVATO";
      hr.insertBefore(cb,hr.firstChild.nextSibling);
      if(!res){
        // Timer dal momento della segnalazione
        const mins=Math.floor((Date.now()-new Date(r.ts).getTime())/60000);
        const esc=mins>=CHILD_ESCALATE_MIN;
        const tm=document.createElement("div");
        tm.style.cssText="display:flex;align-items:center;gap:7px;margin:6px 0 2px;font-size:12.5px;font-weight:700;padding:7px 10px;border-radius:8px;"+(esc?"background:#7f1d1d;color:#fff":"background:var(--danger-bg);color:var(--danger-text)");
        tm.innerHTML="\u23F1\uFE0F Aperto da "+(mins<1?"meno di 1 min":mins+" min")+(esc?" \u2014 oltre "+CHILD_ESCALATE_MIN+' min: coinvolgi le forze dell\u2019ordine, <a href="tel:112" style="color:#fff;text-decoration:underline">chiama 112</a>':"");
        body.appendChild(tm);
        // Incrocio: cerca un caso aperto della direzione opposta
        const opp=open.find(function(o){return o._key!==r._key&&o.childCase&&o.childCase.direction!==dir;});
        if(opp){
          const xm=document.createElement("div");
          xm.style.cssText="margin:6px 0 2px;font-size:12px;font-weight:700;padding:8px 10px;border-radius:8px;background:#fef9c3;color:#854d0e;border:1px solid #fde047;line-height:1.4";
          xm.innerHTML="\u26A0\uFE0F Possibile riscontro: c'\u00e8 anche "+(dir==="perso"?"un <b>ritrovamento</b>":"una <b>scomparsa</b>")+" aperta ("+opp.zone+"). Verifica se coincidono.";
          body.appendChild(xm);
        }
      }
    }
    const nt=document.createElement("p");nt.style.cssText="font-size:13px;line-height:1.5;margin-bottom:4px";nt.textContent=r.notes;body.appendChild(nt);
    if(r.photo){const imgWrap=document.createElement("div");imgWrap.style.cssText="position:relative;display:inline-block;margin:4px 0";const img=document.createElement("img");img.src=r.photo;img.style.cssText="max-width:100%;height:90px;object-fit:cover;border-radius:var(--radius);border:1px solid var(--border);display:block";const dlBtn=document.createElement("a");dlBtn.href=r.photo;dlBtn.download="segnalazione_"+r.id+".jpg";dlBtn.style.cssText="position:absolute;bottom:4px;right:4px;background:rgba(0,0,0,.65);color:white;border-radius:5px;padding:3px 7px;font-size:11px;font-weight:700;text-decoration:none";dlBtn.textContent="\u2B07\uFE0F";imgWrap.appendChild(img);imgWrap.appendChild(dlBtn);body.appendChild(imgWrap);}
    // Posizione GPS della segnalazione (apre il navigatore verso il punto esatto)
    if(r.gps&&typeof r.gps.lat==="number"&&typeof r.gps.lng==="number"){
      const gp=document.createElement("div");gp.style.cssText="display:flex;align-items:center;gap:8px;margin:6px 0 2px;flex-wrap:wrap";
      const gpsLink=document.createElement("a");
      gpsLink.href="https://www.google.com/maps/dir/?api=1&destination="+r.gps.lat+","+r.gps.lng+"&travelmode=walking";
      gpsLink.target="_blank";
      gpsLink.style.cssText="display:inline-flex;align-items:center;gap:6px;background:#166534;color:#fff;font-size:12.5px;font-weight:700;padding:7px 12px;border-radius:8px;text-decoration:none";
      gpsLink.innerHTML="\uD83E\uDDED Posizione sulla mappa"+(r.gps.acc?' <span style="font-weight:500;opacity:.85">(~'+Math.round(r.gps.acc)+'m)</span>':"");
      gp.appendChild(gpsLink);
      const coord=document.createElement("span");coord.style.cssText="font-size:11px;color:var(--text3)";
      coord.textContent=r.gps.lat.toFixed(5)+", "+r.gps.lng.toFixed(5);
      gp.appendChild(coord);
      body.appendChild(gp);
    } else if(r.role==="public"||r.childCase){
      const noGps=document.createElement("p");noGps.style.cssText="font-size:11.5px;color:var(--text3);margin:6px 0 2px;font-style:italic";
      noGps.textContent="\uD83D\uDCCD Posizione GPS non disponibile (il segnalante non l'ha attivata)";
      body.appendChild(noGps);
    }
    // Recapito di chi ha segnalato (pulsante chiamata diretta)
    if(r.phone){
      const ph=document.createElement("a");
      ph.href="tel:"+String(r.phone).replace(/\s+/g,"");
      ph.style.cssText="display:inline-flex;align-items:center;gap:6px;background:#0d3d7a;color:#fff;font-size:12.5px;font-weight:700;padding:7px 12px;border-radius:8px;text-decoration:none;margin:6px 0 2px";
      ph.textContent="\uD83D\uDCDE Chiama segnalante \u00b7 "+r.phone;
      body.appendChild(ph);
    } else if(r.childCase){
      const noPh=document.createElement("p");noPh.style.cssText="font-size:11.5px;color:#b45309;margin:6px 0 2px;font-style:italic";
      noPh.textContent="\u260E\uFE0F Nessun recapito lasciato dal segnalante";
      body.appendChild(noPh);
    }
    const mt=document.createElement("p");mt.className="report-meta";mt.textContent=`${r.zone} \u00b7 ${fmt(r.ts)}${r.author?" \u00b7 "+r.author:""}${r.phone?" \u00b7 \uD83D\uDCDE "+r.phone:""}`;body.appendChild(mt);
    top.appendChild(body);
    const acts=document.createElement("div");acts.className="report-actions";
    const wa=document.createElement("button");wa.className="action-btn wa";wa.textContent="WA";
    wa.addEventListener("click",()=>{
      const em={emergenza:"\uD83D\uDEA8",pericolo:"\u26A0\uFE0F"};
      const gpsLine=(r.gps&&typeof r.gps.lat==="number")?"\nPosizione: https://www.google.com/maps?q="+r.gps.lat.toFixed(6)+","+r.gps.lng.toFixed(6)+(r.gps.acc?" (~"+Math.round(r.gps.acc)+"m)":""):"";
      const txt=`${em[r.type]} *${TYPES[r.type].label.toUpperCase()}* \u2014 ${r.sub}\n\uD83D\uDCCD ${r.zone}\n${r.notes}${r.author?"\n\uD83D\uDC64 "+r.author:""}${r.phone?"\n\uD83D\uDCDE "+r.phone:""}${gpsLine}\n\uD83D\uDD50 ${fmt(r.ts)}\n\n\u2014 Omnia Adriatic Lifeguard Service`;
      window.open(`https://wa.me/${WA_NOTIFY}?text=${encodeURIComponent(txt)}`,"_blank");
    });acts.appendChild(wa);
    if(!res){
      const rv=document.createElement("button");rv.className="action-btn resolve";rv.textContent="\u2713";
      rv.addEventListener("click",()=>resolveReport(r._key).then(()=>refreshMarkers()));acts.appendChild(rv);
    }
    const dl=document.createElement("button");dl.className="action-btn del";dl.textContent="\u2715";
    dl.addEventListener("click",()=>{if(confirm("Eliminare questa segnalazione?")){deleteReport(r._key).then(()=>refreshMarkers());}});
    acts.appendChild(dl);top.appendChild(acts);card.appendChild(top);list.appendChild(card);
  });
  page.appendChild(list);
}

export function renderNote(page){
  var panel=document.createElement("div");panel.className="bandiere-panel";
  panel.id="_notePanelRows";
  var hdr=document.createElement("div");hdr.className="bandiere-header";
  var title=document.createElement("h3");title.textContent="Note di pericolo postazioni";hdr.appendChild(title);
  var sub=document.createElement("p");sub.style.cssText="font-size:11px;color:var(--text2);margin:2px 0 0";
  sub.textContent="La postazione con nota diventa nera sulla mappa — visibile a tutti.";
  hdr.appendChild(sub);panel.appendChild(hdr);
  STATIONS.forEach(function(s){
    var row=document.createElement("div");
    row.style.cssText="padding:10px 16px;border-bottom:1px solid var(--border);display:flex;align-items:center;gap:10px";
    var note=stationNotesData[String(s.num)];
    // Dot
    var dot=document.createElement("div");
    dot.id="_noteDot_"+s.num;
    dot.style.cssText="width:12px;height:12px;border-radius:50%;flex-shrink:0;border:1.5px solid rgba(0,0,0,.15);background:"+(note?"#1a1a1a":FLAG_COLORS[flagsData[s.num]||"verde"]);
    row.appendChild(dot);
    // Name + badge
    var nm=document.createElement("div");nm.style.cssText="flex:1;min-width:0";
    nm.innerHTML='<span style="font-size:13px">'+s.name+'</span> <span style="font-size:11px;color:var(--text3)">P.'+s.num+'</span>';
    var noteBadge=document.createElement("div");
    noteBadge.id="_noteBadge_"+s.num;
    noteBadge.style.cssText="font-size:11px;color:#fff;background:#1a1a1a;border-radius:4px;padding:2px 7px;margin-top:3px;display:"+(note?"inline-block":"none");
    noteBadge.textContent=note?String(note).substring(0,40)+(note.length>40?"...":""):"";
    nm.appendChild(noteBadge);
    row.appendChild(nm);
    // Add button
    var addBtn=document.createElement("button");
    addBtn.id="_noteAddBtn_"+s.num;
    addBtn.style.cssText="font-size:12px;padding:5px 10px;background:var(--bg2);border-color:var(--border2);flex-shrink:0;color:var(--text);display:"+(note?"none":"inline-block");
    addBtn.textContent="+ Nota";
    (function(sNum,sName,btn){
      btn.addEventListener("click",function(){_openNoteModal(sNum,sName,null);});
    })(s.num,s.name,addBtn);
    row.appendChild(addBtn);
    // Edit + delete buttons
    var editBtn=document.createElement("button");
    editBtn.style.cssText="font-size:12px;padding:5px 8px;background:var(--bg2);border-color:var(--border2);flex-shrink:0;color:var(--text);display:"+(note?"inline-block":"none");
    editBtn.textContent="\u270f\ufe0f";
    (function(sNum,sName){
      editBtn.addEventListener("click",function(){_openNoteModal(sNum,sName,stationNotesData[String(sNum)]);});
    })(s.num,s.name);
    row.appendChild(editBtn);
    var delBtn=document.createElement("button");
    delBtn.id="_noteDelBtn_"+s.num;
    delBtn.style.cssText="font-size:12px;padding:5px 10px;color:var(--danger-text);background:var(--danger-bg);border-color:transparent;flex-shrink:0;display:"+(note?"inline-block":"none");
    delBtn.textContent="\u2715";
    (function(sNum){
      delBtn.addEventListener("click",function(){
        if(confirm("Rimuovere la nota per P."+sNum+"?")){
          delete stationNotesData[String(sNum)]; // aggiorna locale immediatamente
          stationNotesRef.child(String(sNum)).remove(); // rimuovi SOLO questa nota
          try{var _sn=JSON.parse(localStorage.getItem("fb_stationNotes")||"{}");delete _sn[String(sNum)];localStorage.setItem("fb_stationNotes",JSON.stringify(_sn));}catch(e){}
          refreshMarkers();
          if(currentScreen==="home")renderPage();
          if(currentScreen==="dashboard"&&window.activeDashTab==="note")renderPage();
        }
      });
    })(s.num);
    row.appendChild(delBtn);
    panel.appendChild(row);
  });
  page.appendChild(panel);
}


// DISPOSITIVI DI POSTAZIONE
export function renderDispositivi(page){
  var panel=document.createElement("div");panel.className="bandiere-panel";
  var hdr=document.createElement("div");hdr.className="bandiere-header";
  var title=document.createElement("h3");title.textContent="Dispositivi di postazione";hdr.appendChild(title);
  var sub=document.createElement("p");sub.style.cssText="font-size:11px;color:var(--text2);margin:2px 0 0";
  sub.textContent="Attivati dalla pagina di login dell'app con “Questo è un dispositivo di postazione”.";
  hdr.appendChild(sub);panel.appendChild(hdr);

  // ---- Contatti emergenza (admin + coordinatore) ----
  var contactsTitle=document.createElement("div");
  contactsTitle.style.cssText="padding:10px 16px 4px;font-size:12px;font-weight:700;color:var(--text2)";
  contactsTitle.textContent="CONTATTI EMERGENZA";
  panel.appendChild(contactsTitle);
  var contactsSub=document.createElement("p");
  contactsSub.style.cssText="padding:0 16px 8px;font-size:11px;color:var(--text3)";
  contactsSub.textContent="Ricevono sempre l'allarme del pulsante EMERGENZA dalle postazioni, oltre alle 2 postazioni più vicine a nord e a sud.";
  panel.appendChild(contactsSub);
  [["admin","Admin"],["coordinator","Coordinatore"]].forEach(function([roleKey,roleLabel]){
    var row=document.createElement("div");
    row.style.cssText="padding:8px 16px;border-bottom:1px solid var(--border);display:flex;flex-wrap:wrap;align-items:center;gap:8px";
    var lbl=document.createElement("span");lbl.style.cssText="font-size:12.5px;font-weight:700;min-width:90px";lbl.textContent=roleLabel;
    var nameInp=document.createElement("input");nameInp.type="text";nameInp.placeholder="Nome";nameInp.style.cssText="width:auto;flex:1;min-width:100px;padding:6px 8px;font-size:12.5px";
    var phoneInp=document.createElement("input");phoneInp.type="tel";phoneInp.placeholder="Telefono";phoneInp.style.cssText="width:auto;flex:1;min-width:110px;padding:6px 8px;font-size:12.5px";
    var saveBtn=document.createElement("button");saveBtn.style.cssText="width:auto;font-size:12px;padding:6px 10px;background:var(--bg2);border-color:var(--border2);color:var(--text)";
    saveBtn.textContent="Salva";
    saveBtn.addEventListener("click",function(){
      saveBtn.disabled=true;saveBtn.textContent="Salvataggio…";
      emergencyContactsRef.child(roleKey).update({name:nameInp.value.trim(),phone:phoneInp.value.trim()})
        .then(function(){saveBtn.textContent="✓ Salvato";setTimeout(function(){saveBtn.disabled=false;saveBtn.textContent="Salva";},1500);})
        .catch(function(e){saveBtn.disabled=false;saveBtn.textContent="Salva";alert("Errore: "+e.message);});
    });
    var pushBtn=document.createElement("button");pushBtn.style.cssText="width:auto;font-size:12px;padding:6px 10px;background:var(--info-bg,var(--bg2));border-color:var(--border2);color:var(--text)";
    pushBtn.textContent="🔔 Attiva su questo dispositivo";
    pushBtn.title="Da premere sul telefono personale di questo contatto, mentre è aperto";
    pushBtn.addEventListener("click",function(){_registerContactPush(roleKey,pushBtn);});
    row.appendChild(lbl);row.appendChild(nameInp);row.appendChild(phoneInp);row.appendChild(saveBtn);row.appendChild(pushBtn);
    panel.appendChild(row);
    emergencyContactsRef.child(roleKey).once("value").then(function(snap){
      var c=snap.val();if(!c)return;
      if(c.name)nameInp.value=c.name;
      if(c.phone)phoneInp.value=c.phone;
    }).catch(function(){});
  });

  var entries=Object.entries(stationDevicesData||{});
  var pending=entries.filter(function(e){return !e[1].enabled;});
  var active=entries.filter(function(e){return e[1].enabled;});

  var pendTitle=document.createElement("div");
  pendTitle.style.cssText="padding:10px 16px 4px;font-size:12px;font-weight:700;color:var(--text2)";
  pendTitle.textContent="IN ATTESA ("+pending.length+")";
  panel.appendChild(pendTitle);

  if(!pending.length){
    var emp=document.createElement("p");emp.style.cssText="padding:2px 16px 14px;font-size:12.5px;color:var(--text3)";
    emp.textContent="Nessuna richiesta in attesa.";panel.appendChild(emp);
  }
  pending.forEach(function(entry){
    var deviceId=entry[0],d=entry[1];
    var row=document.createElement("div");
    row.style.cssText="padding:10px 16px;border-bottom:1px solid var(--border);display:flex;flex-wrap:wrap;align-items:center;gap:8px";
    var info=document.createElement("div");info.style.cssText="flex:1;min-width:180px";
    info.innerHTML='<span style="font-size:12.5px">Richiesta del '+fmt(d.requestedAt)+'</span><br><span style="font-size:10.5px;color:var(--text3)">'+String(d.userAgent||"").substring(0,60)+'</span>';
    row.appendChild(info);
    var sel=document.createElement("select");sel.style.cssText="width:auto;padding:6px 8px;font-size:12.5px";
    var ph=document.createElement("option");ph.value="";ph.textContent="Scegli postazione…";sel.appendChild(ph);
    STATIONS.forEach(function(s){var o=document.createElement("option");o.value=String(s.num);o.textContent="P."+s.num+" – "+s.name;sel.appendChild(o);});
    row.appendChild(sel);
    var actBtn=document.createElement("button");actBtn.className="btn-primary";actBtn.style.cssText="width:auto;font-size:12px;padding:6px 12px";
    actBtn.textContent="Attiva";
    actBtn.addEventListener("click",function(){
      if(!sel.value){alert("Scegli prima una postazione.");return;}
      actBtn.disabled=true;actBtn.textContent="Attivazione…";
      stationDevicesRef.child(deviceId).update({enabled:true,station:sel.value}).catch(function(e){
        actBtn.disabled=false;actBtn.textContent="Attiva";
        alert("Errore: "+e.message);
      });
    });
    row.appendChild(actBtn);
    var rejBtn=document.createElement("button");rejBtn.title="Rifiuta ed elimina la richiesta";
    rejBtn.style.cssText="width:auto;font-size:12px;padding:6px 10px;color:var(--danger-text);background:var(--danger-bg);border-color:transparent";
    rejBtn.textContent="✕";
    rejBtn.addEventListener("click",function(){
      if(confirm("Eliminare questa richiesta di attivazione?"))stationDevicesRef.child(deviceId).remove();
    });
    row.appendChild(rejBtn);
    panel.appendChild(row);
  });

  var actTitle=document.createElement("div");
  actTitle.style.cssText="padding:14px 16px 4px;font-size:12px;font-weight:700;color:var(--text2)";
  actTitle.textContent="ATTIVI ("+active.length+")";
  panel.appendChild(actTitle);
  if(!active.length){
    var emp2=document.createElement("p");emp2.style.cssText="padding:2px 16px 14px;font-size:12.5px;color:var(--text3)";
    emp2.textContent="Nessun dispositivo attivo.";panel.appendChild(emp2);
  }
  active.forEach(function(entry){
    var deviceId=entry[0],d=entry[1];
    var st=STATIONS.find(function(s){return String(s.num)===String(d.station);});
    var row=document.createElement("div");
    row.style.cssText="padding:10px 16px;border-bottom:1px solid var(--border);display:flex;align-items:center;gap:10px";
    var info=document.createElement("div");info.style.cssText="flex:1;min-width:0";
    info.innerHTML='<span style="font-size:13px;font-weight:600">P.'+d.station+(st?" – "+st.name:"")+'</span><br><span style="font-size:10.5px;color:var(--text3)">'+String(d.userAgent||"").substring(0,60)+'</span>';
    row.appendChild(info);
    var offBtn=document.createElement("button");offBtn.style.cssText="width:auto;font-size:12px;padding:6px 10px;background:var(--bg2);border-color:var(--border2);color:var(--text)";
    offBtn.textContent="Disattiva";
    offBtn.addEventListener("click",function(){
      if(confirm("Disattivare questo dispositivo dalla postazione P."+d.station+"?"))
        stationDevicesRef.child(deviceId).update({enabled:false});
    });
    row.appendChild(offBtn);
    var delBtn=document.createElement("button");delBtn.title="Rimuovi definitivamente";
    delBtn.style.cssText="width:auto;font-size:12px;padding:6px 10px;color:var(--danger-text);background:var(--danger-bg);border-color:transparent";
    delBtn.textContent="✕";
    delBtn.addEventListener("click",function(){
      if(confirm("Rimuovere definitivamente questo dispositivo? Dovrà rifare la richiesta di attivazione."))
        stationDevicesRef.child(deviceId).remove();
    });
    row.appendChild(delBtn);
    panel.appendChild(row);
  });

  page.appendChild(panel);
}

// PANNELLO DI POSTAZIONE (dispositivo dedicato, nessun accesso alla dashboard generale)
export function renderBandiere(page){
  const flags=getFlags();
  const panel=document.createElement("div");panel.className="bandiere-panel";
  const hdr=document.createElement("div");hdr.className="bandiere-header";
  const title=document.createElement("h3");title.textContent="Bandiere postazioni";hdr.appendChild(title);
  const bulk=document.createElement("div");bulk.className="bulk-controls";
  const bulkLbl=document.createElement("label");bulkLbl.textContent="Tutte:";bulk.appendChild(bulkLbl);
  const bulkSel=document.createElement("select");bulkSel.style.cssText="width:auto;padding:5px 8px;font-size:12px";
  [["verde","\uD83D\uDFE2 Verde"],["gialla","\uD83D\uDFE1 Gialla"],["rossa","\uD83D\uDD34 Rossa"]].forEach(([v,l])=>{
    const o=document.createElement("option");o.value=v;o.textContent=l;bulkSel.appendChild(o);
  });
  bulk.appendChild(bulkSel);
  const bulkBtn=document.createElement("button");bulkBtn.className="bulk-btn";bulkBtn.textContent="Applica a tutte";
  bulkBtn.addEventListener("click",()=>{
    const val=bulkSel.value,f={};STATIONS.forEach(s=>f[s.num]=val);
    bulkBtn.disabled=true;var prevTxt=bulkBtn.textContent;bulkBtn.textContent="Applico\u2026";
    saveFlags(f).then(function(){
      bulkBtn.disabled=false;bulkBtn.textContent=prevTxt;
    }).catch(function(e){
      bulkBtn.disabled=false;bulkBtn.textContent=prevTxt;
      console.error("Errore 'Applica a tutte':",e);
      alert("Errore nell'applicare la bandiera a tutte le postazioni: "+(e&&e.message?e.message:e)+"\n\nRiprova, e se persiste segnalalo con questo messaggio.");
    });
  });
  bulk.appendChild(bulkBtn);hdr.appendChild(bulk);panel.appendChild(hdr);
  STATIONS.forEach(s=>{
    const row=document.createElement("div");row.className="station-row";
    const dot=document.createElement("div");dot.className="station-flag-dot";dot.style.background=FLAG_COLORS[flags[s.num]||"verde"];row.appendChild(dot);
    const nm=document.createElement("div");nm.className="station-name";
    nm.innerHTML=`${s.name} <span class="station-num">P.${s.num}</span>`;row.appendChild(nm);
    const sel=document.createElement("select");sel.className="flag-select";
    [["verde","\uD83D\uDFE2 Verde"],["gialla","\uD83D\uDFE1 Gialla"],["rossa","\uD83D\uDD34 Rossa"]].forEach(([v,l])=>{
      const o=document.createElement("option");o.value=v;o.textContent=l;
      if((flags[s.num]||"verde")===v)o.selected=true;sel.appendChild(o);
    });
    sel.addEventListener("change",()=>{
      var prevVal=flags[s.num]||"verde";
      var newVal=sel.value;
      dot.style.background=FLAG_COLORS[newVal];
      sel.disabled=true;
      setFlag(s.num,newVal).then(function(){
        sel.disabled=false;
      }).catch(function(e){
        sel.disabled=false;
        sel.value=prevVal;dot.style.background=FLAG_COLORS[prevVal];
        console.error("Errore cambio bandiera P."+s.num+":",e);
        alert("Errore nel cambiare la bandiera di P."+s.num+": "+(e&&e.message?e.message:e)+"\n\nRiprova, e se persiste segnalalo con questo messaggio.");
      });
    });
    row.appendChild(sel);panel.appendChild(row);
  });
  page.appendChild(panel);
}
