import { GAME_CONFIG } from '../config.js';

const CHARACTER_IDS = Object.keys(GAME_CONFIG.characters); // ['coco','domono','faxo','pablo']
// retratos de los personajes (personas, sin autos) para la lineup del menú
const CHAMPION_LINEUP = [
  { id: 'coco', img: '/assets/ui/pilots/coco.webp' },
  { id: 'domono', img: '/assets/ui/pilots/domono.webp' },
  { id: 'faxo', img: '/assets/ui/pilots/faxo.webp' },
  { id: 'pablo', img: '/assets/ui/pilots/Kenai3d 1.png' },
  { id: 'chubit', img: '/assets/ui/pilots/Chubitcoin Splash Art.jpg' },
];
// tarjetas splash art de los personajes (estilo cómic con stats) para el champion select
const CHARACTER_SPLASH = {
  coco: '/assets/ui/pilots/El Coco Splash Art.jfif',
  domono: '/assets/ui/pilots/Domono Splash Art.jfif',
  faxo: '/assets/ui/pilots/Faxo Splash Art.jfif',
  pablo: '/assets/ui/pilots/Kenai Splash Art.jfif',
  chubit: '/assets/ui/pilots/Chubitcoin Splash Art.jpg',
};
const DIFFICULTIES = ['easy', 'normal', 'hard'];
const DIFFICULTY_LABEL = { easy: 'Fácil', normal: 'Normal', hard: 'Difícil' };
const TYPE_LABEL = { off: 'Cerrado', human: 'Humano', cpu: 'CPU' };

/**
 * Capa de interfaz genérica (HTML encima del canvas).
 * Máquina de pantallas: menú → lobby → HUD (partida) → resultados.
 * No toca la simulación: solo la configura (lobby) y la muestra (HUD/resultados).
 */
export class UI {
  /**
   * @param parent elemento contenedor (document.body)
   * @param actions callbacks: { onPlay, onFight(slots), onRematch, onLobby, onMenu }
   */
  constructor(parent, actions) {
    this.actions = actions;
    this.root = document.createElement('div');
    this.root.id = 'ui-root';
    parent.appendChild(this.root);
    this.hudCards = [];
    this.centerMsg = null;
  }

  /** Limpia la pantalla actual. */
  clear() {
    this.root.innerHTML = '';
    this.hudCards = [];
    this.centerMsg = null;
  }

  // ================================================================ MENÚ

  showMenu() {
    this.clear();
    const s = document.createElement('div');
    // pointer-events: auto porque #ui-root tiene pointer-events:none (los clics
    // pasan al canvas 3D en el juego); sin esto el botón no recibe clics
    s.style.cssText = 'position:fixed;inset:0;z-index:50;overflow:hidden;background:#10121a;pointer-events:auto;';

    // fondo: capa exterior con vibración sutil + capa interior con zoom lento (Ken Burns)
    const bgShake = document.createElement('div');
    bgShake.style.cssText = 'position:absolute;inset:0;animation:menuBgShake 3.8s ease-in-out infinite;';
    const bg = document.createElement('div');
    // will-change solo en el bg (1 nodo) para hints de composición sin castigar GPU
    bg.style.cssText = 'position:absolute;inset:-4%;background:url("/assets/ui/title-splash.jpg") center/cover no-repeat;animation:menuBgZoom 22s ease-in-out infinite alternate;will-change:transform;';
    bgShake.append(bg);

    // flash sutil de impacto: pulso blanco cálido cada ~7s desde el centro
    const flash = document.createElement('div');
    flash.style.cssText = 'position:absolute;inset:0;pointer-events:none;background:radial-gradient(ellipse at 50% 40%,rgba(255,244,214,0.55) 0%,rgba(255,244,214,0.18) 35%,transparent 65%);animation:impactFlash 7s ease-out infinite;';

    // capas de movimiento: humo (solo gradients, sin filter:blur — más barato) + chispas + polvo + brillos
    const fxLayer = document.createElement('div');
    fxLayer.style.cssText = 'position:absolute;inset:0;pointer-events:none;overflow:hidden;';
    // humos: blobs suaves por radial-gradient (sin blur filter = GPU amigable)
    const smokeDefs = [
      { top: '16%', w: 340, dur: 26, delay: 0, op: 0.20 },
      { top: '42%', w: 460, dur: 34, delay: 6, op: 0.14 },
      { top: '64%', w: 280, dur: 22, delay: 12, op: 0.18 },
      { top: '28%', w: 380, dur: 30, delay: 18, op: 0.12 },
      { top: '74%', w: 340, dur: 28, delay: 3, op: 0.16 },
    ];
    smokeDefs.forEach((d) => {
      const puff = document.createElement('div');
      puff.style.cssText = `position:absolute;top:${d.top};left:-${d.w}px;width:${d.w}px;height:${d.w * 0.5}px;border-radius:50%;background:radial-gradient(ellipse,rgba(255,255,255,${d.op}) 0%,rgba(255,255,255,${d.op * 0.45}) 40%,transparent 72%);animation:smokeDrift ${d.dur}s linear ${d.delay}s infinite;will-change:transform;`;
      fxLayer.append(puff);
    });
    // chispas: puntos chicos que suben y parpadean (impacto de pelea)
    const sparkDefs = [
      { left: '18%', bottom: '10%', size: 5, dur: 5.5, delay: 0, color: '#ffd23c' },
      { left: '32%', bottom: '6%', size: 4, dur: 7, delay: 1.4, color: '#ff9a3c' },
      { left: '48%', bottom: '12%', size: 6, dur: 6, delay: 0.7, color: '#ffe08a' },
      { left: '62%', bottom: '8%', size: 4, dur: 8, delay: 2.2, color: '#ffd23c' },
      { left: '76%', bottom: '14%', size: 5, dur: 5, delay: 1.1, color: '#ff5a7a' },
      { left: '86%', bottom: '9%', size: 4, dur: 7.5, delay: 3, color: '#ff9a3c' },
    ];
    sparkDefs.forEach((d) => {
      const sp = document.createElement('div');
      sp.style.cssText = `position:absolute;left:${d.left};bottom:${d.bottom};width:${d.size}px;height:${d.size}px;border-radius:50%;background:${d.color};box-shadow:0 0 ${d.size * 2.5}px ${d.color};animation:sparkFloat ${d.dur}s ease-in ${d.delay}s infinite,sparkFlicker ${d.dur * 0.35}s ease-in-out ${d.delay}s infinite;`;
      fxLayer.append(sp);
    });
    // motas de polvo: puntos tenues que derivan en diagonal
    const dustDefs = [
      { top: '25%', left: '10%', size: 3, dur: 18, delay: 0 },
      { top: '55%', left: '70%', size: 2, dur: 22, delay: 5 },
      { top: '40%', left: '40%', size: 2, dur: 20, delay: 9 },
      { top: '68%', left: '85%', size: 3, dur: 16, delay: 3 },
      { top: '15%', left: '55%', size: 2, dur: 24, delay: 12 },
    ];
    dustDefs.forEach((d) => {
      const mote = document.createElement('div');
      mote.style.cssText = `position:absolute;top:${d.top};left:${d.left};width:${d.size}px;height:${d.size}px;border-radius:50%;background:rgba(244,241,232,0.5);animation:dustDrift ${d.dur}s linear ${d.delay}s infinite;`;
      fxLayer.append(mote);
    });
    // brillos flotantes: estrellitas que titilan en el lugar (twinkle), como luciérnagas de pelea
    const glintDefs = [
      { top: '22%', left: '14%', size: 14, dur: 3.2, delay: 0 },
      { top: '35%', left: '78%', size: 11, dur: 4.1, delay: 1.2 },
      { top: '58%', left: '22%', size: 13, dur: 3.6, delay: 2.4 },
      { top: '48%', left: '88%', size: 10, dur: 4.5, delay: 0.8 },
      { top: '68%', left: '50%', size: 12, dur: 3.8, delay: 3.1 },
      { top: '30%', left: '50%', size: 9, dur: 4.8, delay: 1.8 },
    ];
    glintDefs.forEach((d) => {
      const gl = document.createElement('div');
      // cruz de brillo hecha con dos barras + núcleo radial (sin images externas)
      gl.style.cssText = `position:absolute;top:${d.top};left:${d.left};width:${d.size}px;height:${d.size}px;animation:glintTwinkle ${d.dur}s ease-in-out ${d.delay}s infinite;will-change:transform,opacity;`;
      const core = document.createElement('div');
      core.style.cssText = 'position:absolute;inset:25%;border-radius:50%;background:radial-gradient(circle,rgba(255,250,230,0.95) 0%,rgba(255,230,150,0.5) 50%,transparent 75%);';
      const armH = document.createElement('div');
      armH.style.cssText = 'position:absolute;top:45%;left:0;width:100%;height:12%;background:linear-gradient(90deg,transparent,rgba(255,250,230,0.85),transparent);';
      const armV = document.createElement('div');
      armV.style.cssText = 'position:absolute;top:0;left:45%;width:12%;height:100%;background:linear-gradient(180deg,transparent,rgba(255,250,230,0.85),transparent);';
      gl.append(core, armH, armV);
      fxLayer.append(gl);
    });

    // título: abajo, mitad de tamaño, SIN transform translateX (queda más nítido)
    const titleWrap = document.createElement('div');
    titleWrap.style.cssText = 'position:absolute;bottom:4%;left:0;right:0;margin:0 auto;width:min(32vw,400px);animation:titleShake 3s ease-in-out infinite;';
    const titleImg = document.createElement('img');
    titleImg.src = '/assets/ui/parallax/Title Text - Title Screen.png';
    titleImg.alt = 'Un Re Bondi En Ciudad Evita';
    titleImg.draggable = false;
    // PNG con transparencia real (el cuadriculado del JPG se removió por color)
    titleImg.style.cssText = 'display:block;width:100%;filter:drop-shadow(0 6px 16px rgba(0,0,0,0.75));animation:titleZoom 5s ease-in-out infinite;';
    titleWrap.append(titleImg);

    // start: arriba, donde estaba el título
    const play = document.createElement('button');
    play.textContent = 'PRESS START';
    play.style.cssText = 'position:absolute;top:2%;left:50%;transform:translateX(-50%);padding:14px 48px;font-size:clamp(16px,2.2vw,24px);font-weight:900;letter-spacing:0.05em;color:#10121a;background:#e9c46a;border:4px solid #14161a;border-radius:14px;cursor:pointer;z-index:51;pointer-events:auto;animation:diagPulse 1.5s ease-in-out infinite;';
    play.onclick = () => this.actions.onPlay();

    const version = document.createElement('div');
    version.textContent = 'v3-title-anim';
    version.style.cssText = 'position:absolute;bottom:12px;right:14px;font-size:12px;font-weight:700;color:rgba(244,241,232,0.75);text-shadow:0 1px 3px rgba(0,0,0,0.9);';

    // keyframes inline: todos transform/opacity (GPU-composited, baratos)
    const st = document.createElement('style');
    st.textContent = `
      @keyframes diagPulse{0%,100%{transform:translateX(-50%) scale(1)}50%{transform:translateX(-50%) scale(1.07);box-shadow:0 0 34px rgba(233,196,106,0.7)}}
      @keyframes menuBgZoom{0%{transform:scale(1)}100%{transform:scale(1.07)}}
      @keyframes menuBgShake{0%,100%{transform:translate(0,0)}22%{transform:translate(2px,-1.5px)}48%{transform:translate(-1.5px,2px)}74%{transform:translate(1.5px,1.5px)}}
      @keyframes titleZoom{0%,100%{transform:scale(1)}50%{transform:scale(1.035)}}
      @keyframes titleShake{0%,100%{transform:translate(0,0)}25%{transform:translate(1.5px,-1px)}50%{transform:translate(-1px,1.5px)}75%{transform:translate(1px,1px)}}
      @keyframes smokeDrift{0%{transform:translateX(0) translateY(0)}50%{transform:translateX(60vw) translateY(-3%)}100%{transform:translateX(120vw) translateY(-6%)}}
      @keyframes sparkFloat{0%{transform:translateY(0) scale(1);opacity:0}12%{opacity:1}60%{opacity:0.85}100%{transform:translateY(-48vh) scale(0.35);opacity:0}}
      @keyframes sparkFlicker{0%,100%{opacity:1}50%{opacity:0.35}}
      @keyframes dustDrift{0%{transform:translate(0,0);opacity:0}10%{opacity:0.55}90%{opacity:0.4}100%{transform:translate(-6vw,4vh);opacity:0}}
      @keyframes impactFlash{0%,88%,100%{opacity:0}92%{opacity:0.7}96%{opacity:0.25}}
      @keyframes glintTwinkle{0%,100%{transform:scale(0.4) rotate(0deg);opacity:0}40%{transform:scale(1) rotate(12deg);opacity:1}70%{transform:scale(0.7) rotate(20deg);opacity:0.5}}
    `;
    document.head.appendChild(st);

    s.append(bgShake, flash, fxLayer, titleWrap, play, version);
    this.root.append(s);
  }

  // ================================================================ LOBBY

  /** @param slots array editable de { type:'off'|'human'|'cpu', character, difficulty } */
  showLobby(slots) {
    this.clear();
    const s = el('div', 'ui-screen lobby-screen');

    // capas de movimiento de fondo (mismo estilo que el title screen, más liviano)
    const fx = el('div', 'lobby-fx');
    // humo: blobs suaves que derivan (sin filter:blur)
    [
      { top: '12%', w: 300, dur: 28, delay: 0, op: 0.10 },
      { top: '48%', w: 380, dur: 34, delay: 8, op: 0.08 },
      { top: '70%', w: 260, dur: 24, delay: 14, op: 0.09 },
    ].forEach((d) => {
      const puff = el('div', 'lobby-smoke');
      puff.style.cssText = `top:${d.top};left:-${d.w}px;width:${d.w}px;height:${d.w * 0.5}px;background:radial-gradient(ellipse,rgba(255,255,255,${d.op}) 0%,rgba(255,255,255,${d.op * 0.4}) 40%,transparent 72%);animation:lobbySmokeDrift ${d.dur}s linear ${d.delay}s infinite;`;
      fx.append(puff);
    });
    // motas de polvo que derivan
    [
      { top: '22%', left: '8%', size: 2, dur: 20, delay: 0 },
      { top: '55%', left: '78%', size: 3, dur: 24, delay: 6 },
      { top: '38%', left: '45%', size: 2, dur: 18, delay: 11 },
      { top: '72%', left: '90%', size: 2, dur: 22, delay: 3 },
    ].forEach((d) => {
      const mote = el('div', 'lobby-dust');
      mote.style.cssText = `top:${d.top};left:${d.left};width:${d.size}px;height:${d.size}px;animation:lobbyDustDrift ${d.dur}s linear ${d.delay}s infinite;`;
      fx.append(mote);
    });
    // brillos flotantes que titilan (cruz + núcleo, como en el title)
    [
      { top: '18%', left: '12%', size: 12, dur: 3.6, delay: 0 },
      { top: '30%', left: '84%', size: 10, dur: 4.2, delay: 1.5 },
      { top: '62%', left: '20%', size: 11, dur: 3.9, delay: 2.8 },
      { top: '55%', left: '76%', size: 9, dur: 4.6, delay: 0.9 },
    ].forEach((d) => {
      const gl = el('div', 'lobby-glint');
      gl.style.cssText = `top:${d.top};left:${d.left};width:${d.size}px;height:${d.size}px;animation:lobbyGlintTwinkle ${d.dur}s ease-in-out ${d.delay}s infinite;`;
      const core = el('div', 'lobby-glint-core');
      const armH = el('div', 'lobby-glint-arm-h');
      const armV = el('div', 'lobby-glint-arm-v');
      gl.append(core, armH, armV);
      fx.append(gl);
    });
    s.append(fx);

    s.append(el('div', 'ui-title', 'ELEGÍ TU PELEADOR'), el('div', 'ui-subtitle', 'Tocá la tarjeta para cambiar de personaje'));
    // indicador de joystick conectado (Gamepad API)
    const pads = navigator.getGamepads ? [...navigator.getGamepads()].filter(Boolean) : [];
    if (pads.some((p) => p?.connected)) {
      const gp = el('div', 'lobby-gamepad-ind', '🎮 Joystick conectado — stick/d-pad: moverse · A: saltar · X: atacar · B/Y: especial');
      s.append(gp);
    }

    const row = el('div', 'lobby-slots');
    const rerender = () => { this.showLobby(slots); };

    slots.forEach((slot, i) => {
      const cfg = GAME_CONFIG.players[i];
      const card = el('div', `lobby-slot ui-panel${slot.type === 'off' ? ' off' : ''}`);
      card.append(el('div', 'slot-tag', `PUERTO ${i + 1}`));

      // tipo de slot: cerrado → humano → CPU
      card.append(smallBtn(TYPE_LABEL[slot.type], () => {
        slot.type = slot.type === 'off' ? 'human' : slot.type === 'human' ? 'cpu' : 'off';
        rerender();
      }));

      // personaje (cicla por GAME_CONFIG.characters) — muestra la TARJETA SPLASH ART
      // del personaje (estilo champion select) en vez del retrato recortado
      const ch = GAME_CONFIG.characters[slot.character];
      const charBtn = smallBtn('', () => {
        const idx = CHARACTER_IDS.indexOf(slot.character);
        slot.character = CHARACTER_IDS[(idx + 1) % CHARACTER_IDS.length];
        rerender();
      });
      charBtn.classList.add('slot-char', 'slot-char-card');
      const charImg = document.createElement('img');
      charImg.alt = ch.name;
      charImg.draggable = false;
      charImg.src = CHARACTER_SPLASH[slot.character] || '/assets/ui/pilots/Kenai3d 1.png';
      // zoom sutil escalonado (cardZoom en ui.css) — cada tarjeta con su fase
      charImg.style.animationDelay = `${i * 1.4}s`;
      const nameTag = el('div', 'slot-char-name', ch.name);
      nameTag.style.background = ch.color;
      charBtn.append(charImg, nameTag);
      card.append(charBtn);

      // dificultad (solo si es CPU)
      const diffBtn = smallBtn(
        slot.type === 'cpu' ? `CPU ${DIFFICULTY_LABEL[slot.difficulty]}` : '—',
        () => {
          const idx = DIFFICULTIES.indexOf(slot.difficulty);
          slot.difficulty = DIFFICULTIES[(idx + 1) % DIFFICULTIES.length];
          rerender();
        });
      diffBtn.disabled = slot.type !== 'cpu';
      card.append(diffBtn);

      card.querySelectorAll('.slot-btn').forEach((b) => b.classList.add('slot-btn'));
      row.append(card);
    });
    s.append(row);

    const active = slots.filter((x) => x.type !== 'off').length;
    const bottom = el('div', 'lobby-bottom');

    // selector de mapa: cicla por GAME_CONFIG.stages — al cambiar, el renderer
    // reconstruye el escenario 3D de fondo (onStageChange en main.js)
    const stageIds = Object.keys(GAME_CONFIG.stages);
    const stageBtn = smallBtn(`MAPA: ${GAME_CONFIG.stages[this._stageId ?? GAME_CONFIG.defaultStage].name}`, () => {
      const cur = stageIds.indexOf(this._stageId ?? GAME_CONFIG.defaultStage);
      this._stageId = stageIds[(cur + 1) % stageIds.length];
      // avisar al renderer para que cambie el escenario 3D de fondo
      this.actions.onStageChange?.(this._stageId);
      rerender();
    });
    stageBtn.classList.add('lobby-stage-btn');
    bottom.append(stageBtn);

    const fight = btn(`¡A PELEAR! (${active} jugadores)`, () => this.actions.onFight(slots, this._stageId ?? GAME_CONFIG.defaultStage));
    fight.disabled = active < 2;
    fight.classList.add('lobby-fight-btn');
    const back = btn('VOLVER', () => this.actions.onMenu());
    back.classList.add('secondary');
    bottom.append(row, fight, back);
    s.append(bottom);
    this.root.append(s);
  }

  // ================================================================ HUD

  /** Crea la barra inferior con una tarjeta por luchador. */
  showHUD(match) {
    this.clear();
    const hud = el('div', '');
    hud.id = 'hud';
    this.hudCards = match.fighters.map((f) => {
      const slot = GAME_CONFIG.players[f.index % GAME_CONFIG.players.length];
      const card = el('div', 'hud-card');
      card.style.borderTopColor = slot.color;
      const name = el('div', 'hud-name', `${slot.short} · ${f.spec.name}`);
      const pct = el('div', 'hud-percent', '0%');
      const stocks = el('div', 'hud-stocks');
      card.append(name, pct, stocks);
      hud.append(card);
      return { card, pct, stocks, f };
    });

    this.centerMsg = el('div', '');
    this.centerMsg.id = 'center-msg';
    this.root.append(hud, this.centerMsg);
    this._lastCenter = '';
  }

  /** Se llama cada cuadro durante la partida. */
  updateHUD(match) {
    // tarjetas: % y vidas
    for (const c of this.hudCards) {
      const f = c.f;
      c.pct.textContent = `${Math.floor(f.percent)}%`;
      // color del %: blanco → amarillo → naranja → rojo
      const t = Math.min(1, f.percent / 150);
      c.pct.style.color = `rgb(255, ${Math.round(255 - 140 * t)}, ${Math.round(255 - 220 * t)})`;
      // vidas
      c.stocks.innerHTML = '';
      for (let i = 0; i < match.stocks; i++) {
        const dot = el('div', `hud-stock${i < f.stocks ? '' : ' lost'}`);
        dot.style.background = i < f.stocks ? GAME_CONFIG.players[f.index % GAME_CONFIG.players.length].color : 'transparent';
        c.stocks.append(dot);
      }
      c.card.classList.toggle('dead', f.state === 'dead');
    }

    // mensaje central: cuenta regresiva / ¡YA!
    let msg = '';
    if (match.phase === 'countdown') {
      const left = GAME_CONFIG.match.countdownFrames - match.frame;
      const n = Math.ceil(left / 60);
      if (n >= 1 && n <= 3) msg = String(n);
    } else if (match.phase === 'fighting' && match.fightFrames < 70) {
      msg = '¡YA!';
    }
    if (msg !== this._lastCenter) {
      this._lastCenter = msg;
      this.centerMsg.innerHTML = msg ? `<span>${msg}</span>` : '';
    }
  }

  // ================================================================ RESULTADOS

  showResults(match) {
    this.clear();
    const s = el('div', 'ui-screen');
    const w = match.winner;
    if (w >= 0) {
      const f = match.fighters[w];
      const slot = GAME_CONFIG.players[f.index % GAME_CONFIG.players.length];
      s.append(
        el('div', 'ui-title', `¡GANÓ ${slot.short}!`),
        el('div', 'ui-subtitle', `${f.spec.name} — quedó con ${f.stocks} ${f.stocks === 1 ? 'vida' : 'vidas'}`),
      );
    } else {
      s.append(el('div', 'ui-title', 'EMPATE'), el('div', 'ui-subtitle', 'Nadie quedó en pie'));
    }

    const rematch = btn('REVANCHA', () => this.actions.onRematch());
    const lobby = btn('LOBBY', () => this.actions.onLobby());
    lobby.classList.add('secondary');
    const menu = btn('MENÚ', () => this.actions.onMenu());
    menu.classList.add('secondary');
    s.append(rematch, lobby, menu);
    this.root.append(s);
  }
}

// ---------------------------------------------------------------- helpers DOM

function el(tag, cls, html) {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (html != null) e.innerHTML = html;
  return e;
}
function btn(label, onClick) {
  const b = document.createElement('button');
  b.className = 'ui-btn';
  b.textContent = label;
  b.onclick = onClick;
  return b;
}
function smallBtn(label, onClick) {
  const b = document.createElement('button');
  b.className = 'slot-btn';
  b.innerHTML = label || ' ';
  b.onclick = onClick;
  return b;
}

// ---------------------------------------------------------------- nube de pelea (inline SVG)

/** Nube de pelea de caricatura con guantes, estrellas y bursts — inline para animarla con CSS. */
const FIGHT_CLOUD_SVG = `
<svg viewBox="-280 -195 560 380" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
  <defs>
    <linearGradient id="cloudG" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#fdfdf8"/>
      <stop offset="1" stop-color="#c9cec6"/>
    </linearGradient>
    <path id="st4" d="M0 -13 L3 -3 L13 0 L3 3 L0 13 L-3 3 L-13 0 L-3 -3 Z"/>
    <path id="bst" d="M0 -40 L9 -17 L29 -27 L21 -7 L41 -5 L24 7 L38 22 L16 19 L14 40 L0 22 L-14 40 L-16 19 L-38 22 L-24 7 L-41 -5 L-21 -7 L-29 -27 L-9 -17 Z"/>
  </defs>

  <!-- estelas de movimiento -->
  <g class="speedlines" stroke="#14161a" stroke-width="6" stroke-linecap="round">
    <path d="M-196 -52 l-30 -12"/><path d="M-190 26 l-34 6"/>
    <path d="M192 -60 l32 -16"/><path d="M202 18 l36 5"/>
    <path d="M-54 -136 l-10 -28"/><path d="M62 -134 l12 -26"/>
  </g>

  <!-- nube -->
  <g class="cloud-body" fill="url(#cloudG)" stroke="#14161a" stroke-width="7">
    <circle cx="-85" cy="9" r="52"/>
    <circle cx="-40" cy="-46" r="56"/>
    <circle cx="27" cy="-52" r="52"/>
    <circle cx="85" cy="-16" r="56"/>
    <circle cx="72" cy="43" r="49"/>
    <circle cx="0" cy="49" r="56"/>
    <circle cx="-63" cy="43" r="47"/>
  </g>

  <!-- guantes -->
  <g class="glove g1" transform="translate(-115,-106) rotate(-26)">
    <ellipse rx="32" ry="26" fill="#d8352a" stroke="#14161a" stroke-width="6"/>
    <ellipse cx="-21" cy="8" rx="13" ry="11" fill="#d8352a" stroke="#14161a" stroke-width="5"/>
    <rect x="18" y="-13" width="21" height="28" rx="8" fill="#f4f1e8" stroke="#14161a" stroke-width="5"/>
  </g>
  <g class="glove g2" transform="translate(126,-62) rotate(22) scale(-1,1)">
    <ellipse rx="32" ry="26" fill="#d8352a" stroke="#14161a" stroke-width="6"/>
    <ellipse cx="-21" cy="8" rx="13" ry="11" fill="#d8352a" stroke="#14161a" stroke-width="5"/>
    <rect x="18" y="-13" width="21" height="28" rx="8" fill="#f4f1e8" stroke="#14161a" stroke-width="5"/>
  </g>
  <g class="glove g3" transform="translate(-134,58) rotate(13)">
    <ellipse rx="27" ry="22" fill="#d8352a" stroke="#14161a" stroke-width="6"/>
    <ellipse cx="-18" cy="7" rx="11" ry="10" fill="#d8352a" stroke="#14161a" stroke-width="5"/>
    <rect x="15" y="-11" width="18" height="24" rx="7" fill="#f4f1e8" stroke="#14161a" stroke-width="5"/>
  </g>
  <g class="glove g4" transform="translate(5,-128) rotate(-8)">
    <ellipse rx="28" ry="23" fill="#d8352a" stroke="#14161a" stroke-width="6"/>
    <rect x="-16" y="-36" width="32" height="20" rx="8" fill="#d8352a" stroke="#14161a" stroke-width="5"/>
    <rect x="14" y="-14" width="20" height="27" rx="8" fill="#f4f1e8" stroke="#14161a" stroke-width="5"/>
  </g>

  <!-- bursts -->
  <g class="pow" transform="translate(134,96) rotate(11)">
    <use href="#bst" fill="#F2C94C" stroke="#14161a" stroke-width="5"/>
    <text y="9" text-anchor="middle" font-family="'Arial Black', Impact, sans-serif" font-size="26" font-weight="900" fill="#d8352a" stroke="#14161a" stroke-width="1">¡POW!</text>
  </g>
  <g class="pow p2" transform="translate(-54,116) rotate(-9) scale(0.78)">
    <use href="#bst" fill="#2DD4BF" stroke="#14161a" stroke-width="5"/>
    <text y="9" text-anchor="middle" font-family="'Arial Black', Impact, sans-serif" font-size="26" font-weight="900" fill="#14161a">¡PIÑA!</text>
  </g>

  <!-- estrellitas -->
  <use class="est e1" href="#st4" transform="translate(-170,-86) scale(1.2)" fill="#F2C94C" stroke="#14161a" stroke-width="2"/>
  <use class="est e2" href="#st4" transform="translate(176,-22) scale(1)" fill="#F2C94C" stroke="#14161a" stroke-width="2"/>
  <use class="est e3" href="#st4" transform="translate(-24,-168) scale(0.85)" fill="#F2C94C" stroke="#14161a" stroke-width="2"/>
  <use class="est e4" href="#st4" transform="translate(86,104) scale(0.75)" fill="#F2C94C" stroke="#14161a" stroke-width="2"/>
  <use class="est e5" href="#st4" transform="translate(-104,126) scale(0.65)" fill="#F2C94C" stroke="#14161a" stroke-width="2"/>
</svg>`;

// ---------------------------------------------------------------- recorte de fondo

const _cutoutCache = new Map();

/**
 * Recorta el fondo sólido de un PNG en el navegador (sin dependencias).
 * Toma el color de las esquinas como fondo y lo vuelve transparente con
 * tolerancia + feather en el borde. Cachea el resultado.
 * Devuelve una Promise<string> (dataURL listo para <img src>).
 */
async function cutoutPng(src, tolerance = 120) {
  if (_cutoutCache.has(src)) return _cutoutCache.get(src);
  const img = await new Promise((res, rej) => {
    const i = new Image();
    i.onload = () => res(i);
    i.onerror = rej;
    i.src = src;
  });
  const c = document.createElement('canvas');
  const W = (c.width = img.naturalWidth);
  const H = (c.height = img.naturalHeight);
  const ctx = c.getContext('2d', { willReadFrequently: true });
  ctx.drawImage(img, 0, 0);
  const data = ctx.getImageData(0, 0, W, H);
  const px = data.data;

  // color de fondo: promedio REAL de las 4 esquinas (índice de píxel + canal)
  const at = (x, y) => (y * W + x) * 4;
  const corners = [at(2, 2), at(W - 3, 2), at(2, H - 3), at(W - 3, H - 3)];
  const bg = [0, 1, 2].map((ch) => corners.reduce((s, i) => s + px[i + ch], 0) / corners.length);
  const bgLum = (bg[0] + bg[1] + bg[2]) / 3;
  const darkBg = bgLum < 128; // fondo de estudio negro (Kenai3d 1.png) vs claro (pilots webp)

  // ¿este píxel es fondo? cercano al color de esquina; claro u oscuro según el fondo detectado
  const isBg = (i) => {
    const r = px[i], g = px[i + 1], b = px[i + 2];
    const lum = (r + g + b) / 3;
    const d = Math.abs(r - bg[0]) + Math.abs(g - bg[1]) + Math.abs(b - bg[2]);
    if (darkBg) {
      // fondo oscuro: SOLO lo casi idéntico al color de esquina (el cargo negro es
      // casi tan oscuro como el fondo: con tolerancia amplia el flood fill se lo comía)
      if (lum > 48) return false;
      return d < tolerance * 0.3;
    }
    if (lum < 168) return false; // el fondo de estudio es claro; protege el hoodie gris
    return d < tolerance;
  };

  // flood fill SOLO desde los bordes: nunca toca el blanco interno (dientes/ojos)
  const bgMask = new Uint8Array(W * H);
  const stack = [];
  const seed = (x, y) => {
    const p = y * W + x;
    if (!bgMask[p] && isBg(p * 4)) {
      bgMask[p] = 1;
      stack.push(p);
    }
  };
  for (let x = 0; x < W; x++) { seed(x, 0); seed(x, H - 1); }
  for (let y = 0; y < H; y++) { seed(0, y); seed(W - 1, y); }
  while (stack.length) {
    const p = stack.pop();
    const x = p % W, y = (p / W) | 0;
    if (x > 0) seed(x - 1, y);
    if (x < W - 1) seed(x + 1, y);
    if (y > 0) seed(x, y - 1);
    if (y < H - 1) seed(x, y + 1);
  }

  // Huecos internos de fondo SIN conexión al borde (ej: triángulo blanco entre
  // las piernas de Kenai, que el flood fill de arriba no alcanza). Se eliminan
  // solo si son regiones grandes, para no borrar detalles blancos del personaje
  // (dientes, ojos, brillos).
  const MIN_HOLE = 200; // px²
  const pot = new Uint8Array(W * H);
  for (let p = 0; p < W * H; p++) pot[p] = isBg(p * 4) ? 1 : 0;
  const edgePot = new Uint8Array(W * H);
  const stackE = [];
  const seedE = (x, y) => {
    const p = y * W + x;
    if (pot[p] && !edgePot[p]) { edgePot[p] = 1; stackE.push(p); }
  };
  for (let x = 0; x < W; x++) { seedE(x, 0); seedE(x, H - 1); }
  for (let y = 0; y < H; y++) { seedE(0, y); seedE(W - 1, y); }
  while (stackE.length) {
    const p = stackE.pop();
    const x = p % W, y = (p / W) | 0;
    if (x > 0) seedE(x - 1, y);
    if (x < W - 1) seedE(x + 1, y);
    if (y > 0) seedE(x, y - 1);
    if (y < H - 1) seedE(x, y + 1);
  }
  const seen = new Uint8Array(W * H);
  for (let p0 = 0; p0 < W * H; p0++) {
    if (pot[p0] && !edgePot[p0] && !seen[p0]) {
      const comp = [];
      const st2 = [p0];
      seen[p0] = 1;
      while (st2.length) {
        const p = st2.pop();
        comp.push(p);
        const x = p % W, y = (p / W) | 0;
        if (x > 0) { const np = p - 1; if (pot[np] && !edgePot[np] && !seen[np]) { seen[np] = 1; st2.push(np); } }
        if (x < W - 1) { const np = p + 1; if (pot[np] && !edgePot[np] && !seen[np]) { seen[np] = 1; st2.push(np); } }
        if (y > 0) { const np = p - W; if (pot[np] && !edgePot[np] && !seen[np]) { seen[np] = 1; st2.push(np); } }
        if (y < H - 1) { const np = p + W; if (pot[np] && !edgePot[np] && !seen[np]) { seen[np] = 1; st2.push(np); } }
      }
      if (comp.length >= MIN_HOLE) for (const p of comp) bgMask[p] = 1;
    }
  }
  for (let p = 0; p < W * H; p++) if (bgMask[p]) px[p * 4 + 3] = 0;

  // feather: píxeles opacos que tocan el fondo → alpha según cercanía al color de fondo
  const isTransparent = (x, y) => x < 0 || y < 0 || x >= W || y >= H || bgMask[y * W + x];
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const p = y * W + x;
      if (bgMask[p]) continue;
      if (isTransparent(x - 1, y) || isTransparent(x + 1, y) || isTransparent(x, y - 1) || isTransparent(x, y + 1)) {
        const i = p * 4;
        const d = Math.abs(px[i] - bg[0]) + Math.abs(px[i + 1] - bg[1]) + Math.abs(px[i + 2] - bg[2]);
        if (d < tolerance * 2.2) {
          px[i + 3] = Math.min(px[i + 3], Math.round(60 + (195 * d) / (tolerance * 2.2)));
        }
      }
    }
  }

  ctx.putImageData(data, 0, 0);
  const url = c.toDataURL('image/png');
  _cutoutCache.set(src, url);
  return url;
}
