// Nessuna regola apre su "sono autenticato" e basta.
//
// Sul progetto la creazione account via endpoint pubblico di Firebase Auth e'
// attiva: con la chiave che sta nel JS - pubblica per forza, non e' un segreto
// da proteggere - chiunque si fa un account in una chiamata. La restrizione per
// referrer sulla chiave non c'entra niente: il referrer lo sceglie chi chiama,
// e si aggira con una riga di intestazione (verificato).
//
// Quindi "auth != null" non e' un permesso: e' la constatazione che qualcuno ha
// un account, e un account ce l'ha anche un estraneo. Il permesso e' avere un
// ruolo, che si ottiene soltanto da un account creato dal pannello admin
// (functions/ruoli.js, createOperatorAccount) o da un dispositivo di postazione
// abilitato (getStationToken). Da qui la regola: ogni "auth != null" in queste
// regole deve essere accompagnato da un controllo su role, station o uid.
//
// Chiudere la registrazione nella console Firebase resta la prima difesa.
// Questo test tiene in piedi la seconda, che e' quella che regge se qualcuno
// riapre la registrazione o crea un nuovo progetto partendo da queste regole.
import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { RUOLI_OPERATORE, RUOLO_BASE, ruoloOperatore, normalizzaRuolo, puoPromuovereAdmin } from "../functions/ruoli.js";

const REGOLE = JSON.parse(readFileSync(join(import.meta.dirname, "..", "database.rules.json"), "utf8"));

// Raccoglie ogni espressione di permesso con il percorso a cui sta attaccata.
function espressioni(nodo, percorso = "") {
  const fuori = [];
  if (!nodo || typeof nodo !== "object") return fuori;
  Object.entries(nodo).forEach(([chiave, valore]) => {
    if ([".read", ".write", ".validate"].includes(chiave) && typeof valore === "string") {
      fuori.push({ percorso: percorso + "/" + chiave, espressione: valore });
    } else if (!chiave.startsWith(".")) {
      fuori.push(...espressioni(valore, percorso + "/" + chiave));
    }
  });
  return fuori;
}

const TUTTE = espressioni(REGOLE.rules);

describe("le regole del database non si accontentano di un account", () => {
  it("ci sono regole da controllare (se l'elenco si svuota il test non guarda piu' niente)", () => {
    expect(TUTTE.length).toBeGreaterThan(20);
    expect(TUTTE.map((e) => e.percorso)).toContain("/reports/.read");
  });

  it("ogni 'auth != null' e' seguito da un controllo su ruolo, postazione o uid", () => {
    const nudi = [];
    TUTTE.forEach(({ percorso, espressione }) => {
      const re = /auth != null/g;
      let m;
      while ((m = re.exec(espressione)) !== null) {
        const coda = espressione.slice(m.index + m[0].length, m.index + m[0].length + 60);
        if (!/^\s*&&\s*\(?\s*auth\.(token\.role|token\.station|uid)/.test(coda)) {
          nudi.push(percorso + " → ...auth != null" + coda.slice(0, 40));
        }
      }
    });
    expect(nudi).toEqual([]);
  });

  it("le parentesi di ogni espressione sono bilanciate", () => {
    // Una regola sbilanciata la rifiuta il deploy, ma lo scopre molto piu'
    // tardi di qui - ed e' un errore facile, perche' queste espressioni si
    // modificano a pezzi di stringa.
    const rotte = [];
    TUTTE.forEach(({ percorso, espressione }) => {
      let livello = 0;
      let negativo = false;
      for (const ch of espressione) {
        if (ch === "(") livello++;
        else if (ch === ")") {
          livello--;
          if (livello < 0) negativo = true;
        }
      }
      if (livello !== 0 || negativo) rotte.push(percorso + " (bilancio " + livello + ")");
    });
    expect(rotte).toEqual([]);
  });

  it("la lettura delle segnalazioni chiede un ruolo riconosciuto", () => {
    const lettura = REGOLE.rules.reports[".read"];
    RUOLI_OPERATORE.forEach((r) => expect(lettura).toContain("auth.token.role === '" + r + "'"));
    // Le postazioni leggono l'elenco delle segnalazioni aperte dal pannello.
    expect(lettura).toContain("auth.token.role === 'station'");
  });

  it("una segnalazione la crea chiunque, ma la modifica solo centro operativo o postazione di competenza", () => {
    const scrittura = REGOLE.rules.reports.$reportId[".write"];
    // Chi e' in spiaggia non ha un account: la creazione resta libera.
    expect(scrittura.startsWith("!data.exists() ||")).toBe(true);
    // Il ramo della postazione chiede il ruolo station in positivo, non
    // "diverso da station": e' la differenza fra un controllo e un buco.
    expect(scrittura).toContain("auth.token.role === 'station'");
    expect(scrittura).not.toContain("auth.token.role !== 'station'");
  });

  it("nessuna regola concede permessi con \"role !== 'station'\"", () => {
    // Era la forma usata prima: "chiunque tranne una postazione", che
    // comprendeva anche chi si era registrato da solo. Resta ammessa solo
    // dentro .validate, dove limita e non concede.
    const concessioni = TUTTE.filter(
      (e) => e.percorso.endsWith("/.read") || e.percorso.endsWith("/.write")
    ).filter((e) => e.espressione.includes("role !== 'station'"));
    expect(concessioni.map((e) => e.percorso)).toEqual([]);
  });
});

describe("il ruolo base si scrive per esteso", () => {
  it("'operator' e' un ruolo valido come gli altri", () => {
    expect(ruoloOperatore("operator")).toBe(true);
    expect(RUOLI_OPERATORE).toContain("admin");
    expect(RUOLI_OPERATORE).toContain("operator");
  });

  it("un account senza ruolo non e' riconosciuto", () => {
    expect(ruoloOperatore(undefined)).toBe(false);
    expect(ruoloOperatore(null)).toBe(false);
    expect(ruoloOperatore("")).toBe(false);
    // "station" non e' un ruolo d'account: non ha email ne' password.
    expect(ruoloOperatore("station")).toBe(false);
    // E niente che somigli a un ruolo senza esserlo.
    expect(ruoloOperatore("Admin")).toBe(false);
    expect(ruoloOperatore("operatore")).toBe(false);
  });

  it("la voce vuota del pannello vale il ruolo base, non la cancellazione del claim", () => {
    expect(normalizzaRuolo("")).toBe(RUOLO_BASE);
    expect(normalizzaRuolo(null)).toBe(RUOLO_BASE);
    expect(normalizzaRuolo(undefined)).toBe(RUOLO_BASE);
  });

  it("un ruolo inventato passa invariato, e tocca a chi chiama rifiutarlo", () => {
    expect(normalizzaRuolo("superadmin")).toBe("superadmin");
    expect(ruoloOperatore(normalizzaRuolo("superadmin"))).toBe(false);
  });
});

describe("il primo admin lo crea solo l'account principale", () => {
  // Il bootstrap era aperto a qualunque utente autenticato. Con la creazione
  // account attiva sul progetto significava: aperto a chiunque, in qualunque
  // momento in cui nessun admin esistesse - per esempio subito dopo un
  // ripristino, o se i claim si fossero persi.
  const casi = [
    { nome: "estraneo, nessun admin esiste", stato: { giaAdmin: false, proprietario: false, nessunAdminEsiste: true }, atteso: false },
    { nome: "estraneo, un admin esiste", stato: { giaAdmin: false, proprietario: false, nessunAdminEsiste: false }, atteso: false },
    { nome: "proprietario, nessun admin esiste (via di rientro)", stato: { giaAdmin: false, proprietario: true, nessunAdminEsiste: true }, atteso: true },
    { nome: "proprietario senza claim, ma un admin esiste: chieda a lui", stato: { giaAdmin: false, proprietario: true, nessunAdminEsiste: false }, atteso: false },
    { nome: "admin promuove un collega", stato: { giaAdmin: true, proprietario: false, nessunAdminEsiste: false }, atteso: true },
  ];
  casi.forEach(({ nome, stato, atteso }) => {
    it(nome + " \u2192 " + (atteso ? "permesso" : "rifiutato"), () => {
      expect(puoPromuovereAdmin(stato)).toBe(atteso);
    });
  });
});
