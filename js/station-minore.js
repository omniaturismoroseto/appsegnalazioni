// Protocollo "persona o minore smarrito" per le postazioni.
//
// Non e' una schermata come le altre: e' una procedura d'emergenza tradotta in
// domande. Chi la usa ha davanti una famiglia nel panico, e ogni scelta fatta
// qui dentro serve a fargli guadagnare secondi.
//
// Tre cose ne spiegano la forma:
//
//  - L'ordine delle domande e' quello del protocollo, e non e' casuale. La
//    prima e' "dov'era", perche' se la risposta e' "in acqua" la chiamata al
//    coordinatore e al 112 deve partire subito, prima di raccogliere il resto.
//    Per questo da quel momento i pulsanti di chiamata restano in cima a ogni
//    passo, invece di aspettare la fine.
//  - Si risponde toccando dove si puo' e si scrive solo dove serve davvero: un
//    nome e un numero di telefono non si possono indovinare, il resto si'.
//  - Il messaggio lo compone l'app, non il bagnino. Dettare un annuncio chiaro
//    mentre qualcuno urla e' proprio la cosa che riesce peggio.
import { STATIONS, addReport, emergencyContactsRef, render, resizeImg, stationMode } from "./core.js";
import { inviaInChat } from "./chat.js";

const MAX_TESTO_CHAT = 500;   // limite imposto dalle regole del database
const ULTIMO_PASSO = 5;       // dopo c'e' solo la conferma di invio

// Lo stato vive fuori dalla funzione di disegno perche' render() ricostruisce
// la pagina da zero a ogni passo: le risposte gia' date non devono sparire.
let passo = 0;
let dati = _vuoto();

function _vuoto() {
  return { inAcqua: null, minuti: "", nome: "", eta: "", costume: "", aspetto: "", genitore: "", telefono: "", riferimento: "", foto: null };
}

// La voce "Persona / Minore disperso" chiama questa: ogni ricerca riparte
// pulita, non deve mai portarsi dietro i dati di quella prima.
export function avviaProtocolloMinore() {
  passo = 0;
  dati = _vuoto();
  render("minore-protocollo");
}

function _postazione() {
  const num = String(stationMode || "");
  const st = STATIONS.find(function (s) { return String(s.num) === num; });
  return "P." + num + (st ? " – " + st.name : "");
}

function _chiama(numero) {
  const tel = String(numero || "").replace(/[^+0-9]/g, "");
  if (!tel) { alert("Numero non disponibile."); return; }
  window.location.href = "tel:" + tel;
}

// I numeri dei responsabili non stanno scritti qui: si leggono dal centro
// operativo, cosi' cambiarli non richiede di aggiornare i tablet.
function _chiamaContatto(ruolo) {
  emergencyContactsRef.child(ruolo).child("phone").once("value").then(function (snap) {
    const tel = String(snap.val() || "");
    if (!tel) { alert("Il numero non è impostato nel centro operativo."); return; }
    _chiama(tel);
  }).catch(function () { alert("Non riesco a leggere il numero."); });
}

// Il messaggio che parte sul gruppo, nell'ordine che serve a chi cerca: prima
// dove e da quanto, poi chi e com'e' vestito, infine chi contattare.
export function componiMessaggio() {
  const righe = [];
  righe.push("🚨 PERSONA/MINORE SMARRITO — " + _postazione());
  if (dati.inAcqua === true) righe.push("⚠️ ULTIMA POSIZIONE: IN ACQUA — allerta massima");
  else if (dati.inAcqua === false) righe.push("Ultima posizione: a riva (camminava/giocava)");
  if (dati.minuti) righe.push("Non lo vedono da: " + dati.minuti);
  const chi = [dati.nome, dati.eta ? dati.eta + " anni" : ""].filter(Boolean).join(", ");
  if (chi) righe.push("Chi: " + chi);
  if (dati.costume) righe.push("Costume: " + dati.costume);
  if (dati.aspetto) righe.push("Aspetto: " + dati.aspetto);
  const contatto = [dati.genitore, dati.telefono].filter(Boolean).join(" — ");
  if (contatto) righe.push("Con chi era: " + contatto);
  if (dati.riferimento) righe.push("Riferimento: " + dati.riferimento);
  // Il taglio e' l'ultima difesa: le regole del database rifiuterebbero un
  // messaggio piu' lungo, e un rifiuto qui vorrebbe dire nessun avviso.
  return righe.join("\n").slice(0, MAX_TESTO_CHAT);
}

// ---- pezzi di interfaccia ----

function _titolo(testo, sotto) {
  const h = document.createElement("div");
  h.className = "min-testa";
  h.innerHTML = '<div class="min-passo">Passo ' + (passo + 1) + ' di ' + (ULTIMO_PASSO + 1) + '</div>'
    + '<h2 class="min-titolo">' + testo + '</h2>'
    + (sotto ? '<p class="min-sotto">' + sotto + '</p>' : "");
  return h;
}

function _scelte(opzioni) {
  const g = document.createElement("div");
  g.className = "min-scelte";
  opzioni.forEach(function (o) {
    const b = document.createElement("button");
    b.type = "button";
    b.className = "min-scelta" + (o.grave ? " min-scelta--grave" : "");
    b.innerHTML = '<span class="min-scelta__icona">' + o.icona + '</span><span>' + o.testo + '</span>';
    b.addEventListener("click", o.azione);
    g.appendChild(b);
  });
  return g;
}

function _campo(etichetta, chiave, opzioni) {
  opzioni = opzioni || {};
  const w = document.createElement("div");
  w.className = "min-campo";
  const l = document.createElement("label");
  l.className = "min-campo__label";
  l.textContent = etichetta;
  const i = document.createElement("input");
  i.type = opzioni.tipo || "text";
  i.className = "min-campo__input";
  i.value = dati[chiave] || "";
  if (opzioni.esempio) i.placeholder = opzioni.esempio;
  if (opzioni.max) i.maxLength = opzioni.max;
  // Si salva a ogni tasto: se il bagnino torna indietro a correggere un passo,
  // quello che aveva gia' scritto e' ancora li'.
  i.addEventListener("input", function () { dati[chiave] = i.value; });
  w.appendChild(l);
  w.appendChild(i);
  return w;
}

function _avanti(contenitore, etichetta, azione) {
  const b = document.createElement("button");
  b.type = "button";
  b.className = "btn-primary min-avanti";
  b.textContent = etichetta || "Avanti";
  b.addEventListener("click", azione || function () { passo++; render("minore-protocollo"); });
  contenitore.appendChild(b);
  return b;
}

function _indietro(contenitore) {
  const b = document.createElement("button");
  b.type = "button";
  b.className = "min-indietro";
  b.textContent = passo === 0 ? "← Annulla" : "← Indietro";
  b.addEventListener("click", function () {
    if (passo === 0) { render("station"); return; }
    passo--;
    render("minore-protocollo");
  });
  contenitore.appendChild(b);
}

// Le chiamate che contano, sempre nello stesso ordine e sempre nello stesso
// posto: chi le ha usate una volta le ritrova senza doverle cercare.
//
// Il 1530 della Guardia Costiera non c'e': non e' piu' in uso, e un numero che
// non risponde e' peggio di un pulsante in meno - farebbe perdere il tempo che
// tutta questa procedura serve a guadagnare.
function _pulsantiChiamata() {
  const riga = document.createElement("div");
  riga.className = "min-chiamate";
  [
    { t: "Coordinatore", a: function () { _chiamaContatto("coordinator"); } },
    { t: "Responsabile", a: function () { _chiamaContatto("admin"); } },
    { t: "112", a: function () { _chiama("112"); } },
  ].forEach(function (c) {
    const b = document.createElement("button");
    b.type = "button";
    b.className = "min-chiamata";
    b.innerHTML = '<span class="min-scelta__icona">📞</span><span>' + c.t + '</span>';
    b.addEventListener("click", c.a);
    riga.appendChild(b);
  });
  return riga;
}

// La prima cosa che il bagnino legge non e' una domanda, e' cosa dire.
//
// Chi arriva a chiedere aiuto sta gia' correndo e parlando sopra a tutti: se
// la prima schermata fosse subito un modulo da riempire, la raccolta dei dati
// partirebbe male e piu' lenta. Una frase pronta da ripetere costa mezzo
// secondo di lettura e cambia il tono di tutta la conversazione che segue -
// per questo sta sopra la domanda, non sotto.
function _riquadroCalma() {
  const box = document.createElement("div");
  box.className = "min-calma";
  box.innerHTML = '<div class="min-calma__titolo">🤝 Prima di tutto: tranquillizzalo</div>'
    + '<p class="min-calma__frase">«Stia tranquillo, ci pensiamo noi: quasi sempre li ritroviamo '
    + 'in pochi minuti. Mi risponda a due domande veloci e resti qui con me.»</p>'
    + '<p class="min-calma__nota">Tono cordiale e calmo, senza fretta nella voce.</p>';
  return box;
}

// Il riquadro rosso: compare appena si sa che la persona era in acqua e resta
// fino alla fine, perche' in quel caso il protocollo dice di chiamare prima di
// aver finito di raccogliere i dati.
function _riquadroUrgenza() {
  const box = document.createElement("div");
  box.className = "min-urgenza";
  box.innerHTML = '<div class="min-urgenza__titolo">⚠️ ERA IN ACQUA — chiama subito</div>'
    + '<p class="min-urgenza__testo">Non aspettare di finire le domande.</p>';
  box.appendChild(_pulsantiChiamata());
  return box;
}

// ---- i passi ----

export function renderProtocolloMinore(page) {
  const wrap = document.createElement("div");
  wrap.className = "min-wrap";
  page.appendChild(wrap);

  if (passo > ULTIMO_PASSO) { _fatto(wrap); return; }

  _indietro(wrap);
  if (passo > 0 && dati.inAcqua === true) wrap.appendChild(_riquadroUrgenza());

  if (passo === 0) {
    wrap.appendChild(_riquadroCalma());
    wrap.appendChild(_titolo(
      "Dov'era l'ultima volta?",
      "Non deve allontanarsi finché non ha lasciato i dati e un recapito."
    ));
    wrap.appendChild(_scelte([
      { icona: "🌊", testo: "In acqua, faceva il bagno", grave: true, azione: function () { dati.inAcqua = true; passo = 1; render("minore-protocollo"); } },
      { icona: "🏖️", testo: "A riva, camminava o giocava", azione: function () { dati.inAcqua = false; passo = 1; render("minore-protocollo"); } },
    ]));
    return;
  }

  if (passo === 1) {
    wrap.appendChild(_titolo("Da quanto non lo vedono?"));
    wrap.appendChild(_scelte(["Meno di 5 minuti", "5-10 minuti", "10-30 minuti", "Più di 30 minuti"].map(function (t) {
      return { icona: "⏱️", testo: t, azione: function () { dati.minuti = t; passo = 2; render("minore-protocollo"); } };
    })));
    return;
  }

  if (passo === 2) {
    wrap.appendChild(_titolo("Chi è?"));
    wrap.appendChild(_campo("Nome e cognome", "nome", { esempio: "Marco Rossi", max: 60 }));
    wrap.appendChild(_campo("Età", "eta", { esempio: "7", tipo: "number", max: 3 }));
    _avanti(wrap);
    return;
  }

  if (passo === 3) {
    wrap.appendChild(_titolo(
      "Com'è vestito?",
      "Il costume è il dettaglio che si vede da lontano: colore e modello valgono più di tutto il resto."
    ));
    wrap.appendChild(_campo("Costume: colore e modello", "costume", { esempio: "rosso a righe bianche", max: 80 }));
    wrap.appendChild(_campo("Capelli, segni, accessori", "aspetto", { esempio: "castani, cappellino blu, braccialetto", max: 120 }));
    _avanti(wrap);
    return;
  }

  if (passo === 4) {
    wrap.appendChild(_titolo(
      "Chi lo cerca, e una foto",
      "Se i genitori hanno una foto recente sul telefono, fotografala: gira alle altre postazioni insieme al messaggio."
    ));
    wrap.appendChild(_campo("Nome del genitore o accompagnatore", "genitore", { esempio: "Anna Rossi", max: 60 }));
    wrap.appendChild(_campo("Telefono", "telefono", { esempio: "333 1234567", tipo: "tel", max: 20 }));
    wrap.appendChild(_campo("Lido o numero di ombrellone", "riferimento", { esempio: "Lido Sole, ombrellone 42", max: 60 }));
    wrap.appendChild(_foto());
    _avanti(wrap, "Vedi il messaggio");
    return;
  }

  // Ultimo passo: si rilegge cio' che partira', e si manda.
  wrap.appendChild(_titolo("Controlla e manda", "Va a tutte le postazioni e resta come segnalazione aperta nel centro operativo."));
  const anteprima = document.createElement("pre");
  anteprima.className = "min-anteprima";
  anteprima.textContent = componiMessaggio();
  wrap.appendChild(anteprima);
  const manda = _avanti(wrap, "Manda a tutte le postazioni", function () { _manda(manda); });
}

// La foto e' sempre uno scatto diretto, mai la galleria: sui tablet di
// postazione non devono restare immagini di minori oltre il necessario.
function _foto() {
  const box = document.createElement("div");

  const input = document.createElement("input");
  input.type = "file";
  input.accept = "image/*";
  input.setAttribute("capture", "environment");
  input.hidden = true;

  const btn = document.createElement("button");
  btn.type = "button";
  btn.className = "seg-foto-btn";
  function etichetta(t) {
    btn.innerHTML = '<span class="seg-foto-btn__icona">📷</span><span>' + t + '</span>';
  }
  etichetta(dati.foto ? "Rifai la foto" : "Fotografa la foto dei genitori");
  btn.addEventListener("click", function () { input.click(); });

  const img = document.createElement("img");
  img.className = "seg-anteprima";
  img.hidden = !dati.foto;
  if (dati.foto) img.src = dati.foto;

  input.addEventListener("change", function () {
    const f = input.files && input.files[0];
    if (!f) return;
    resizeImg(f, function (dataUri) {
      dati.foto = dataUri;
      img.src = dataUri;
      img.hidden = false;
      etichetta("Rifai la foto");
    });
  });

  box.appendChild(input);
  box.appendChild(btn);
  box.appendChild(img);
  return box;
}

function _manda(btn) {
  btn.disabled = true;
  btn.textContent = "Invio…";
  const testo = componiMessaggio();
  const etichetta = _postazione();

  // Due strade insieme, e non sono la stessa cosa: il messaggio in chat e' cio'
  // che fa partire la ricerca subito, la segnalazione aperta e' cio' che resta
  // nel centro operativo anche dopo che la chat si azzera la sera.
  addReport({
    id: Date.now(),
    type: "emergenza",
    sub: "Persona / Minore disperso",
    zone: etichetta,
    notes: testo.slice(0, 900),
    author: etichetta,
    phone: null,
    role: "station",
    ts: new Date().toISOString(),
    status: "aperta",
    photo: dati.foto || null,
    gps: null,
  }).catch(function () { /* la chat resta la via principale: non blocca l'avviso */ });

  inviaInChat({ text: testo }, function (err) {
    if (err) {
      btn.disabled = false;
      btn.textContent = "Manda a tutte le postazioni";
      alert("Errore nell'invio: " + err.message);
      return;
    }
    // La foto va come messaggio a parte: il testo deve poter arrivare anche se
    // l'immagine e' pesante o il suo invio fallisce.
    if (dati.foto) inviaInChat({ type: "photo", photoData: dati.foto });
    passo = ULTIMO_PASSO + 1;
    render("minore-protocollo");
  });
}

function _fatto(wrap) {
  const testa = document.createElement("div");
  testa.className = "min-fatto";
  testa.innerHTML = '<div class="min-fatto__segno">✅</div>'
    + '<h2 class="min-titolo">Messaggio mandato a tutte le postazioni</h2>'
    + '<p class="min-sotto">Ora avvisa i responsabili: è il passaggio che fa partire il coordinamento.</p>';
  wrap.appendChild(testa);
  wrap.appendChild(_pulsantiChiamata());
  const torna = document.createElement("button");
  torna.type = "button";
  torna.className = "btn-primary min-avanti";
  torna.textContent = "Torna al pannello";
  torna.addEventListener("click", function () { render("station"); });
  wrap.appendChild(torna);
}
