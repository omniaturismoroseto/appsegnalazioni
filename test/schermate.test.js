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
import { avviaProtocolloMinore, componiMessaggio, renderProtocolloMinore } from "../js/station-minore.js";
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

  it("offre tutte le voci in un elenco solo, senza scegliere prima la gravita", () => {
    // Prima serviva scegliere emergenza o pericolo e poi la voce: due tocchi
    // per dire una cosa sola. Ora le voci ci sono tutte subito, e la gravita
    // resta attaccata a ciascuna.
    const page = document.createElement("div");
    document.body.appendChild(page);
    renderSegnalaPostazione(page);
    const voci = page.querySelectorAll(".seg-voce");
    // Tutte le voci di entrambe le categorie, presenti fin dal primo sguardo.
    expect(voci.length).toBe(9);
    expect(page.querySelectorAll(".seg-voce--emergenza").length).toBe(4);
    expect(page.querySelectorAll(".seg-voce--pericolo").length).toBe(5);
    // Nessuna voce e scelta finche non la si tocca.
    expect(page.querySelectorAll(".seg-voce.is-scelta").length).toBe(0);
    voci[0].click();
    expect(voci[0].classList.contains("is-scelta")).toBe(true);
    expect(voci[0].getAttribute("aria-pressed")).toBe("true");
    // Sceglierne unaltra sposta la scelta, non la aggiunge.
    voci[5].click();
    expect(page.querySelectorAll(".seg-voce.is-scelta").length).toBe(1);
    page.remove();
  });

  it("la foto si scatta da un pulsante, non da un campo file di sistema", () => {
    // Il campo file mostrava "Scegli file": una scelta che non esiste, perche
    // con capture si apre comunque la fotocamera.
    const page = document.createElement("div");
    document.body.appendChild(page);
    renderSegnalaPostazione(page);
    const btn = page.querySelector(".seg-foto-btn");
    expect(btn).not.toBeNull();
    expect(btn.textContent).toMatch(/Scatta una foto/);
    const campo = page.querySelector('input[type="file"]');
    expect(campo.hidden).toBe(true);
    expect(campo.getAttribute("capture")).toBe("environment");
    page.remove();
  });

  it("usa il vocabolario dei bagnini, non quello dell app pubblica", () => {
    // Queste voci sono di servizio e non devono seguire TYPES, che e delle
    // pagine pubbliche: "Soccorso del Vicino" a un bagnante non direbbe nulla.
    const page = document.createElement("div");
    document.body.appendChild(page);
    renderSegnalaPostazione(page);
    const testi = Array.from(page.querySelectorAll(".seg-voce__testo")).map((n) => n.textContent);
    expect(testi).toContain("Annegamento / Soccorso del Vicino");
    expect(testi).toContain("Persona / Minore disperso");
    // La voce che apre il telefono lo dichiara, cosi chi tocca sa cosa aspettarsi.
    const chiamante = Array.from(page.querySelectorAll(".seg-voce")).find((b) =>
      /Soccorso del Vicino/.test(b.textContent)
    );
    expect(chiamante.textContent).toMatch(/chiama il coordinatore/);
    page.remove();
  });

  it("persona smarrita apre il protocollo invece di spuntarsi come le altre voci", () => {
    // E' l'unica voce che non e' una casella: tocca aprire le domande guidate.
    // Se un giorno tornasse a comportarsi come le altre, il bagnino si
    // ritroverebbe a scrivere a mano i dati mentre i genitori urlano.
    const page = document.createElement("div");
    document.body.appendChild(page);
    renderSegnalaPostazione(page);
    const voce = Array.from(page.querySelectorAll(".seg-voce")).find((b) =>
      /Minore disperso/.test(b.textContent)
    );
    expect(voce.textContent).toMatch(/domande guidate/);
    voce.click();
    expect(voce.classList.contains("is-scelta")).toBe(false);
    expect(page.querySelectorAll(".seg-voce.is-scelta").length).toBe(0);
    page.remove();
  });

  it("il protocollo chiede prima dov'era, e se era in acqua fa chiamare subito", () => {
    // L'ordine non e' estetico: "in acqua" vuol dire allerta massima, e la
    // chiamata deve poter partire prima di finire le domande. Se i pulsanti di
    // chiamata scivolassero in fondo, il protocollo sarebbe tradito.
    const disegnaProtocollo = () => {
      const page = document.createElement("div");
      document.body.appendChild(page);
      renderProtocolloMinore(page);
      return page;
    };

    avviaProtocolloMinore();
    let page = disegnaProtocollo();
    // La frase da dire viene prima della domanda, non dopo: e' quello che
    // cambia il tono di tutta la conversazione che segue.
    const calma = page.querySelector(".min-calma");
    expect(calma).not.toBeNull();
    expect(calma.compareDocumentPosition(page.querySelector(".min-titolo")))
      .toBe(Node.DOCUMENT_POSITION_FOLLOWING);
    expect(page.querySelector(".min-titolo").textContent).toMatch(/Dov'era/);
    const scelte = page.querySelectorAll(".min-scelta");
    expect(scelte.length).toBe(2);
    // Al primo passo non c'e' ancora nulla da chiamare: non si sa cos'e'
    // successo.
    expect(page.querySelector(".min-urgenza")).toBeNull();
    scelte[0].click();   // "In acqua, faceva il bagno"
    page.remove();

    page = disegnaProtocollo();
    const urgenza = page.querySelector(".min-urgenza");
    expect(urgenza).not.toBeNull();
    expect(urgenza.querySelectorAll(".min-chiamata").length).toBe(3);
    expect(urgenza.textContent).toMatch(/112/);
    // Il 1530 non e' piu' in uso: un numero che non risponde farebbe perdere
    // proprio il tempo che questa procedura serve a guadagnare.
    expect(urgenza.textContent).not.toMatch(/1530/);
    page.remove();

    // Il messaggio dice subito la cosa piu grave, e resta entro il limite che
    // le regole del database impongono ai messaggi di chat.
    const testo = componiMessaggio();
    expect(testo).toMatch(/IN ACQUA/);
    expect(testo.length).toBeLessThanOrEqual(500);
  });

  it("il protocollo a riva non mostra il riquadro dell'allerta massima", () => {
    const page = document.createElement("div");
    document.body.appendChild(page);
    avviaProtocolloMinore();
    renderProtocolloMinore(page);
    page.querySelectorAll(".min-scelta")[1].click();   // "A riva"
    page.innerHTML = "";
    renderProtocolloMinore(page);
    expect(page.querySelector(".min-urgenza")).toBeNull();
    expect(componiMessaggio()).not.toMatch(/IN ACQUA/);
    page.remove();
  });

  it("la foto del protocollo e sempre uno scatto diretto, mai la galleria", () => {
    // Sui tablet di postazione non devono restare immagini di minori: senza
    // "capture" il sistema offrirebbe la galleria e le foto verrebbero salvate.
    const page = document.createElement("div");
    document.body.appendChild(page);
    avviaProtocolloMinore();
    renderProtocolloMinore(page);
    page.querySelectorAll(".min-scelta")[1].click();
    for (let i = 0; i < 3; i++) {
      page.innerHTML = "";
      renderProtocolloMinore(page);
      const avanti = page.querySelector(".min-avanti") || page.querySelectorAll(".min-scelta")[0];
      avanti.click();
    }
    page.innerHTML = "";
    renderProtocolloMinore(page);
    const campo = page.querySelector('input[type="file"]');
    expect(campo).not.toBeNull();
    expect(campo.getAttribute("capture")).toBe("environment");
    expect(campo.hidden).toBe(true);
    page.remove();
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
