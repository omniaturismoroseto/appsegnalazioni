import { FLAG_COLORS, STATIONS, TYPES, _openNoteModal, addReport, flagsData, fmt, render, setFlag, stationEmergenciesRef, stationMode, stationNotesData } from "./core.js";
import { renderChatPanel } from "./chat.js";

export function _stationNeighborsClient(num){
  var ordered=STATIONS.slice().sort(function(a,b){return a.lat-b.lat;});
  var idx=ordered.findIndex(function(s){return String(s.num)===String(num);});
  if(idx===-1)return{north:[],south:[]};
  return{south:ordered.slice(Math.max(0,idx-2),idx),north:ordered.slice(idx+1,idx+3)};
}

export function _sendStationEmergency(num,zoneStr){
  const r={id:Date.now(),type:"emergenza",sub:"Allarme rapido",
    notes:"🚨 Allarme EMERGENZA inviato dal pulsante rapido della postazione",
    zone:zoneStr,author:"Postazione P."+num,phone:null,role:"station",quickAlert:true,
    ts:new Date().toISOString(),status:"aperta",photo:null,gps:null};
  return Promise.all([
    addReport(r),
    stationEmergenciesRef.push({station:String(num),ts:Date.now()})
  ]);
}

export function renderStationPanel(page){
  const num=stationMode;

  if(window._stationChatOpen){
    const chatWrap=document.createElement("div");chatWrap.style.cssText="padding-bottom:110px";
    const back=document.createElement("button");back.className="back-btn";back.textContent="← Torna alla postazione";
    back.addEventListener("click",function(){window._stationChatOpen=false;render("station");});
    chatWrap.appendChild(back);
    renderChatPanel(chatWrap,{isStation:true});
    page.appendChild(chatWrap);
    return;
  }

  const st=STATIONS.find(s=>String(s.num)===String(num));
  const stName=st?st.name:"";
  const zoneStr="P."+num+" – "+stName;
  const flagColor=flagsData[num]||"verde";
  const note=stationNotesData[String(num)];
  const openReports=Object.values(window.reportsData||{}).filter(r=>r&&r.status==="aperta"&&r.zone===zoneStr);

  const wrap=document.createElement("div");wrap.style.cssText="padding-bottom:110px";

  // Header
  const hdr=document.createElement("div");
  hdr.style.cssText="background:#D62B1F;color:#fff;border-radius:var(--radius-lg);padding:14px 16px 12px;margin-bottom:10px;display:flex;justify-content:space-between;align-items:baseline";
  const hdrTitle=document.createElement("span");hdrTitle.style.cssText="font-size:19px;font-weight:700";
  hdrTitle.textContent="P."+num+" · "+stName;
  const hdrClock=document.createElement("span");hdrClock.id="_stClock";hdrClock.style.cssText="font-size:13px;opacity:.85";
  hdrClock.textContent=new Date().toLocaleTimeString("it-IT",{hour:"2-digit",minute:"2-digit"});
  hdr.appendChild(hdrTitle);hdr.appendChild(hdrClock);wrap.appendChild(hdr);

  const grid=document.createElement("div");
  grid.style.cssText="display:grid;grid-template-columns:1fr 1fr;gap:6px";

  // Tile BANDIERA
  const flagLabels={verde:"VERDE",gialla:"GIALLA",rossa:"ROSSA"};
  const flagTile=document.createElement("button");
  flagTile.type="button";
  flagTile.style.cssText="grid-column:span 2;background:"+FLAG_COLORS[flagColor]+";color:#fff;border:none;border-radius:4px;padding:14px 16px;text-align:left;display:flex;flex-direction:column;justify-content:space-between;min-height:96px;cursor:pointer";
  flagTile.innerHTML='<span style="font-size:14px;font-weight:700;opacity:.9">BANDIERA</span>'
    +'<span><span style="font-size:28px;font-weight:700;display:block">'+flagLabels[flagColor]+'</span>'
    +'<span style="font-size:13px;opacity:.9">tocca per cambiare</span></span>';
  const flagChooser=document.createElement("div");
  flagChooser.style.cssText="grid-column:span 2;display:none;grid-template-columns:1fr 1fr 1fr;gap:6px;margin-top:-2px";
  [["verde","VERDE"],["gialla","GIALLA"],["rossa","ROSSA"]].forEach(function([v,l]){
    const b=document.createElement("button");b.type="button";
    b.style.cssText="background:"+FLAG_COLORS[v]+";color:#fff;border:none;border-radius:4px;padding:14px 4px;font-weight:700;font-size:13px;cursor:pointer"+(v===flagColor?";outline:3px solid #0b0b0b;outline-offset:-3px":"");
    b.textContent=l;
    b.addEventListener("click",function(){
      setFlag(num,v).catch(function(e){alert("Errore: "+e.message);});
      flagChooser.style.display="none";
    });
    flagChooser.appendChild(b);
  });
  flagTile.addEventListener("click",function(){
    flagChooser.style.display=flagChooser.style.display==="none"?"grid":"none";
  });
  grid.appendChild(flagTile);grid.appendChild(flagChooser);

  // Tile SEGNALAZIONI + SEGNALA
  const repTile=document.createElement("button");repTile.type="button";
  repTile.style.cssText="background:#1A3B8C;color:#fff;border:none;border-radius:4px;padding:14px 16px;text-align:left;display:flex;flex-direction:column;justify-content:space-between;min-height:96px;cursor:pointer";
  repTile.innerHTML='<span style="font-size:14px;font-weight:700;opacity:.9">SEGNALAZIONI</span>'
    +'<span><span style="font-size:26px;font-weight:700;display:block">'+openReports.length+'</span>'
    +'<span style="font-size:13px;opacity:.9">apert'+(openReports.length===1?"a":"e")+'</span></span>';
  const repList=document.createElement("div");
  repList.style.cssText="grid-column:span 2;display:none;flex-direction:column;gap:6px";
  repTile.addEventListener("click",function(){
    repList.style.display=repList.style.display==="none"?"flex":"none";
  });

  const segTile=document.createElement("button");segTile.type="button";
  segTile.style.cssText="background:#D62B1F;color:#fff;border:none;border-radius:4px;padding:14px 16px;text-align:left;display:flex;flex-direction:column;justify-content:space-between;min-height:96px;cursor:pointer";
  segTile.innerHTML='<span style="font-size:16px;font-weight:700">🚨</span><span style="font-size:20px;font-weight:700">SEGNALA</span>';
  segTile.addEventListener("click",function(){window.activeStation=zoneStr;render("submit");});

  grid.appendChild(repTile);grid.appendChild(segTile);
  grid.appendChild(repList);
  openReports.forEach(function(r){
    const card=document.createElement("div");
    card.style.cssText="background:var(--bg2);border:1px solid var(--border);border-radius:8px;padding:10px 12px";
    const topRow=document.createElement("div");topRow.style.cssText="display:flex;gap:6px;align-items:center;margin-bottom:3px";
    const badge=document.createElement("span");badge.className="badge badge-"+r.type;badge.style.fontSize="10.5px";badge.textContent=TYPES[r.type].label.toUpperCase();
    const subEl=document.createElement("span");subEl.style.cssText="font-size:12.5px;font-weight:600";subEl.textContent=r.sub;
    topRow.appendChild(badge);topRow.appendChild(subEl);
    const metaEl=document.createElement("div");metaEl.style.cssText="font-size:12px;color:var(--text2)";
    metaEl.textContent=fmt(r.ts)+(r.notes?" · "+r.notes:"");
    card.appendChild(topRow);card.appendChild(metaEl);
    repList.appendChild(card);
  });

  // Fascia NOTA POSTAZIONE
  const noteBar=document.createElement("button");noteBar.type="button";
  noteBar.style.cssText="grid-column:span 2;background:#333;color:#fff;border:none;border-radius:4px;padding:9px 14px;display:flex;align-items:center;justify-content:space-between;cursor:pointer;text-align:left";
  const noteBarLbl=document.createElement("span");noteBarLbl.style.cssText="font-size:12px;font-weight:700;opacity:.9";noteBarLbl.textContent="NOTA POSTAZIONE";
  const noteBarVal=document.createElement("span");noteBarVal.style.cssText="font-size:12px;opacity:.85";
  noteBarVal.textContent=note?String(note).substring(0,40)+(note.length>40?"...":""):"nessuna nota · tocca per aggiungere";
  noteBar.appendChild(noteBarLbl);noteBar.appendChild(noteBarVal);
  noteBar.addEventListener("click",function(){_openNoteModal(num,stName,note);});
  grid.appendChild(noteBar);

  // Tile METEO E DIARIO (placeholder in attesa dell'integrazione dati reale)
  const meteoTile=document.createElement("div");
  meteoTile.style.cssText="grid-column:span 2;background:#0ea5e9;color:#fff;border-radius:4px;padding:14px 16px;display:flex;flex-direction:column;justify-content:space-between;min-height:96px";
  meteoTile.innerHTML='<span style="font-size:14px;font-weight:700;opacity:.9">METEO E DIARIO</span>'
    +'<span style="font-size:15px;opacity:.85">Dati non ancora collegati</span>';
  grid.appendChild(meteoTile);

  // Tile CHAT e COMUNICAZIONE RADIO: due porte sulla stessa schermata, dove
  // convivono i messaggi scritti e quelli vocali. La radio non e' un canale a
  // parte - i vocali viaggiano nella stessa chat e vengono riprodotti da soli
  // sui dispositivi di postazione (vedi ChatAudioService nel progetto Android).
  const tileStyle="background:#4a4a46;color:#fff;border:none;border-radius:4px;padding:14px 16px;text-align:left;display:flex;flex-direction:column;justify-content:space-between;min-height:96px;cursor:pointer";
  const chatTile=document.createElement("button");chatTile.type="button";
  chatTile.style.cssText=tileStyle;
  chatTile.innerHTML='<span style="font-size:14px;font-weight:700">💬 CHAT</span><span style="font-size:13.5px">con tutte le postazioni</span>';
  chatTile.addEventListener("click",function(){window._stationChatOpen=true;render("station");});
  const wtTile=document.createElement("button");wtTile.type="button";
  wtTile.style.cssText=tileStyle;
  wtTile.innerHTML='<span style="font-size:14px;font-weight:700">🎙️ COMUNICAZIONE RADIO</span><span style="font-size:13.5px">messaggi vocali</span>';
  wtTile.addEventListener("click",function(){window._stationChatOpen=true;render("station");});
  grid.appendChild(chatTile);grid.appendChild(wtTile);

  wrap.appendChild(grid);
  page.appendChild(wrap);

  // Barra EMERGENZA fissa in basso, tieni-premuto per confermare l'invio
  let emBar=document.getElementById("_stEmergencyBar");
  if(!emBar){
    emBar=document.createElement("div");emBar.id="_stEmergencyBar";
    emBar.style.cssText="position:fixed;left:0;right:0;bottom:0;z-index:500;padding:10px 16px calc(10px + env(safe-area-inset-bottom));background:#0b0b0b";
    document.body.appendChild(emBar);
  }
  emBar.innerHTML="";
  const emBtn=document.createElement("button");emBtn.type="button";
  emBtn.style.cssText="position:relative;overflow:hidden;width:100%;max-width:660px;margin:0 auto;display:block;background:#a5140a;color:#fff;text-align:center;padding:20px 18px;border:none;border-radius:4px;font-weight:700;font-size:22px;letter-spacing:.03em;cursor:pointer;-webkit-user-select:none;user-select:none";
  const emFill=document.createElement("div");
  emFill.style.cssText="position:absolute;left:0;top:0;bottom:0;width:0%;background:rgba(255,255,255,.35);transition:width linear";
  const emLabel=document.createElement("span");emLabel.style.cssText="position:relative";emLabel.textContent="⚠️ EMERGENZA — tieni premuto";
  emBtn.appendChild(emFill);emBtn.appendChild(emLabel);
  emBar.appendChild(emBtn);

  const HOLD_MS=1500;
  let holdTimer=null,holdStart=0,sent=false;
  function holdCancel(){
    if(holdTimer){clearTimeout(holdTimer);holdTimer=null;}
    emFill.style.transition="width .15s linear";emFill.style.width="0%";
    emLabel.textContent="⚠️ EMERGENZA — tieni premuto";
  }
  function holdStart_(){
    if(sent)return;
    holdStart=Date.now();
    emFill.style.transition="width "+HOLD_MS+"ms linear";
    requestAnimationFrame(function(){emFill.style.width="100%";});
    emLabel.textContent="Rilascia per annullare…";
    holdTimer=setTimeout(function(){
      sent=true;
      emLabel.textContent="Invio in corso…";
      const {north,south}=_stationNeighborsClient(num);
      _sendStationEmergency(num,zoneStr).then(function(){
        const names=function(arr){return arr.map(function(s){return "P."+s.num;}).join(", ")||"nessuna";};
        emLabel.textContent="✅ Allarme inviato — nord: "+names(north)+" · sud: "+names(south)+" + admin/coordinatore";
        setTimeout(function(){sent=false;holdCancel();},4000);
      }).catch(function(e){
        emLabel.textContent="Errore invio: "+e.message;
        setTimeout(function(){sent=false;holdCancel();},4000);
      });
    },HOLD_MS);
  }
  emBtn.addEventListener("pointerdown",function(e){e.preventDefault();holdStart_();});
  emBtn.addEventListener("pointerup",function(){if(!sent)holdCancel();});
  emBtn.addEventListener("pointerleave",function(){if(!sent)holdCancel();});
  emBtn.addEventListener("pointercancel",function(){if(!sent)holdCancel();});

  if(!window._stClockInterval){
    window._stClockInterval=setInterval(function(){
      var el=document.getElementById("_stClock");
      if(el)el.textContent=new Date().toLocaleTimeString("it-IT",{hour:"2-digit",minute:"2-digit"});
    },15000);
  }
}

// BANDIERE
