import { describe, it, expect } from "vitest";
import { knotsFromKmh, degToCompass, getRiskFromMeteo, fmtHour, wmoIcon } from "../js/meteo.js";

describe("knotsFromKmh", () => {
  it("converte km/h in nodi arrotondando", () => {
    expect(knotsFromKmh(0)).toBe(0);
    expect(knotsFromKmh(10)).toBe(5); // 10*0.539957 = 5.39957 -> 5
    expect(knotsFromKmh(20)).toBe(11); // 20*0.539957 = 10.79914 -> 11
  });
  it("gestisce input mancante come 0", () => {
    expect(knotsFromKmh(undefined)).toBe(0);
    expect(knotsFromKmh(null)).toBe(0);
  });
});

describe("degToCompass", () => {
  it("mappa i gradi cardinali principali", () => {
    expect(degToCompass(0)).toBe("N");
    expect(degToCompass(90)).toBe("E");
    expect(degToCompass(180)).toBe("S");
    expect(degToCompass(270)).toBe("O");
  });
  it("gestisce il giro oltre 360 gradi", () => {
    expect(degToCompass(360)).toBe("N");
    expect(degToCompass(405)).toBe("NE");
  });
  it("restituisce '-' per input non valido", () => {
    expect(degToCompass(undefined)).toBe("-");
    expect(degToCompass(NaN)).toBe("-");
  });
});

describe("getRiskFromMeteo", () => {
  it("segnala dati assenti", () => {
    expect(getRiskFromMeteo(null).level).toBe("n/d");
  });
  it("livello basso con condizioni calme", () => {
    const r = getRiskFromMeteo({ wave_height: 0.2, wind_speed_10m: 10, wind_gusts_10m: 15, weather_code: 1 });
    expect(r.level).toBe("basso");
    expect(r.flag).toBe("verde");
  });
  it("livello alto con onda pericolosa", () => {
    const r = getRiskFromMeteo({ wave_height: 1.5, wind_speed_10m: 10, wind_gusts_10m: 15, weather_code: 1 });
    expect(r.level).toBe("alto");
    expect(r.flag).toBe("rossa");
  });
  it("livello alto in caso di temporale, a prescindere da onda/vento", () => {
    const r = getRiskFromMeteo({ wave_height: 0.1, wind_speed_10m: 5, wind_gusts_10m: 5, weather_code: 95 });
    expect(r.level).toBe("alto");
  });
});

describe("fmtHour", () => {
  it("non lancia eccezioni con una data non valida (anche se il risultato non e' un orario)", () => {
    expect(() => fmtHour("non-una-data")).not.toThrow();
  });
  it("formatta un orario valido come HH:MM", () => {
    expect(fmtHour("2026-08-21T14:30:00")).toMatch(/^\d{2}:\d{2}$/);
  });
});

describe("wmoIcon", () => {
  it("sceglie icone diverse per codici meteo diversi", () => {
    expect(wmoIcon(0)).toBe("☀️");
    expect(wmoIcon(95)).toBe("⛈️");
  });
  it("ha un fallback per codice mancante", () => {
    expect(wmoIcon(null)).toBe("🌤️");
  });
});
