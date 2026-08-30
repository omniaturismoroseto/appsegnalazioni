// Segnalazione dal pannello di postazione.
//
// E' una schermata a se', non la stessa dell'app pubblica, e la differenza non
// e' estetica: chi segnala qui e' un bagnino in servizio, non un bagnante.
// Quindi niente numero di telefono da lasciare (la postazione e' gia'
// identificata), niente consenso privacy da spuntare (non ci sono dati
// personali di chi segnala), niente attesa del GPS - la posizione della
// postazione e' nota e non ha bisogno di essere rilevata - e la foto si scatta
// sul momento, mai dalla galleria.
//
// Vive in un file suo perche' le due app non devono potersi rompere a vicenda:
// modificare il modulo delle pagine pubbliche non deve poter toccare cio' che
// un bagnino vede in servizio. Cio' che resta in comune e' solo il modo di
// mandare il dato al server (addReport), che e' il punto in cui le due app si
// parlano davvero.
import { STATIONS, TYPES, addReport, render, resizeImg, stationMode } from "./core.js";

function _etichettaPostazione() {
  const num = String(stationMode || "");
  const st = STATIONS.find(function (s) { return String(s.num) === num; });
  return "P." + num + (st ? " – " + st.name : "");
}

export function renderSegnalaPostazione(page) {
  let tipo = "pericolo";
  let sotto = "";
  let note = "";
  let foto = null;

  const wrap = document.createElement("div");

  const indietro = document.createElement("button");
  indietro.type = "button";
  indietro.style.cssText = "width:auto;background:none;border:none;color:var(--text2);font-size:13px;padding:0;margin-bottom:14px;cursor:pointer";
  indietro.textContent = "← Torna al pannello";
  indietro.addEventListener("click", function () { render("station"); });
  wrap.appendChild(indietro);

  const titolo = document.createElement("h2");
  titolo.style.cssText = "font-size:19px;margin:0 0 2px";
  titolo.textContent = "Nuova segnalazione";
  wrap.appendChild(titolo);

  const da = document.createElement("p");
  da.style.cssText = "font-size:13px;color:var(--text2);margin:0 0 16px";
  da.textContent = "Da " + _etichettaPostazione();
  wrap.appendChild(da);

  // ---- Tipo: emergenza o pericolo ----
  const tipoRiga = document.createElement("div");
  tipoRiga.style.cssText = "display:flex;gap:8px;margin-bottom:14px";
  const bottoniTipo = {};
  Object.keys(TYPES).forEach(function (k) {
    const b = document.createElement("button");
    b.type = "button";
    b.textContent = TYPES[k].label;
    b.style.cssText = "flex:1;padding:12px;font-size:14px;font-weight:700;border-radius:var(--radius);border:2px solid var(--border2);background:var(--bg2);color:var(--text);cursor:pointer";
    b.addEventListener("click", function () { tipo = k; sotto = ""; aggiorna(); });
    bottoniTipo[k] = b;
    tipoRiga.appendChild(b);
  });
  wrap.appendChild(tipoRiga);

  // ---- Cosa e' successo ----
  const sottoTitolo = document.createElement("label");
  sottoTitolo.textContent = "Cosa è successo";
  wrap.appendChild(sottoTitolo);
  const sottoRiga = document.createElement("div");
  sottoRiga.style.cssText = "display:flex;flex-direction:column;gap:6px;margin-bottom:14px";
  wrap.appendChild(sottoRiga);

  function aggiorna() {
    Object.keys(bottoniTipo).forEach(function (k) {
      const attivo = k === tipo;
      bottoniTipo[k].style.borderColor = attivo ? (k === "emergenza" ? "var(--danger-text)" : "#d97706") : "var(--border2)";
      bottoniTipo[k].style.background = attivo ? (k === "emergenza" ? "var(--danger-bg)" : "var(--warning-bg)") : "var(--bg2)";
    });
    sottoRiga.innerHTML = "";
    TYPES[tipo].sub.forEach(function (s) {
      const b = document.createElement("button");
      b.type = "button";
      b.textContent = s;
      b.style.cssText = "width:100%;text-align:left;padding:11px 13px;font-size:13.5px;border-radius:var(--radius);cursor:pointer;"
        + "border:2px solid " + (sotto === s ? "var(--accent,#2563eb)" : "var(--border2)") + ";"
        + "background:" + (sotto === s ? "var(--info-bg,var(--bg2))" : "var(--bg2)") + ";color:var(--text)";
      b.addEventListener("click", function () { sotto = s; aggiorna(); });
      sottoRiga.appendChild(b);
    });
  }
  aggiorna();

  // ---- Dettagli ----
  const lblNote = document.createElement("label");
  lblNote.innerHTML = "Descrizione <span style=\"font-size:11px;color:var(--text3);font-weight:400\">(opzionale)</span>";
  wrap.appendChild(lblNote);
  const noteEl = document.createElement("textarea");
  noteEl.rows = 3;
  noteEl.placeholder = "Aggiungi dettagli utili a chi interviene...";
  wrap.appendChild(noteEl);

  // ---- Foto: sempre scatto diretto ----
  const lblFoto = document.createElement("label");
  lblFoto.textContent = "Foto (opzionale)";
  wrap.appendChild(lblFoto);
  const fotoInput = document.createElement("input");
  fotoInput.type = "file";
  fotoInput.accept = "image/*";
  fotoInput.setAttribute("capture", "environment");
  fotoInput.style.cssText = "font-size:12px;color:var(--text2);width:100%";
  const anteprima = document.createElement("img");
  anteprima.style.cssText = "display:none;max-width:100%;max-height:180px;border-radius:10px;margin-top:8px";
  fotoInput.addEventListener("change", function () {
    const f = fotoInput.files && fotoInput.files[0];
    if (!f) return;
    // resizeImg sta in core.js: e' fondamenta condivise, non una schermata.
    resizeImg(f, function (dataUri) {
      foto = dataUri;
      anteprima.src = dataUri;
      anteprima.style.display = "block";
    });
  });
  wrap.appendChild(fotoInput);
  wrap.appendChild(anteprima);

  const invia = document.createElement("button");
  invia.className = "btn-primary";
  invia.style.marginTop = "18px";
  invia.textContent = "Invia segnalazione";
  invia.addEventListener("click", function () {
    note = noteEl.value;
    if (!sotto) { alert("Seleziona cosa è successo."); return; }
    invia.disabled = true;
    invia.textContent = "Invio...";
    const etichetta = _etichettaPostazione();
    // Stessa forma del dato che manda l'app pubblica: e' il contratto con il
    // server, e cambiarlo qui romperebbe dashboard e mappa.
    const r = {
      id: Date.now(),
      type: tipo,
      sub: sotto,
      zone: etichetta,
      notes: note,
      author: etichetta,
      phone: null,
      role: "station",
      ts: new Date().toISOString(),
      status: "aperta",
      photo: foto || null,
      gps: null,
    };
    addReport(r).then(function () {
      render("segnala-fatto");
    }).catch(function (e) {
      invia.disabled = false;
      invia.textContent = "Invia segnalazione";
      alert("Errore: " + e.message);
    });
  });
  wrap.appendChild(invia);

  const nota = document.createElement("p");
  nota.style.cssText = "font-size:11px;color:var(--text3);text-align:center;margin-top:10px";
  nota.textContent = "Per un'emergenza in corso usa il pulsante EMERGENZA del pannello: avvisa subito le postazioni vicine.";
  wrap.appendChild(nota);

  page.appendChild(wrap);
}

export function renderSegnalaFatto(page) {
  const wrap = document.createElement("div");
  wrap.style.cssText = "text-align:center;padding:30px 10px";
  wrap.innerHTML = '<div style="font-size:44px;margin-bottom:10px">✅</div>'
    + '<h2 style="font-size:20px;margin:0 0 6px">Segnalazione inviata</h2>'
    + '<p style="font-size:13.5px;color:var(--text2);line-height:1.5;margin:0 0 20px">Il centro operativo la vede subito nella dashboard.</p>';
  const b = document.createElement("button");
  b.className = "btn-primary";
  b.textContent = "Torna al pannello";
  b.addEventListener("click", function () { render("station"); });
  wrap.appendChild(b);
  page.appendChild(wrap);
}
