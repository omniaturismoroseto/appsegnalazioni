// Il promemoria accorpato: a chi arriva, e cosa dice.
//
// La proprietà che conta, e che questi test tengono ferma, è che
// l'accorpamento non è un filtro. Il primo allarme di ogni segnalazione parte
// sempre e non passa di qui (sendPushOnNewReport); qui si tocca solo la
// RIPETIZIONE, che ridice una cosa già detta. Senza accorpamento, con cento
// segnalazioni aperte ogni telefono riceve cento squilli al minuto per
// quindici minuti, e un telefono così smette di essere guardato - proprio
// quello da cui un giorno arriva la sirena.
//
// Il numero non dice se le segnalazioni sono vere o false: cento segnalazioni
// vere durante una mareggiata fanno lo stesso danno di cento finte. Per
// questo non si decide in base al numero *se* avvisare, ma *come*.
//
// L'altra proprietà, meno ovvia e più facile da rompere: una postazione non
// deve sentirsi riassumere segnalazioni di un tratto che non le compete. I
// destinatari di una segnalazione dipendono dalla sua zona, quindi il
// riepilogo si costruisce per destinatario, non uno uguale per tutti.
import { describe, it, expect } from "vitest";
import {
  SOGLIA_ACCORPAMENTO,
  ZONE_NEL_TESTO,
  raggruppaPerDestinatario,
  testoRiepilogo,
} from "../functions/riepilogo.js";

// Come le costruisce index.js: percorsi è token -> dove sta quel token nel
// database, così un token morto si cancella da dove sta davvero.
function voce(id, r, tokenEPercorsi) {
  return { id, r, percorsi: new Map(Object.entries(tokenEPercorsi)) };
}

describe("a chi arriva il promemoria", () => {
  it("chi riceve le stesse segnalazioni sta nello stesso gruppo: un invio, non uno a testa", () => {
    const gruppi = raggruppaPerDestinatario([
      voce("a", { zone: "P.3" }, { tokenCentrale: "operatorTokens/x", tokenAdmin: "config/emergencyContacts/admin/pushToken" }),
      voce("b", { zone: "P.4" }, { tokenCentrale: "operatorTokens/x", tokenAdmin: "config/emergencyContacts/admin/pushToken" }),
    ]);
    expect(gruppi).toHaveLength(1);
    expect(gruppi[0].tokens.sort()).toEqual(["tokenAdmin", "tokenCentrale"]);
    expect(gruppi[0].segnalazioni.map((s) => s[0])).toEqual(["a", "b"]);
  });

  it("una postazione riceve solo le sue, il centro operativo tutte", () => {
    // P.3 è destinataria solo della sua; la centrale di entrambe.
    const gruppi = raggruppaPerDestinatario([
      voce("a", { zone: "P.3" }, { tokenP3: "stationDevices/d3/pushToken", tokenCentrale: "operatorTokens/x" }),
      voce("b", { zone: "P.20" }, { tokenP20: "stationDevices/d20/pushToken", tokenCentrale: "operatorTokens/x" }),
    ]);
    expect(gruppi).toHaveLength(3);

    const perToken = {};
    gruppi.forEach((g) => g.tokens.forEach((t) => { perToken[t] = g.segnalazioni.map((s) => s[0]); }));
    expect(perToken.tokenP3).toEqual(["a"]);
    expect(perToken.tokenP20).toEqual(["b"]);
    expect(perToken.tokenCentrale).toEqual(["a", "b"]);
  });

  it("ogni token si porta dietro il percorso da cui cancellarlo se risulta morto", () => {
    const gruppi = raggruppaPerDestinatario([
      voce("a", { zone: "P.3" }, { tokenP3: "stationDevices/d3/pushToken" }),
    ]);
    expect(gruppi[0].percorsi.get("tokenP3")).toBe("stationDevices/d3/pushToken");
  });

  it("nessun destinatario, nessun gruppo", () => {
    expect(raggruppaPerDestinatario([])).toEqual([]);
    expect(raggruppaPerDestinatario([voce("a", { zone: "P.3" }, {})])).toEqual([]);
  });

  it("non perde nessuna segnalazione: ogni destinatario le ritrova tutte le sue", () => {
    // Cento segnalazioni, un destinatario che le riguarda tutte.
    const molte = Array.from({ length: 100 }, (_, i) =>
      voce("r" + i, { zone: "P." + (i % 20), type: "pericolo" }, { centrale: "operatorTokens/x" })
    );
    const gruppi = raggruppaPerDestinatario(molte);
    expect(gruppi).toHaveLength(1);
    expect(gruppi[0].segnalazioni).toHaveLength(100);
  });
});

describe("cosa dice il promemoria", () => {
  const seg = (zone, type) => ["id" + zone, { zone, type }];

  it("dice quante sono", () => {
    const { title } = testoRiepilogo([seg("P.3"), seg("P.4"), seg("P.5")]);
    expect(title).toContain("3");
    expect(title).toContain("segnalazioni ancora aperte");
  });

  it("al singolare quando è una sola", () => {
    expect(testoRiepilogo([seg("P.3")]).title).toContain("1 segnalazione ancora aperta");
  });

  it("conta le emergenze a parte: sono quelle che cambiano cosa fai", () => {
    const { body } = testoRiepilogo([seg("P.3", "emergenza"), seg("P.4", "pericolo"), seg("P.5", "emergenza")]);
    expect(body).toContain("2 emergenze");
  });

  it("non scrive le emergenze se non ce ne sono", () => {
    expect(testoRiepilogo([seg("P.3", "pericolo")]).body).not.toContain("emergenz");
  });

  it("elenca le zone, senza ripetere la stessa due volte", () => {
    const { body } = testoRiepilogo([seg("P.3"), seg("P.3"), seg("P.4")]);
    expect(body).toContain("P.3");
    expect(body).toContain("P.4");
    expect(body.match(/P\.3/g)).toHaveLength(1);
  });

  it("oltre cinque zone conta le altre, invece di farsi tagliare dal sistema", () => {
    const tante = ["P.1", "P.2", "P.3", "P.4", "P.5", "P.6", "P.7"].map((z) => seg(z));
    const { body } = testoRiepilogo(tante);
    expect(body).toContain("e altre 2");
    expect(body).toContain("P." + ZONE_NEL_TESTO);
    expect(body).not.toContain("P.6");
  });

  it("senza zone resta comunque chiaro perché sta suonando", () => {
    const { title, body } = testoRiepilogo([["x", {}], ["y", {}]]);
    expect(title).toContain("2");
    expect(body.length).toBeGreaterThan(0);
  });
});

describe("la soglia", () => {
  it("lascia stare i casi normali", () => {
    // Due o tre segnalazioni aperte insieme capitano in una giornata
    // qualsiasi: lì la ripetizione per esteso serve, e non si accorpa.
    expect(SOGLIA_ACCORPAMENTO).toBeGreaterThanOrEqual(2);
    // E non è così alta da lasciar passare il caso che fa danno.
    expect(SOGLIA_ACCORPAMENTO).toBeLessThanOrEqual(5);
  });
});
