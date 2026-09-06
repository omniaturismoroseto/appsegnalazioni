// Le icone delle schermate di postazione.
//
// Prima erano emoji dentro la scritta (🚨 💬 👁 ✓): grandi quanto la scritta
// accanto, cioe' invisibili a un braccio di distanza e sotto il sole - che e'
// esattamente la distanza e la luce in cui questi schermi vengono guardati - e
// per giunta disegnate diversamente da ogni marca di telefono.
//
// Questi sono tracciati: prendono il colore di chi li contiene (currentColor) e
// crescono con lui. Vivono in un modulo loro perche' li usano piu' schermate:
// tenerne una copia per file era la strada sicura per ritrovarsi due occhi
// diversi nella stessa app.
//
// Le emoji restano dove sono contenuto - i messaggi della chat, il testo delle
// segnalazioni scritto dalle persone - e li' continua a occuparsene twemoji.
export const ICONE = {
  bandiera: '<path d="M6 3v18"/><path d="M6 4.5h12l-3 4.25L18 13H6z"/>',
  segnalazioni: '<path d="M6 9.5a6 6 0 0 1 12 0c0 4.5 2 5.5 2 5.5H4s2-1 2-5.5Z"/><path d="M10 18.5a2.2 2.2 0 0 0 4 0"/>',
  segnala: '<path d="M12 3.6 2.6 20.4h18.8L12 3.6Z"/><path d="M12 9.6v4.6"/><path d="M12 17.4h.01"/>',
  chat: '<path d="M3.5 5.5h13v8h-8l-5 4v-12Z"/><path d="M8.5 16.5v1h7l5 4v-12h-3"/>',
  radio: '<rect x="9" y="2.6" width="6" height="11" rx="3"/><path d="M5 11a7 7 0 0 0 14 0"/><path d="M12 18v3.2"/><path d="M8.2 21.4h7.6"/>',
  nota: '<path d="M5 3.5h9.5L19 8v12.5H5z"/><path d="M14 3.5V8h5"/><path d="M8.5 12.5h7"/><path d="M8.5 16.5h4.5"/>',
  meteo: '<circle cx="9" cy="7.4" r="3.3"/><path d="M9 1.4v1.3M9 12.1v1.3M3 7.4h1.3M13.7 7.4h1.3M4.8 3.2l.9.9M12.3 10.7l.9.9M13.2 3.2l-.9.9M5.7 10.7l-.9.9"/><path d="M2.6 17.4c1.6 0 1.6-1.3 3.2-1.3s1.6 1.3 3.2 1.3 1.6-1.3 3.2-1.3 1.6 1.3 3.2 1.3 1.6-1.3 3.2-1.3"/><path d="M2.6 21.2c1.6 0 1.6-1.3 3.2-1.3s1.6 1.3 3.2 1.3 1.6-1.3 3.2-1.3 1.6 1.3 3.2 1.3 1.6-1.3 3.2-1.3"/>',
  // Il salvagente, non una sirena: la sirena a quella misura si leggeva come
  // una lampada su un piedistallo. Questo e' il simbolo del mestiere.
  emergenza: '<circle cx="12" cy="12" r="9.2"/><circle cx="12" cy="12" r="4"/><path d="M5.5 5.5 9.2 9.2M18.5 5.5 14.8 9.2M5.5 18.5 9.2 14.8M18.5 18.5 14.8 14.8"/>',
  occhio: '<path d="M1.9 12S5.5 5.6 12 5.6 22.1 12 22.1 12 18.5 18.4 12 18.4 1.9 12 1.9 12Z"/><circle cx="12" cy="12" r="3.1"/>',
  spunta: '<path d="M4.6 12.7 9.5 17.6 19.4 6.8"/>',
  indietro: '<path d="M19.4 12H5.2"/><path d="M11.2 5.8 5 12l6.2 6.2"/>',
  fotocamera: '<path d="M3 7.6h3.6l1.7-2.4h7.4l1.7 2.4H21v11.2H3z"/><circle cx="12" cy="13" r="3.7"/>',
  invia: '<path d="M3.2 11.9 20.6 4.2l-7.7 17.4-1.9-7.8z"/><path d="M11 13.8 20.6 4.2"/>',
  stop: '<rect x="6.2" y="6.2" width="11.6" height="11.6" rx="2"/>',
  chiudi: '<path d="M6 6l12 12M18 6 6 18"/>',
  attesa: '<circle cx="12" cy="12" r="9.2"/><path d="M12 6.6V12l3.6 2.2"/>',
  dispositivo: '<rect x="6.4" y="2.6" width="11.2" height="18.8" rx="2.4"/><path d="M10.4 18.4h3.2"/>',
};

// Un contenitore con dentro l'SVG, non l'SVG nudo: la misura la decide il
// foglio di stile sul contenitore, e l'SVG la riempie. aria-hidden perche'
// l'icona ripete la parola che le sta accanto.
export function icona(nome, classe) {
  const el = document.createElement("span");
  el.className = classe;
  el.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" '
    + 'stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + ICONE[nome] + "</svg>";
  return el;
}
