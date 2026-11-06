// Quando le segnalazioni aperte sono tante, le ripetizioni si accorpano.
//
// Una segnalazione aperta che nessuno ha preso in carico viene ripetuta ogni
// minuto per quindici minuti. Ha senso per una: è il promemoria che impedisce
// a un'emergenza di restare lì. Ma le ripetizioni si moltiplicano per il
// numero di segnalazioni, e con cento aperte sono cento squilli al minuto per
// quindici minuti - millecinquecento. Un telefono così non lo guarda più
// nessuno, ed è il telefono da cui un giorno arriva la sirena.
//
// Il numero però non dice se sono vere o false: cento segnalazioni vere
// durante una mareggiata fanno lo stesso danno di cento finte. Quindi non si
// decide in base al numero *se* avvisare - si decide *come*.
//
// La regola, e il motivo per cui è sicura:
//
//   • il PRIMO allarme di ogni segnalazione parte sempre, intero, subito.
//     Non passa mai di qui (vedi sendPushOnNewReport): niente filtri, niente
//     ritardi, niente soglie. Cento segnalazioni vere, cento allarmi.
//   • si accorpano solo le RIPETIZIONI, che per definizione non dicono niente
//     di nuovo: ripetono una cosa già detta. Al loro posto va un promemoria
//     solo, che dice quante sono ancora aperte e dove.
//
// Nessuna informazione va persa, perché l'informazione era già arrivata col
// primo allarme. Quello che si perde è la ripetizione della ripetizione.
//
// La sirena a schermo intero (minore visto in acqua) non passa da qui e non
// viene accorpata in nessun caso.

// Sotto questa soglia non cambia niente: ogni segnalazione tiene la sua
// ripetizione per esteso, con tipo, zona e note. È il caso normale - due o tre
// segnalazioni aperte insieme capitano, e lì il dettaglio serve.
const SOGLIA_ACCORPAMENTO = 3;

// Quante zone si scrivono nel promemoria prima di contare le altre. Cinque
// stanno in una notifica senza farla tagliare dal sistema.
const ZONE_NEL_TESTO = 5;

// Raggruppa i destinatari per l'elenco di segnalazioni che li riguarda.
//
// I destinatari non sono gli stessi per tutte: una postazione sente solo il
// proprio tratto, il centro operativo sente tutto. Mandare a ognuno lo stesso
// riepilogo direbbe a P.3 di segnalazioni che non le competono. Qui ogni
// destinatario finisce nel gruppo di chi ha esattamente il suo stesso elenco,
// così gli invii restano pochi e ciascuno riceve solo il suo.
//
// conDestinatari: [{ id, r, percorsi: Map<token, percorsoNelDatabase> }, ...]
// torna:          [{ segnalazioni: [[id, r], ...], tokens: [...], percorsi: Map }, ...]
function raggruppaPerDestinatario(conDestinatari) {
  const perToken = new Map();
  (conDestinatari || []).forEach(function (voce) {
    if (!voce || !voce.percorsi) return;
    voce.percorsi.forEach(function (percorso, token) {
      let v = perToken.get(token);
      if (!v) {
        v = { percorso, segnalazioni: [] };
        perToken.set(token, v);
      }
      v.segnalazioni.push([voce.id, voce.r]);
    });
  });

  const gruppi = new Map();
  perToken.forEach(function (v, token) {
    const firma = v.segnalazioni
      .map(function (s) { return s[0]; })
      .slice()
      .sort()
      .join(",");
    let g = gruppi.get(firma);
    if (!g) {
      g = { segnalazioni: v.segnalazioni, tokens: [], percorsi: new Map() };
      gruppi.set(firma, g);
    }
    g.tokens.push(token);
    g.percorsi.set(token, v.percorso);
  });

  return [...gruppi.values()];
}

// Titolo e testo del promemoria accorpato.
//
// Dice tre cose, nell'ordine in cui servono a chi guarda lo schermo di corsa:
// quante sono, quante di quelle sono emergenze, e in quali zone.
function testoRiepilogo(segnalazioni) {
  const elenco = segnalazioni || [];
  const quante = elenco.length;

  const zone = [];
  let emergenze = 0;
  elenco.forEach(function (s) {
    const r = (s && s[1]) || {};
    if (r.type === "emergenza") emergenze++;
    const z = String(r.zone || "").trim();
    if (z && zone.indexOf(z) === -1) zone.push(z);
  });

  const mostrate = zone.slice(0, ZONE_NEL_TESTO).join(" · ");
  const restanti = zone.length - ZONE_NEL_TESTO;
  const dove = restanti > 0 ? mostrate + " e altre " + restanti : mostrate;

  const pezzi = [];
  if (emergenze) pezzi.push(emergenze === 1 ? "1 emergenza" : emergenze + " emergenze");
  if (dove) pezzi.push("📍 " + dove);

  return {
    title: "🔁 " + quante + (quante === 1 ? " segnalazione ancora aperta" : " segnalazioni ancora aperte"),
    // Senza zone (dato mancante) resta comunque chiaro perché suona.
    body: pezzi.join(" · ") || "Nessuna ancora presa in carico",
  };
}

module.exports = { SOGLIA_ACCORPAMENTO, ZONE_NEL_TESTO, raggruppaPerDestinatario, testoRiepilogo };
