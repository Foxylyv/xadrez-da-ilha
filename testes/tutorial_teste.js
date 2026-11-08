const dir = process.argv[2] || require('path').join(__dirname, '../js');
globalThis.Regras = require(dir + '/regras.js');
require(dir + '/tutorial.js');
const { Game, parseSq, name } = Regras;
Tutorial.LICOES.forEach((l, k) => l.passos.forEach((p, j) => {
  const g = new Game(p.fen);
  if (p.antes) { const [a, b] = p.antes.map(parseSq); const m = g.legal().find(x => x.from === a && x.to === b); g.make(m); }
  let info = '';
  if (p.tipo === 'lance') { const sol = g.legal().filter(m => { g.make(m); const ok = p.ok(g, m); g.unmake(); return ok; }); info = 'soluções: ' + sol.map(m => name(m.from) + name(m.to)).join(' '); }
  if (p.tipo === 'estrelas') { // cada estrela (em ordem) deve estar a 1 lance da anterior
    let ok = true;
    for (const e of p.estrelas) {
      const m = g.legal().find(x => x.to === parseSq(e));
      if (!m) { ok = false; break; }
      g.make(m); if (g.turn === 'b') { g.turn = 'w'; g.ep = -1; }
    }
    info = 'estrelas ' + p.estrelas.join(',') + (ok ? ' | cada uma a 1 lance ✓' : ' | ERRO: estrela fora de alcance');
  }
  if (p.tipo === 'info') { const s = g.status(); info = s.over ? s.reason : 'ok'; }
  console.log(`${k + 1}.${j + 1} ${p.tipo.padEnd(8)} ${info}`);
}));
