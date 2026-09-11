import { execSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { defineConfig } from "vite";

// L'identificativo di versione che finisce in Sentry.
//
// Era una costante scritta a mano negli HTML, con accanto il commento "da
// incrementare a ogni pubblicazione". E' rimasta ferma dal 27 agosto: per tre
// settimane ogni errore e' finito sotto la stessa etichetta, e alla domanda
// "questo e' comparso dopo quale modifica?" - che e' l'unica ragione per cui
// quel campo esiste - non c'era risposta. Un numero da ricordare a mano e' un
// numero che prima o poi resta indietro, quindi ora lo mette la build.
//
// Su GitHub Actions e' l'impronta del commit pubblicato. In locale e'
// l'impronta del commit corrente col suffisso "-locale", cosi' un pacchetto
// costruito sul portatile non si confonde con quello vero uscito dalla CI.
function versioneSentry() {
  if (process.env.GITHUB_SHA) return "omnia-" + process.env.GITHUB_SHA.slice(0, 7);
  try {
    const sha = execSync("git rev-parse --short HEAD", { stdio: ["ignore", "pipe", "ignore"] })
      .toString()
      .trim();
    return "omnia-" + sha + "-locale";
  } catch {
    return "omnia-sconosciuta";
  }
}

// Riempie il segnaposto in index.html e postazione.html.
const versione = {
  name: "versione-sentry",
  transformIndexHtml(html) {
    return html.split("__VERSIONE_SENTRY__").join(versioneSentry());
  },
};

// Il sito e' pubblicato sotto /appsegnalazioni/ (vedi manifest.json, sw.js,
// icone: usano gia' tutti questo percorso assoluto).
export default defineConfig({
  base: "/appsegnalazioni/",
  plugins: [versione],
  build: {
    outDir: "dist",
    // Fin dove deve arrivare il codice pubblicato.
    //
    // Senza questa riga Vite comprime pensando ai browser di oggi, e il
    // compressore si prende una liberta' che sembra innocua: riscrive
    // "n = n || {}" in "n ||= {}". E' la stessa cosa, ma detta con una
    // grammatica del 2021. Su una WebView vecchia - i tablet di postazione
    // sono dispositivi amministrati, la loro WebView resta indietro per anni -
    // quel "||=" non e' codice: e' un errore di sintassi, e un errore di
    // sintassi non sbaglia una funzione, impedisce di leggere l'intero
    // pacchetto. Schermo bianco (Sentry: "SyntaxError: Unexpected token '='"
    // su postazione.html, WebView 83).
    //
    // Il minimo che la app chiede e' Android 7 (vedi minSdkVersion), e sulla
    // pagina ci sono comunque gli SDK Firebase e Sentry: es2017 sta sotto a
    // entrambi, quindi il limite lo mettono loro, non noi. I sorgenti restano
    // scritti come si vuole - e' la build che li traduce.
    target: "es2017",
    rollupOptions: {
      // Due pagine, due pacchetti: l app segnalazioni e l app dei dispositivi
      // di postazione. La seconda importa solo il proprio punto di avvio,
      // quindi non si porta dietro mappa, pagine pubbliche e dashboard.
      input: {
        index: fileURLToPath(new URL("./index.html", import.meta.url)),
        postazione: fileURLToPath(new URL("./postazione.html", import.meta.url)),
      },
    },
    // sw.js (vedi strategia "stale-while-revalidate" per gli asset) non ha
    // una lista precaricata di file: mette in cache qualunque URL richiesto,
    // quindi i nomi con hash di Vite per il cache-busting sono sicuri.
  },
  test: {
    environment: "jsdom",
    setupFiles: ["./test/setup.js"],
  },
});
