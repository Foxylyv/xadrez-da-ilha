// Interface do jogo: tabuleiro, arrastar/clicar, IA, partidas infinitas, tutorial e salvamento.
(function () {
  'use strict';
  const { Game, START_FEN, name, parseSq, colorOf, fen960 } = Regras;
  const $ = s => document.querySelector(s);
  const CHAVE_JOGO = 'xadrez-ilha-jogo', CHAVE_INF = 'xadrez-ilha-infinito', CHAVE_TUT = 'xadrez-ilha-tutorial', CHAVE_CFG = 'xadrez-ilha-cfg';
  const ler = (k, padrao) => { try { const v = localStorage.getItem(k); return v ? JSON.parse(v) : padrao; } catch (e) { return padrao; } };
  const gravar = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) { /* sem armazenamento */ } };

  // ---------------- estado ----------------
  const S = {
    modo: null,          // 'infinito' | 'ia' | 'dois' | 'tutorial'
    jogo: new Game(),
    inicioFen: START_FEN,
    euCor: 'w',
    nivel: 3,
    virado: false,
    sel: -1,
    alvos: [],
    ids: [],             // id da peça em cada casa (para animar)
    proxId: 1,
    pensando: false,
    acabou: false,
    lancesSan: [],
    dica: null,
    som: true,
    tut: null,           // {licao, passo, estrelas:[casas em ordem]}
  };
  const inf = Object.assign({ partida: 0, v: 0, e: 0, d: 0, nivel: 2, seq: 0, recorde: 0, surpresa: false }, ler(CHAVE_INF, {}));
  const tutFeitas = new Set(ler(CHAVE_TUT, []));
  const cfg = Object.assign({ som: true, nivel: 3, cor: 'w' }, ler(CHAVE_CFG, {}));
  S.som = cfg.som;

  // ---------------- palco escalado ----------------
  const palco = $('#palco');
  let escala = 1;
  function ajustarPalco() {
    escala = Math.min(window.innerWidth / 1920, window.innerHeight / 1080);
    palco.style.transform = `translate(${-960 * escala}px, ${-540 * escala}px) scale(${escala})`;
  }
  window.addEventListener('resize', ajustarPalco);
  ajustarPalco();

  // ---------------- sons (WebAudio, sem arquivos) ----------------
  let audio = null;
  function tocar(tipo) {
    if (!S.som) return;
    try {
      audio = audio || new (window.AudioContext || window.webkitAudioContext)();
      const t = audio.currentTime;
      const notas = { lance: [[520, 0, .07]], captura: [[300, 0, .08], [200, .06, .1]], xeque: [[660, 0, .08], [880, .09, .12]],
        estrela: [[880, 0, .07], [1175, .07, .1]], vitoria: [[523, 0, .12], [659, .12, .12], [784, .24, .25]],
        derrota: [[392, 0, .15], [330, .15, .15], [262, .3, .3]], erro: [[180, 0, .15]] }[tipo] || [];
      for (const [f, ini, dur] of notas) {
        const o = audio.createOscillator(), g = audio.createGain();
        o.type = 'triangle'; o.frequency.value = f;
        g.gain.setValueAtTime(0.0001, t + ini);
        g.gain.exponentialRampToValueAtTime(0.18, t + ini + 0.01);
        g.gain.exponentialRampToValueAtTime(0.0001, t + ini + dur);
        o.connect(g).connect(audio.destination); o.start(t + ini); o.stop(t + ini + dur + 0.02);
      }
    } catch (e) { /* sem áudio */ }
  }

  // ---------------- fala da raposa ----------------
  const falar = html => { $('#fala-texto').innerHTML = html; };
  const sorteia = l => l[Math.floor(Math.random() * l.length)];
  const FALAS = {
    suaVez: ['Sua vez!', 'Pode jogar!', 'Hmm... o que você vai fazer?', 'Sua vez. Olhe o tabuleiro todo antes!'],
    pensando: ['Deixa eu consultar o livro de feitiços...', 'Hmm, deixa eu pensar...', 'Mexendo o caldeirão... 🫧', 'Calculando as ondas...'],
    capturouVoce: ['Boa captura!', 'Ui! Essa doeu.', 'Nham! Uma peça a menos para o Mar.', 'Muito bem!'],
    capturouIA: ['Peguei! 😼', 'Essa peça é minha agora!', 'Cuidado com as peças soltas!', 'Splash! 🌊'],
  };

  // ---------------- tabuleiro ----------------
  const casasEl = $('#casas'), pecasEl = $('#camada-pecas'), tabEl = $('#tabuleiro');
  const casaEls = [];
  for (let i = 0; i < 64; i++) {
    const d = document.createElement('div');
    d.className = 'casa ' + ((Math.floor(i / 8) + i % 8) % 2 ? 'escura' : 'clara');
    casasEl.appendChild(d); casaEls.push(d);
  }
  const pos = i => { const r = Math.floor(i / 8), f = i % 8; return S.virado ? [(7 - f) * 100, (7 - r) * 100] : [f * 100, r * 100]; };

  function desenharCoords() {
    const c = $('#coords'); c.innerHTML = '';
    for (let k = 0; k < 8; k++) {
      const letra = 'abcdefgh'[S.virado ? 7 - k : k], num = S.virado ? k + 1 : 8 - k;
      c.insertAdjacentHTML('beforeend', `<span style="left:${22 + 39 + k * 100}px;top:${824}px">${letra}</span>`);
      c.insertAdjacentHTML('beforeend', `<span style="left:0;top:${22 + 39 + k * 100}px">${num}</span>`);
    }
  }

  const els = new Map(); // id -> elemento
  function reconstruirIds() {
    S.ids = S.jogo.board.map(p => (p === '.' ? 0 : S.proxId++));
    for (const el of els.values()) el.remove();
    els.clear();
  }

  // atualiza ids após um lance (antes do jogo.make)
  function moverIds(m) {
    const ids = S.ids, me = colorOf(m.piece);
    if (m.flag === 'ep') ids[m.to + (me === 'w' ? 8 : -8)] = 0;
    ids[m.to] = ids[m.from]; ids[m.from] = 0;
    if (m.flag === 'castleK') { ids[m.to - 1] = ids[m.to + 1]; ids[m.to + 1] = 0; }
    if (m.flag === 'castleQ') { ids[m.to + 1] = ids[m.to - 2]; ids[m.to - 2] = 0; }
  }

  function desenharPecas() {
    const vivos = new Set();
    S.jogo.board.forEach((p, i) => {
      const id = S.ids[i]; if (!id || p === '.') return;
      vivos.add(id);
      let el = els.get(id);
      if (!el) {
        el = document.createElement('div'); el.className = 'peca'; el.dataset.p = '';
        pecasEl.appendChild(el); els.set(id, el);
        el.style.transition = 'none';
        const [x, y] = pos(i); el.style.transform = `translate(${x}px,${y}px)`;
        void el.offsetWidth; el.style.transition = '';
      }
      if (el.dataset.p !== p) { if (el.dataset.p) el.classList.add('nova'); el.dataset.p = p; el.innerHTML = Pecas.svg(p); }
      const [x, y] = pos(i);
      el.classList.remove('arrastando');
      el.style.transform = `translate(${x}px,${y}px)`;
      el.dataset.casa = i;
    });
    for (const [id, el] of els) {
      if (!vivos.has(id)) { els.delete(id); el.classList.add('saindo'); setTimeout(() => el.remove(), 260); }
    }
  }

  function desenharCasas() {
    const g = S.jogo, ult = g.history[g.history.length - 1];
    const xequeK = g.inCheck() ? g.kingSq(g.turn) : -1;
    for (let i = 0; i < 64; i++) {
      const el = casaEls[i], [x, y] = pos(i);
      el.style.left = x + 'px'; el.style.top = y + 'px';
      el.classList.toggle('ultimo', !!ult && (ult.m.from === i || ult.m.to === i) && S.modo !== 'tutorial');
      el.classList.toggle('sel', S.sel === i);
      const alvo = S.alvos.find(m => m.to === i);
      el.classList.toggle('alvo', !!alvo);
      el.classList.toggle('cap', !!alvo && g.board[i] !== '.');
      el.classList.toggle('xeque', xequeK === i);
      el.classList.toggle('dica', !!S.dica && (S.dica.from === i || S.dica.to === i));
      const temEstrela = S.tut && S.tut.estrelas && S.tut.estrelas[0] === i; // uma estrela por vez
      const est = el.querySelector('.estrela');
      if (temEstrela && !est) el.insertAdjacentHTML('beforeend', '<svg class="estrela" viewBox="0 0 100 100"><path d="M50 6 L62 37 L95 38 L69 59 L78 92 L50 73 L22 92 L31 59 L5 38 L38 37Z" fill="#f6c945" stroke="#1d1a17" stroke-width="5" stroke-linejoin="round"/></svg>');
      else if (!temEstrela && est) est.remove();
    }
  }

  function desenharBarras() {
    const g = S.jogo;
    const topoCor = S.virado ? 'w' : 'b', baseCor = S.virado ? 'b' : 'w';
    const nomeDe = cor => {
      const time = cor === 'w' ? 'Floresta' : 'Mar';
      if (S.modo === 'tutorial') return cor === 'w' ? 'Você · Floresta' : 'Mar';
      if (S.modo === 'dois') return `Jogador ${cor === 'w' ? 1 : 2} · ${time}`;
      if (cor === S.euCor) return `Você · ${time}`;
      const nv = IA.NIVEIS[S.nivel];
      return `IA ${nv.nome} (nível ${S.nivel}) · ${time}`;
    };
    // capturas: compara com o material inicial
    const conta = cor => { const c = {}; for (const p of g.board) if (p !== '.' && colorOf(p) === cor) c[p.toLowerCase()] = (c[p.toLowerCase()] || 0) + 1; return c; };
    const ini = new Game(S.inicioFen);
    const contaIni = cor => { const c = {}; for (const p of ini.board) if (p !== '.' && colorOf(p) === cor) c[p.toLowerCase()] = (c[p.toLowerCase()] || 0) + 1; return c; };
    const VAL = { p: 1, n: 3, b: 3, r: 5, q: 9, k: 0 };
    const mat = cor => Object.entries(conta(cor)).reduce((s, [t, n]) => s + VAL[t] * n, 0);
    const capturasDe = cor => { // peças do adversário que `cor` capturou
      const adv = cor === 'w' ? 'b' : 'w', agora = conta(adv), antes = contaIni(adv);
      let html = '';
      for (const t of 'qrbnp') for (let k = 0; k < (antes[t] || 0) - (agora[t] || 0); k++) html += Pecas.svg(adv === 'w' ? t.toUpperCase() : t);
      const dif = mat(cor) - mat(adv);
      if (dif > 0) html += `<em>+${dif}</em>`;
      return html;
    };
    for (const [id, cor] of [['#barra-topo', topoCor], ['#barra-base', baseCor]]) {
      const b = $(id);
      b.querySelector('.quem').innerHTML = `<span class="vez"></span>${Pecas.svg(cor === 'w' ? 'K' : 'k')}${nomeDe(cor)}`;
      b.querySelector('.capturas').innerHTML = S.modo === 'tutorial' ? '' : capturasDe(cor);
      b.classList.toggle('ativa', !S.acabou && g.turn === cor);
    }
  }

  function desenharLances() {
    const ol = $('#lances'); ol.innerHTML = '';
    if (S.modo === 'tutorial') return;
    const comecaPreto = S.inicioFen.split(' ')[1] === 'b';
    const l = (comecaPreto ? ['…'] : []).concat(S.lancesSan);
    for (let i = 0; i < l.length; i += 2) ol.insertAdjacentHTML('beforeend', `<li>${l[i]} ${l[i + 1] || ''}</li>`);
    ol.scrollTop = ol.scrollHeight;
  }

  function desenharPlacar() {
    const p = $('#placar');
    p.hidden = S.modo !== 'infinito';
    if (!p.hidden) p.innerHTML = `<span>Partida <b>${inf.partida}</b></span><span>✓ <b>${inf.v}</b> · = <b>${inf.e}</b> · ✗ <b>${inf.d}</b></span><span>Sequência <b>${inf.seq}</b></span><span>IA nível <b>${S.nivel}</b></span>${inf.recorde ? `<span>Maior nível vencido <b>${inf.recorde}</b></span>` : ''}`;
  }

  function desenhar() {
    desenharCasas(); desenharPecas(); desenharBarras(); desenharLances(); desenharPlacar();
    const tut = S.modo === 'tutorial';
    $('#botoes').hidden = tut; $('#tutorial-botoes').hidden = !tut;
    $('#botoes [data-acao=desfazer]').disabled = S.pensando || S.jogo.history.length === 0 || S.acabou;
    $('#botoes [data-acao=dica]').disabled = S.pensando || S.acabou || !vezHumana();
    $('#btn-som').classList.toggle('desligado', !S.som);
    $('#btn-som').textContent = S.som ? '♪ Som' : '♪ Mudo';
  }

  // ---------------- regras de quem joga ----------------
  function vezHumana() {
    if (S.acabou || S.pensando || !S.modo) return false;
    if (S.modo === 'dois' || S.modo === 'tutorial') return S.modo !== 'tutorial' || (S.tut && S.tut.ativo);
    return S.jogo.turn === S.euCor;
  }

  function selecionar(i) {
    S.sel = i;
    S.alvos = i >= 0 ? S.jogo.legalFrom(i) : [];
    desenharCasas();
  }

  // ---------------- executar lance ----------------
  function executar(m, quem) {
    const g = S.jogo;
    S.dica = null;
    const san = S.modo === 'tutorial' ? '' : g.san(m);
    moverIds(m);
    g.make(m);
    S.lancesSan.push(san);
    S.sel = -1; S.alvos = [];
    const xeque = g.inCheck();
    tocar(xeque ? 'xeque' : m.captured !== '.' ? 'captura' : 'lance');
    desenhar();
    salvar();
    if (S.modo === 'tutorial') return tutorialAposLance(m);
    const st = g.status();
    if (st.over) return setTimeout(() => fimDeJogo(st), 450);
    if (S.modo === 'dois') {
      falar(xeque ? `Xeque! Vez do time <b>${g.turn === 'w' ? 'Floresta' : 'Mar'}</b> salvar a Baleia.` : `Vez do time <b>${g.turn === 'w' ? 'Floresta' : 'Mar'}</b>.`);
      return;
    }
    if (quem === 'humano') {
      if (m.captured !== '.') falar(sorteia(FALAS.capturouVoce));
      setTimeout(lanceIA, 380);
    } else {
      falar(xeque ? 'Xeque! 🐋 Proteja sua Baleia!' : m.captured !== '.' ? sorteia(FALAS.capturouIA) : sorteia(FALAS.suaVez));
    }
  }

  function tentarLance(from, to) {
    const cands = S.alvos.filter(m => m.from === from && m.to === to);
    if (!cands.length) return false;
    if (cands.length > 1) { escolherPromocao(cands); return true; }
    executar(cands[0], 'humano');
    return true;
  }

  function escolherPromocao(cands) {
    const box = $('#promo-opcoes'); box.innerHTML = '';
    for (const m of cands) {
      const b = document.createElement('button');
      b.innerHTML = Pecas.svg(m.promo) + Pecas.NOMES_CURTOS[m.promo.toLowerCase()];
      b.onclick = () => { abrirJanela(null); executar(m, 'humano'); };
      box.appendChild(b);
    }
    abrirJanela('#janela-promo');
  }

  function lanceIA() {
    if (S.acabou || S.modo === 'dois' || S.modo === 'tutorial' || S.jogo.turn === S.euCor) return;
    S.pensando = true; desenhar();
    falar(sorteia(FALAS.pensando));
    const partidaAtual = S.jogo;
    // espera a tela pintar antes de "pensar" (a busca roda na thread principal)
    setTimeout(() => {
      if (partidaAtual !== S.jogo) { S.pensando = false; return; }
      const m = IA.melhorLance(S.jogo, S.nivel);
      S.pensando = false;
      if (m && partidaAtual === S.jogo) executar(m, 'ia');
      else desenhar();
    }, 60);
  }

  // ---------------- mouse / toque ----------------
  let arraste = null;
  function casaDoPonteiro(ev) {
    const r = tabEl.getBoundingClientRect();
    const x = (ev.clientX - r.left) / r.width * 8, y = (ev.clientY - r.top) / r.height * 8;
    if (x < 0 || y < 0 || x >= 8 || y >= 8) return -1;
    const c = Math.floor(x), l = Math.floor(y);
    return S.virado ? (7 - l) * 8 + (7 - c) : l * 8 + c;
  }
  function podeMexer(i) {
    const p = S.jogo.board[i];
    return p !== '.' && vezHumana() && colorOf(p) === S.jogo.turn;
  }
  tabEl.addEventListener('pointerdown', ev => {
    const i = casaDoPonteiro(ev); if (i < 0) return;
    if (S.sel >= 0 && S.alvos.some(m => m.to === i)) { tentarLance(S.sel, i); return; }
    if (podeMexer(i)) {
      selecionar(i);
      const el = [...els.values()].find(e => +e.dataset.casa === i);
      arraste = { i, el, x0: ev.clientX, y0: ev.clientY, moveu: false };
      tabEl.setPointerCapture(ev.pointerId);
    } else selecionar(-1);
  });
  tabEl.addEventListener('pointermove', ev => {
    if (!arraste || !arraste.el) return;
    if (!arraste.moveu && Math.hypot(ev.clientX - arraste.x0, ev.clientY - arraste.y0) < 6) return;
    arraste.moveu = true;
    const r = tabEl.getBoundingClientRect();
    const x = (ev.clientX - r.left) / escala - 50, y = (ev.clientY - r.top) / escala - 50;
    arraste.el.classList.add('arrastando');
    arraste.el.style.transform = `translate(${x}px,${y}px)`;
  });
  const soltar = ev => {
    if (!arraste) return;
    const a = arraste; arraste = null;
    if (!a.moveu) return;
    const i = casaDoPonteiro(ev);
    if (!(i >= 0 && i !== a.i && tentarLance(a.i, i))) desenharPecas();
  };
  tabEl.addEventListener('pointerup', soltar);
  tabEl.addEventListener('pointercancel', () => { arraste = null; desenharPecas(); });

  // ---------------- partidas ----------------
  function novaPartida(modo, opts) {
    opts = opts || {};
    S.modo = modo;
    S.inicioFen = opts.fen || START_FEN;
    S.jogo = new Game(S.inicioFen);
    S.euCor = opts.euCor || 'w';
    S.nivel = opts.nivel || 3;
    S.virado = modo === 'dois' ? false : S.euCor === 'b';
    S.sel = -1; S.alvos = []; S.lancesSan = []; S.acabou = false; S.pensando = false; S.dica = null;
    if (modo !== 'tutorial') S.tut = null;
    reconstruirIds(); desenharCoords();
    abrirJanela(null);
    desenhar(); salvar();
  }

  function comecarInfinito() {
    inf.partida++;
    const euCor = inf.partida % 2 === 1 ? 'w' : 'b';
    const surpresa = inf.surpresa && inf.partida % 3 === 0;
    gravar(CHAVE_INF, inf);
    novaPartida('infinito', { euCor, nivel: inf.nivel, fen: surpresa ? fen960(Date.now()) : START_FEN });
    const nv = IA.NIVEIS[inf.nivel];
    falar(`Partida <b>${inf.partida}</b>! Você joga com o time <b>${euCor === 'w' ? 'Floresta' : 'Mar'}</b> contra a IA <b>${nv.nome}</b> (nível ${inf.nivel}).` +
      (surpresa ? ' 🎲 Abertura surpresa: as peças de trás foram embaralhadas!' : ''));
    if (euCor === 'b') setTimeout(lanceIA, 700);
  }

  function fimDeJogo(st) {
    S.acabou = true; desenhar();
    let titulo, venceuEu = null;
    if (st.result === '1/2') titulo = 'Empate!';
    else {
      const vencedor = st.result === '1-0' ? 'w' : 'b';
      if (S.modo === 'dois') titulo = `Vitória do time ${vencedor === 'w' ? 'Floresta 🌲' : 'Mar 🌊'}!`;
      else { venceuEu = vencedor === S.euCor; titulo = venceuEu ? 'Você venceu! 🎉' : 'A IA venceu!'; }
    }
    tocar(venceuEu === false ? 'derrota' : 'vitoria');
    let placar = '';
    if (S.modo === 'infinito') {
      const antes = inf.nivel;
      if (venceuEu) { inf.v++; inf.seq++; inf.nivel = Math.min(10, inf.nivel + 1); inf.recorde = Math.max(inf.recorde, antes); }
      else if (venceuEu === false) { inf.d++; inf.seq = 0; inf.nivel = Math.max(1, inf.nivel - 1); }
      else inf.e++;
      gravar(CHAVE_INF, inf);
      const mudou = inf.nivel > antes ? `A IA sobe para o nível <b>${inf.nivel}</b> (${IA.NIVEIS[inf.nivel].nome}).` :
        inf.nivel < antes ? `A IA desce para o nível <b>${inf.nivel}</b> (${IA.NIVEIS[inf.nivel].nome}).` : `A IA continua no nível <b>${inf.nivel}</b>.`;
      placar = `Vitórias ${inf.v} · Empates ${inf.e} · Derrotas ${inf.d} · Sequência ${inf.seq}<br>${mudou}`;
    }
    desenharPlacar();
    $('#fim-titulo').textContent = titulo;
    $('#fim-motivo').textContent = { 'xeque-mate': 'por xeque-mate', 'afogamento': 'por afogamento', 'regra dos 50 lances': 'pela regra dos 50 lances',
      'repetição tripla': 'por repetição da posição', 'material insuficiente': 'por falta de peças para dar mate', 'desistência': 'por desistência' }[st.reason] || st.reason;
    $('#fim-placar').innerHTML = placar;
    $('#btn-proxima').textContent = S.modo === 'infinito' ? 'Próxima partida ➜' : 'Jogar de novo';
    falar(titulo + ' ' + (S.modo === 'infinito' ? 'Bora para a próxima?' : ''));
    gravar(CHAVE_JOGO, null);
    abrirJanela('#janela-fim');
  }

  // ---------------- tutorial ----------------
  function abrirLicoes() {
    const ol = $('#lista-licoes'); ol.innerHTML = '';
    Tutorial.LICOES.forEach((l, k) => {
      const li = document.createElement('li'), b = document.createElement('button');
      b.className = tutFeitas.has(k) ? 'feita' : '';
      b.innerHTML = `${Pecas.svg(l.icone)}<span>${k + 1}. ${l.titulo}${tutFeitas.has(k) ? ' ✓' : ''}</span>`;
      b.onclick = () => iniciarLicao(k, 0);
      li.appendChild(b); ol.appendChild(li);
    });
    abrirJanela('#janela-licoes');
  }

  function iniciarLicao(k, p) {
    const passo = Tutorial.LICOES[k].passos[p];
    S.tut = { licao: k, passo: p, estrelas: passo.estrelas ? passo.estrelas.map(parseSq) : null, ativo: passo.tipo !== 'info', feito: false };
    novaPartida('tutorial', { fen: passo.fen, euCor: 'w' });
    S.virado = false; desenharCoords();
    const total = Tutorial.LICOES[k].passos.length;
    falar(`<small>${Tutorial.LICOES[k].titulo} · ${p + 1}/${total}</small><br>${passo.texto}`);
    $('#btn-tut-continuar').hidden = passo.tipo !== 'info';
    desenhar();
    if (passo.mostrar) { S.alvos = S.jogo.legalFrom(parseSq(passo.mostrar)); desenharCasas(); } // pontinhos de exemplo
    autoSelecionar();
    if (passo.antes) { // lance automático do adversário antes do desafio
      S.tut.ativo = false;
      setTimeout(() => {
        const [de, para] = passo.antes.map(parseSq);
        const m = S.jogo.legal().find(x => x.from === de && x.to === para);
        moverIds(m); S.jogo.make(m); tocar('lance');
        S.tut.ativo = true; desenhar();
      }, 900);
    }
  }

  // nas lições com uma peça só, já deixa ela selecionada para mostrar os pontinhos
  function autoSelecionar() {
    if (!S.tut || !S.tut.ativo || !S.tut.estrelas) return;
    const minhas = [];
    S.jogo.board.forEach((p, i) => { if (p !== '.' && colorOf(p) === 'w') minhas.push(i); });
    if (minhas.length === 1) selecionar(minhas[0]);
  }

  function voltarVezBranca() { // nas lições de estrelas/captura o Mar não joga
    const g = S.jogo;
    if (g.turn === 'b') { g.turn = 'w'; g.ep = -1; g.keys.push(g.hash()); }
  }

  function tutorialAposLance(m) {
    const passo = Tutorial.LICOES[S.tut.licao].passos[S.tut.passo];
    if (passo.tipo === 'estrelas') {
      const pegou = S.tut.estrelas[0] === m.to;
      if (pegou) { S.tut.estrelas.shift(); tocar('estrela'); }
      voltarVezBranca(); desenhar();
      if (S.tut.estrelas.length === 0) return passoConcluido('Todas as estrelas! ⭐');
      if (pegou) falar(`⭐ Isso! Falta${S.tut.estrelas.length > 1 ? 'm' : ''} ${S.tut.estrelas.length}. Os pontinhos mostram para onde dá para ir.`);
      else falar('A estrela continua lá. Olhe os pontinhos e tente outro caminho!');
      autoSelecionar();
      return;
    }
    if (passo.tipo === 'capturar') {
      voltarVezBranca(); desenhar();
      if (!S.jogo.board.some(p => p !== '.' && colorOf(p) === 'b')) return passoConcluido('Capturou tudo! 💪');
      return;
    }
    if (passo.tipo === 'lance') {
      if (passo.ok(S.jogo, m)) {
        const st = S.jogo.status();
        return passoConcluido(st.over && st.reason === 'xeque-mate' ? 'Xeque-mate! 🎉' : 'Isso mesmo! ✨');
      }
      S.tut.ativo = false; tocar('erro');
      falar(passo.erro || 'Hmm, não foi esse. Tente de novo!');
      setTimeout(() => {
        S.jogo.unmake(); S.lancesSan.pop(); reconstruirIds(); S.tut.ativo = true; desenhar();
      }, 900);
    }
  }

  function passoConcluido(msg) {
    S.tut.ativo = false; S.tut.feito = true;
    const licao = Tutorial.LICOES[S.tut.licao];
    const ultimo = S.tut.passo === licao.passos.length - 1;
    falar(`<b>${msg}</b> ${ultimo ? 'Lição concluída!' : ''}`);
    $('#btn-tut-continuar').hidden = false;
    tocar('vitoria');
    desenhar();
  }

  function tutContinuar() {
    const t = S.tut; if (!t) return;
    const licao = Tutorial.LICOES[t.licao];
    if (t.passo < licao.passos.length - 1) return iniciarLicao(t.licao, t.passo + 1);
    tutFeitas.add(t.licao); gravar(CHAVE_TUT, [...tutFeitas]);
    if (t.licao < Tutorial.LICOES.length - 1) iniciarLicao(t.licao + 1, 0);
    else abrirLicoes();
  }

  // ---------------- salvar / continuar ----------------
  function salvar() {
    if (!S.modo || S.modo === 'tutorial' || S.acabou) return;
    const lances = S.jogo.history.map(u => [u.m.from, u.m.to, u.m.promo]);
    gravar(CHAVE_JOGO, { modo: S.modo, fen: S.inicioFen, euCor: S.euCor, nivel: S.nivel, lances });
  }
  function continuar() {
    const s = ler(CHAVE_JOGO, null); if (!s) return;
    novaPartida(s.modo, { fen: s.fen, euCor: s.euCor, nivel: s.nivel });
    for (const [de, para, promo] of s.lances) {
      const m = S.jogo.legal().find(x => x.from === de && x.to === para && x.promo === promo);
      if (!m) break;
      S.lancesSan.push(S.jogo.san(m)); S.jogo.make(m);
    }
    reconstruirIds(); desenhar();
    falar('De volta à partida! ' + (vezHumana() ? 'Sua vez.' : ''));
    if (S.modo !== 'dois' && S.jogo.turn !== S.euCor) setTimeout(lanceIA, 600);
  }

  // ---------------- janelas e botões ----------------
  function abrirJanela(sel) {
    $('#veu').hidden = !sel;
    document.querySelectorAll('.janela').forEach(j => { j.hidden = '#' + j.id !== sel; });
  }
  function abrirMenu() {
    $('#btn-continuar').hidden = !ler(CHAVE_JOGO, null);
    $('#opt-surpresa').checked = !!inf.surpresa;
    $('#opt-nivel').value = cfg.nivel; $('#opt-cor').value = cfg.cor; atualizarNomeNivel();
    abrirJanela('#janela-menu');
  }
  function atualizarNomeNivel() { $('#nivel-nome').textContent = IA.NIVEIS[+$('#opt-nivel').value].nome; }
  $('#opt-nivel').addEventListener('input', atualizarNomeNivel);
  $('#opt-surpresa').addEventListener('change', e => { inf.surpresa = e.target.checked; gravar(CHAVE_INF, inf); });

  const ACOES = {
    menu: abrirMenu,
    continuar,
    infinito: comecarInfinito,
    ia: () => {
      cfg.nivel = +$('#opt-nivel').value; cfg.cor = $('#opt-cor').value; gravar(CHAVE_CFG, cfg);
      const euCor = cfg.cor === '?' ? (Math.random() < .5 ? 'w' : 'b') : cfg.cor;
      novaPartida('ia', { euCor, nivel: cfg.nivel });
      falar(`Você é o time <b>${euCor === 'w' ? 'Floresta' : 'Mar'}</b>. ${euCor === 'w' ? 'Comece!' : 'Eu começo...'}`);
      if (euCor === 'b') setTimeout(lanceIA, 700);
    },
    dois: () => { novaPartida('dois'); falar('Dois jogadores! O time <b>Floresta</b> começa.'); },
    licoes: abrirLicoes,
    proxima: () => {
      if (S.modo === 'infinito') comecarInfinito();
      else if (S.modo === 'ia') ACOES.ia();
      else if (S.modo === 'dois') ACOES.dois();
    },
    'ver-tabuleiro': () => { abrirJanela(null); falar('Quando quiser, aperte <b>Menu</b> para jogar de novo.'); },
    desfazer: () => {
      if (S.pensando || !S.jogo.history.length) return;
      S.jogo.unmake(); S.lancesSan.pop();
      if (S.modo !== 'dois' && S.jogo.turn !== S.euCor && S.jogo.history.length) { S.jogo.unmake(); S.lancesSan.pop(); }
      S.sel = -1; S.alvos = []; S.dica = null;
      reconstruirIds(); desenhar(); salvar();
      falar('Voltei o lance. Tente outra ideia!');
      if (S.modo !== 'dois' && S.jogo.turn !== S.euCor) setTimeout(lanceIA, 400);
    },
    dica: () => {
      if (!vezHumana()) return;
      falar('Deixa eu ver no livro...');
      setTimeout(() => {
        const m = IA.melhorLance(S.jogo, 7);
        if (!m) return;
        S.dica = m; desenharCasas();
        falar(`Que tal mover <b>${Pecas.NOMES_CURTOS[m.piece.toLowerCase()]}</b> de ${name(m.from)} para ${name(m.to)}?`);
      }, 30);
    },
    virar: () => { S.virado = !S.virado; desenharCoords(); desenhar(); },
    som: () => { S.som = !S.som; cfg.som = S.som; gravar(CHAVE_CFG, cfg); desenhar(); },
    'tut-continuar': tutContinuar,
    'tut-recomecar': () => S.tut && iniciarLicao(S.tut.licao, S.tut.passo),
    'tut-sair': abrirLicoes,
  };
  document.addEventListener('click', ev => {
    const b = ev.target.closest('[data-acao]'); if (!b) return;
    const f = ACOES[b.dataset.acao]; if (f) f();
  });

  // ---------------- início ----------------
  reconstruirIds(); desenharCoords(); desenhar();
  falar('Olá! Eu sou a <b>Raposa Maga</b> 🦊. Vamos jogar xadrez na ilha da baleia?');
  abrirMenu();

  // ganchos para teste automático
  window.__xadrez = { S, inf, executar, ACOES, iniciarLicao, fimDeJogo };
})();
