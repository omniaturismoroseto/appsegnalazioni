// Il nome del bagnino in chat: chi lo vede e, soprattutto, chi non lo vede.
//
// La regola e' che il nome di chi e' in turno lo leggono solo il centro
// operativo e il coordinatore. Le altre postazioni vedono numero e nome della
// postazione, e basta - a una postazione non serve sapere chi c'e' dentro
// quella a due chilometri di distanza.
//
// La difesa vera sono le regole del database, che non lasciano a una postazione
// leggere la riga dei turni di un'altra. Questi test guardano il lato di qua:
// che il nome non finisca *scritto dentro il messaggio*, dove sarebbe leggibile
// da chiunque e nessuna regola potrebbe piu' nasconderlo. Prima era cosi': il
// cognome veniva chiesto con un prompt e infilato nell'etichetta del mittente.
import { describe, it, expect, beforeEach, vi } from "vitest";

const state = vi.hoisted(() => ({ station: null, messages: {}, pushed: [] }));

vi.mock("../js/core.js", () => ({
  STATIONS: [
    { num: 14, name: "Bolla Mare" },
    { num: 20, name: "Lido Azzurra" },
  ],
  _escapeHtml: (s) =>
    String(s === null || s === undefined ? "" : s).replace(
      /[&<>"']/g,
      (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]
    ),
  zonaPostazione: (num) => {
    const st = [
      { num: 14, name: "Bolla Mare" },
      { num: 20, name: "Lido Azzurra" },
    ].find((s) => String(s.num) === String(num));
    return "P." + num + (st ? " – " + st.name : "");
  },
  get stationMode() {
    return state.station;
  },
  get chatMessages() {
    return state.messages;
  },
  chatResetAt: 0,
  chatRef: {
    push: (payload) => {
      state.pushed.push(payload);
      return Promise.resolve();
    },
  },
  chatEsternaMessages: {},
  chatEsternaResetAt: 0,
  chatEsternaRef: { push: () => Promise.resolve() },
  render: () => {},
  renderPage: () => {},
  _getAuth: () => null,
}));

const { _etichettaMittente, renderChatPanel } = await import("../js/chat.js");

const OGGI = new Intl.DateTimeFormat("sv-SE", {
  timeZone: "Europe/Rome", year: "numeric", month: "2-digit", day: "2-digit",
}).format(new Date());

// Un orario di oggi, all'ora indicata a Roma. I messaggi in chat sono sempre
// della giornata in corso: si azzera alle 20.
function oggiAlle(ora) {
  const d = new Date();
  d.setHours(ora, 30, 0, 0);
  return d.getTime();
}

function turni(dati) {
  window.turniOggiData = dati;
}

const DA_P14 = { role: "station", station: "14", ts: oggiAlle(16), text: "ok" };

beforeEach(() => {
  document.body.innerHTML = "";
  state.pushed = [];
  state.station = null;
  window.userRole = null;
  window.isAdmin = false;
  turni({
    data: OGGI,
    postazioni: { 14: { adesso: "Mario Rossi", fascia: "pomeriggio", mattina: "Luca Bianchi", pomeriggio: "Mario Rossi" } },
  });
});

describe("chi vede il nome del bagnino", () => {
  it("il centro operativo lo vede, abbreviato", () => {
    window.userRole = "admin";
    window.isAdmin = true;
    expect(_etichettaMittente(DA_P14)).toBe("P.14 – Bolla Mare · M. Rossi");
  });

  it("anche il coordinatore lo vede", () => {
    window.userRole = "coordinator";
    expect(_etichettaMittente(DA_P14)).toBe("P.14 – Bolla Mare · M. Rossi");
  });

  it("un'altra postazione vede solo numero e nome della postazione", () => {
    state.station = "20";
    window.userRole = null;
    expect(_etichettaMittente(DA_P14)).toBe("P.14 – Bolla Mare");
  });

  it("nemmeno la postazione che ha scritto vede un nome in chat", () => {
    // Il suo nome lo legge nel pannello, dove riguarda lei. In chat l'etichetta
    // e' la stessa che vedono le altre: cosi' non c'e' un caso particolare in
    // cui il nome comparirebbe su uno schermo che non e' il centro operativo.
    state.station = "14";
    window.userRole = null;
    expect(_etichettaMittente(DA_P14)).toBe("P.14 – Bolla Mare");
  });
});

describe("quale nome, e quando nessuno", () => {
  it("sceglie la fascia dall'ora del messaggio", () => {
    window.userRole = "admin";
    expect(_etichettaMittente({ ...DA_P14, ts: oggiAlle(10) })).toMatch(/L\. Bianchi$/);
    expect(_etichettaMittente({ ...DA_P14, ts: oggiAlle(16) })).toMatch(/M\. Rossi$/);
  });

  it("con una copia dei turni di ieri non mostra nessun nome", () => {
    window.userRole = "admin";
    turni({ data: "2020-01-01", postazioni: { 14: { adesso: "Mario Rossi", pomeriggio: "Mario Rossi" } } });
    expect(_etichettaMittente(DA_P14)).toBe("P.14 – Bolla Mare");
  });

  it("senza turni mostra comunque la postazione", () => {
    window.userRole = "admin";
    turni(null);
    expect(_etichettaMittente(DA_P14)).toBe("P.14 – Bolla Mare");
  });

  it("un messaggio del centro operativo resta com'e", () => {
    window.userRole = "admin";
    expect(_etichettaMittente({ role: "operator", authorLabel: "Coordinatore", ts: oggiAlle(16) }))
      .toBe("Coordinatore");
  });
});

describe("cosa finisce scritto nel messaggio", () => {
  it("l'etichetta salvata porta solo la postazione, mai il nome", async () => {
    // E' il punto che conta davvero: quel campo lo legge ogni tablet della
    // costa, e nessuna regola del database puo' nascondere un pezzo di un
    // messaggio che quel tablet ha comunque il diritto di leggere.
    state.station = "14";
    const host = document.createElement("div");
    document.body.appendChild(host);
    renderChatPanel(host, { isStation: true });

    const input = host.querySelector("input[type=text], textarea");
    const invia = [...host.querySelectorAll("button")].find((b) => /Invia/.test(b.textContent));
    input.value = "arrivato";
    invia.click();
    await new Promise((r) => setTimeout(r, 0));

    expect(state.pushed.length).toBe(1);
    const msg = state.pushed[0];
    expect(msg.authorLabel).toBe("P.14");
    expect(msg.station).toBe("14");
    // Nessuna traccia del nome di chi e' in turno, in nessun campo.
    expect(JSON.stringify(msg)).not.toMatch(/Rossi|Mario|Bianchi|Luca/);
  });
});
