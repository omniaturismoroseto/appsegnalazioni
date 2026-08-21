import { defineConfig } from "vite";

// Il sito e' pubblicato sotto /appsegnalazioni/ (vedi manifest.json, sw.js,
// icone: usano gia' tutti questo percorso assoluto).
export default defineConfig({
  base: "/appsegnalazioni/",
  build: {
    outDir: "dist",
    // sw.js (vedi strategia "stale-while-revalidate" per gli asset) non ha
    // una lista precaricata di file: mette in cache qualunque URL richiesto,
    // quindi i nomi con hash di Vite per il cache-busting sono sicuri.
  },
});
