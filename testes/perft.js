const { Game } = require(process.argv[2] || '../js/regras.js');
function perft(g, d) { if (d === 0) return 1; let n = 0; for (const m of g.legal()) { g.make(m); n += perft(g, d - 1); g.unmake(); } return n; }
const tests = [
  ['rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1', 4, 197281],
  ['r3k2r/p1ppqpb1/bn2pnp1/3PN3/1p2P3/2N2Q1p/PPPBBPPP/R3K2R w KQkq - 0 1', 3, 97862],
  ['8/2p5/3p4/KP5r/1R3p1k/8/4P1P1/8 w - - 0 1', 4, 43238],
  ['r3k2r/Pppp1ppp/1b3nbN/nP6/BBP1P3/q4N2/Pp1P2PP/R2Q1RK1 w kq - 0 1', 3, 9467],
  ['rnbq1k1r/pp1Pbppp/2p5/8/2B5/8/PPP1NnPP/RNBQK2R w KQ - 1 8', 3, 62379],
];
for (const [f, d, exp] of tests) { const g = new Game(f); const t = Date.now(); const n = perft(g, d); console.log(n === exp ? 'OK ' : 'ERRO', n, exp, (Date.now()-t)+'ms', g.fen() === new Game(f).fen() ? '' : 'FEN mudou!'); }
