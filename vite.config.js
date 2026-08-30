import { fileURLToPath } from "node:url";
import { defineConfig } from "vite";

// Il sito e' pubblicato sotto /appsegnalazioni/ (vedi manifest.json, sw.js,
// icone: usano gia' tutti questo percorso assoluto).
export default defineConfig({
  base: "/appsegnalazioni/",
  build: {
    outDir: "dist",
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
