// Lições do tutorial. Tipos de passo:
//   info      – só explicação (botão Continuar)
//   estrelas  – mova a peça até pegar todas as estrelas (o adversário não joga)
//   capturar  – capture todas as peças do Mar (o adversário não joga)
//   lance     – faça um lance que cumpra o objetivo (`ok(jogo, lance)`)
(function (global) {
  'use strict';
  const ehMate = g => { const s = g.status(); return s.over && s.reason === 'xeque-mate'; };

  const LICOES = [
    {
      titulo: 'Conheça a ilha', icone: 'K',
      passos: [
        { tipo: 'info', fen: 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1',
          texto: 'Bem-vinda à ilha! Aqui o time <b>Floresta</b> (claro) enfrenta o time <b>Mar</b> (escuro). A Floresta sempre começa.' },
        { tipo: 'info', fen: 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1',
          texto: 'As peças: <b>Passarinho</b> = peão, <b>Casinha</b> = torre, <b>Raposa</b> = cavalo, <b>Chapéu</b> = bispo, <b>Caldeirão</b> = rainha e <b>Baleia</b> = rei.' },
        { tipo: 'info', fen: 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1',
          texto: 'O objetivo é encurralar a <b>Baleia</b> do adversário sem que ela tenha para onde fugir: o <b>xeque-mate</b>.' },
      ],
    },
    {
      titulo: 'Casinha (torre)', icone: 'R',
      passos: [
        { tipo: 'estrelas', fen: '8/8/8/8/8/8/8/R7 w - - 0 1', estrelas: ['a6', 'f6', 'f2'],
          texto: 'A <b>Casinha</b> anda em linha reta, quantas casas quiser: para frente, para trás e para os lados. Pegue as estrelas!' },
        { tipo: 'estrelas', fen: '8/8/3p4/8/8/8/8/3R4 w - - 0 1', estrelas: ['d5', 'h5', 'h8'],
          texto: 'Ela não pula peças: o passarinho do Mar está no caminho. Dê a volta para pegar as estrelas.' },
      ],
    },
    {
      titulo: 'Chapéu (bispo)', icone: 'B',
      passos: [
        { tipo: 'estrelas', fen: '8/8/8/8/8/8/8/2B5 w - - 0 1', estrelas: ['e3', 'g5', 'd8'],
          texto: 'O <b>Chapéu de mago</b> anda só nas diagonais, quantas casas quiser. Ele nunca muda a cor da casa onde está.' },
      ],
    },
    {
      titulo: 'Raposa (cavalo)', icone: 'N',
      passos: [
        { tipo: 'info', fen: '8/8/8/8/3N4/8/8/8 w - - 0 1', mostrar: 'd4',
          texto: 'A <b>Raposa</b> pula em <b>"L"</b>: anda <b>2 casas</b> reto e depois <b>1 para o lado</b>. Os pontinhos mostram as 8 casas onde ela pode cair.' },
        { tipo: 'estrelas', fen: '8/8/8/8/8/8/8/1N6 w - - 0 1', estrelas: ['c3', 'e4', 'f6'],
          texto: 'Pegue a estrela! Ela aparece <b>uma de cada vez</b>, sempre a um pulo de distância. É só clicar num pontinho.' },
        { tipo: 'estrelas', fen: '8/8/8/8/8/2ppp3/2pNp3/2ppp3 w - - 0 1', estrelas: ['b3'],
          texto: 'Cercada? Sem problema: a Raposa é a única peça que <b>pula por cima</b> das outras. Pegue a estrela.' },
      ],
    },
    {
      titulo: 'Caldeirão (rainha)', icone: 'Q',
      passos: [
        { tipo: 'estrelas', fen: '8/8/8/8/8/8/8/3Q4 w - - 0 1', estrelas: ['d6', 'g3', 'b3', 'b8'],
          texto: 'O <b>Caldeirão mágico</b> é a peça mais forte: anda como a Casinha <i>e</i> como o Chapéu, em linha reta ou diagonal.' },
      ],
    },
    {
      titulo: 'Baleia (rei)', icone: 'K',
      passos: [
        { tipo: 'estrelas', fen: '8/8/8/8/8/8/8/4K3 w - - 0 1', estrelas: ['d2', 'd3', 'e4', 'f4'],
          texto: 'A <b>Baleia</b> é a peça mais importante, mas é lenta: anda só <b>uma casa</b> em qualquer direção.' },
      ],
    },
    {
      titulo: 'Passarinho (peão)', icone: 'P',
      passos: [
        { tipo: 'estrelas', fen: '8/8/8/8/8/8/4P3/8 w - - 0 1', estrelas: ['e4', 'e5'],
          texto: 'O <b>Passarinho</b> anda só para frente, uma casa. Na primeira vez ele pode dar um voo de <b>duas casas</b>!' },
        { tipo: 'capturar', fen: '8/8/8/3p1p2/4P3/8/8/8 w - - 0 1',
          texto: 'Para capturar, o Passarinho bica na <b>diagonal</b>, uma casa à frente. Capture os dois do Mar.' },
      ],
    },
    {
      titulo: 'Capturar', icone: 'Q',
      passos: [
        { tipo: 'capturar', fen: '8/1n6/8/3p4/6r1/8/1b6/3Q4 w - - 0 1',
          texto: 'Capturar é ocupar a casa de uma peça adversária. Use o Caldeirão para capturar <b>todas</b> as peças do Mar!' },
        { tipo: 'capturar', fen: '8/8/2p1b3/8/3N4/1r6/8/8 w - - 0 1',
          texto: 'Agora com a Raposa. Pense nos saltos em L!' },
      ],
    },
    {
      titulo: 'Xeque', icone: 'R',
      passos: [
        { tipo: 'lance', fen: '3k4/8/8/8/8/8/8/R3K3 w - - 0 1', ok: g => g.inCheck(),
          texto: 'Atacar a Baleia adversária é dar <b>xeque</b>. Dê xeque na Baleia do Mar com a Casinha.' , erro: 'Isso não ataca a Baleia do Mar. Tente de novo!' },
        { tipo: 'lance', fen: '4r1k1/8/8/8/8/2B5/8/4K3 w - - 0 1', ok: () => true,
          texto: 'Sua Baleia está em <b>xeque</b>! Você precisa salvá-la: <b>fugir</b>, <b>bloquear</b> o ataque com outra peça, ou <b>capturar</b> quem ataca.' },
      ],
    },
    {
      titulo: 'Xeque-mate', icone: 'K',
      passos: [
        { tipo: 'lance', fen: 'k7/8/1K6/8/8/8/8/7R w - - 0 1', ok: ehMate,
          texto: '<b>Xeque-mate</b> é o xeque do qual não dá para escapar — e vence a partida! Dê mate em 1 lance.', erro: 'Ela ainda escapa! Procure outro lance.' },
        { tipo: 'lance', fen: '6k1/5ppp/8/8/8/8/8/3R2K1 w - - 0 1', ok: ehMate,
          texto: 'Os próprios passarinhos prendem a Baleia do Mar. Mate em 1!', erro: 'Quase! Procure a última fileira.' },
        { tipo: 'lance', fen: '7k/8/6K1/8/8/8/8/5Q2 w - - 0 1', ok: ehMate,
          texto: 'Caldeirão + Baleia trabalhando juntos. Mate em 1!', erro: 'Ainda não é mate. Tente outra casa!' },
      ],
    },
    {
      titulo: 'Roque', icone: 'R',
      passos: [
        { tipo: 'lance', fen: '4k3/8/8/8/8/8/PPPPPPPP/R3K2R w KQ - 0 1', ok: (g, m) => m.flag === 'castleK' || m.flag === 'castleQ',
          texto: 'O <b>roque</b> protege a Baleia: ela anda <b>duas casas</b> em direção a uma Casinha, e a Casinha pula para o outro lado. Mova a Baleia duas casas!',
          erro: 'Esse não foi o roque. Arraste a Baleia duas casas para o lado.' },
        { tipo: 'info', fen: '4k3/8/8/8/8/8/PPPPPPPP/R4RK1 w - - 0 1',
          texto: 'Só pode rocar se a Baleia e a Casinha ainda não se mexeram, o caminho está livre e a Baleia não está, nem passa, por casa atacada.' },
      ],
    },
    {
      titulo: 'En passant', icone: 'P',
      passos: [
        { tipo: 'lance', fen: '4k3/3p4/8/4P3/8/8/8/4K3 b - - 0 1', antes: ['d7', 'd5'], ok: (g, m) => m.flag === 'ep',
          texto: 'O passarinho do Mar voou duas casas e parou ao lado do seu. Só neste lance, você pode capturá-lo <b>"de passagem"</b> (en passant), indo para d6!',
          erro: 'Era para capturar de passagem, indo para d6. Tente de novo!' },
      ],
    },
    {
      titulo: 'Promoção', icone: 'Q',
      passos: [
        { tipo: 'lance', fen: '4k3/1P6/8/8/8/8/8/4K3 w - - 0 1', ok: (g, m) => !!m.promo,
          texto: 'Quando o Passarinho chega do outro lado ele vira <b>outra peça</b> (quase sempre o Caldeirão). Leve-o até o fim!' },
      ],
    },
    {
      titulo: 'Empates', icone: 'K',
      passos: [
        { tipo: 'info', fen: '7k/5Q2/6K1/8/8/8/8/8 b - - 0 1',
          texto: 'Cuidado! Aqui o Mar <b>não está em xeque</b>, mas não tem nenhum lance possível. Isso é <b>afogamento</b>: empate!' },
        { tipo: 'info', fen: '8/8/4k3/8/8/3K4/8/8 w - - 0 1',
          texto: 'Também é empate: só as duas Baleias no tabuleiro, a mesma posição repetida 3 vezes, ou 50 lances sem captura nem passarinho andando.' },
        { tipo: 'info', fen: 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1',
          texto: 'Pronto, você terminou o tutorial! 🎉 Agora vá para as <b>Partidas infinitas</b> no Menu e jogue quantas quiser.' },
      ],
    },
  ];

  global.Tutorial = { LICOES };
})(typeof window !== 'undefined' ? window : globalThis);
