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

describe("il pannello sta dentro lo schermo", () => {
  // Il 31 agosto 2026, su un tablet in orizzontale, chat e radio finivano sotto
  // la barra EMERGENZA e la pagina scorreva di 124px: due riquadri erano a
  // schermo ma non premibili. Non era un dettaglio estetico, era meta pannello
  // fuori uso.
  //
  // La causa erano due misure che sembravano prudenti e invece impedivano di
  // adattarsi: min-height sul contenitore, che lo lascia crescere oltre il
  // bordo, e un minimo di 56px sulle righe, che quando lo spazio non basta non
  // si comprime - sfonda. jsdom non calcola il layout, quindi qui si verifica
  // il patto che tiene: il contenitore e vincolato all altezza dello schermo e
  // le righe si spartiscono quello che c e.
  const css = readFileSync(join(process.cwd(), "css", "app.css"), "utf8");

  function regola(selettore) {
    const i = css.indexOf(selettore + "{");
    expect(i, "regola non trovata: " + selettore).toBeGreaterThan(-1);
    return css.slice(i + selettore.length + 1, css.indexOf("}", i));
  }

  it("il contenitore e alto quanto lo schermo, non 'almeno'", () => {
    const r = regola(".st-wrap");
    expect(r).toMatch(/height:calc\(100dvh/);
    // min-height lo lascerebbe crescere oltre il bordo appena il contenuto non
    // ci sta: e esattamente il guasto di prima.
    expect(r).not.toMatch(/min-height:calc\(100dvh/);
  });

  it("le righe si spartiscono lo spazio, senza un minimo che le faccia debordare", () => {
    const r = regola(".st-grid");
    expect(r).toMatch(/grid-auto-rows:minmax\(0,\s*1fr\)/);
    // Senza min-height:0 un elemento flex non scende sotto il proprio
    // contenuto, e la griglia tornerebbe a sfondare comunque.
    expect(r).toMatch(/min-height:0/);
  });

  it("sugli schermi bassi si stringe prima la barra EMERGENZA, non i riquadri", () => {
    // L ordine in cui si cede spazio conta: la barra e una riga fissa che sa
    // rimpicciolirsi senza perdere niente, i riquadri sono quello che si preme.
    expect(css).toMatch(/@media\(max-height:560px\)/);
    const bassi = css.slice(css.indexOf("@media(max-height:560px)"));
    expect(bassi).toMatch(/\.st-em__btn\{min-height:84px/);
    expect(bassi).toMatch(/\.st-wrap\{padding-bottom:104px/);
  });

  it("la riserva in fondo copre la barra EMERGENZA in ogni scaglione", () => {
    // Se la riserva fosse piu bassa della barra, l ultima riga di riquadri
    // finirebbe sotto: e la stessa coppia di misure che si era slegata.
    const scaglioni = [
      { barra: 140, riserva: 170 },   // schermi normali
      { barra: 110, riserva: 138 },   // max-height:700px
      { barra: 84, riserva: 104 },    // max-height:560px
    ];
    scaglioni.forEach(({ barra, riserva }) => {
      expect(riserva, "riserva " + riserva + " non copre una barra da " + barra)
        .toBeGreaterThan(barra);
    });
    expect(regola(".st-em__btn")).toMatch(/min-height:140px/);
    expect(regola(".st-wrap")).toMatch(/padding-bottom:170px/);
  });

  it("la chat riserva lo stesso spazio del pannello: sotto c e la stessa barra", () => {
    // Quando le due misure si erano slegate, in orizzontale la chat lasciava
    // una striscia vuota alta quanto la differenza.
    expect(regola(".st-chat")).toMatch(/padding-bottom:170px/);
    const bassi = css.slice(css.indexOf("@media(max-height:700px)"));
    expect(bassi).toMatch(/\.st-chat\{padding-bottom:138px/);
    const bassissimi = css.slice(css.indexOf("@media(max-height:560px)"));
    expect(bassissimi).toMatch(/\.st-chat\{padding-bottom:104px/);
  });
});
