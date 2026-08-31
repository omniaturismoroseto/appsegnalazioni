// Il pannello di postazione deve restare governato dal foglio di stile.
//
// Prima le misure stavano in due posti insieme - stili scritti nel JavaScript e
// regole CSS - e si contraddicevano: un'altezza minima nel codice impediva alla
// griglia di comprimere i riquadri, e nessuno dei due aveva torto da solo. Ne
// sono usciti riquadri che non riempivano lo schermo e uno scorrimento che non
// doveva esserci.
//
// jsdom non calcola il layout, quindi qui non si misurano pixel: si verifica il
// patto che li rende possibili. Ogni riquadro deve portare la propria classe, e
// negli attributi di stile possono restare solo variabili di colore - che sono
// dati (il colore della bandiera cambia col mare), non misure.
import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { renderStationPanel } from "../js/pages-station.js";

function pannello() {
  const page = document.createElement("div");
  document.body.appendChild(page);
  renderStationPanel(page);
  return page;
}

const CLASSI_AMMESSE = ["st-tile", "st-note", "st-flagchooser"];

describe("stile del pannello di postazione", () => {
  it("ogni riquadro porta una classe, nessuno e' lasciato agli stili in linea", () => {
    const page = pannello();
    const grid = page.querySelector(".st-grid");
    expect(grid).not.toBeNull();
    const figli = Array.from(grid.children);
    expect(figli.length).toBeGreaterThan(0);
    const senzaClasse = figli.filter(
      (n) => !CLASSI_AMMESSE.some((c) => n.classList.contains(c))
    );
    expect(senzaClasse.map((n) => n.className || n.tagName)).toEqual([]);
  });

  it("negli stili in linea restano solo variabili di colore, mai misure", () => {
    const page = pannello();
    const conStile = Array.from(page.querySelectorAll(".st-grid [style]"));
    const misureSfuggite = conStile
      .map((n) => n.getAttribute("style"))
      .filter((s) => s && s.split(";").some((d) => d.trim() && !d.trim().startsWith("--")));
    expect(misureSfuggite).toEqual([]);
  });

  it("la barra dell'emergenza usa le proprie classi", () => {
    pannello();
    const bar = document.getElementById("_stEmergencyBar");
    expect(bar).not.toBeNull();
    expect(bar.classList.contains("st-em")).toBe(true);
    expect(bar.querySelector(".st-em__btn")).not.toBeNull();
    expect(bar.querySelector(".st-em__fill")).not.toBeNull();
  });

  it("la bandiera occupa la riga intera, nota e meteo la dividono", () => {
    const page = pannello();
    const wide = Array.from(page.querySelectorAll(".st-grid .st-wide"));
    // La bandiera e lo stato che si legge da lontano: tiene la riga tutta per se.
    const bandiera = page.querySelector(".st-grid .st-tile.st-wide");
    expect(bandiera).not.toBeNull();
    expect(bandiera.textContent).toMatch(/BANDIERA/);
    // Nota e meteo condividono una riga: cosi ne resta una in piu per il
    // pulsante EMERGENZA, che deve essere il bersaglio piu grande dello schermo.
    const nota = page.querySelector(".st-note");
    const meteo = Array.from(page.querySelectorAll(".st-grid .st-tile")).find((n) => /METEO/.test(n.textContent));
    expect(nota.classList.contains("st-wide")).toBe(false);
    expect(meteo.classList.contains("st-wide")).toBe(false);
    // Restano a tutta larghezza solo bandiera e il suo selettore di colore.
    expect(wide.length).toBe(2);
  });
});

describe("elementi nascosti con hidden", () => {
  // jsdom non applica il foglio di stile, quindi questo e' l'unico posto dove
  // il difetto si puo' bloccare: un elemento con display: flex o block resta a
  // schermo anche con l'attributo "hidden", perche' la regola scritta qui vince
  // su quella del browser. E' successo davvero - il pulsante "Chiudi
  // segnalazione" restava sotto la domanda di conferma - e a occhio nudo nei
  // test non si vedeva, perche' l'attributo risultava impostato.
  const css = readFileSync(join(process.cwd(), "css", "app.css"), "utf8");

  const daNascondere = ["sr-chiudi__btn", "sr-conferma", "seg-anteprima", "seg-foto-btn"];

  daNascondere.forEach((classe) => {
    it("resta invisibile davvero: ." + classe, () => {
      expect(css).toContain("." + classe + "[hidden]");
    });
  });
});
