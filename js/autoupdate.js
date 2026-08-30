// Aggiornamento automatico dell'app di postazione.
//
// L'APK e' un guscio che carica la pagina dal sito, quindi una pubblicazione
// arriva a tutti i dispositivi senza reinstallare nulla - ma solo alla
// riapertura dell'app. Un tablet di postazione resta acceso tutta la giornata:
// senza questo controllo continuerebbe a far girare la versione con cui e'
// partito la mattina, e a stagione avviata nessuno andrebbe a riavviare venti
// dispositivi uno per uno.
//
// Il controllo e' volutamente grezzo: si rilegge la pagina e si guarda quali
// pacchetti JavaScript cita. Vite ne cambia il nome a ogni build (contengono
// un'impronta del contenuto), quindi nomi diversi significa versione diversa.
// Nessun numero di versione da ricordare di aggiornare a mano.
import { _appOccupata } from "./core.js";

const OGNI_MS = 15 * 60 * 1000;   // controllo ogni quarto d'ora
const RIPROVA_MS = 60 * 1000;     // se il dispositivo e' occupato, richiedi tra un minuto

function pacchettiCitati(html) {
  const trovati = String(html).match(/assets\/[A-Za-z0-9_-]+\.js/g) || [];
  return trovati.sort().join(",");
}

function pacchettiInUso() {
  // Vanno raccolti sia i <script> sia i <link rel="modulepreload">: la pagina
  // cita il pacchetto condiviso solo come preload, e confrontare i soli script
  // con tutto cio che la pagina nomina darebbe sempre esito "diverso" - cioe
  // una ricarica continua.
  const nodi = document.querySelectorAll("script[src], link[href]");
  const trovati = [];
  Array.prototype.forEach.call(nodi, function (n) {
    const u = n.getAttribute("src") || n.getAttribute("href") || "";
    const i = u.indexOf("assets/");
    if (i >= 0 && /[.]js$/.test(u)) trovati.push(u.slice(i));
  });
  return trovati.sort().join(",");
}

export function avviaAutoAggiornamento() {
  const inUso = pacchettiInUso();
  // In sviluppo i pacchetti non hanno impronta e questo resta vuoto: senza un
  // riferimento non c'e' modo di dire cosa sia cambiato, quindi non si parte.
  if (!inUso) return;

  let aggiornamentoPronto = false;

  function ricaricaQuandoLibero() {
    // Ricaricare mentre suona un allarme, mentre si trasmette alla radio o
    // mentre c'e' un vocale in ascolto significherebbe interrompere proprio
    // quello per cui il dispositivo esiste. Si aspetta.
    if (_appOccupata()) {
      setTimeout(ricaricaQuandoLibero, RIPROVA_MS);
      return;
    }
    location.reload();
  }

  function controlla() {
    // no-store per non farsi rispondere da nessuna cache: e' l'unico punto in
    // cui una risposta vecchia renderebbe il controllo inutile.
    fetch(location.pathname, { cache: "no-store" })
      .then(function (r) { return r.ok ? r.text() : null; })
      .then(function (html) {
        if (!html || aggiornamentoPronto) return;
        const online = pacchettiCitati(html);
        if (online && online !== inUso) {
          aggiornamentoPronto = true;
          ricaricaQuandoLibero();
        }
      })
      .catch(function () { /* offline o rete ballerina: si riprova al giro dopo */ });
  }

  setInterval(controlla, OGNI_MS);
  // Un controllo anche quando il tablet torna in primo piano dopo ore in tasca
  // o a schermo spento: e' il momento in cui e' piu' probabile essere indietro.
  document.addEventListener("visibilitychange", function () {
    if (!document.hidden) controlla();
  });
}
