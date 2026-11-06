// I ruoli di un account, e perche' "nessun ruolo" non e' piu' un ruolo.
//
// Fino a ieri un operatore normale era un account **senza** claim: il ruolo si
// scriveva solo per admin, coordinatore, CP e forze dell'ordine, e l'assenza
// voleva dire "operatore". Comodo, e sbagliato in un punto preciso: le regole
// del database aprivano su `auth != null`, quindi un account senza claim valeva
// quanto un operatore - e un account senza claim e' esattamente quello che si
// ritrova chi si registra da solo. Con la creazione account attiva sul progetto
// (lo e'), bastava una chiamata all'endpoint pubblico di Firebase Auth con la
// chiave che sta nel JS - pubblica per forza - per leggere tutte le
// segnalazioni: telefoni, GPS, foto di minori.
//
// Il ruolo base ora si scrive per esteso. Cosi' "autenticato" e "riconosciuto"
// tornano a essere due cose diverse, e le regole possono chiedere la seconda:
// un estraneo che si registra resta autenticato e non ha accesso a niente.
// Chiudere la registrazione nella console Firebase resta la prima difesa -
// questa e' quella che regge se qualcuno la riapre.

// I cinque ruoli di un account umano. "station" non e' qui: un dispositivo di
// postazione non e' un account, non ha email ne' password, e il suo ruolo lo
// rilascia getStationToken.
const RUOLI_OPERATORE = ["admin", "coordinator", "cp", "forze_ordine", "operator"];

// Il ruolo di chi non ne ha uno speciale.
const RUOLO_BASE = "operator";

// Puo' usare le callable e i nodi riservati al centro operativo?
function ruoloOperatore(role) {
  return RUOLI_OPERATORE.indexOf(String(role)) !== -1;
}

// Il pannello admin manda stringa vuota quando si scegle "Operatore" nel
// menu: prima voleva dire "cancella il claim", ora vuol dire il ruolo base
// scritto per esteso. Qualunque altro valore passa di qui invariato, e tocca
// a chi chiama rifiutarlo con ruoloOperatore().
function normalizzaRuolo(role) {
  if (role === null || role === undefined || role === "") return RUOLO_BASE;
  return String(role);
}

module.exports = { RUOLI_OPERATORE, RUOLO_BASE, ruoloOperatore, normalizzaRuolo };
