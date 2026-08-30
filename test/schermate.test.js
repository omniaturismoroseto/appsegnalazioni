// Rete di sicurezza contro le schermate bianche.
//
// Il 30 agosto 2026, separando l'app di postazione, la tile "Segnala" ha
// smesso di disegnare qualsiasi cosa: la schermata non era piu' registrata e
// il pannello mostrava una pagina vuota. Nessun test se ne e' accorto, perche'
// coprivano solo funzioni di calcolo, e il guasto e' arrivato fino al tablet.
//
// Questi test non verificano che una schermata sia *giusta* - per quello serve
// guardarla - ma che esista e produca qualcosa. E' poco, e intercetta in pochi
// secondi proprio il tipo di errore che sfugge leggendo il codice: una
// funzione che non viene piu' chiamata, un modulo spostato, un ramo rimasto
// senza registrazione.
import { describe, it, expect, beforeEach } from "vitest";

import { renderAttivazione, renderStationPanel } from "../js/pages-station.js";
import { renderSegnalaFatto, renderSegnalaPostazione } from "../js/station-segnala.js";
import {
  renderConsigliPage,
  renderDone,
  renderForecastPage,
  renderHome,
  renderInstallPage,
  renderLogin,
  renderMinoreBivio,
  renderMinoreDone,
  renderOrdinanzePage,
  renderPartnerPage,
  renderSubmit,
} from "../js/pages-public.js";

function disegna(fn) {
  const page = document.createElement("div");
  document.body.appendChild(page);
  fn(page);
  const contenuto = page.innerHTML.trim();
  page.remove();
  return contenuto;
}

describe("schermate dell'app di postazione", () => {
  beforeEach(() => {
    window.currentRole = null;
  });

  const schermate = {
    "richiesta di attivazione": renderAttivazione,
    "pannello di postazione": renderStationPanel,
    "segnalazione della postazione": renderSegnalaPostazione,
    "conferma di invio": renderSegnalaFatto,
  };

  Object.entries(schermate).forEach(([nome, fn]) => {
    it("disegna qualcosa: " + nome, () => {
      expect(disegna(fn).length).toBeGreaterThan(0);
    });
  });

  it("la segnalazione della postazione non chiede telefono ne consenso privacy", () => {
    // Chi segnala qui e' un bagnino gia' identificato dalla postazione: se un
    // giorno ricomparissero quei campi vorrebbe dire che e' tornata la
    // schermata pubblica al posto della sua.
    const html = disegna(renderSegnalaPostazione);
    expect(html).not.toMatch(/privacyCheck/);
    expect(html).not.toMatch(/segnalazione-phone/);
    expect(html).toMatch(/Invia segnalazione/);
  });
});

describe("schermate dell'app pubblica", () => {
  beforeEach(() => {
    window.currentRole = null;
  });

  const schermate = {
    home: renderHome,
    login: renderLogin,
    segnalazione: renderSubmit,
    "invio riuscito": renderDone,
    meteo: renderForecastPage,
    consigli: renderConsigliPage,
    ordinanze: renderOrdinanzePage,
    partner: renderPartnerPage,
    installazione: renderInstallPage,
    "minori - scelta": renderMinoreBivio,
    "minori - fatto": renderMinoreDone,
  };

  Object.entries(schermate).forEach(([nome, fn]) => {
    it("disegna qualcosa: " + nome, () => {
      expect(disegna(fn).length).toBeGreaterThan(0);
    });
  });
});
