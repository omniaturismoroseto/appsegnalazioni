import { FLAG_COLORS, METEO_POINT, STATIONS, flagsData, fmt, fmtDist, nearestDist, nearestStation } from "./core.js";

export function knotsFromKmh(v){return Math.round((Number(v||0))*0.539957);}
export function degToCompass(deg){
  if(deg===undefined||deg===null||isNaN(deg)) return "-";
  const dirs=["N","NE","E","SE","S","SO","O","NO"];
  return dirs[Math.round((((deg%360)+360)%360)/45)%8];
}
export function getRiskFromMeteo(m){
  if(!m) return {level:"n/d",flag:"verde",text:"Dati non disponibili"};
  const wave=Number(m.wave_height||0);
  const windKn=knotsFromKmh(m.wind_speed_10m||0);
  const gustKn=knotsFromKmh(m.wind_gusts_10m||0);
  const weatherCode=Number(m.weather_code||0);
  const thunder=[95,96,99].includes(weatherCode);
  if(thunder || wave>=1.2 || windKn>=22 || gustKn>=28) return {level:"alto",flag:"rossa",text:"Condizioni critiche o potenzialmente pericolose"};
  if(wave>=0.6 || windKn>=12 || gustKn>=18) return {level:"medio",flag:"gialla",text:"Mare mosso o vento sostenuto: attenzione"};
  return {level:"basso",flag:"verde",text:"Condizioni generalmente favorevoli"};
}
export function fmtHour(iso){
  try{return new Date(iso).toLocaleTimeString("it-IT",{hour:"2-digit",minute:"2-digit"});}catch(e){return "--:--";}
}
export async function fetchMeteoMarine(force){
  const now=Date.now();
  if(window.meteoLoading) return;
  if(!force && window.meteoData && (now-window.meteoLastFetch)<20*60*1000) return;
  window.meteoLoading=true; window.meteoError="";
  
  try{
    const forecastUrl = "https://api.open-meteo.com/v1/forecast?latitude="+METEO_POINT.lat+"&longitude="+METEO_POINT.lng+"&current=temperature_2m,weather_code,wind_speed_10m,wind_direction_10m,wind_gusts_10m,precipitation&hourly=temperature_2m,weather_code,wind_speed_10m,wind_direction_10m,wind_gusts_10m,precipitation&timezone=auto&forecast_days=3";
    const marineUrl = "https://marine-api.open-meteo.com/v1/marine?latitude="+METEO_POINT.lat+"&longitude="+METEO_POINT.lng+"&current=wave_height,wave_direction,wave_period,sea_surface_temperature&hourly=wave_height,wave_direction,wave_period,sea_surface_temperature&timezone=auto&forecast_days=2&cell_selection=sea";
    const [forecastRes, marineRes] = await Promise.all([fetch(forecastUrl), fetch(marineUrl)]);
    if(!forecastRes.ok) throw new Error("Forecast HTTP "+forecastRes.status);
    if(!marineRes.ok) throw new Error("Marine HTTP "+marineRes.status);
    const forecast = await forecastRes.json();
    const marine = await marineRes.json();
    const current = Object.assign({}, forecast.current||{}, marine.current||{});
    const times = (forecast.hourly&&forecast.hourly.time)||[];
    const marineTimes = (marine.hourly&&marine.hourly.time)||[];
    const hourly = [];
    const startIdx = times.findIndex(function(t){
      const d = new Date(t).getTime();
      return d >= now-60*60*1000;
    });
    const from = startIdx>=0 ? startIdx : 0;
    for(let i=from;i<Math.min(from+72,times.length);i++){
      const mt = marineTimes.indexOf(times[i]);
      hourly.push({
        time: times[i],
        weather_code: forecast.hourly.weather_code ? forecast.hourly.weather_code[i] : null,
        wind_speed_10m: forecast.hourly.wind_speed_10m ? forecast.hourly.wind_speed_10m[i] : null,
        wind_direction_10m: forecast.hourly.wind_direction_10m ? forecast.hourly.wind_direction_10m[i] : null,
        wind_gusts_10m: forecast.hourly.wind_gusts_10m ? forecast.hourly.wind_gusts_10m[i] : null,
        precipitation: forecast.hourly.precipitation ? forecast.hourly.precipitation[i] : null,
        wave_height: mt>=0 && marine.hourly.wave_height ? marine.hourly.wave_height[mt] : null,
        wave_direction: mt>=0 && marine.hourly.wave_direction ? marine.hourly.wave_direction[mt] : null,
        sea_surface_temperature: mt>=0 && marine.hourly.sea_surface_temperature ? marine.hourly.sea_surface_temperature[mt] : null
      });
    }
    window.meteoData = {
      current: current,
      hourly: hourly,
      risk: getRiskFromMeteo(current),
      updatedAt: new Date().toISOString()
    };
    window.meteoLastFetch = Date.now();
  }catch(err){
    window.meteoError = "Dati meteomarini non disponibili";
  }finally{
    window.meteoLoading=false;
    
  }
}
export function wIcon(kmh){
  if(kmh==null)return"🌬️";
  const n=Math.round((kmh||0)*0.54);
  if(n<4)return"🌀";if(n<11)return"🍃";if(n<17)return"💨";if(n<22)return"🌬️";if(n<34)return"⛵";return"⚡";
}
export function wmoIcon(code){
  if(code==null)return"🌤️";
  if(code<=1)return"☀️";if(code<=3)return"⛅";if(code<=49)return"🌫️";
  if(code<=67)return"🌧️";if(code<=77)return"❄️";if(code<=82)return"🌦️";
  if(code<=86)return"🌨️";return"⛈️";
}
export function renderMeteoCard(page){
  if(window.meteoLoading&&!window.meteoData){
    const c=document.createElement("div");c.className="meteo-card";
    c.innerHTML="<div style='padding:24px;text-align:center;color:var(--text3)'>⏳ Caricamento dati meteomarini...</div>";
    page.appendChild(c);return;
  }
  if(window.meteoError&&!window.meteoData){
    const c=document.createElement("div");c.className="meteo-card";
    c.innerHTML="<div style='padding:16px;text-align:center;color:var(--danger-text)'>⚠️ "+window.meteoError+"</div>";
    page.appendChild(c);return;
  }
  const m=window.meteoData;

  // ── Calcola bandiera da mostrare ──────────────────────────────────────────
  // 1. GPS attivo → bandiera della postazione più vicina
  // 2. GPS non attivo → bandiera più comune tra tutte le postazioni di Roseto
  var displayFlag, displaySource, displaySub, gpsActive=false;

  if(nearestStation && flagsData[nearestStation.num]){
    // GPS attivo: usa bandiera reale della postazione più vicina
    gpsActive=true;
    displayFlag=flagsData[nearestStation.num]||"verde";
    displaySource="📍 P."+nearestStation.num+" – "+nearestStation.name+(nearestDist?" · "+fmtDist(nearestDist):"");
    displaySub=null; // nessun avviso
  } else {
    // GPS non attivo: calcola bandiera più comune tra le postazioni
    var counts={verde:0,gialla:0,rossa:0};
    STATIONS.forEach(function(s){
      var f=flagsData[s.num]||"verde";
      if(counts[f]!==undefined)counts[f]++;
    });
    // Priorità: rossa > gialla > verde (sicurezza prima)
    if(counts.rossa>=counts.gialla&&counts.rossa>=counts.verde) displayFlag="rossa";
    else if(counts.gialla>=counts.verde) displayFlag="gialla";
    else displayFlag="verde";
    var tot=STATIONS.length;
    var pct=Math.round((counts[displayFlag]/tot)*100);
    displaySource="📊 Bandiera prevalente a Roseto ("+pct+"% postazioni)";
    displaySub="⚠️ Attiva il GPS per vedere la bandiera della postazione più vicina a te";
  }

  const risk={flag:displayFlag,level:"",text:displaySource};
  const fc=FLAG_COLORS[risk.flag]||"#27ae60";
  const fEmoji={"verde":"🟢","gialla":"🟡","rossa":"🔴"}[risk.flag]||"🟢";
  const cur=m.current||{};
  const seaT=(cur.sea_surface_temperature!=null?cur.sea_surface_temperature:cur.temperature_2m);

  // Hero bandiera
  const hero=document.createElement("div");
  hero.className="mhero";
  hero.style.cssText="background:linear-gradient(135deg,"+fc+"22,"+fc+"08);border:1.5px solid "+fc+"44;border-radius:var(--radius-lg);padding:18px 16px;margin-bottom:12px;display:flex;align-items:center;gap:14px;position:relative;overflow:hidden";
  hero.innerHTML=
    '<div style="position:absolute;right:-10px;bottom:-10px;font-size:100px;opacity:.06;line-height:1;pointer-events:none">'+fEmoji+'</div>'+
    '<div class="mhero-flag" style="background:'+fc+'28;width:54px;height:54px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:28px;flex-shrink:0;z-index:1">'+fEmoji+'</div>'+
    '<div class="mhero-body" style="flex:1;z-index:1">'+
      '<div class="mhero-name" style="font-size:28px;font-weight:900;line-height:1;margin-bottom:4px;color:'+fc+'">'+String(risk.flag||"verde").toUpperCase()+'</div>'+
      '<div class="mhero-desc" style="font-size:13px;font-weight:600;color:var(--text);margin-bottom:'+(displaySub?"6px":"4px")+'">'+risk.text+'</div>'+
      '<div class="mhero-time" style="font-size:11px;color:var(--text3);margin-bottom:'+( displaySub?"4px":"0")+'">Aggiornato: '+fmt(m.updatedAt)+'</div>'+
      (displaySub?'<div style="font-size:11px;color:#92400e;background:#fef3c7;border:1px solid #fde68a;border-radius:6px;padding:5px 8px;line-height:1.4">'+ displaySub+'</div>':'')
    +'</div>'+
    '<button id="meteo-refresh-btn" type="button" style="background:rgba(0,0,0,.06);border:none;border-radius:50%;width:36px;height:36px;font-size:17px;cursor:pointer;flex-shrink:0;z-index:1">↻</button>';
  page.appendChild(hero);
  hero.querySelector("#meteo-refresh-btn").addEventListener("click",function(){fetchMeteoMarine(true);});

  // Grid 6 dati
  const grid=document.createElement("div");grid.className="meteo-card";
  grid.innerHTML=
    '<div class="meteo-head"><h3>📊 Condizioni ora</h3></div>'+
    '<div class="mgrid3">'+
      '<div class="mstat"><div class="mi">💨</div><div class="mk">Vento</div><div class="mv">'+knotsFromKmh(cur.wind_speed_10m)+'<small style="font-size:11px;font-weight:500"> nd</small></div><div class="ms">'+degToCompass(cur.wind_direction_10m)+'</div></div>'+
      '<div class="mstat"><div class="mi">🌊</div><div class="mk">Onda</div><div class="mv">'+(cur.wave_height!=null?Number(cur.wave_height).toFixed(1):"-")+'<small style="font-size:11px;font-weight:500"> m</small></div><div class="ms">T:'+(cur.wave_period!=null?Math.round(cur.wave_period)+"s":"-")+'</div></div>'+
      '<div class="mstat"><div class="mi">⚡</div><div class="mk">Raffiche</div><div class="mv">'+knotsFromKmh(cur.wind_gusts_10m)+'<small style="font-size:11px;font-weight:500"> nd</small></div><div class="ms">max</div></div>'+
      '<div class="mstat"><div class="mi">🌡️</div><div class="mk">Temp. mare</div><div class="mv">'+(seaT!=null?Number(seaT).toFixed(1):"-")+'<small style="font-size:11px;font-weight:500">°C</small></div><div class="ms">superficie</div></div>'+
      '<div class="mstat"><div class="mi">💧</div><div class="mk">Pioggia</div><div class="mv">'+(cur.precipitation!=null?Number(cur.precipitation).toFixed(1):"-")+'<small style="font-size:11px;font-weight:500"> mm</small></div><div class="ms">ultima ora</div></div>'+
      '<div class="mstat"><div class="mi">↗️</div><div class="mk">Dir. onda</div><div class="mv" style="font-size:16px">'+degToCompass(cur.wave_direction)+'</div><div class="ms">'+(cur.wave_direction!=null?Math.round(cur.wave_direction)+"°":"-")+'</div></div>'+
    '</div>';
  page.appendChild(grid);

  // Grafico barre onda + vento (Canvas)
  if(m.hourly&&m.hourly.length){
    const chartCard=document.createElement("div");chartCard.className="meteo-card";
    chartCard.innerHTML='<div class="meteo-head"><h3>📈 Prossime 12 ore</h3><div style="display:flex;align-items:center;gap:12px;font-size:10px;color:var(--text3)"><span><span style="display:inline-block;width:10px;height:10px;border-radius:2px;background:#1697e6;margin-right:3px;vertical-align:middle"></span>Onda (m)</span><span><span style="display:inline-block;width:10px;height:3px;background:#F5C800;margin-right:3px;vertical-align:middle"></span>Vento (nd)</span></div></div>';
    const canvas=document.createElement("canvas");
    canvas.height=110;
    canvas.style.cssText="width:100%;display:block";
    chartCard.appendChild(canvas);
    page.appendChild(chartCard);

    // Disegna grafico dopo mount
    setTimeout(function(){
      canvas.width=canvas.offsetWidth||canvas.parentElement.offsetWidth||320;
      const W=canvas.width, H=canvas.height;
      const ctx=canvas.getContext("2d");
      const hrs=m.hourly.slice(0,12);
      const PAD={t:10,r:8,b:28,l:36};
      const gW=W-PAD.l-PAD.r, gH=H-PAD.t-PAD.b;

      // Scala onda (barre)
      const waves=hrs.map(function(h){return h.wave_height!=null?Number(h.wave_height):0;});
      const winds=hrs.map(function(h){return knotsFromKmh(h.wind_speed_10m);});
      const maxWave=Math.max.apply(null,waves.concat([0.5]));
      const maxWind=Math.max.apply(null,winds.concat([5]));

      const barW=gW/hrs.length;

      // Griglia orizzontale
      ctx.strokeStyle="rgba(0,0,0,.06)";ctx.lineWidth=1;
      [0.25,0.5,0.75,1].forEach(function(f){
        const y=PAD.t+gH*(1-f);
        ctx.beginPath();ctx.moveTo(PAD.l,y);ctx.lineTo(PAD.l+gW,y);ctx.stroke();
      });

      // Barre onda
      hrs.forEach(function(h,i){
        const wv=h.wave_height!=null?Number(h.wave_height):0;
        const x=PAD.l+i*barW+barW*0.12;
        const bw=barW*0.52;
        const bh=(wv/maxWave)*gH;
        const y=PAD.t+gH-bh;
        // Colore barra per rischio
        const wnd=knotsFromKmh(h.wind_speed_10m);
        var col= (wv>2||wnd>25)?"#e74c3c":(wv>1||wnd>15)?"#F5C800":"#1697e6";
        ctx.fillStyle=col+"cc";
        // Arrotondamento sopra
        const r=Math.min(4,bw/2,bh);
        ctx.beginPath();
        ctx.moveTo(x+r,y);
        ctx.lineTo(x+bw-r,y);
        ctx.quadraticCurveTo(x+bw,y,x+bw,y+r);
        ctx.lineTo(x+bw,y+bh);
        ctx.lineTo(x,y+bh);
        ctx.lineTo(x,y+r);
        ctx.quadraticCurveTo(x,y,x+r,y);
        ctx.closePath();
        ctx.fill();
      });

      // Linea vento (sopra le barre)
      ctx.strokeStyle="#F5C800";ctx.lineWidth=2.5;ctx.lineJoin="round";
      ctx.beginPath();
      hrs.forEach(function(h,i){
        const wnd=knotsFromKmh(h.wind_speed_10m);
        const cx=PAD.l+i*barW+barW*0.5;
        const cy=PAD.t+gH-(wnd/maxWind)*gH*0.9;
        if(i===0) ctx.moveTo(cx,cy); else ctx.lineTo(cx,cy);
      });
      ctx.stroke();
      // Punti linea vento
      hrs.forEach(function(h,i){
        const wnd=knotsFromKmh(h.wind_speed_10m);
        const cx=PAD.l+i*barW+barW*0.5;
        const cy=PAD.t+gH-(wnd/maxWind)*gH*0.9;
        ctx.fillStyle="#F5C800";
        ctx.beginPath();ctx.arc(cx,cy,3,0,Math.PI*2);ctx.fill();
      });

      // Asse Y onda (sinistra)
      ctx.fillStyle="rgba(0,0,0,.35)";ctx.font="10px sans-serif";ctx.textAlign="right";
      [0,maxWave*0.5,maxWave].forEach(function(v){
        const y=PAD.t+gH-(v/maxWave)*gH;
        ctx.fillText(v.toFixed(1)+"m",PAD.l-4,y+3);
      });

      // Etichette ore (basso)
      ctx.fillStyle="rgba(0,0,0,.4)";ctx.textAlign="center";ctx.font="9px sans-serif";
      hrs.forEach(function(h,i){
        if(i%2!==0)return; // ogni 2 ore
        const cx=PAD.l+i*barW+barW*0.5;
        ctx.fillText(fmtHour(h.time),cx,H-6);
      });
    },60);
  }
}

// Cancellazione differita delle foto dei casi minore chiusi da oltre il TTL (sicurezza in caso di chiusura senza foto azzerata)
