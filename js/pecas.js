// Peças da Ilha da Baleia — desenhadas no estilo do exe1.kra (contorno preto, cores chapadas).
//   Peão = passarinho · Torre = casinha da árvore · Cavalo = raposa · Bispo = chapéu de mago
//   Rainha = caldeirão mágico · Rei = baleia coroada
// Time Floresta (brancas): creme + laranja + verde.  Time Mar (pretas): azul-noite + lilás + verde-água.
(function (global) {
  'use strict';

  const TIMES = {
    w: { main: '#fff8e6', shade: '#e9d7a8', acc: '#f49b37', acc2: '#3f55d8', leaf: '#2fb24f', leafD: '#1f8a3b',
      wood: '#b8732a', woodD: '#8a531c', cheek: '#fffdf6', gold: '#f6c945', base: '#f3e6bf', baseD: '#d4c07d', line: '#1d1a17' },
    b: { main: '#3a4688', shade: '#262f63', acc: '#9b7ef0', acc2: '#ff7fb6', leaf: '#2aa39a', leafD: '#1c7a73',
      wood: '#4e5aa6', woodD: '#323d80', cheek: '#c9bcff', gold: '#f6c945', base: '#2d3770', baseD: '#1b2250', line: '#120f1f' },
  };

  const base = c => `
    <path d="M20 87 Q20 79 30 78 H70 Q80 79 80 87 Q80 95 50 95 Q20 95 20 87Z" fill="${c.baseD}"/>
    <ellipse cx="50" cy="82" rx="27" ry="6" fill="${c.base}"/>`;

  const DRAW = {
    // passarinho (o que está no galho do desenho)
    p: c => `${base(c)}
      <path d="M30 70 L18 62 L22 72 L16 76 L31 76Z" fill="${c.shade}"/>
      <ellipse cx="50" cy="66" rx="20" ry="15" fill="${c.main}"/>
      <path d="M38 64 Q46 56 58 64 Q50 74 38 64Z" fill="${c.shade}"/>
      <circle cx="54" cy="45" r="12" fill="${c.main}"/>
      <path d="M50 33 Q52 24 58 27 Q54 29 56 33 Q60 28 63 33" fill="${c.acc}"/>
      <path d="M65 43 L76 47 L65 51Z" fill="${c.acc}"/>
      <circle cx="58" cy="43" r="2.4" fill="${c.line}" stroke="none"/>
      <circle cx="58.8" cy="42.2" r="0.8" fill="#fff" stroke="none"/>
      <ellipse cx="52" cy="50" rx="3" ry="1.8" fill="${c.acc2}" opacity=".35" stroke="none"/>
      <path d="M45 80 L45 77 M55 80 L55 77" fill="none"/>`,

    // casinha da árvore (a casa da ilha)
    r: c => `${base(c)}
      <path d="M31 80 L33 50 H67 L69 80Z" fill="${c.wood}"/>
      <path d="M40 52 V78 M58 52 V60 M60 68 V78" fill="none" stroke="${c.woodD}" stroke-width="1.6"/>
      <path d="M44 80 V68 Q50 60 56 68 V80Z" fill="${c.shade}"/>
      <path d="M50 64 V80" fill="none" stroke-width="1.4"/>
      <path d="M22 54 Q50 60 78 54 Q72 46 64 40 Q60 30 56 20 Q54 12 58 8 Q50 8 49 18 Q44 32 36 40 Q28 46 22 54Z" fill="${c.leaf}"/>
      <path d="M22 54 Q50 61 78 54 L77 58 Q50 65 23 58Z" fill="${c.woodD}"/>
      <path d="M33 47 q4 3 8 0 M47 41 q4 3 8 0 M58 48 q4 3 8 0 M43 30 q3 2 6 0" fill="none" stroke="${c.leafD}" stroke-width="1.6"/>
      <rect x="61" y="22" width="7" height="12" fill="#7e3b2c"/>
      <circle cx="66" cy="16" r="3" fill="${c.acc2}" opacity=".7"/>`,

    // raposa (cabeça de perfil, no lugar do cavalo)
    n: c => `${base(c)}
      <path d="M30 80 C30 68 33 62 29 56 L13 50 C11 47 13 43 17 42 L33 33 L35 12 L46 26 L56 11 L61 30 C73 40 74 62 70 80Z" fill="${c.acc}"/>
      <path d="M29 56 L13 50 C12 48 13 46 15 45 C22 50 30 50 38 47 C42 54 40 62 34 68 C32 63 31 59 29 56Z" fill="${c.cheek}"/>
      <path d="M38 18 L44 26 L39 30Z M55 17 L58 29 L52 27Z" fill="${c.line}" opacity=".55" stroke="none"/>
      <circle cx="15" cy="44.5" r="3" fill="${c.line}" stroke="none"/>
      <path d="M38 38 Q43 35 47 39" fill="none" stroke-width="2.4"/>
      <path d="M52 52 Q60 60 58 74" fill="none" stroke="${c.shade}" stroke-width="2"/>
      <path d="M58 30 L52 6 L74 14 Z" fill="${c.acc2}" transform="rotate(8 60 20)"/>
      <circle cx="73" cy="13" r="3" fill="${c.gold}"/>`,

    // chapéu de mago (o chapéu azul da raposa)
    b: c => `${base(c)}
      <ellipse cx="50" cy="73" rx="27" ry="7" fill="${c.main}"/>
      <path d="M30 72 Q34 50 42 34 Q48 20 52 12 Q60 6 68 10 Q60 12 58 20 Q62 44 70 72 Q50 78 30 72Z" fill="${c.main}"/>
      <path d="M32 64 Q50 70 68 64 L69.5 70 Q50 77 30.5 70Z" fill="${c.acc2}"/>
      <path d="M50 38 L52.5 44 L59 44.5 L54 48.5 L56 55 L50 51.3 L44 55 L46 48.5 L41 44.5 L47.5 44Z" fill="${c.gold}" stroke-width="1.6"/>
      <circle cx="58" cy="28" r="1.8" fill="${c.gold}" stroke="none"/>
      <circle cx="41" cy="58" r="1.6" fill="${c.gold}" stroke="none"/>
      <circle cx="69" cy="10" r="3.4" fill="${c.acc}"/>`,

    // caldeirão mágico com fumaça (como o da varanda da raposa)
    q: c => `${base(c)}
      <path d="M40 46 Q32 38 40 32 Q36 24 44 20 Q46 12 54 14 Q62 10 64 18 Q72 20 68 28 Q74 36 64 42Z" fill="${c.acc2}" opacity=".95"/>
      <path d="M42 15 L46 4 L50 13 L54 3 L58 13 L62 5 L64 16Z" fill="${c.gold}"/>
      <circle cx="46" cy="4" r="2" fill="${c.gold}"/><circle cx="54" cy="3" r="2" fill="${c.gold}"/><circle cx="62" cy="5" r="2" fill="${c.gold}"/>
      <path d="M26 50 H74 Q78 50 76 54 Q80 76 62 80 H38 Q20 76 24 54 Q22 50 26 50Z" fill="${c.shade}"/>
      <ellipse cx="50" cy="51" rx="24" ry="5" fill="${c.acc}"/>
      <path d="M30 60 Q50 66 70 60" fill="none" stroke="${c.main}" stroke-width="2.4"/>
      <circle cx="44" cy="44" r="3.4" fill="${c.acc}"/><circle cx="57" cy="40" r="2.4" fill="${c.acc}"/>
      <path d="M24 56 Q18 56 18 60 M76 56 Q82 56 82 60" fill="none" stroke-width="2.4"/>`,

    // baleia coroada (a baleia que carrega a ilha)
    k: c => `${base(c)}
      <path d="M24 78 C15 66 20 46 40 44 C56 42 66 50 72 60 L78 50 C74 46 72 42 71 37 C77 39 81 42 84 46 C86 41 90 38 96 37 C95 43 91 48 85 52 L79 66 C76 74 70 80 62 80 H32 C28 80 26 79 24 78Z" fill="${c.main}"/>
      <path d="M21 70 Q44 64 76 69 Q72 78 62 80 H32 Q25 78 21 70Z" fill="${c.shade}"/>
      <path d="M30 74 L33 69 M39 76 L41 68 M48 78 L49 68 M57 78 L58 68 M66 77 L66 69" fill="none" stroke="${c.line}" stroke-width="1.2" opacity=".55"/>
      <circle cx="33" cy="58" r="2.8" fill="${c.line}" stroke="none"/>
      <circle cx="33.9" cy="57.2" r="0.9" fill="#fff" stroke="none"/>
      <path d="M22 64 Q28 68 36 66" fill="none" stroke-width="2"/>
      <ellipse cx="40" cy="63" rx="3.4" ry="2" fill="${c.acc2}" opacity=".35" stroke="none"/>
      <path d="M58 44 Q57 34 52 29 M61 44 Q63 34 69 29 M59.5 44 V31" fill="none" stroke="${c.acc2}" stroke-width="2.4"/>
      <path d="M29 47 L28 30 L35 37 L40 24 L45 37 L52 30 L51 46 Q40 42 29 47Z" fill="${c.gold}"/>
      <path d="M40 9 V20 M35.5 13.5 H44.5" fill="none" stroke-width="2.8"/>
      <circle cx="40" cy="36" r="2.2" fill="${c.acc}"/>`,
  };

  const NOMES = { p: 'Passarinho (peão)', r: 'Casinha (torre)', n: 'Raposa (cavalo)', b: 'Chapéu de mago (bispo)', q: 'Caldeirão (rainha)', k: 'Baleia (rei)' };
  const NOMES_CURTOS = { p: 'Passarinho', r: 'Casinha', n: 'Raposa', b: 'Chapéu', q: 'Caldeirão', k: 'Baleia' };

  function svg(piece) {
    const team = piece === piece.toUpperCase() ? 'w' : 'b';
    const c = TIMES[team];
    return `<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg" class="peca-svg" aria-hidden="true">
      <g stroke="${c.line}" stroke-width="2.8" stroke-linejoin="round" stroke-linecap="round">${DRAW[piece.toLowerCase()](c)}</g></svg>`;
  }

  global.Pecas = { svg, NOMES, NOMES_CURTOS, TIMES };
})(typeof window !== 'undefined' ? window : globalThis);
