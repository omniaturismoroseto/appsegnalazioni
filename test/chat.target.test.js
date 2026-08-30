// Messaggi diretti a una sola postazione (campo "to"): chi li vede, chi li
// riceve e cosa finisce davvero scritto sul database.
//
// A differenza degli altri file di test, qui js/core.js e' sostituito da un
// finto completo (vi.mock): serve poter cambiare stationMode e l'elenco dei
// messaggi da un test all'altro, cosa impossibile col modulo vero, dove
// stationMode si valorizza solo dentro _activateStationMode (fetch + Firebase
// Auth). test/setup.js resta comunque attivo per gli altri globali.
import { describe, it, expect, beforeEach, vi } from "vitest";

// vi.hoisted: vi.mock viene spostato sopra gli import, e la sua factory non
// puo' leggere una const dichiarata qui sotto (sarebbe ancora in TDZ).
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
  // Getter, non valori: chat.js li rilegge ad ogni chiamata (sono live
  // binding nel modulo vero), cosi' ogni test puo' cambiarli prima.
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

const { renderChatPanel, _chatMsgAddressedToMe } = await import("../js/chat.js");

const BROADCAST = { ts: 1000, authorLabel: "Coordinatore", role: "operator", text: "Attenzione a tutti" };
const A_P14 = { ts: 2000, authorLabel: "Coordinatore", role: "operator", text: "Solo per la 14", to: "14" };
const A_P20 = { ts: 3000, authorLabel: "Coordinatore", role: "operator", text: "Solo per la 20", to: "20" };

function renderAs({ station = null, role = null, admin = false, messages = {} }) {
  state.station = station;
  state.messages = messages;
  window.userRole = role;
  window.isAdmin = admin;
  const host = document.createElement("div");
  document.body.appendChild(host);
  renderChatPanel(host, station ? { isStation: true } : {});
  return host;
}

beforeEach(() => {
  document.body.innerHTML = "";
  state.pushed = [];
  try {
    localStorage.setItem("omnia_chat_name", "Tester");
    localStorage.setItem("omnia_station_surname", "Rossi");
  } catch (e) {
    /* jsdom senza localStorage: i prompt sono comunque gestiti da chat.js */
  }
});

describe("_chatMsgAddressedToMe", () => {
  it("un messaggio senza destinatario e' per tutti", () => {
    state.station = "20";
    expect(_chatMsgAddressedToMe(BROADCAST)).toBe(true);
    expect(_chatMsgAddressedToMe({ to: "all" })).toBe(true);
  });

  it("un messaggio diretto e' solo della postazione indicata", () => {
    state.station = "14";
    expect(_chatMsgAddressedToMe(A_P14)).toBe(true);
    expect(_chatMsgAddressedToMe(A_P20)).toBe(false);
  });

  it("fuori dalla modalita' postazione nessun messaggio diretto e' 'per me'", () => {
    // Vale anche per admin/coordinatore: lo vedono in elenco (sono loro a
    // mandarlo) ma il vocale non deve partire da solo sul loro telefono.
    state.station = null;
    expect(_chatMsgAddressedToMe(A_P14)).toBe(false);
    expect(_chatMsgAddressedToMe(BROADCAST)).toBe(true);
  });
});

describe("elenco messaggi", () => {
  it("una postazione non vede i messaggi diretti alle altre", () => {
    const host = renderAs({ station: "20", messages: { a: BROADCAST, b: A_P14, c: A_P20 } });
    const txt = host.textContent;
    expect(txt).toContain("Attenzione a tutti");
    expect(txt).toContain("Solo per la 20");
    expect(txt).not.toContain("Solo per la 14");
  });

  it("la postazione destinataria vede l'etichetta 'solo per te'", () => {
    const host = renderAs({ station: "20", messages: { c: A_P20 } });
    expect(host.textContent).toContain("solo per te");
    expect(host.textContent).not.toContain("solo P.20");
  });

  it("admin e coordinatore vedono tutto il traffico, con la postazione indicata", () => {
    const host = renderAs({ role: "coordinator", messages: { a: BROADCAST, b: A_P14, c: A_P20 } });
    const txt = host.textContent;
    expect(txt).toContain("Solo per la 14");
    expect(txt).toContain("Solo per la 20");
    expect(txt).toContain("solo P.14");
    expect(txt).not.toContain("solo per te");
  });
});

describe("barra destinatario", () => {
  it("c'e' per admin e coordinatore, con tutte le postazioni piu' 'tutte'", () => {
    const host = renderAs({ role: "admin", admin: true });
    const sel = host.querySelector("select");
    expect(sel).not.toBeNull();
    expect([...sel.options].map((o) => o.value)).toEqual(["all", "14", "20"]);
  });

  it("non c'e' per una postazione", () => {
    const host = renderAs({ station: "20" });
    expect(host.querySelector("select")).toBeNull();
  });

  it("non c'e' sulla chat esterna, che non ha postazioni a cui indirizzare", () => {
    state.station = null;
    window.userRole = "admin";
    window.isAdmin = true;
    const host = document.createElement("div");
    document.body.appendChild(host);
    renderChatPanel(host, { channel: "external" });
    expect(host.querySelector("select")).toBeNull();
  });
});

describe("invio", () => {
  // Dopo ogni invio chat.js riabilita input e pulsante solo nel .then()
  // della push: senza attendere il microtask il click successivo cadrebbe su
  // un pulsante ancora disabilitato.
  const flush = () => new Promise((r) => setTimeout(r, 0));

  it("scrive il campo 'to' solo quando il messaggio e' diretto", async () => {
    const host = renderAs({ role: "coordinator" });
    const sel = host.querySelector("select");
    const input = host.querySelector('input[type="text"]');
    // Ricerca per contenuto e non per uguaglianza esatta: l etichetta del pulsante
    // porta anche un icona, e un confronto rigido si rompe a ogni ritocco grafico
    // senza che il comportamento sia cambiato.
    const sendBtn = [...host.querySelectorAll("button")].find((b) => /Invia/.test(b.textContent));

    // 1) a tutte: nessun campo "to", messaggio identico a prima della modifica
    input.value = "a tutti";
    sendBtn.click();
    await flush();
    expect(state.pushed[0].to).toBeUndefined();

    // 2) diretto a una postazione
    sel.value = "14";
    sel.dispatchEvent(new Event("change"));
    input.value = "solo alla 14";
    sendBtn.click();
    await flush();
    expect(state.pushed[1].to).toBe("14");
    expect(state.pushed[1].text).toBe("solo alla 14");

    // 3) ritorno a "tutte" col pulsante della barra
    const resetBtn = [...host.querySelectorAll("button")].find((b) => b.textContent.indexOf("tutte") !== -1);
    resetBtn.click();
    input.value = "di nuovo a tutti";
    sendBtn.click();
    await flush();
    expect(state.pushed[2].to).toBeUndefined();
  });

  it("una postazione non puo' indirizzare: nessun campo 'to'", () => {
    const host = renderAs({ station: "20" });
    const input = host.querySelector('input[type="text"]');
    // Ricerca per contenuto e non per uguaglianza esatta: l etichetta del pulsante
    // porta anche un icona, e un confronto rigido si rompe a ogni ritocco grafico
    // senza che il comportamento sia cambiato.
    const sendBtn = [...host.querySelectorAll("button")].find((b) => /Invia/.test(b.textContent));
    input.value = "ricevuto";
    sendBtn.click();
    expect(state.pushed[0].to).toBeUndefined();
    expect(state.pushed[0].role).toBe("station");
  });
});
