// Regras do xadrez — tabuleiro 8x8, índice = linha*8 + coluna (linha 0 = 8ª fileira, no topo).
// Peças: maiúsculas = brancas (time Floresta), minúsculas = pretas (time Mar). '.' = vazio.
(function (global) {
  'use strict';

  const KNIGHT = [[-2, -1], [-2, 1], [-1, -2], [-1, 2], [1, -2], [1, 2], [2, -1], [2, 1]];
  const KING = [[-1, -1], [-1, 0], [-1, 1], [0, -1], [0, 1], [1, -1], [1, 0], [1, 1]];
  const ROOK_D = [[-1, 0], [1, 0], [0, -1], [0, 1]];
  const BISHOP_D = [[-1, -1], [-1, 1], [1, -1], [1, 1]];

  const isWhite = p => p !== '.' && p === p.toUpperCase();
  const colorOf = p => (p === '.' ? null : isWhite(p) ? 'w' : 'b');
  const sq = (r, f) => r * 8 + f;
  const inB = (r, f) => r >= 0 && r < 8 && f >= 0 && f < 8;
  const FILES = 'abcdefgh';
  const name = i => FILES[i % 8] + (8 - Math.floor(i / 8));
  const parseSq = s => sq(8 - parseInt(s[1], 10), FILES.indexOf(s[0]));

  const START_FEN = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';

  // Zobrist (para repetição e tabela de transposição da IA)
  let seed = 1234567;
  const rnd = () => { seed = (seed * 1103515245 + 12345) & 0x7fffffff; return seed; };
  const Z = {};
  'PNBRQKpnbrqk'.split('').forEach(p => { Z[p] = []; for (let i = 0; i < 64; i++) Z[p][i] = [rnd(), rnd()]; });
  const ZSIDE = [rnd(), rnd()];
  const ZCAST = []; for (let i = 0; i < 16; i++) ZCAST.push([rnd(), rnd()]);
  const ZEP = []; for (let i = 0; i < 8; i++) ZEP.push([rnd(), rnd()]);

  class Game {
    constructor(fen) { this.load(fen || START_FEN); }

    load(fen) {
      const [pos, turn, cast, ep, half, full] = fen.trim().split(/\s+/);
      this.board = [];
      for (const row of pos.split('/')) {
        for (const ch of row) {
          if (/\d/.test(ch)) for (let i = 0; i < +ch; i++) this.board.push('.');
          else this.board.push(ch);
        }
      }
      this.turn = turn || 'w';
      this.castling = { K: false, Q: false, k: false, q: false };
      if (cast && cast !== '-') for (const c of cast) this.castling[c] = true;
      this.ep = ep && ep !== '-' ? parseSq(ep) : -1;
      this.half = parseInt(half || '0', 10);
      this.full = parseInt(full || '1', 10);
      this.history = [];
      this.keys = [this.hash()];
    }

    fen() {
      let s = '';
      for (let r = 0; r < 8; r++) {
        let e = 0;
        for (let f = 0; f < 8; f++) {
          const p = this.board[sq(r, f)];
          if (p === '.') e++; else { if (e) { s += e; e = 0; } s += p; }
        }
        if (e) s += e;
        if (r < 7) s += '/';
      }
      let c = ''; for (const k of 'KQkq') if (this.castling[k]) c += k;
      return `${s} ${this.turn} ${c || '-'} ${this.ep >= 0 ? name(this.ep) : '-'} ${this.half} ${this.full}`;
    }

    castMask() { return (this.castling.K ? 1 : 0) | (this.castling.Q ? 2 : 0) | (this.castling.k ? 4 : 0) | (this.castling.q ? 8 : 0); }

    hash() {
      let a = 0, b = 0;
      for (let i = 0; i < 64; i++) { const p = this.board[i]; if (p !== '.') { a ^= Z[p][i][0]; b ^= Z[p][i][1]; } }
      if (this.turn === 'b') { a ^= ZSIDE[0]; b ^= ZSIDE[1]; }
      const cm = this.castMask(); a ^= ZCAST[cm][0]; b ^= ZCAST[cm][1];
      if (this.ep >= 0) { a ^= ZEP[this.ep % 8][0]; b ^= ZEP[this.ep % 8][1]; }
      return a.toString(36) + ':' + b.toString(36);
    }

    kingSq(color) {
      const k = color === 'w' ? 'K' : 'k';
      return this.board.indexOf(k);
    }

    // a casa i é atacada pelo lado `by`?
    attacked(i, by) {
      const b = this.board, r = Math.floor(i / 8), f = i % 8;
      const W = by === 'w';
      // peões
      const pr = W ? r + 1 : r - 1, pp = W ? 'P' : 'p';
      if (pr >= 0 && pr < 8) {
        if (f > 0 && b[sq(pr, f - 1)] === pp) return true;
        if (f < 7 && b[sq(pr, f + 1)] === pp) return true;
      }
      const n = W ? 'N' : 'n', k = W ? 'K' : 'k';
      for (const [dr, df] of KNIGHT) { const rr = r + dr, ff = f + df; if (inB(rr, ff) && b[sq(rr, ff)] === n) return true; }
      for (const [dr, df] of KING) { const rr = r + dr, ff = f + df; if (inB(rr, ff) && b[sq(rr, ff)] === k) return true; }
      const rq = W ? 'RQ' : 'rq', bq = W ? 'BQ' : 'bq';
      for (const [dr, df] of ROOK_D) {
        let rr = r + dr, ff = f + df;
        while (inB(rr, ff)) { const p = b[sq(rr, ff)]; if (p !== '.') { if (rq.includes(p)) return true; break; } rr += dr; ff += df; }
      }
      for (const [dr, df] of BISHOP_D) {
        let rr = r + dr, ff = f + df;
        while (inB(rr, ff)) { const p = b[sq(rr, ff)]; if (p !== '.') { if (bq.includes(p)) return true; break; } rr += dr; ff += df; }
      }
      return false;
    }

    inCheck(color) {
      color = color || this.turn;
      const k = this.kingSq(color);
      if (k < 0) return false; // tutorial sem rei
      return this.attacked(k, color === 'w' ? 'b' : 'w');
    }

    // movimentos pseudo-legais: {from,to,piece,captured,promo,flag}  flag: 'ep' | 'castleK' | 'castleQ' | 'double'
    pseudo(onlyCaptures) {
      const b = this.board, me = this.turn, moves = [];
      const enemy = p => p !== '.' && colorOf(p) !== me;
      for (let i = 0; i < 64; i++) {
        const p = b[i];
        if (p === '.' || colorOf(p) !== me) continue;
        const r = Math.floor(i / 8), f = i % 8, t = p.toLowerCase();
        const add = (to, flag) => {
          const cap = flag === 'ep' ? (me === 'w' ? 'p' : 'P') : b[to];
          if (t === 'p' && (Math.floor(to / 8) === 0 || Math.floor(to / 8) === 7)) {
            for (const pr of 'qrbn') moves.push({ from: i, to, piece: p, captured: cap, promo: me === 'w' ? pr.toUpperCase() : pr, flag });
          } else moves.push({ from: i, to, piece: p, captured: cap, promo: null, flag });
        };
        if (t === 'p') {
          const dir = me === 'w' ? -1 : 1, startR = me === 'w' ? 6 : 1, r1 = r + dir;
          if (r1 >= 0 && r1 < 8) {
            if (!onlyCaptures && b[sq(r1, f)] === '.') {
              add(sq(r1, f));
              if (r === startR && b[sq(r + 2 * dir, f)] === '.') add(sq(r + 2 * dir, f), 'double');
            } else if (onlyCaptures && b[sq(r1, f)] === '.' && (r1 === 0 || r1 === 7)) add(sq(r1, f));
            for (const df of [-1, 1]) {
              const ff = f + df; if (ff < 0 || ff > 7) continue;
              const to = sq(r1, ff);
              if (enemy(b[to])) add(to);
              else if (to === this.ep) add(to, 'ep');
            }
          }
        } else if (t === 'n' || t === 'k') {
          for (const [dr, df] of (t === 'n' ? KNIGHT : KING)) {
            const rr = r + dr, ff = f + df; if (!inB(rr, ff)) continue;
            const to = sq(rr, ff);
            if (b[to] === '.') { if (!onlyCaptures) add(to); } else if (enemy(b[to])) add(to);
          }
          if (t === 'k' && !onlyCaptures) {
            const opp = me === 'w' ? 'b' : 'w', home = me === 'w' ? 60 : 4;
            const KS = me === 'w' ? 'K' : 'k', QS = me === 'w' ? 'Q' : 'q', R = me === 'w' ? 'R' : 'r';
            if (i === home && !this.attacked(home, opp)) {
              if (this.castling[KS] && b[home + 1] === '.' && b[home + 2] === '.' && b[home + 3] === R &&
                !this.attacked(home + 1, opp) && !this.attacked(home + 2, opp)) add(home + 2, 'castleK');
              if (this.castling[QS] && b[home - 1] === '.' && b[home - 2] === '.' && b[home - 3] === '.' && b[home - 4] === R &&
                !this.attacked(home - 1, opp) && !this.attacked(home - 2, opp)) add(home - 2, 'castleQ');
            }
          }
        } else {
          const dirs = t === 'r' ? ROOK_D : t === 'b' ? BISHOP_D : ROOK_D.concat(BISHOP_D);
          for (const [dr, df] of dirs) {
            let rr = r + dr, ff = f + df;
            while (inB(rr, ff)) {
              const to = sq(rr, ff);
              if (b[to] === '.') { if (!onlyCaptures) add(to); }
              else { if (enemy(b[to])) add(to); break; }
              rr += dr; ff += df;
            }
          }
        }
      }
      return moves;
    }

    make(m) {
      const b = this.board;
      const undo = { m, castling: Object.assign({}, this.castling), ep: this.ep, half: this.half, full: this.full };
      b[m.from] = '.';
      b[m.to] = m.promo || m.piece;
      if (m.flag === 'ep') b[m.to + (this.turn === 'w' ? 8 : -8)] = '.';
      if (m.flag === 'castleK') { b[m.to - 1] = b[m.to + 1]; b[m.to + 1] = '.'; }
      if (m.flag === 'castleQ') { b[m.to + 1] = b[m.to - 2]; b[m.to - 2] = '.'; }
      const t = m.piece.toLowerCase();
      if (t === 'k') { if (this.turn === 'w') { this.castling.K = this.castling.Q = false; } else { this.castling.k = this.castling.q = false; } }
      for (const s of [m.from, m.to]) {
        if (s === 63) this.castling.K = false; if (s === 56) this.castling.Q = false;
        if (s === 7) this.castling.k = false; if (s === 0) this.castling.q = false;
      }
      this.ep = m.flag === 'double' ? (m.from + m.to) / 2 : -1;
      this.half = (t === 'p' || m.captured !== '.') ? 0 : this.half + 1;
      if (this.turn === 'b') this.full++;
      this.turn = this.turn === 'w' ? 'b' : 'w';
      this.history.push(undo);
      this.keys.push(this.hash());
    }

    unmake() {
      const u = this.history.pop(); if (!u) return null;
      this.keys.pop();
      const m = u.m, b = this.board;
      this.turn = this.turn === 'w' ? 'b' : 'w';
      b[m.from] = m.piece;
      b[m.to] = m.flag === 'ep' ? '.' : m.captured;
      if (m.flag === 'ep') b[m.to + (this.turn === 'w' ? 8 : -8)] = m.captured;
      if (m.flag === 'castleK') { b[m.to + 1] = b[m.to - 1]; b[m.to - 1] = '.'; }
      if (m.flag === 'castleQ') { b[m.to - 2] = b[m.to + 1]; b[m.to + 1] = '.'; }
      this.castling = u.castling; this.ep = u.ep; this.half = u.half; this.full = u.full;
      return m;
    }

    legal() {
      const out = [], me = this.turn;
      for (const m of this.pseudo(false)) {
        this.make(m);
        if (!this.inCheck(me)) out.push(m);
        this.unmake();
      }
      return out;
    }

    legalFrom(i) { return this.legal().filter(m => m.from === i); }

    repetitions() {
      const k = this.keys[this.keys.length - 1]; let n = 0;
      for (let i = this.keys.length - 1; i >= 0 && i >= this.keys.length - 1 - this.half; i -= 1) if (this.keys[i] === k) n++;
      return n;
    }

    insufficient() {
      const pcs = this.board.map((p, i) => [p, i]).filter(([p]) => p !== '.' && p.toLowerCase() !== 'k');
      if (pcs.length === 0) return true;
      if (pcs.length === 1 && 'nb'.includes(pcs[0][0].toLowerCase())) return true;
      if (pcs.every(([p]) => p.toLowerCase() === 'b')) {
        const colors = new Set(pcs.map(([, i]) => (Math.floor(i / 8) + i % 8) % 2));
        return colors.size === 1;
      }
      return false;
    }

    // estado do jogo: {over, result:'1-0'|'0-1'|'1/2', reason}
    status() {
      const moves = this.legal();
      if (moves.length === 0) {
        if (this.inCheck()) return { over: true, result: this.turn === 'w' ? '0-1' : '1-0', reason: 'xeque-mate' };
        return { over: true, result: '1/2', reason: 'afogamento' };
      }
      if (this.half >= 100) return { over: true, result: '1/2', reason: 'regra dos 50 lances' };
      if (this.repetitions() >= 3) return { over: true, result: '1/2', reason: 'repetição tripla' };
      if (this.insufficient()) return { over: true, result: '1/2', reason: 'material insuficiente' };
      return { over: false, check: this.inCheck(), moves };
    }

    // notação algébrica (SAN) do lance m, calculada ANTES de jogá-lo
    san(m) {
      let s;
      if (m.flag === 'castleK') s = 'O-O';
      else if (m.flag === 'castleQ') s = 'O-O-O';
      else {
        const t = m.piece.toUpperCase(), cap = m.captured !== '.';
        if (t === 'P') s = (cap ? FILES[m.from % 8] + 'x' : '') + name(m.to) + (m.promo ? '=' + m.promo.toUpperCase() : '');
        else {
          const others = this.legal().filter(o => o.to === m.to && o.piece === m.piece && o.from !== m.from);
          let dis = '';
          if (others.length) {
            if (others.every(o => o.from % 8 !== m.from % 8)) dis = FILES[m.from % 8];
            else if (others.every(o => Math.floor(o.from / 8) !== Math.floor(m.from / 8))) dis = String(8 - Math.floor(m.from / 8));
            else dis = name(m.from);
          }
          s = t + dis + (cap ? 'x' : '') + name(m.to);
        }
      }
      this.make(m);
      if (this.inCheck()) s += this.legal().length === 0 ? '#' : '+';
      this.unmake();
      return s;
    }

    clone() { const g = new Game(this.fen()); return g; }
  }

  // Xadrez 960 (posição inicial sorteada) — usada para variar as partidas infinitas
  function fen960(seedN) {
    let s = seedN >>> 0;
    const r = n => { s = (s * 1664525 + 1013904223) >>> 0; return s % n; };
    const row = Array(8).fill(null);
    const free = () => row.map((v, i) => v ? -1 : i).filter(i => i >= 0);
    row[[1, 3, 5, 7][r(4)]] = 'b'; row[[0, 2, 4, 6][r(4)]] = 'b';
    let f = free(); row[f[r(f.length)]] = 'q';
    f = free(); row[f[r(f.length)]] = 'n';
    f = free(); row[f[r(f.length)]] = 'n';
    f = free(); row[f[0]] = 'r'; row[f[1]] = 'k'; row[f[2]] = 'r';
    const blk = row.join('');
    return `${blk}/pppppppp/8/8/8/8/PPPPPPPP/${blk.toUpperCase()} w - - 0 1`;
  }

  const api = { Game, START_FEN, name, parseSq, colorOf, isWhite, fen960 };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else global.Regras = api;
})(typeof window !== 'undefined' ? window : globalThis);
