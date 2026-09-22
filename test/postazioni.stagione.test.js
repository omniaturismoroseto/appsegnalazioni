// Postazioni e periodo di attivazione gestiti dall'admin (tab "Postazioni"
// della dashboard, js/admin-postazioni.js).
//
// L'elenco delle postazioni non e' piu' un file: arriva dal database, e una
// voce scritta male non deve togliere la mappa a nessuno. Il periodo di
// stagione decide cosa vede chi apre l'app a ottobre: i saluti, non un
// servizio che non c'e'.
import { describe, it, expect } from "vitest";
import { inStagione, postazioniAttive, postazioniDaNodo, sospesaIl } from "../js/core.js";
import { leggiCoordinate, statoPostazione, validaPostazione, validaSospensione } from "../js/admin-postazioni.js";
import { _bannerFineStagione } from "../js/pages-public.js";

describe("postazioniDaNodo", () => {
  it("trasforma il nodo del database in un elenco ordinato per numero", () => {
    const l = postazioniDaNodo({
      "20": { name: "Lido Azzurra", lat: 42.68372, lng: 14.01391 },
      "10": { name: "Orsa Minore", lat: 42.6712, lng: 14.02308 },
    });
    expect(l.map((s) => s.num)).toEqual([10, 20]);
    expect(l[0]).toEqual({ num: 10, name: "Orsa Minore", lat: 42.6712, lng: 14.02308, sospensioni: [] });
  });
  it("scarta le voci malformate invece di rompere tutto l'elenco", () => {
    const l = postazioniDaNodo({
      "10": { name: "Buona", lat: 42.67, lng: 14.02 },
      "11": { name: "", lat: 42.67, lng: 14.02 },
      "12": { name: "Senza coordinate" },
      abc: { name: "Numero finto", lat: 42.67, lng: 14.02 },
    });
    expect(l.map((s) => s.num)).toEqual([10]);
  });
  it("nodo assente: elenco vuoto (si torna al file di riserva)", () => {
    expect(postazioniDaNodo(null)).toEqual([]);
  });
  it("porta con se' i periodi di sospensione, in ordine di inizio", () => {
    const l = postazioniDaNodo({
      "10": {
        name: "Orsa Minore",
        lat: 42.6712,
        lng: 14.02308,
        sospensioni: { b: { dal: "2026-08-01", al: "2026-08-10" }, a: { dal: "2026-07-01" }, rotta: { al: "2026-09-01" } },
      },
    });
    expect(l[0].sospensioni).toEqual([
      { id: "a", dal: "2026-07-01", al: null },
      { id: "b", dal: "2026-08-01", al: "2026-08-10" },
    ]);
  });
});

describe("inStagione", () => {
  const s = { inizio: "2026-05-23", fine: "2026-09-20" };
  it("senza periodo impostato la stagione e' sempre aperta", () => {
    expect(inStagione(null, "2026-12-25")).toBe(true);
  });
  it("aperta dal primo all'ultimo giorno compresi", () => {
    expect(inStagione(s, "2026-05-23")).toBe(true);
    expect(inStagione(s, "2026-08-15")).toBe(true);
    expect(inStagione(s, "2026-09-20")).toBe(true);
  });
  it("chiusa prima dell'inizio e dopo la fine", () => {
    expect(inStagione(s, "2026-05-22")).toBe(false);
    expect(inStagione(s, "2026-09-21")).toBe(false);
  });
});

describe("leggiCoordinate", () => {
  it("accetta il formato che copia Google Maps", () => {
    expect(leggiCoordinate("42.67120, 14.02308")).toEqual({ lat: 42.6712, lng: 14.02308 });
  });
  it("accetta lo spazio come separatore e la virgola decimale col punto e virgola", () => {
    expect(leggiCoordinate("42.6712 14.02308")).toEqual({ lat: 42.6712, lng: 14.02308 });
    expect(leggiCoordinate("42,6712; 14,02308")).toEqual({ lat: 42.6712, lng: 14.02308 });
  });
  it("rifiuta cio' che non sono due numeri", () => {
    expect(leggiCoordinate("")).toBeNull();
    expect(leggiCoordinate("42.67")).toBeNull();
    expect(leggiCoordinate("via Roma 3")).toBeNull();
  });
});

describe("validaPostazione", () => {
  const esistenti = [
    { num: 10, name: "Orsa Minore", lat: 42.6712, lng: 14.02308 },
    { num: 20, name: "Lido Azzurra", lat: 42.68372, lng: 14.01391 },
  ];
  it("accetta una postazione nuova corretta e ne pulisce il nome", () => {
    const v = validaPostazione({ num: "36", name: "  Lido   Nuovo ", coord: "42.7, 14.0" }, esistenti, true);
    expect(v.postazione).toEqual({ num: 36, name: "Lido Nuovo", lat: 42.7, lng: 14 });
  });
  it("non permette due postazioni con lo stesso numero", () => {
    expect(validaPostazione({ num: "20", name: "Doppia", coord: "42.7, 14.0" }, esistenti, true).errore).toMatch(/gia'/);
  });
  it("in modifica il numero della postazione stessa non conta come doppione", () => {
    const altre = esistenti.filter((s) => s.num !== 20);
    expect(validaPostazione({ num: 20, name: "Azzurra", coord: "42.684, 14.014" }, altre, false).postazione.name).toBe("Azzurra");
  });
  it("segnala latitudine e longitudine scambiate", () => {
    expect(validaPostazione({ num: "36", name: "X", coord: "14.02, 42.67" }, esistenti, true).errore).toMatch(/scambiato/);
  });
  it("rifiuta numero, nome e coordinate mancanti", () => {
    expect(validaPostazione({ num: "0", name: "X", coord: "42.7, 14" }, esistenti, true).errore).toBeTruthy();
    expect(validaPostazione({ num: "36", name: " ", coord: "42.7, 14" }, esistenti, true).errore).toBeTruthy();
    expect(validaPostazione({ num: "36", name: "X", coord: "" }, esistenti, true).errore).toBeTruthy();
  });
});

describe("banner di fine stagione", () => {
  it("dopo la fine saluta e ringrazia, col messaggio predefinito", () => {
    const b = _bannerFineStagione({ inizio: "2026-05-23", fine: "2026-09-20" }, "2026-10-01");
    expect(b.textContent).toMatch(/Grazie e arrivederci/);
    expect(b.textContent).toMatch(/stagione balneare è terminata/);
    expect(b.textContent).not.toMatch(/riprender/);
  });
  it("prima dell'inizio annuncia quando riprende il servizio", () => {
    const b = _bannerFineStagione({ inizio: "2027-05-22", fine: "2027-09-20" }, "2027-03-01");
    expect(b.textContent).toMatch(/riprenderà il 22\/05\/2027/);
  });
  it("il messaggio dell'admin e' testo, non HTML", () => {
    const b = _bannerFineStagione({ inizio: "2026-05-23", fine: "2026-09-20", messaggio: "<b>Ciao</b>" }, "2026-10-01");
    expect(b.querySelector("b")).toBeNull();
    expect(b.textContent).toMatch(/<b>Ciao<\/b>/);
  });
});

describe("sospensione di una postazione", () => {
  const p = {
    num: 14,
    name: "Bolla Mare",
    lat: 42.67643,
    lng: 14.01932,
    sospensioni: [
      { id: "a", dal: "2026-07-01", al: "2026-07-15" },
      { id: "b", dal: "2026-09-01", al: null },
    ],
  };
  it("sospesa dal primo all'ultimo giorno del periodo, compresi", () => {
    expect(sospesaIl(p, "2026-07-01")).toBe(true);
    expect(sospesaIl(p, "2026-07-15")).toBe(true);
  });
  it("in servizio fuori dai periodi", () => {
    expect(sospesaIl(p, "2026-06-30")).toBe(false);
    expect(sospesaIl(p, "2026-07-16")).toBe(false);
  });
  it("periodo senza fine: sospesa da li' in avanti", () => {
    expect(sospesaIl(p, "2026-09-01")).toBe(true);
    expect(sospesaIl(p, "2027-05-30")).toBe(true);
  });
  it("una postazione senza sospensioni e' sempre in servizio", () => {
    expect(sospesaIl({ num: 10, name: "X", lat: 42.6, lng: 14 }, "2026-07-05")).toBe(false);
  });
  it("postazioniAttive toglie dall'elenco solo quelle sospese quel giorno", () => {
    const altra = { num: 15, name: "Y", lat: 42.6, lng: 14, sospensioni: [] };
    expect(postazioniAttive([p, altra], "2026-07-05").map((s) => s.num)).toEqual([15]);
    expect(postazioniAttive([p, altra], "2026-08-05").map((s) => s.num)).toEqual([14, 15]);
  });
});

describe("validaSospensione", () => {
  const esistenti = [{ id: "a", dal: "2026-07-01", al: "2026-07-15" }];
  it("accetta un periodo con inizio e fine", () => {
    expect(validaSospensione({ dal: "2026-08-01", al: "2026-08-10" }, esistenti).sospensione).toEqual({
      dal: "2026-08-01",
      al: "2026-08-10",
    });
  });
  it("accetta un periodo senza fine", () => {
    expect(validaSospensione({ dal: "2026-08-01", al: "" }, esistenti).sospensione).toEqual({ dal: "2026-08-01", al: null });
  });
  it("pretende la data di inizio", () => {
    expect(validaSospensione({ dal: "", al: "2026-08-10" }, esistenti).errore).toBeTruthy();
  });
  it("rifiuta una fine precedente all'inizio", () => {
    expect(validaSospensione({ dal: "2026-08-10", al: "2026-08-01" }, esistenti).errore).toBeTruthy();
  });
  it("rifiuta un periodo che si accavalla a uno gia' presente", () => {
    expect(validaSospensione({ dal: "2026-07-10", al: "2026-07-20" }, esistenti).errore).toMatch(/sovrappone/);
    expect(validaSospensione({ dal: "2026-06-01", al: null }, esistenti).errore).toMatch(/sovrappone/);
  });
  it("un periodo attaccato ma non sovrapposto passa", () => {
    expect(validaSospensione({ dal: "2026-07-16", al: "2026-07-20" }, esistenti).sospensione).toBeTruthy();
  });
});

describe("statoPostazione", () => {
  const p = { num: 14, sospensioni: [{ id: "a", dal: "2026-07-01", al: "2026-07-15" }] };
  it("dice fino a quando e' sospesa, mentre lo e'", () => {
    expect(statoPostazione(p, "2026-07-05")).toEqual({ sospesa: true, testo: "SOSPESA fino al 15/07/2026" });
  });
  it("annuncia una sospensione futura senza dichiararla sospesa", () => {
    expect(statoPostazione(p, "2026-06-01")).toEqual({ sospesa: false, testo: "sospensione dal 01/07/2026 al 15/07/2026" });
  });
  it("niente da dire quando la sospensione e' passata", () => {
    expect(statoPostazione(p, "2026-08-01")).toEqual({ sospesa: false, testo: "" });
  });
  it("periodo senza fine: sospesa a tempo indeterminato", () => {
    expect(statoPostazione({ num: 1, sospensioni: [{ id: "b", dal: "2026-09-01", al: null }] }, "2026-09-02").testo).toBe(
      "SOSPESA a tempo indeterminato",
    );
  });
});
