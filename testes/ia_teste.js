const dir = process.argv[2] || require('path').join(__dirname, '../js');
const { Game } = require(dir + '/regras.js'); const { melhorLance } = require(dir + '/ia.js');
// mate em 1
let g = new Game('6k1/5ppp/8/8/8/8/8/R5K1 w - - 0 1');
for (const n of [3,5,8,10]) { const m = melhorLance(g, n); console.log('mate1 nivel', n, g.san(m)); }
// pega dama solta
g = new Game('rnb1kbnr/pppp1ppp/8/4p2q/4P3/5N2/PPPP1PPP/RNBQKB1R w KQkq - 2 3');
console.log('captura', g.san(melhorLance(g, 7)));
// partida nivel 6 x nivel 3
g = new Game(); let t = Date.now(), maxT = 0, s, sanList = [];
while (!(s = g.status()).over && g.history.length < 160) {
  const t0 = Date.now(); const m = melhorLance(g, g.turn === 'w' ? 7 : 3); maxT = Math.max(maxT, Date.now() - t0);
  sanList.push(g.san(m)); g.make(m);
}
console.log(sanList.slice(0, 30).join(' '), '...');
console.log('fim:', s.over ? s.result + ' ' + s.reason : 'limite', 'lances', g.history.length, 'tempo max', maxT, 'total', Date.now() - t);
