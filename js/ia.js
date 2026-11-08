// IA: negamax com poda alfa-beta, aprofundamento iterativo, quiescência e tabela de transposição.
(function (global) {
  'use strict';
  const R = typeof module !== 'undefined' && module.exports ? require('./regras.js') : global.Regras;

  const VAL = { p: 100, n: 320, b: 330, r: 500, q: 900, k: 0 };
  // tabelas de posição (ponto de vista das brancas, linha 0 = 8ª fileira)
  const PST = {
    p: [0, 0, 0, 0, 0, 0, 0, 0, 50, 50, 50, 50, 50, 50, 50, 50, 10, 10, 20, 30, 30, 20, 10, 10, 5, 5, 10, 25, 25, 10, 5, 5,
      0, 0, 0, 20, 20, 0, 0, 0, 5, -5, -10, 0, 0, -10, -5, 5, 5, 10, 10, -20, -20, 10, 10, 5, 0, 0, 0, 0, 0, 0, 0, 0],
    n: [-50, -40, -30, -30, -30, -30, -40, -50, -40, -20, 0, 0, 0, 0, -20, -40, -30, 0, 10, 15, 15, 10, 0, -30, -30, 5, 15, 20, 20, 15, 5, -30,
      -30, 0, 15, 20, 20, 15, 0, -30, -30, 5, 10, 15, 15, 10, 5, -30, -40, -20, 0, 5, 5, 0, -20, -40, -50, -40, -30, -30, -30, -30, -40, -50],
    b: [-20, -10, -10, -10, -10, -10, -10, -20, -10, 0, 0, 0, 0, 0, 0, -10, -10, 0, 5, 10, 10, 5, 0, -10, -10, 5, 5, 10, 10, 5, 5, -10,
      -10, 0, 10, 10, 10, 10, 0, -10, -10, 10, 10, 10, 10, 10, 10, -10, -10, 5, 0, 0, 0, 0, 5, -10, -20, -10, -10, -10, -10, -10, -10, -20],
    r: [0, 0, 0, 0, 0, 0, 0, 0, 5, 10, 10, 10, 10, 10, 10, 5, -5, 0, 0, 0, 0, 0, 0, -5, -5, 0, 0, 0, 0, 0, 0, -5,
      -5, 0, 0, 0, 0, 0, 0, -5, -5, 0, 0, 0, 0, 0, 0, -5, -5, 0, 0, 0, 0, 0, 0, -5, 0, 0, 0, 5, 5, 0, 0, 0],
    q: [-20, -10, -10, -5, -5, -10, -10, -20, -10, 0, 0, 0, 0, 0, 0, -10, -10, 0, 5, 5, 5, 5, 0, -10, -5, 0, 5, 5, 5, 5, 0, -5,
      0, 0, 5, 5, 5, 5, 0, -5, -10, 5, 5, 5, 5, 5, 0, -10, -10, 0, 5, 0, 0, 0, 0, -10, -20, -10, -10, -5, -5, -10, -10, -20],
    k: [-30, -40, -40, -50, -50, -40, -40, -30, -30, -40, -40, -50, -50, -40, -40, -30, -30, -40, -40, -50, -50, -40, -40, -30, -30, -40, -40, -50, -50, -40, -40, -30,
      -20, -30, -30, -40, -40, -30, -30, -20, -10, -20, -20, -20, -20, -20, -20, -10, 20, 20, 0, 0, 0, 0, 20, 20, 20, 30, 10, 0, 0, 10, 30, 20],
    kEnd: [-50, -40, -30, -20, -20, -30, -40, -50, -30, -20, -10, 0, 0, -10, -20, -30, -30, -10, 20, 30, 30, 20, -10, -30, -30, -10, 30, 40, 40, 30, -10, -30,
      -30, -10, 30, 40, 40, 30, -10, -30, -30, -10, 20, 30, 30, 20, -10, -30, -30, -30, 0, 0, 0, 0, -30, -30, -50, -30, -30, -30, -30, -30, -30, -50],
  };

  function evaluate(g) {
    const b = g.board;
    let score = 0, npm = 0;
    for (let i = 0; i < 64; i++) { const p = b[i]; if (p !== '.') { const t = p.toLowerCase(); if (t !== 'p' && t !== 'k') npm += VAL[t]; } }
    const endgame = npm <= 2600;
    for (let i = 0; i < 64; i++) {
      const p = b[i]; if (p === '.') continue;
      const t = p.toLowerCase(), w = p !== t;
      const idx = w ? i : (7 - Math.floor(i / 8)) * 8 + (i % 8);
      const tab = t === 'k' && endgame ? PST.kEnd : PST[t];
      const v = VAL[t] + tab[idx];
      score += w ? v : -v;
    }
    return g.turn === 'w' ? score : -score;
  }

  const MATE = 100000;

  class Searcher {
    constructor() { this.tt = new Map(); }

    order(g, moves, ttMove, ply) {
      const k = this.killers[ply] || [];
      for (const m of moves) {
        let s = 0;
        if (ttMove && m.from === ttMove.from && m.to === ttMove.to && m.promo === ttMove.promo) s = 1e7;
        else if (m.captured !== '.') s = 1e6 + VAL[m.captured.toLowerCase()] * 10 - VAL[m.piece.toLowerCase()] / 10;
        else if (k.some(x => x && x.from === m.from && x.to === m.to)) s = 5e5;
        if (m.promo) s += 8e5 + VAL[m.promo.toLowerCase()];
        m._s = s;
      }
      moves.sort((a, b) => b._s - a._s);
      return moves;
    }

    timeUp() {
      if ((++this.nodes & 1023) === 0 && Date.now() > this.deadline) this.stop = true;
      return this.stop;
    }

    quiesce(g, alpha, beta, ply) {
      if (this.timeUp()) return 0;
      const stand = evaluate(g);
      if (stand >= beta) return beta;
      if (stand > alpha) alpha = stand;
      const me = g.turn;
      const moves = this.order(g, g.pseudo(true), null, ply);
      for (const m of moves) {
        g.make(m);
        if (g.inCheck(me)) { g.unmake(); continue; }
        const s = -this.quiesce(g, -beta, -alpha, ply + 1);
        g.unmake();
        if (this.stop) return 0;
        if (s >= beta) return beta;
        if (s > alpha) alpha = s;
      }
      return alpha;
    }

    search(g, depth, alpha, beta, ply) {
      if (this.timeUp()) return 0;
      if (ply > 0) {
        if (g.half >= 100) return 0;
        const k = g.keys[g.keys.length - 1];
        for (let i = g.keys.length - 3; i >= 0 && i >= g.keys.length - 1 - g.half; i -= 2) if (g.keys[i] === k) return 0;
      }
      const me = g.turn, inCheck = g.inCheck(me);
      if (inCheck) depth++;
      if (depth <= 0) return this.quiesce(g, alpha, beta, ply);
      const key = g.keys[g.keys.length - 1];
      const tte = this.tt.get(key);
      if (tte && tte.depth >= depth && ply > 0) {
        if (tte.flag === 0) return tte.score;
        if (tte.flag === 1 && tte.score >= beta) return tte.score;
        if (tte.flag === 2 && tte.score <= alpha) return tte.score;
      }
      const moves = this.order(g, g.pseudo(false), tte && tte.move, ply);
      let best = -Infinity, bestMove = null, legalN = 0; const a0 = alpha;
      for (const m of moves) {
        g.make(m);
        if (g.inCheck(me)) { g.unmake(); continue; }
        legalN++;
        const s = -this.search(g, depth - 1, -beta, -alpha, ply + 1);
        g.unmake();
        if (this.stop) return 0;
        if (s > best) { best = s; bestMove = m; }
        if (s > alpha) alpha = s;
        if (alpha >= beta) {
          if (m.captured === '.') { const k = this.killers[ply] || (this.killers[ply] = [null, null]); k[1] = k[0]; k[0] = m; }
          break;
        }
      }
      if (legalN === 0) return inCheck ? -MATE + ply : 0;
      const flag = best <= a0 ? 2 : best >= beta ? 1 : 0;
      if (this.tt.size > 400000) this.tt.clear();
      this.tt.set(key, { depth, score: best, flag, move: bestMove });
      return best;
    }

    // escolhe o lance. opts: {maxDepth, timeMs, noise, randomMove}
    think(g, opts) {
      const root = g.clone();
      const legal = root.legal();
      if (!legal.length) return null;
      if (legal.length === 1) return legal[0];
      if (opts.randomMove && Math.random() < opts.randomMove) return legal[Math.floor(Math.random() * legal.length)];
      this.nodes = 0; this.stop = false; this.killers = [];
      this.deadline = Date.now() + (opts.timeMs || 1000);
      const noise = opts.noise || 0;
      let scored = legal.map(m => ({ m, s: 0 }));
      let bestDone = null;
      for (let d = 1; d <= opts.maxDepth; d++) {
        // busca cada lance da raiz (janela cheia quando há ruído; janela de busca normal sem ruído)
        let alpha = -Infinity;
        const res = [];
        for (const it of scored) {
          root.make(it.m);
          const s = -this.search(root, d - 1, -Infinity, noise ? Infinity : -alpha, 1);
          root.unmake();
          if (this.stop) break;
          res.push({ m: it.m, s });
          if (s > alpha) alpha = s;
        }
        if (this.stop && res.length < scored.length) {
          // o 1º lance da lista é o melhor da iteração anterior; se outro já o superou, fica com ele
          if (res.length && !noise) bestDone = res.reduce((a, b) => (b.s > a.s ? b : a));
          break;
        }
        res.sort((a, b) => b.s - a.s);
        scored = res;
        bestDone = res[0];
        if (Math.abs(res[0].s) > MATE - 100) break;
      }
      if (noise && scored.length) {
        let pick = null, ps = -Infinity;
        for (const it of scored) { const v = it.s + (Math.random() * 2 - 1) * noise; if (v > ps) { ps = v; pick = it; } }
        // nunca ignora um mate encontrado
        if (scored[0].s > MATE - 100) pick = scored[0];
        return pick.m;
      }
      return (bestDone || scored[0]).m;
    }
  }

  // níveis 1 a 10
  const NIVEIS = [
    null,
    { maxDepth: 1, noise: 350, randomMove: 0.35, timeMs: 300, nome: 'Girino' },
    { maxDepth: 1, noise: 180, randomMove: 0.15, timeMs: 300, nome: 'Peixinho' },
    { maxDepth: 2, noise: 110, randomMove: 0.05, timeMs: 400, nome: 'Siri' },
    { maxDepth: 2, noise: 60, timeMs: 500, nome: 'Tartaruga' },
    { maxDepth: 3, noise: 35, timeMs: 700, nome: 'Golfinho' },
    { maxDepth: 3, noise: 15, timeMs: 900, nome: 'Polvo' },
    { maxDepth: 4, noise: 8, timeMs: 1200, nome: 'Foca' },
    { maxDepth: 5, noise: 0, timeMs: 1600, nome: 'Tubarão' },
    { maxDepth: 6, noise: 0, timeMs: 2400, nome: 'Orca' },
    { maxDepth: 8, noise: 0, timeMs: 3500, nome: 'Baleia Anciã' },
  ];

  const searcher = new Searcher();
  function melhorLance(g, nivel) {
    const o = Object.assign({}, NIVEIS[Math.max(1, Math.min(10, nivel))]);
    // variedade nas aberturas, para as partidas infinitas não se repetirem
    if (g.history.length < 8 && !o.noise) o.noise = 6;
    return searcher.think(g, o);
  }

  const api = { melhorLance, NIVEIS, evaluate };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else global.IA = api;
})(typeof window !== 'undefined' ? window : globalThis);
