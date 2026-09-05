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

const CLASSI_AMMESSE = ["st-tile", "st-flagchooser"];

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

  it("nella griglia ci sono solo cose che si premono; nota e meteo stanno fuori", () => {
    // Nota e meteo sono due righe da leggere, non bersagli da premere in fretta.
    // Dentro la griglia si prendevano una riga intera - un quarto dello schermo -
    // e la toglievano ai riquadri che invece si premono davvero.
    const page = pannello();
    expect(page.querySelector(".st-grid .st-note")).toBeNull();
    expect(page.querySelector(".st-grid .st-meteo")).toBeNull();
    const strisce = page.querySelector(".st-strisce");
    expect(strisce).not.toBeNull();
    expect(strisce.querySelector(".st-note")).not.toBeNull();
    expect(strisce.querySelector(".st-meteo")).not.toBeNull();
    // La bandiera e' lo stato che si legge da lontano: tiene la riga tutta per
    // se, e con lei solo il suo selettore di colore.
    const bandiera = page.querySelector(".st-grid .st-tile.st-wide");
    expect(bandiera).not.toBeNull();
    expect(bandiera.textContent).toMatch(/BANDIERA/);
    expect(page.querySelectorAll(".st-grid .st-wide").length).toBe(2);
  });

  it("le icone sono disegnate qui, non affidate alle emoji di sistema", () => {
    // Le emoji erano grandi quanto la scritta accanto: a un braccio di distanza
    // e sotto il sole non si riconoscevano, e cambiavano forma da un modello di
    // telefono all'altro. Ogni riquadro porta il proprio tracciato.
    const page = pannello();
    const riquadri = Array.from(page.querySelectorAll(".st-grid .st-tile"));
    expect(riquadri.length).toBeGreaterThan(0);
    const senzaIcona = riquadri.filter((t) => !t.querySelector("svg"));
    expect(senzaIcona.map((t) => t.textContent.trim())).toEqual([]);
    // E nelle scritte dei riquadri non ne devono ricomparire.
    const conEmoji = riquadri
      .map((t) => t.textContent)
      .filter((t) => /\p{Extended_Pictographic}/u.test(t));
    expect(conEmoji).toEqual([]);
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

  it("la barra EMERGENZA e la riserva che le lascia posto sono un numero solo", () => {
    // Non tre elenchi di numeri da tenere allineati a mano - pannello, chat e
    // barra - ma una coppia di variabili per scaglione, letta da tutti e tre.
    // Quando erano tre elenchi si sono slegati davvero.
    expect((css.match(/--st-em-alt:/g) || []).length).toBe(3);
    expect((css.match(/--st-em-riserva:/g) || []).length).toBe(3);
    expect(regola(".st-wrap")).toMatch(/padding-bottom:var\(--st-em-riserva\)/);
    expect(regola(".st-chat")).toMatch(/padding-bottom:var\(--st-em-riserva\)/);
    expect(regola(".st-em__btn")).toMatch(/min-height:var\(--st-em-alt\)/);
  });

  it("la riserva in fondo copre la barra EMERGENZA in ogni scaglione", () => {
    // Se la riserva fosse piu bassa della barra, l ultima riga di riquadri
    // finirebbe sotto: e la stessa coppia di misure che si era slegata.
    const coppie = Array.from(
      css.matchAll(/--st-em-alt:(\d+)px[^}]*?--st-em-riserva:(\d+)px/g)
    ).map((m) => ({ barra: Number(m[1]), riserva: Number(m[2]) }));
    expect(coppie.length, "ogni scaglione deve dichiarare la coppia").toBe(3);
    coppie.forEach(({ barra, riserva }) => {
      expect(riserva, "riserva " + riserva + " non copre una barra da " + barra)
        .toBeGreaterThan(barra);
    });
  });

  it("sugli schermi bassi si stringe prima la barra EMERGENZA, non i riquadri", () => {
    // L ordine in cui si cede spazio conta: la barra e una riga fissa che sa
    // rimpicciolirsi senza perdere niente, i riquadri sono quello che si preme.
    expect(css).toMatch(/@media\(max-height:560px\)/);
    const bassi = css.slice(css.indexOf("@media(max-height:560px)"));
    expect(bassi).toMatch(/--st-em-alt:84px/);
    expect(bassi).toMatch(/--st-em-riserva:104px/);
  });
});
