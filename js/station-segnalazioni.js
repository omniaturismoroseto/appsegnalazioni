// Le segnalazioni aperte della postazione, con la possibilita' di chiuderle.
//
// Prima erano un elenco che si apriva sotto la griglia del pannello: schede
// piccole, di sola lettura, e nessun modo di dire "risolta". Chi stava in
// postazione poteva vedere che qualcosa era aperto ma non poteva chiuderlo, e
// una segnalazione risolta restava accesa nella dashboard finche' non se ne
// accorgeva qualcun altro.
//
// Qui e' una schermata sua, con le stesse regole delle altre della postazione:
// riquadri grandi, testo scuro e leggibile al sole, niente da centrare col
// dito. La chiusura chiede conferma sulla scheda stessa - non con una
// finestrella di sistema, che su un tablet ha pulsanti minuscoli - perche'
// chiudere per sbaglio un'emergenza in corso e' l'errore che costa di piu'.
import { fmt, render, resolveReport, takeReport, zonaPostazione } from "./core.js";

// Le segnalazioni aperte di questa postazione, dalla piu' recente. E' la stessa
// selezione che fa il pannello: se cambia una, deve cambiare l'altra.
export function segnalazioniAperte() {
  const zona = zonaPostazione();
  return Object.entries(window.reportsData || {})
    .map(function (e) { return Object.assign({ _key: e[0] }, e[1]); })
    .filter(function (r) { return r && r.status === "aperta" && r.zone === zona; })
    .sort(function (a, b) { return new Date(b.ts) - new Date(a.ts); });
}

export function renderSegnalazioniAperte(page) {
  const wrap = document.createElement("div");
  wrap.className = "sr-wrap";

  const indietro = document.createElement("button");
  indietro.type = "button";
  indietro.className = "seg-indietro";
  indietro.textContent = "← Torna al pannello";
  indietro.addEventListener("click", function () { render("station"); });
  wrap.appendChild(indietro);

  const aperte = segnalazioniAperte();

  const titolo = document.createElement("h2");
  titolo.className = "sr-titolo";
  titolo.textContent = aperte.length === 1 ? "1 segnalazione aperta" : aperte.length + " segnalazioni aperte";
  wrap.appendChild(titolo);

  if (!aperte.length) {
    const vuoto = document.createElement("p");
    vuoto.className = "sr-vuoto";
    vuoto.textContent = "Nessuna segnalazione aperta in questa postazione.";
    wrap.appendChild(vuoto);
    page.appendChild(wrap);
    return;
  }

  aperte.forEach(function (r) { wrap.appendChild(_scheda(r)); });
  page.appendChild(wrap);
}

function _scheda(r) {
  const card = document.createElement("div");
  card.className = "sr-card sr-card--" + (r.type === "emergenza" ? "emergenza" : "pericolo");

  const gravita = document.createElement("div");
  gravita.className = "sr-card__gravita";
  gravita.textContent = r.type === "emergenza" ? "EMERGENZA" : "PERICOLO";
  card.appendChild(gravita);

  const sub = document.createElement("div");
  sub.className = "sr-card__sub";
  sub.textContent = r.sub || "Segnalazione";
  card.appendChild(sub);

  const quando = document.createElement("div");
  quando.className = "sr-card__quando";
  quando.textContent = fmt(r.ts);
  card.appendChild(quando);

  if (r.notes) {
    const note = document.createElement("p");
    note.className = "sr-card__note";
    note.textContent = r.notes;
    card.appendChild(note);
  }

  if (r.photo) {
    const img = document.createElement("img");
    img.className = "sr-card__foto";
    img.src = r.photo;
    img.alt = "Foto della segnalazione";
    card.appendChild(img);
  }

  card.appendChild(_presaInCarico(r));
  card.appendChild(_chiusura(r, card));
  return card;
}

// "L'ho vista", il tocco che ferma la ripetizione dell'avviso.
//
// Non chiude la segnalazione: dice solo che qualcuno se ne sta occupando. Senza
// questo, il server continuerebbe a richiamare ogni minuto un bagnino che sta
// gia' camminando verso il punto.
function _presaInCarico(r) {
  const box = document.createElement("div");
  box.className = "sr-presa";

  if (r.presaInCarico) {
    box.classList.add("sr-presa--fatta");
    const chi = r.presaInCarico.da ? " · " + r.presaInCarico.da : "";
    box.textContent = "👁 Presa in carico" + chi;
    return box;
  }

  const b = document.createElement("button");
  b.type = "button";
  b.className = "sr-presa__btn";
  b.innerHTML = "<span class=\"sr-presa__segno\">👁</span><span>L'ho vista, me ne occupo</span>";
  b.addEventListener("click", function () {
    b.disabled = true;
    b.textContent = "…";
    takeReport(r._key, zonaPostazione()).catch(function (e) {
      b.disabled = false;
      b.innerHTML = "<span class=\"sr-presa__segno\">👁</span><span>L'ho vista, me ne occupo</span>";
      alert("Non sono riuscito a segnarla: " + e.message);
    });
  });
  box.appendChild(b);
  return box;
}

// La chiusura in due tempi, dentro la scheda: il primo tocco chiede conferma,
// il secondo chiude. Serve perche' queste schede si toccano con le mani
// bagnate e di corsa, e riaprire una segnalazione chiusa per sbaglio dal
// tablet non si puo'.
function _chiusura(r, card) {
  const box = document.createElement("div");
  box.className = "sr-chiudi";

  const avvia = document.createElement("button");
  avvia.type = "button";
  avvia.className = "sr-chiudi__btn";
  avvia.innerHTML = '<span class="sr-chiudi__segno">✓</span><span>Chiudi segnalazione</span>';

  const conferma = document.createElement("div");
  conferma.className = "sr-conferma";
  conferma.hidden = true;
  const domanda = document.createElement("div");
  domanda.className = "sr-conferma__domanda";
  domanda.textContent = "È stata risolta?";
  const scelte = document.createElement("div");
  scelte.className = "sr-conferma__scelte";

  const si = document.createElement("button");
  si.type = "button";
  si.className = "sr-conferma__si";
  si.textContent = "Sì, risolta";
  const no = document.createElement("button");
  no.type = "button";
  no.className = "sr-conferma__no";
  no.textContent = "No, annulla";

  avvia.addEventListener("click", function () {
    avvia.hidden = true;
    conferma.hidden = false;
  });
  no.addEventListener("click", function () {
    conferma.hidden = true;
    avvia.hidden = false;
  });
  si.addEventListener("click", function () {
    si.disabled = true;
    no.disabled = true;
    domanda.textContent = "Chiusura in corso…";
    resolveReport(r._key).then(function () {
      // La schermata si ridisegna da sola quando il database conferma (vedi il
      // listener delle segnalazioni in core.js): la scheda sparisce da sola.
      card.classList.add("is-chiusa");
    }).catch(function (e) {
      si.disabled = false;
      no.disabled = false;
      domanda.textContent = "È stata risolta?";
      alert("Non sono riuscito a chiuderla: " + e.message);
    });
  });

  scelte.appendChild(si);
  scelte.appendChild(no);
  conferma.appendChild(domanda);
  conferma.appendChild(scelte);
  box.appendChild(avvia);
  box.appendChild(conferma);
  return box;
}
