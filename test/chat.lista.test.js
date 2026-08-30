// La lista della chat deve AGGIORNARSI, non rifarsi da capo.
//
// Prima ogni messaggio in arrivo ricostruiva l'intera lista, e questo
// distruggeva il lettore di un vocale in ascolto: chi stava riascoltando un
// messaggio se lo vedeva interrompere a meta'. Proprio la funzione per cui i
// vocali restano in chat ("se non l'ho sentito bene, lo riascolto").
//
// Questi test verificano la proprieta' che lo garantisce: un messaggio gia' a
// schermo resta lo STESSO elemento del documento anche dopo che ne sono
// arrivati altri. E' una condizione che leggendo il codice sembra sempre vera
// e che si rompe con una riga distratta.
import { describe, it, expect, beforeEach } from "vitest";
import { _renderMessages } from "../js/chat.js";

function messaggio(id, extra) {
  return Object.assign({ authorLabel: "P.10", role: "station", ts: 1000 + id, text: "messaggio " + id }, extra || {});
}

function finto(messaggi) {
  return {
    getMessages: () => messaggi,
    getResetAt: () => 0,
    emptyToday: "Nessun messaggio ancora oggi.",
  };
}

describe("lista della chat", () => {
  let lista;

  beforeEach(() => {
    // Da admin la lista non filtra per orario di azzeramento: cosi' il test
    // guarda solo cio' che deve guardare.
    window.isAdmin = true;
    lista = document.createElement("div");
    document.body.appendChild(lista);
  });

  it("mostra tutti i messaggi", () => {
    _renderMessages(lista, finto({ a: messaggio(1), b: messaggio(2) }));
    expect(lista.querySelectorAll("[data-mid]").length).toBe(2);
  });

  it("non ridisegna i messaggi gia' presenti quando ne arriva uno nuovo", () => {
    const messaggi = { a: messaggio(1), b: messaggio(2) };
    _renderMessages(lista, finto(messaggi));
    const primoPrima = lista.querySelector('[data-mid="a"]');
    const secondoPrima = lista.querySelector('[data-mid="b"]');

    messaggi.c = messaggio(3);
    _renderMessages(lista, finto(messaggi));

    // Stessi oggetti, non solo stesso contenuto: e' questo che tiene in vita
    // un lettore audio in riproduzione.
    expect(lista.querySelector('[data-mid="a"]')).toBe(primoPrima);
    expect(lista.querySelector('[data-mid="b"]')).toBe(secondoPrima);
    expect(lista.querySelectorAll("[data-mid]").length).toBe(3);
  });

  it("mantiene l'ordine cronologico quando arriva un messaggio", () => {
    const messaggi = { a: messaggio(1), c: messaggio(3) };
    _renderMessages(lista, finto(messaggi));
    messaggi.b = messaggio(2);
    _renderMessages(lista, finto(messaggi));
    const ordine = Array.from(lista.querySelectorAll("[data-mid]")).map((n) => n.getAttribute("data-mid"));
    expect(ordine).toEqual(["a", "b", "c"]);
  });

  it("toglie i messaggi spariti dall'elenco", () => {
    const messaggi = { a: messaggio(1), b: messaggio(2) };
    _renderMessages(lista, finto(messaggi));
    delete messaggi.a;
    _renderMessages(lista, finto(messaggi));
    expect(lista.querySelector('[data-mid="a"]')).toBeNull();
    expect(lista.querySelectorAll("[data-mid]").length).toBe(1);
  });

  it("mostra il messaggio di lista vuota e poi lo toglie", () => {
    _renderMessages(lista, finto({}));
    expect(lista.querySelector("[data-vuoto]")).not.toBeNull();
    _renderMessages(lista, finto({ a: messaggio(1) }));
    expect(lista.querySelector("[data-vuoto]")).toBeNull();
    expect(lista.querySelectorAll("[data-mid]").length).toBe(1);
  });
});
