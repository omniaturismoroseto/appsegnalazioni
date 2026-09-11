// Il pacchetto pubblicato deve essere leggibile dalle WebView vecchie.
//
// I tablet di postazione sono dispositivi amministrati: la loro WebView resta
// indietro per anni, e non c'e' nessuno che la aggiorni. Qui non si prova a
// capire se una funzione fa la cosa giusta: si prova a leggere il pacchetto,
// che e' il passo prima. Un errore di sintassi non sbaglia una funzione,
// impedisce di leggere l'intero file - schermo bianco, e nemmeno un errore
// dentro l'app perche' l'app non e' mai partita.
//
// E' successo: il compressore riscriveva "n = n || {}" in "n ||= {}" perche'
// nessuno gli aveva detto fin dove dovesse arrivare il codice, e su WebView 83
// quel "||=" era "SyntaxError: Unexpected token '='". I sorgenti erano
// innocenti, il difetto stava nella build - quindi e' la build che si
// controlla, non i sorgenti.
import { describe, it, expect } from "vitest";
import { parse } from "acorn";
import { build } from "vite";

// La grammatica che ogni dispositivo in servizio deve saper leggere: ES2020,
// cioe' Chrome/WebView 80. Il limite lo pone la pagina stessa, non noi - il
// caricatore ufficiale di Google Maps, incollato in index.html, e' scritto in
// ES2020. Sotto quella soglia non si scende comunque.
//
// build.target in vite.config.js dice es2017, piu' in basso del necessario:
// margine che non costa niente per i pacchetti che costruiamo noi. Qui si
// controlla il patto minimo, quindi un domani si puo' alzare o abbassare quel
// target senza che questo controllo diventi bugiardo: tutto cio' che e' piu'
// nuovo di ES2020 - un "||=" compreso - non passa.
const GRAMMATICA = 2020;

function leggibile(codice, sourceType) {
  try {
    parse(codice, { ecmaVersion: GRAMMATICA, sourceType });
    return null;
  } catch (e) {
    return e.message;
  }
}

// Gli <script> scritti a mano dentro le pagine: Vite non li comprime e non li
// traduce, li copia. Quindi valgono anche loro, e per loro non c'e' rete di
// sicurezza: quello che si scrive li' e' quello che arriva al tablet.
function scriptScrittiAMano(html) {
  const blocchi = [];
  const re = /<script\b([^>]*)>([\s\S]*?)<\/script>/gi;
  let m;
  while ((m = re.exec(html)) !== null) {
    const attributi = m[1];
    if (/\bsrc\b/i.test(attributi)) continue;
    blocchi.push({
      codice: m[2],
      sourceType: /type\s*=\s*["']module["']/i.test(attributi) ? "module" : "script",
    });
  }
  return blocchi;
}

describe("il pacchetto pubblicato", () => {
  it(`si legge con la grammatica ES${GRAMMATICA}`, async () => {
    // write: false — si costruisce in memoria, senza toccare dist/.
    const risultato = await build({ logLevel: "silent", build: { write: false } });
    const uscite = (Array.isArray(risultato) ? risultato : [risultato]).flatMap(
      (r) => r.output
    );
    expect(uscite.length).toBeGreaterThan(0);

    const illeggibili = [];
    for (const pezzo of uscite) {
      if (pezzo.type === "chunk") {
        const errore = leggibile(pezzo.code, "module");
        if (errore) illeggibili.push(`${pezzo.fileName}: ${errore}`);
        continue;
      }
      if (!pezzo.fileName.endsWith(".html")) continue;
      for (const s of scriptScrittiAMano(String(pezzo.source))) {
        const errore = leggibile(s.codice, s.sourceType);
        if (errore) illeggibili.push(`${pezzo.fileName} (script in pagina): ${errore}`);
      }
    }
    expect(illeggibili).toEqual([]);
  }, 120000);
});
