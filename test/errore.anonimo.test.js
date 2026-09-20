// Un errore anonimo non e' un guasto di questa app.
//
// "Script error." e' quello che il browser dice quando l'errore arriva da uno
// script di un'altra origine senza CORS: niente file, niente riga, niente
// messaggio vero. Non si puo' sapere se sia colpa nostra, e in genere non lo e'
// (reCAPTCHA di App Check, i moduli che Google Maps si carica da solo,
// un'estensione del browser, il contenitore del kiosk).
//
// Due cose andavano dette, e qui si controllano tutte e due, perche' e' facile
// che una delle due pagine resti indietro sull'altra:
//
//  - a Sentry non deve arrivare. Il suo elenco predefinito scarta gia'
//    "Script error." scritto cosi', ma se l'errore capita PRIMA che il pacchetto
//    Sentry sia carico, e' il caricatore a tenerlo da parte e a riconsegnarlo
//    come oggetto ErrorEvent: il testo diventa un altro, l'elenco predefinito
//    non lo riconosce piu' e la segnalazione si apre lo stesso, vuota.
//    Il 20 settembre e' successo su postazione.html.
//  - non deve coprire lo schermo. La rete di sicurezza in cima alla pagina
//    esiste per i nostri file - stessa origine, errori raccontati per intero -
//    non per mostrare una pagina rossa a un bagnino in servizio per colpa di
//    uno script di qualcun altro.
import { describe, it, expect, beforeEach } from "vitest";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const RADICE = join(dirname(fileURLToPath(import.meta.url)), "..");

// Il testo esatto che Sentry costruisce quando gli si consegna un ErrorEvent
// invece di un errore (verificato dentro il pacchetto pubblicato, bundle 10.75:
// `Event \`ErrorEvent\` captured as ${tipo} with message \`${e.message}\``).
// Se un domani cambiasse, questo controllo fallirebbe qui invece che in
// silenzio su Sentry.
const TESTO_TRAVESTITO =
  "Event `ErrorEvent` captured as exception with message `Script error.`";

// Il blocco <script> scritto a mano in cima alla pagina: quello senza attributi
// che installa Sentry e la rete di sicurezza. Vite non lo tocca, quindi quello
// che si legge qui e' esattamente quello che gira sul tablet.
function reteDiSicurezza(pagina) {
  const html = readFileSync(join(RADICE, pagina), "utf8");
  const blocchi = [...html.matchAll(/<script>([\s\S]*?)<\/script>/g)].map((m) => m[1]);
  const codice = blocchi.find((c) => c.includes('addEventListener("error"'));
  expect(codice, `nessuna rete di sicurezza in ${pagina}`).toBeTruthy();

  const opzioni = {};
  const catturati = [];
  const Sentry = {
    onLoad: (cb) => cb(),
    init: (o) => Object.assign(opzioni, o),
    captureException: (e) => catturati.push(e),
    consoleLoggingIntegration: () => ({}),
    replayIntegration: () => ({}),
  };
  // Si intercetta l'iscrizione invece di lanciare eventi veri: le due pagine
  // installano lo stesso gestore sulla stessa finestra, e chiamandolo a mano
  // ognuna risponde solo per se'.
  let gestore = null;
  const finestra = {
    Sentry,
    addEventListener: (tipo, fn) => {
      if (tipo === "error") gestore = fn;
    },
  };
  new Function("window", "Sentry", codice)(finestra, Sentry);
  expect(gestore, `${pagina} non installa nessun gestore "error"`).toBeTypeOf("function");
  return { opzioni, catturati, gestore };
}

describe.each(["index.html", "postazione.html"])("%s: errore da un'altra origine", (pagina) => {
  beforeEach(() => {
    document.body.innerHTML = '<div id="page"></div>';
  });

  it("non apre una segnalazione su Sentry, nemmeno travestito da ErrorEvent", () => {
    const { opzioni } = reteDiSicurezza(pagina);
    const filtri = opzioni.ignoreErrors || [];
    expect(filtri.some((r) => r.test(TESTO_TRAVESTITO))).toBe(true);
  });

  it("non copre la pagina e non viene mandato a mano a Sentry", () => {
    const { catturati, gestore } = reteDiSicurezza(pagina);
    gestore(new ErrorEvent("error", { message: "Script error." }));
    expect(document.getElementById("page").innerHTML).toBe("");
    expect(catturati).toEqual([]);
  });

  it("un errore nostro invece si vede e arriva a Sentry", () => {
    const { catturati, gestore } = reteDiSicurezza(pagina);
    const guasto = new Error("core.js non si e' caricato");
    gestore(new ErrorEvent("error", { message: guasto.message, error: guasto }));
    expect(document.getElementById("page").innerHTML).toContain("non si e' caricato");
    expect(catturati).toEqual([guasto]);
  });
});
