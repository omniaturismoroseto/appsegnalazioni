// A chi arriva l'avviso di una segnalazione.
//
// Il client scrive nella segnalazione l'etichetta della postazione
// ("P.20 – Lido Azzurra") e il server la rilegge per sapere chi svegliare.
// Sono due pezzi diversi, scritti in due linguaggi diversi, che devono
// accordarsi su una stringa: e' il punto in cui due parti di un programma
// cominciano tipicamente a dire cose diverse senza che nessuno se ne accorga,
// perche' il sintomo non e' un errore - e' un telefono che non suona.
//
// Per questo qui non si prova il server contro stringhe inventate: si prova
// contro quelle che il client produce davvero, per ognuna delle postazioni.
import { describe, it, expect } from "vitest";
import { postazioneDellaSegnalazione } from "../functions/instradamento.js";
import { STATIONS, zonaPostazione } from "../js/core.js";

describe("dalla segnalazione alla postazione", () => {
  it("rilegge l'etichetta che scrive il client, con il nome della postazione", () => {
    // Le postazioni note al client: l'etichetta viene completa, "P.20 – Lido
    // Azzurra". E' la forma che hanno le segnalazioni vere.
    expect(STATIONS.length).toBeGreaterThan(0);
    STATIONS.forEach((s) => {
      const zone = zonaPostazione(s.num);
      expect(zone, "etichetta di " + s.num).toMatch(/ – /);
      expect(postazioneDellaSegnalazione({ zone }), zone).toBe(String(s.num));
    });
  });

  it("rilegge l'etichetta anche senza il nome, su tutti i numeri in uso", () => {
    // Se una postazione non fosse nell'elenco del client, l'etichetta resta il
    // solo numero. Deve funzionare lo stesso: sono i numeri veri, dalla 10 alla
    // 35, ed e' la forma piu' facile da rompere con un'espressione regolare
    // scritta male.
    for (let num = 10; num <= 35; num++) {
      const zone = zonaPostazione(num);
      expect(postazioneDellaSegnalazione({ zone }), zone).toBe(String(num));
    }
  });

  it("legge il numero intero, non le prime cifre", () => {
    expect(postazioneDellaSegnalazione({ zone: "P.1 – Qualcosa" })).toBe("1");
    expect(postazioneDellaSegnalazione({ zone: "P.10 – Spiaggia Libera" })).toBe("10");
    expect(postazioneDellaSegnalazione({ zone: "P.35 – Cabana Park" })).toBe("35");
  });

  it("rifiuta un'etichetta malformata invece di troncarla", () => {
    // "P.1000" non e' una postazione. Troncarlo a 100 sarebbe peggio che
    // arrendersi: l'avviso partirebbe verso una postazione inesistente e non
    // arriverebbe a nessuno, senza che niente segnali il problema.
    expect(postazioneDellaSegnalazione({ zone: "P.1000 – Inventata" })).toBeNull();
    expect(postazioneDellaSegnalazione({ zone: "P.12345" })).toBeNull();
  });

  it("senza una postazione riconoscibile non sveglia nessuno", () => {
    // Sono i valori che l'app pubblica scrive quando il GPS non ha risposto:
    // meglio nessun destinatario che una postazione indovinata.
    expect(postazioneDellaSegnalazione({ zone: "Posizione GPS (vedi link)" })).toBeNull();
    expect(postazioneDellaSegnalazione({ zone: "Zona non specificata" })).toBeNull();
    expect(postazioneDellaSegnalazione({ zone: "" })).toBeNull();
    expect(postazioneDellaSegnalazione({})).toBeNull();
    expect(postazioneDellaSegnalazione(null)).toBeNull();
  });

  it("non si fa ingannare da un'etichetta che comincia per caso con P.", () => {
    expect(postazioneDellaSegnalazione({ zone: "Parco della Rimembranza" })).toBeNull();
    expect(postazioneDellaSegnalazione({ zone: "P. Aurora" })).toBeNull();
  });
});
