// Copia stations-data.js dalla cartella public/ del progetto in questa
// cartella prima di ogni deploy (vedi "predeploy" in firebase.json). Non
// modificare il file copiato qui a mano: si perde al prossimo deploy,
// l'unica fonte è ../public/stations-data.js.
const fs = require("fs");
const path = require("path");
const src = path.join(__dirname, "..", "public", "stations-data.js");
const dest = path.join(__dirname, "stations-data.js");
fs.copyFileSync(src, dest);
console.log("stations-data.js sincronizzato in functions/");
