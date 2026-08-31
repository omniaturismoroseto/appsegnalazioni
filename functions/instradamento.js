// A quale postazione appartiene una segnalazione.
//
// Sta in un file suo, senza dipendenze da Firebase, perche' e' il punto in cui
// il server decide **chi viene svegliato**. Sbagliarlo non produce un errore
// nei log: produce un telefono che non suona, o che suona nella postazione
// sbagliata. Isolato cosi' si puo' provare contro le etichette vere.
//
// Il numero non viene ricalcolato: e' gia' scritto nel campo "zone" della
// segnalazione ("P.20 – Lido Azzurra"), messo dal client, e la stessa stringa
// la usa il pannello per filtrare le proprie segnalazioni aperte. Leggerlo da
// li' garantisce che chi riceve l'avviso sia esattamente chi se la ritrova
// nell'elenco e puo' prenderla in carico.

// Il numero, e poi qualcosa che non sia una cifra. Il vincolo finale non serve
// a distinguere "P.1" da "P.10" - il quantificatore e' goloso e prende gia'
// tutte le cifre - ma a **rifiutare** un'etichetta malformata invece di
// troncarla: senza, "P.1000" diventerebbe la postazione 100, che esiste solo
// nella fantasia dell'espressione regolare, e l'avviso non arriverebbe a
// nessuno senza che niente segnali il problema.
const ETICHETTA = /^P\.(\d{1,3})(?:\D|$)/;

function postazioneDellaSegnalazione(data) {
  const m = ETICHETTA.exec(String((data && data.zone) || ""));
  return m ? m[1] : null;
}

module.exports = { postazioneDellaSegnalazione };
