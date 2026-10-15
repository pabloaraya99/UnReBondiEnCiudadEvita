import { GAME_CONFIG } from '../config.js';

const CHARACTER_IDS = Object.keys(GAME_CONFIG.characters); // ['coco','domono','faxo','pablo']
// retratos de los personajes (personas, sin autos) para la lineup del menú
const CHAMPION_LINEUP = [
  { id: 'coco', img: '/assets/ui/pilots/coco.webp' },
  { id: 'domono', img: '/assets/ui/pilots/domono.webp' },
  { id: 'faxo', img: '/assets/ui/pilots/faxo.webp' },
  { id: 'pablo', img: '/assets/ui/pilots/Kenai3d 1.png' },
];
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
    const s = el('div', 'ui-screen menu-screen menu-screen-splash');

    // TITLE SCREEN ESTÁTICO (provisorio): el splash art del barrio con los 4
    // personajes cubre toda la pantalla; el título y el botón van encima.
    const splash = el('div', 'menu-splash-bg');
    // imagen como BACKGROUND inline (a prueba de balas: no depende del render
    // del elemento <img>, que en algunos navegadores no mostraba la imagen)
    splash.style.backgroundImage = "url('/assets/ui/title-splash.jpg')";
    splash.style.backgroundSize = 'cover';
    splash.style.backgroundPosition = 'center';
    splash.style.backgroundRepeat = 'no-repeat';
    // viñeta suave arriba/abajo para que el título y el botón se lean
    splash.append(el('div', 'menu-splash-shade'));
    s.append(splash);

    // Logo central tipo Arcade (encima del splash, con sus animaciones)
    const stack = el('div', 'menu-logo-stack');
    const tMain = el('div', 't-main', 'UN RE BONDI');
    const tSub = el('div', 't-sub', 'CIUDAD EVITA');
    stack.append(tMain, tSub);
    s.append(stack);

    // Botón Start
    const play = btn('PRESS START', () => this.actions.onPlay());
    play.classList.add('menu-play');
    s.append(play);

    // etiqueta de versión (para verificar que no estás viendo una versión cacheada)
    const version = el('div', 'menu-version', 'v2-splash-estatico');
    s.append(version);

    this.root.append(s);
  }

  // ================================================================ LOBBY

  /** @param slots array editable de { type:'off'|'human'|'cpu', character, difficulty } */
  showLobby(slots) {
    this.clear();
    const s = el('div', 'ui-screen lobby-screen');
    s.append(el('div', 'ui-title', 'LOBBY'), el('div', 'ui-subtitle', 'Elegí jugadores y personajes'));

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

      // personaje (cicla por GAME_CONFIG.characters) — muestra el retrato recortado como en el title screen
      const ch = GAME_CONFIG.characters[slot.character];
      const charBtn = smallBtn('', () => {
        const idx = CHARACTER_IDS.indexOf(slot.character);
        slot.character = CHARACTER_IDS[(idx + 1) % CHARACTER_IDS.length];
        rerender();
      });
      charBtn.classList.add('slot-char');
      const charImg = document.createElement('img');
      charImg.alt = ch.name;
      charImg.draggable = false;
      const charEntry = CHAMPION_LINEUP.find(e => e.id === slot.character);
      if (charEntry) {
        cutoutPng(charEntry.img).then((url) => { charImg.src = url; });
      } else {
        charImg.src = '/assets/ui/pilots/Kenai3d 1.png';
      }
      charBtn.append(charImg, el('div', '', ch.name));
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

    // selector de mapa: cicla por GAME_CONFIG.stages
    const stageIds = Object.keys(GAME_CONFIG.stages);
    const stageBtn = smallBtn(`MAPA: ${GAME_CONFIG.stages[this._stageId ?? GAME_CONFIG.defaultStage].name}`, () => {
      const cur = stageIds.indexOf(this._stageId ?? GAME_CONFIG.defaultStage);
      this._stageId = stageIds[(cur + 1) % stageIds.length];
      rerender();
    });
    stageBtn.classList.add('lobby-stage-btn');
    bottom.append(stageBtn);

    const fight = btn(`¡A PELEAR! (${active} jugadores)`, () => this.actions.onFight(slots, this._stageId ?? GAME_CONFIG.defaultStage));
    fight.disabled = active < 2;
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
