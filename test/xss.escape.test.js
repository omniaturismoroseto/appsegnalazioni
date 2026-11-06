// Niente di quello che scrive un estraneo finisce in innerHTML senza escape.
//
// Due nodi del database si scrivono SENZA essere autenticati, e non per
// sbaglio: una segnalazione la manda chi e' in spiaggia, e una richiesta di
// attivazione la manda un tablet che non ha ancora nessuna sessione. Le regole
// lo dicono apertamente (database.rules.json, ".write": "!data.exists() || ...")
// e ne limitano la lunghezza, non i caratteri.
//
// Il che vuol dire che `sub`, `zone`, `notes`, `author` di una segnalazione e
// `userAgent` di un dispositivo sono testo scelto da chi passa. Da li' quel
// testo arriva, senza che nessuno chieda niente a nessuno, dentro la dashboard
// di un operatore e dentro quella dell'admin: il banner d'allarme compare da
// solo appena c'e' una segnalazione aperta, e l'elenco dei dispositivi in
// attesa si riempie da solo. Se quel testo viene concatenato in innerHTML,
// chiunque dall'esterno esegue codice nella sessione di chi ha le chiavi:
// l'elenco completo delle segnalazioni - telefoni, GPS, foto di minori - e le
// callable di amministrazione.
//
// E' successo in quattro punti insieme (banner d'allarme in core.js, incrocio
// perso/trovato ed elenco dispositivi in pages-operator.js) mentre la chat,
// scritta dopo, escapava tutto correttamente: la conoscenza c'era, non era
// applicata uniformemente. Un controllo a mano file per file non regge nel
// tempo, quindi lo fa questo test, sui sorgenti - l'unico posto dove il
// difetto si vede senza dover ricostruire mezza app.
import { describe, it, expect } from "vitest";
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";

const JS_DIR = join(import.meta.dirname, "..", "js");

// I campi che un estraneo puo' riempire (segnalazioni, dispositivi, chat) piu'
// quelli che riempie un admin dal pannello: anche l'admin che si fa male da
// solo e' un difetto, e costa un _escapeHtml.
const CAMPI_NON_FIDATI = [
  "sub",
  "zone",
  "notes",
  "author",
  "phone",
  "userAgent",
  "text",
  "audioData",
  "photoData",
  "authorLabel",
  "name",
  "email",
  "label",
  "message",
  "station",
  "testo",
];

// Togli dalla riga il contenuto di ogni _escapeHtml(...), bilanciando le
// parentesi: cio' che resta e' la parte che finisce in innerHTML grezza.
function senzaEscape(riga) {
  let out = "";
  let i = 0;
  while (i < riga.length) {
    const inizio = riga.indexOf("_escapeHtml(", i);
    if (inizio === -1) {
      out += riga.slice(i);
      break;
    }
    out += riga.slice(i, inizio);
    let livello = 0;
    let j = inizio + "_escapeHtml".length;
    for (; j < riga.length; j++) {
      if (riga[j] === "(") livello++;
      else if (riga[j] === ")") {
        livello--;
        if (livello === 0) break;
      }
    }
    i = j + 1;
  }
  return out;
}

// Leggere un campo per sapere SE c'e' non lo scrive nella pagina: in
// `(d.station?" – "+st.name:"")` il valore che finisce in innerHTML e' st.name,
// mentre d.station e' solo la domanda. Si saltano quindi le letture seguite da
// un operatore che puo' essere soltanto un confronto. Il caso pericoloso
// `a.name?a.name:""` resta preso: la seconda lettura e' seguita da ":", non da
// un confronto.
const SOLO_UN_CONFRONTO = /^\s*(?:\?(?!\.)|&&|\|\||===|!==|==|!=|>=|<=|>|<)/;

// `qualcosa.campo` o `qualcosa["campo"]`, non precedute da una lettera (per non
// pescare `s.subItem`) e non seguite da altri caratteri di identificatore.
function campiGrezzi(testo) {
  const trovati = [];
  CAMPI_NON_FIDATI.forEach((campo) => {
    const re = new RegExp("[A-Za-z_$][\\w$]*\\s*(?:\\.\\s*" + campo + "|\\[\\s*[\"']" + campo + "[\"']\\s*\\])(?![\\w$])", "g");
    let m;
    while ((m = re.exec(testo)) !== null) {
      if (SOLO_UN_CONFRONTO.test(testo.slice(m.index + m[0].length))) continue;
      trovati.push(m[0].replace(/\s+/g, ""));
    }
  });
  return trovati;
}

// Un'assegnazione a innerHTML non sta per forza su una riga sola: quella del
// banner d'allarme - il difetto piu' grave dei quattro - era spezzata in due,
// con `innerHTML` sulla prima e `report.sub` sulla seconda. Un controllo riga
// per riga la lasciava passare, quindi si raccoglie l'istruzione intera: dalla
// riga dell'assegnazione in avanti, fino al punto e virgola che la chiude.
const MAX_RIGHE_ISTRUZIONE = 40;

function istruzioniInnerHtml(sorgente) {
  const righe = sorgente.split("\n");
  const istruzioni = [];
  for (let i = 0; i < righe.length; i++) {
    if (!/\.innerHTML\s*(?:\+)?=/.test(righe[i])) continue;
    let testo = righe[i];
    let j = i;
    while (!testo.trimEnd().endsWith(";") && j + 1 < righe.length && j - i < MAX_RIGHE_ISTRUZIONE) {
      j++;
      testo += "\n" + righe[j];
    }
    istruzioni.push({ n: i + 1, riga: testo });
    i = j;
  }
  return istruzioni;
}

describe("nessun campo scritto dall'esterno finisce in innerHTML senza escape", () => {
  const file = readdirSync(JS_DIR).filter((f) => f.endsWith(".js"));

  it("i file da controllare ci sono (se questo elenco si svuota il test non sta piu' guardando niente)", () => {
    expect(file).toContain("core.js");
    expect(file).toContain("pages-operator.js");
    expect(file).toContain("chat.js");
  });

  file.forEach((nome) => {
    it(nome, () => {
      const sorgente = readFileSync(join(JS_DIR, nome), "utf8");
      const colpevoli = [];
      istruzioniInnerHtml(sorgente).forEach(({ n, riga }) => {
        const grezzi = campiGrezzi(senzaEscape(riga));
        if (grezzi.length) colpevoli.push(nome + ":" + n + " → " + [...new Set(grezzi)].join(", "));
      });
      expect(colpevoli).toEqual([]);
    });
  });
});
