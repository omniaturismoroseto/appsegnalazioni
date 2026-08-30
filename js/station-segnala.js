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
  let tipo = "";
  let sotto = "";
  let note = "";
  let foto = null;

  const wrap = document.createElement("div");
  wrap.className = "seg-wrap";

  const indietro = document.createElement("button");
  indietro.type = "button";
  indietro.className = "seg-indietro";
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

  // ---- Cosa e' successo: un elenco solo ----
  // Chi segnala sceglie il fatto, non la categoria. Emergenza e pericolo
  // restano attaccati alla voce - servono alle regole del database, al colore
  // sulla mappa e a chi viene avvisato - ma non sono piu' una domanda da fare a
  // un bagnino che ha fretta: erano due tocchi per dire una cosa sola. La
  // gravita' si legge dal colore del riquadro, che e' piu' immediato di
  // un'etichetta da scegliere.
  const sottoTitolo = document.createElement("label");
  sottoTitolo.className = "seg-titolo";
  sottoTitolo.textContent = "Cosa è successo";
  wrap.appendChild(sottoTitolo);

  const griglia = document.createElement("div");
  griglia.className = "seg-griglia";
  wrap.appendChild(griglia);

  const voci = [];
  Object.keys(TYPES).forEach(function (k) {
    TYPES[k].sub.forEach(function (testo) { voci.push({ tipo: k, testo: testo }); });
  });

  const riquadri = voci.map(function (v) {
    const b = document.createElement("button");
    b.type = "button";
    b.className = "seg-voce seg-voce--" + v.tipo;
    b.setAttribute("aria-pressed", "false");
    b.innerHTML = '<span class="seg-voce__gravita">' + TYPES[v.tipo].label + '</span>'
      + '<span class="seg-voce__testo">' + v.testo + '</span>';
    b.addEventListener("click", function () {
      tipo = v.tipo;
      sotto = v.testo;
      riquadri.forEach(function (altro) {
        const scelto = altro === b;
        altro.classList.toggle("is-scelta", scelto);
        altro.setAttribute("aria-pressed", scelto ? "true" : "false");
      });
    });
    griglia.appendChild(b);
    return b;
  });

  // ---- Dettagli ----
  const lblNote = document.createElement("label");
  lblNote.className = "seg-titolo";
  lblNote.textContent = "Descrizione (opzionale)";
  wrap.appendChild(lblNote);
  const noteEl = document.createElement("textarea");
  noteEl.className = "seg-note";
  noteEl.rows = 3;
  noteEl.placeholder = "Aggiungi dettagli utili a chi interviene...";
  wrap.appendChild(noteEl);

  // ---- Foto: sempre scatto diretto ----
  const lblFoto = document.createElement("label");
  lblFoto.className = "seg-titolo";
  lblFoto.textContent = "Foto (opzionale)";
  wrap.appendChild(lblFoto);
  const fotoInput = document.createElement("input");
  fotoInput.type = "file";
  fotoInput.accept = "image/*";
  fotoInput.setAttribute("capture", "environment");
  fotoInput.className = "seg-foto";
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
  invia.className = "btn-primary seg-invia";
  invia.textContent = "Invia segnalazione";
  invia.addEventListener("click", function () {
    note = noteEl.value;
    // tipo e sotto vengono impostati insieme dal riquadro scelto: controllarli
    // entrambi evita di inviare una segnalazione senza gravita, che le regole
    // del database rifiuterebbero con un errore incomprensibile.
    if (!sotto || !tipo) { alert("Tocca cosa è successo."); return; }
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
