// Unica fonte di verità per l'elenco delle postazioni (numero, nome, coordinate).
// Usato sia dal client (index.html, come <script> globale) sia dalle Cloud
// Function (functions/index.js, via require — una copia viene sincronizzata
// automaticamente in functions/ ad ogni deploy, vedi predeploy in firebase.json).
// Per aggiungere/spostare una postazione: modifica SOLO questo file.
var STATIONS_DATA = [
  {num:10,name:"Spiaggia Libera tra Orsa Minore e Scirocco",lat:42.67120,lng:14.02308},
  {num:11,name:"Spiaggia Libera tra Ahamar e Papenoo",lat:42.67290,lng:14.02199},
  {num:12,name:"Lido La Vela",lat:42.67410,lng:14.02162},
  {num:13,name:"Bagni Marini",lat:42.67514,lng:14.02057},
  {num:14,name:"Bolla Mare",lat:42.67643,lng:14.01932},
  {num:15,name:"La Paranzella",lat:42.67753,lng:14.01848},
  {num:16,name:"Celommi",lat:42.67885,lng:14.01741},
  {num:17,name:"Marisella",lat:42.68013,lng:14.01646},
  {num:18,name:"Sirenetta",lat:42.68164,lng:14.01554},
  {num:19,name:"Lauretta",lat:42.68282,lng:14.01457},
  {num:20,name:"Lido Azzurra",lat:42.68372,lng:14.01391},
  {num:21,name:"Aurora",lat:42.68511,lng:14.01286},
  {num:22,name:"Bellavista",lat:42.68657,lng:14.01179},
  {num:23,name:"Lido Aragosta",lat:42.68774,lng:14.01106},
  {num:24,name:"Riva del Sol",lat:42.68898,lng:14.01014},
  {num:25,name:"Tropical",lat:42.69022,lng:14.00906},
  {num:26,name:"Lido38",lat:42.69139,lng:14.00815},
  {num:27,name:"Spiaggia Libera tra VVF e Lido Sahara",lat:42.69265,lng:14.00706},
  {num:28,name:"Casa del Mar",lat:42.69426,lng:14.00533},
  {num:29,name:"Maldimare",lat:42.69532,lng:14.00436},
  {num:30,name:"Bora Bora",lat:42.69630,lng:14.00378},
  {num:31,name:"Spiaggia Libera tra Lo Squalo e Bagni Bruno",lat:42.72301,lng:13.98858},
  {num:32,name:"Camping Nino",lat:42.72457,lng:13.98758},
  {num:33,name:"Camping Surabaia",lat:42.69927,lng:14.00192},
  {num:34,name:"Tartaruga",lat:42.66747,lng:14.02596},
  {num:35,name:"Cabana Park",lat:42.66836,lng:14.02542},
];
if (typeof module !== "undefined" && module.exports) {
  module.exports = STATIONS_DATA;
}
