import { describe, it, expect } from "vitest";
import { fmtDist, haversine, findNearest, _escapeHtml, _safeTokenKey, romeNow } from "../js/core.js";

describe("fmtDist", () => {
  it("mostra i metri sotto 1000m", () => {
    expect(fmtDist(250)).toBe("250m");
    expect(fmtDist(999)).toBe("999m");
  });
  it("passa ai km da 1000m in su, con un decimale", () => {
    expect(fmtDist(1000)).toBe("1.0km");
    expect(fmtDist(2300)).toBe("2.3km");
  });
});

describe("haversine", () => {
  it("distanza nulla tra un punto e se stesso", () => {
    expect(haversine(42.67, 14.02, 42.67, 14.02)).toBe(0);
  });
  it("calcola una distanza reale plausibile (Roseto, ~1.6km tra due postazioni note)", () => {
    // P.10 e P.20 di public/stations-data.js
    const d = haversine(42.6712, 14.02308, 42.68372, 14.01391);
    expect(d).toBeGreaterThan(1500);
    expect(d).toBeLessThan(1700);
  });
});

describe("findNearest", () => {
  it("trova la postazione piu' vicina tra quelle note (vedi test/setup.js)", () => {
    // molto vicino a P.10 (42.6712,14.02308)
    const r = findNearest(42.6713, 14.0231);
    expect(r.station.num).toBe(10);
    expect(r.dist).toBeLessThan(50);
  });
  it("sceglie unaltra postazione quando piu' vicina", () => {
    // molto vicino a P.30 (42.6963,14.00378)
    const r = findNearest(42.6964, 14.0038);
    expect(r.station.num).toBe(30);
  });
});

describe("_escapeHtml", () => {
  it("neutralizza i caratteri pericolosi per l'injection HTML", () => {
    expect(_escapeHtml('<script>alert("x")</script>')).toBe(
      "&lt;script&gt;alert(&quot;x&quot;)&lt;/script&gt;"
    );
  });
  it("gestisce anche & e apostrofo", () => {
    expect(_escapeHtml("Mario & l'ombrellone")).toBe("Mario &amp; l&#39;ombrellone");
  });
  it("converte in stringa i valori non testuali", () => {
    expect(_escapeHtml(42)).toBe("42");
  });
});

describe("_safeTokenKey", () => {
  it("produce una chiave senza caratteri non validi per un path Firebase (/ + .)", () => {
    const key = _safeTokenKey("abc/def+ghi==");
    expect(key).not.toMatch(/[/+=.]/);
  });
  it("e' deterministica per lo stesso input", () => {
    expect(_safeTokenKey("stesso-token")).toBe(_safeTokenKey("stesso-token"));
  });
});

describe("romeNow", () => {
  it("restituisce ora, minuti e data nel formato atteso", () => {
    const r = romeNow();
    expect(r.h).toBeGreaterThanOrEqual(0);
    expect(r.h).toBeLessThan(24);
    expect(r.m).toBeGreaterThanOrEqual(0);
    expect(r.m).toBeLessThan(60);
    expect(r.date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });
});
