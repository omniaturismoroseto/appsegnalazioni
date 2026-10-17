// Un segnaposto di contorno che si rompe non deve portarsi via la mappa.
//
// Il 13 ottobre Google Maps e' andato in errore dentro il proprio codice
// mentre costruiva il segnaposto LOCAMARE ("Cannot set properties of
// undefined (setting 'baseVal')"). Era il primo della lista in initMap: tutti
// quelli dopo - postazioni comprese - non si disegnavano, e sopra una mappa
// funzionante compariva "Mappa non caricata". Qui si rifa' lo stesso guasto
// con una Google Maps finta e si controlla che il resto si disegni comunque.
import { describe, it, expect, beforeEach, vi } from "vitest";

const LOCAMARE = { lat: 42.669431107568684, lng: 14.024105577318382 };

// Qualunque cosa la mappa chieda a Google e non serva al test: una funzione
// che si puo' anche chiamare con new, e che restituisce altrettanta cosa finta.
function finto() {
  const f = function () { return new Proxy({}, { get: (o, k) => (k in o ? o[k] : finto()) }); };
  return new Proxy(f, { get: (o, k) => (k in o ? o[k] : finto()) });
}

let creati;
function installaGoogle() {
  creati = [];
  class AdvancedMarkerElement {
    constructor(opz = {}) {
      const p = opz.position || {};
      if (p.lat === LOCAMARE.lat && p.lng === LOCAMARE.lng) {
        throw new TypeError("Cannot set properties of undefined (setting 'baseVal')");
      }
      Object.assign(this, opz);
      this.addListener = () => {};
      creati.push(this);
    }
  }
  class MappaFinta {
    constructor(el, opz) { Object.assign(this, opz); }
    addListener() {}
    getHeading() { return 0; }
    getMapTypeId() { return "hybrid"; }
    setMapTypeId() {}
    setHeading() {}
    getDiv() { return document.getElementById("main-map"); }
    get controls() { return new Proxy({}, { get: () => ({ push() {} }) }); }
  }
  const maps = new Proxy(
    {
      importLibrary: async (n) => (n === "maps" ? { Map: MappaFinta } : {}),
      marker: { AdvancedMarkerElement },
      event: { addListenerOnce() {}, addListener() {} },
    },
    { get: (o, k) => (k in o ? o[k] : finto()) },
  );
  globalThis.google = { maps };
}

describe("initMap con un segnaposto che Google non riesce a costruire", () => {
  beforeEach(() => {
    vi.resetModules();
    document.body.innerHTML = '<div id="main-map"></div>';
    delete window.mapObj;
    delete window.locamareMarker;
    window._mapInitializing = false;
    installaGoogle();
  });

  it("disegna comunque gli altri segnaposti e non dichiara la mappa rotta", async () => {
    const segnalati = [];
    globalThis._sentryCapture = (e) => segnalati.push(e);
    const { initMap } = await import("../js/map.js");
    await initMap();
    expect(document.getElementById("map-error")).toBeNull();
    expect(window.mapObj).toBeTruthy();
    expect(creati.length).toBeGreaterThan(0);
    expect(segnalati.map((e) => e.message)).toEqual([
      "Cannot set properties of undefined (setting 'baseVal')",
    ]);
    globalThis._sentryCapture = () => {};
  });
});
