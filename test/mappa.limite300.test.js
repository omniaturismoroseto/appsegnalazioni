// Il limite dei 300 metri dalla battigia (Ord. 29/2026), la riga tratteggiata
// arancione al largo delle postazioni.
//
// Nasceva dalle postazioni, che stanno sulla sabbia e non sul bagnasciuga, e
// le spostava tutte di 300 metri in un'unica direzione media: ne usciva una
// retta parallela alla corda tra il primo e l'ultimo punto, e dove la costa
// piega il limite entrava in spiaggia da una parte e tagliava il mare
// dall'altra. Fuori stagione, con zero postazioni in servizio, restavano i
// due soli capi: un unico segmento dritto in mezzo al mare.
//
// Ora parte dalla battigia vera (dati OpenStreetMap) e ogni punto si sposta
// perpendicolarmente alla costa come gira li'. Questi test fissano le due
// proprieta' che contano: la distanza giusta e la curva seguita.
import { describe, it, expect } from "vitest";
import { BATTIGIA, puntiLimite300 } from "../js/map.js";

// Il limite dei 300 metri deve stare a 300 metri dalla battigia DAPPERTUTTO,
// anche dove la costa piega. Con una direzione media sola (com'era) usciva
// una retta: dove la costa girava, il limite entrava in spiaggia da una parte
// e tagliava il mare dall'altra.
describe("limite dei 300 metri dalla battigia", () => {
  // Costa a gomito: prima verso nord, poi piega verso nord-ovest.
  const battigia = [
    { lat: 42.66, lng: 14.03 },
    { lat: 42.67, lng: 14.03 },
    { lat: 42.68, lng: 14.02 },
  ];
  const metri = (a, b) => {
    const dx = (b.lng - a.lng) * 81657;
    const dy = (b.lat - a.lat) * 111111;
    return Math.hypot(dx, dy);
  };

  it("ogni punto del limite dista 300 metri dal suo punto di costa", () => {
    const l = puntiLimite300(battigia);
    expect(l).toHaveLength(battigia.length);
    l.forEach((p, i) => {
      expect(metri(battigia[i], p)).toBeGreaterThan(295);
      expect(metri(battigia[i], p)).toBeLessThan(305);
    });
  });

  it("dove la costa piega, il limite piega con lei invece di tirare dritto", () => {
    const l = puntiLimite300(battigia);
    // Scostamento del punto di mezzo dalla retta tra il primo e l'ultimo: se
    // il limite fosse una retta sola sarebbe zero.
    const a = l[0], b = l[2], m = l[1];
    const dx = (b.lng - a.lng) * 81657, dy = (b.lat - a.lat) * 111111;
    const px = (m.lng - a.lng) * 81657, py = (m.lat - a.lat) * 111111;
    const scarto = Math.abs(dy * px - dx * py) / Math.hypot(dx, dy);
    expect(scarto).toBeGreaterThan(30);
  });

  it("sposta verso il mare, cioe' a est della costa", () => {
    puntiLimite300(battigia).forEach((p, i) => {
      expect(p.lng).toBeGreaterThan(battigia[i].lng);
    });
  });

  it("la battigia vera parte da Foce Vomano e arriva a Foce Tordino", () => {
    expect(BATTIGIA.length).toBeGreaterThan(20);
    expect(BATTIGIA[0].lat).toBeCloseTo(42.657, 2);
    expect(BATTIGIA[BATTIGIA.length - 1].lat).toBeCloseTo(42.738, 2);
    // Ordinata da sud a nord, senza salti indietro oltre i pennelli
    for (let i = 1; i < BATTIGIA.length; i++) {
      expect(BATTIGIA[i].lat).toBeGreaterThanOrEqual(BATTIGIA[i - 1].lat - 0.001);
    }
  });

  it("sulla costa vera il limite non torna mai indietro verso la spiaggia", () => {
    // Ogni punto del limite deve restare piu' a est (verso il mare) del
    // punto di costa corrispondente: e' il controllo che falliva quando la
    // direzione era una sola per tutti.
    puntiLimite300(BATTIGIA).forEach((p, i) => {
      expect(p.lng).toBeGreaterThan(BATTIGIA[i].lng);
    });
  });
});
