// La mappa non deve raddrizzarsi verso nord da sola.
//
// La costa di Roseto e' storta rispetto al nord, quindi l'app apre la mappa
// ruotata (COAST_HEADING) per stendere il litorale sul lato lungo dello
// schermo. Il guaio e' che qualcun altro puo' azzerare quella rotazione senza
// che nessuno l'abbia chiesto: fitBounds(), che _syncUserMarker chiama quando
// arriva il primo fix GPS, sulle mappe vettoriali "sets the map's tilt and
// heading to their default zero values" — e' Google a documentarlo. In
// spiaggia si vedeva la mappa girare verso nord da sola appena il GPS
// agganciava.
//
// Chi guarda non ha nessun modo di ruotare la mappa col gesto (il comando
// bussola di Google e' disattivato e headingInteractionEnabled e' spento):
// l'unica rotazione legittima e' quella scelta col pulsante e salvata. Ogni
// altro heading e' quindi da rimettere a posto, chiunque l'abbia cambiato.
// Questi test fissano quella proprieta'.
import { describe, it, expect, beforeEach } from "vitest";
import { COAST_HEADING, _spostamentoPerVedere, applyHeadingPreference } from "../js/map.js";

// Il localStorage di questo jsdom e' un oggetto senza metodi: map.js lo legge
// dentro un try/catch e ripiegherebbe sempre sulla costa, cosi' il caso "ho
// scelto il nord" passerebbe senza essere mai provato davvero. Gliene diamo
// uno vero, in memoria.
const memoria = new Map();
Object.defineProperty(window, "localStorage", {
  configurable: true,
  value: {
    getItem: (k) => (memoria.has(k) ? memoria.get(k) : null),
    setItem: (k, v) => memoria.set(k, String(v)),
    removeItem: (k) => memoria.delete(k),
    clear: () => memoria.clear(),
  },
});

// Mappa finta ridotta all'osso: di applyHeadingPreference interessa solo che
// legga e scriva l'heading. Registra anche quante volte viene scritto, per
// distinguere "era gia' giusto" da "l'ha rimesso".
function mappaFinta(heading) {
  return {
    heading,
    scritture: 0,
    getHeading() { return this.heading; },
    setHeading(v) { this.heading = v; this.scritture++; },
    // Riproduce l'effetto documentato di fitBounds su mappa vettoriale.
    fitBoundsCheAzzera() { this.heading = 0; this.tilt = 0; },
  };
}

describe("rotazione della mappa", () => {
  beforeEach(() => {
    localStorage.clear();
    delete window.mapObj;
  });

  it("di base apre con la costa in orizzontale, senza preferenze salvate", () => {
    const mappa = mappaFinta(0);
    window.mapObj = mappa;
    applyHeadingPreference();
    expect(mappa.heading).toBe(COAST_HEADING);
  });

  it("rimette la rotazione dopo il fitBounds del primo fix GPS", () => {
    const mappa = mappaFinta(COAST_HEADING);
    window.mapObj = mappa;
    mappa.fitBoundsCheAzzera();
    expect(mappa.heading).toBe(0); // il guaio, riprodotto
    applyHeadingPreference();
    expect(mappa.heading).toBe(COAST_HEADING); // e rimesso a posto
  });

  it("rimette la rotazione qualunque sia la causa dell'azzeramento", () => {
    const mappa = mappaFinta(COAST_HEADING);
    window.mapObj = mappa;
    mappa.heading = 0; // un terzo qualsiasi, non solo fitBounds
    applyHeadingPreference();
    expect(mappa.heading).toBe(COAST_HEADING);
  });

  it("rispetta chi ha scelto il nord in alto, e non glielo gira sotto il naso", () => {
    localStorage.setItem("omnia_map_heading", "north");
    const mappa = mappaFinta(COAST_HEADING);
    window.mapObj = mappa;
    applyHeadingPreference();
    expect(mappa.heading).toBe(0);
  });

  it("non tocca la mappa quando la rotazione e' gia' quella scelta", () => {
    const mappa = mappaFinta(COAST_HEADING);
    window.mapObj = mappa;
    applyHeadingPreference();
    // Serve a non innescare un rimpallo: il guardiano e' agganciato proprio
    // all'evento heading_changed che setHeading fa scattare.
    expect(mappa.scritture).toBe(0);
  });

  it("non esplode se la mappa non c'e' ancora", () => {
    expect(() => applyHeadingPreference()).not.toThrow();
  });
});

// Il caso visto in spiaggia dopo il GPS: a ogni tocco su una postazione la
// mappa tornava col nord in alto. La causa non era la rotazione in se' ma il
// fumetto: per farlo entrare nello schermo l'InfoWindow di Google chiama
// panToBounds, che sulle mappe vettoriali azzera rotazione e inclinazione
// esattamente come fitBounds. Ora l'auto-pan e' spento e il rientro in vista
// lo calcola _spostamentoPerVedere, che finisce in panBy: pixel, non camera.
describe("rientro in vista del fumetto, senza toccare la rotazione", () => {
  const mappa = { left: 0, top: 0, right: 400, bottom: 300 };
  const popup = (left, top, w, h) => ({ left, top, right: left + w, bottom: top + h });

  it("non sposta niente quando il fumetto ci sta gia'", () => {
    expect(_spostamentoPerVedere(popup(100, 100, 200, 120), mappa)).toEqual({ dx: 0, dy: 0 });
  });
  it("scopre il fumetto che sborda in alto", () => {
    // 20px sopra il bordo, piu' i 12 di margine
    expect(_spostamentoPerVedere(popup(100, -20, 200, 120), mappa).dy).toBe(-32);
  });
  it("scopre il fumetto che sborda a destra e in basso", () => {
    const s = _spostamentoPerVedere(popup(260, 220, 200, 120), mappa);
    expect(s.dx).toBe(72);
    expect(s.dy).toBe(52);
  });
  it("un fumetto piu' largo del riquadro non si insegue di lato", () => {
    expect(_spostamentoPerVedere(popup(-30, 100, 460, 120), mappa).dx).toBe(0);
  });
  it("un fumetto piu' alto del riquadro si allinea in cima", () => {
    expect(_spostamentoPerVedere(popup(100, -50, 200, 400), mappa).dy).toBe(-62);
  });
});
