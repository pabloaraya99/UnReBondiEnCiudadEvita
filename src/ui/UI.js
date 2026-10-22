import { GAME_CONFIG } from '../config.js';
import { audio } from '../audio.js';

const CHARACTER_IDS = Object.keys(GAME_CONFIG.characters);
// tarjetas splash art de los personajes (estilo cómic con stats) para el champion select
const CHARACTER_SPLASH = {
  coco: '/assets/ui/peleadores/El Coco/El Coco Splash Art.jfif',
  domono: '/assets/ui/peleadores/Domono/Domono Splash Art.jfif',
  faxo: '/assets/ui/peleadores/Faxo/Faxo Splash Art.jfif',
  pablo: '/assets/ui/peleadores/Kenai/Kenai Splash Art.jfif',
  chubit: '/assets/ui/peleadores/Chubitcoin/Chubitcoin Splash Art.jpg',
};
// posición de la cara en cada splash art (fracciones 0-1 de ancho/alto de la imagen).
// El HUD hace zoom sobre ese punto para mostrar el close-up del rostro.
const FACE_POS = {
  pablo: [0.48, 0.27],
  coco: [0.50, 0.27],
  domono: [0.55, 0.26],
  faxo: [0.46, 0.28],
  chubit: [0.60, 0.29],
};
const DIFFICULTIES = ['easy', 'normal', 'hard'];
const DIFFICULTY_LABEL = { easy: 'Fácil', normal: 'Normal', hard: 'Difícil' };
const TYPE_LABEL = { off: 'Cerrado', human: 'Humano', cpu: 'CPU' };

// lore + habilidades para la galería de champions (no es gameplay: solo texto de UI)
const CHAMPION_LORE = {
  pablo: {
    title: 'Kenai · El Quemador',
    lore: 'El pibe del barrio que siempre está quemando ruedas en la esquina. Tiene 6 saltos como Kirby y un sistema de stances que lo hace versátil: gordo (pesado y con superarmadura), flaco (rápido y escurridizo) o normal. Cambiá de stance con el especial neutro en el suelo.',
    abilities: [
      { key: 'Neutro (H)', name: 'Inhale', desc: 'Succiona al rival y lo escupe con daño. En el suelo cambia de stance.' },
      { key: 'Arriba (H)', name: 'Final Cutter', desc: 'Sube con la hoja y baja cortando. Gran recuperación.' },
      { key: 'Costado (H)', name: 'Hammer', desc: 'Martillazo lento pero devastador. Cuidado con el lag.' },
      { key: 'Abajo (H)', name: 'Stone', desc: 'Se convierte en piedra y cae pesado. Superarmadura mientras dura.' },
    ],
  },
  coco: {
    title: 'El Coco · El Pesado',
    lore: 'El tipo más grosso del barrio. No habla mucho, pero cuando saca la espada todos se corren. Pesadísimo y lento, pero cada golpe duele. Si te acercás sin cuidado, te contraratea.',
    abilities: [
      { key: 'Neutro (H)', name: 'Eruption', desc: 'Carga fuego en la espada y estalla delante. Alarga el daño con la llama.' },
      { key: 'Arriba (H)', name: 'Aether', desc: 'Salta girando con la espada y aterriza con onda de impacto.' },
      { key: 'Costado (H)', name: 'Quick Draw', desc: 'Embestida rápida con la espada. Ideal para cerrar distancia.' },
      { key: 'Abajo (H)', name: 'Counter', desc: 'Postura de contraataque: anula el golpe y devuelve ×1.2 de daño.' },
    ],
  },
  domono: {
    title: 'Dj Domono · El Eléctrico',
    lore: 'El DJ del barrio. Flota como si la gravedad fuera opcional y tira rayos PK como si estuviera en un set. Rápido, impredecible, y con el PK Magnet se cura de los golpes.',
    abilities: [
      { key: 'Neutro (H)', name: 'PK Fire', desc: 'Proyectil eléctrico que estalla y deja llama en el suelo.' },
      { key: 'Arriba (H)', name: 'PK Thunder Up', desc: 'Impulso eléctrico hacia arriba. Recuperación con daño.' },
      { key: 'Costado (H)', name: 'PK Thunder', desc: 'Esfera eléctrica que podés curvar con ←/→ mientras vuela.' },
      { key: 'Abajo (H)', name: 'PK Magnet', desc: 'Absorbe daño (×0.4) y cura un poco por golpe recibido.' },
    ],
  },
  faxo: {
    title: 'Dr Faxo · El de Alcance',
    lore: 'El doctor del barrio (no preguntes de qué). Su látigo Vampire Killer tiene un alcance ridículo, y tira agua bendita y hachas como si fuera normal. Controla el espacio como nadie.',
    abilities: [
      { key: 'Neutro (H)', name: 'Holy Water', desc: 'Deja una llama azul en el suelo que daña mientras dura.' },
      { key: 'Arriba (H)', name: 'Uppercut Whip', desc: 'Latigazo ascendente de recuperación. Lanza alto.' },
      { key: 'Costado (H)', name: 'Vampire Killer', desc: 'Látigo con alcance enorme. El mejor poke del juego.' },
      { key: 'Abajo (H)', name: 'Axe', desc: 'Hacha en arco parabólico. Pega desde arriba y en el suelo.' },
    ],
  },
  chubit: {
    title: 'Chubitcoin · El Versátil',
    lore: 'El crypto-bro del grupo. Come power pellets, tira frutas como proyectiles y se mueve como un fantasma. Versátil, con trampolín para recuperarse y la Fire Hydrant para controlar el stage.',
    abilities: [
      { key: 'Neutro (H)', name: 'Bonus Fruit', desc: 'Mantené para cargar (cereza→fresa→…→llave). Soltá para lanzar. Más tier = más daño.' },
      { key: 'Arriba (H)', name: 'Pac-Jump', desc: 'Impulso de recuperación + trampolín que deja en el suelo.' },
      { key: 'Costado (H)', name: 'Power Pellet', desc: 'Embestida mordiendo todo. Larga distancia y fuerte.' },
      { key: 'Abajo (H)', name: 'Fire Hydrant', desc: 'Manguera en el piso que dispara chorros de agua al rival.' },
    ],
  },
};

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
    // sonidos de UI (delegación en todo botón de cualquier pantalla):
    // hi-hat al pasar por encima + click de boletera al apretar
    this.root.addEventListener('pointerover', (e) => {
      const b = e.target.closest?.('button');
      if (b === this._sfxHover) return;
      this._sfxHover = b || null;
      if (b && !b.disabled) audio.play('uiHover');
    });
    this.root.addEventListener('click', (e) => {
      const b = e.target.closest?.('button');
      if (b && !b.disabled) audio.play('uiClick');
    });
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
    const s = el('div', 'title-screen screen-enter');

    // fondo: capa exterior con vibración sutil + capa interior con Ken Burns
    const bgShake = el('div', 'title-bg-shake');
    const bg = el('div', 'title-bg');
    bgShake.append(bg);

    // flash sutil de impacto cada ~7s
    const flash = el('div', 'title-flash');

    // 3 capas de partículas "baked" (gradients en el propio div) — reemplazan
    // los ~40 nodos DOM individuales (humo/chispas/polvo/glinds) del diseño viejo
    const fx = el('div', 'title-fx');
    fx.append(el('div', 'fx-layer fx-smoke'), el('div', 'fx-layer fx-sparks'), el('div', 'fx-layer fx-dust'));

    // logo (PNG) arriba-izquierda
    const logoWrap = el('div', 'title-logo');
    const titleImg = document.createElement('img');
    titleImg.src = '/assets/ui/parallax/Title Text - Title Screen.png';
    titleImg.alt = 'Un Re Bondi En Ciudad Evita';
    titleImg.draggable = false;
    logoWrap.append(titleImg);

    // menú abajo-izquierda: botones inclinados (btn-smash), CTA principal primero
    const menu = el('div', 'title-menu');
    const play = document.createElement('button');
    play.className = 'btn-smash btn-primary';
    play.innerHTML = '<span>PARARME DE MANOS</span>';
    play.onclick = () => this.actions.onPlay();
    const online = document.createElement('button');
    online.className = 'btn-smash btn-outline-cyan';
    online.innerHTML = '<span>JUGAR CON LOS PIBES</span>';
    online.onclick = () => this.actions.onOnline?.();
    const champions = document.createElement('button');
    champions.className = 'btn-smash btn-outline-magenta';
    champions.innerHTML = '<span>PELEADORES</span>';
    champions.onclick = () => this.actions.onChampions?.();
    menu.append(play, online, champions);

    const version = el('div', 'title-version', 'v5');

    s.append(bgShake, flash, fx, logoWrap, menu, version);

    // overlay "TOCÁ CUALQUIER TECLA...": primer gesto (clic o tecla) desbloquea
    // el audio (los browsers exigen un usuario gesture)
    if (!this._audioUnlocked) {
      const tap = el('div', 'tap-start-overlay');
      tap.innerHTML = '<div class="tap-start-text">TOCÁ CUALQUIER TECLA PA\' ARRANCAR</div>';
      const dismiss = () => {
        if (this._audioUnlocked) return;
        this._audioUnlocked = true;
        tap.remove();
        window.removeEventListener('keydown', dismiss);
        import('../audio.js').then((m) => m.audio.unlock());
      };
      tap.onclick = dismiss;
      window.addEventListener('keydown', dismiss);
      s.append(tap);
    }

    this.root.append(s);
  }

  // ================================================================ CHAMPIONS (galería)

  /** Temas por campeón: cada uno tiene su cumbia propia al posarse sobre él.
   *  Solo temas que NO son de title/pelea/resultados (esos van en sus pantallas). */
  static CHAMPION_MUSIC = {
    pablo: 'champions',    // Smash Brawl Cumbia remix
    coco: 'damas',         // Damas Gratis - Se te ve la tanga 8bit
    domono: 'calle',       // Una calle me separa 8bit
    faxo: 'damas',         // Damas Gratis - Se te ve la tanga 8bit
    chubitcoin: 'pajaritos', // Cumbia de los pajaritos 8bit (tema anterior del title)
  };

  /** Galería de champions: splash art grande, lore, habilidades, stats y controles. */
  showChampions(startId = 'pablo') {
    this.clear();
    const s = el('div', 'ui-screen champions-screen screen-enter');
    const ids = CHARACTER_IDS;
    let cur = Math.max(0, ids.indexOf(startId));

    const render = () => {
      s.innerHTML = '';
      const id = ids[cur];
      const spec = GAME_CONFIG.characters[id];
      const lore = CHAMPION_LORE[id];
      const stats = GAME_CONFIG.smashStats?.[id];
      const statKeys = GAME_CONFIG.smashStatKeys ?? ['peso', 'poder', 'velocidad', 'salto', 'arco'];
      const splash = CHARACTER_SPLASH[id];

      // música del campeón (si hay tema asignado)
      const track = UI.CHAMPION_MUSIC[id];
      if (track) {
        import('../audio.js').then((m) => m.audio.playMusic(track));
      }

      // fondo tenue del splash art
      const bg = el('div', 'champ-bg');
      bg.style.backgroundImage = `url('${splash}')`;
      s.append(bg);

      // panel principal
      const panel = el('div', 'champ-panel');

      // ---- lado izquierdo: splash art grande ----
      const artCol = el('div', 'champ-art-col');
      const art = el('img', 'champ-art');
      art.src = splash;
      art.alt = spec.name;
      art.draggable = false;
      artCol.append(art);
      // nombre grande debajo del arte
      const bigName = el('div', 'champ-big-name', spec.name);
      artCol.append(bigName);

      // ---- lado derecho: info ----
      const infoCol = el('div', 'champ-info-col');
      infoCol.append(el('div', 'champ-title', lore.title));

      // stats estilo Smash (barras de 1-5)
      if (stats) {
        const statsBox = el('div', 'champ-stats');
        for (const k of statKeys) {
          const row = el('div', 'champ-stat-row');
          row.append(el('span', 'champ-stat-label', k.charAt(0).toUpperCase() + k.slice(1)));
          const bars = el('div', 'champ-stat-bars');
          for (let i = 1; i <= 5; i++) {
            const bar = el('div', `champ-stat-bar${i <= stats[k] ? ' on' : ''}`);
            bars.append(bar);
          }
          row.append(bars);
          statsBox.append(row);
        }
        infoCol.append(statsBox);
      }

      // lore
      infoCol.append(el('div', 'champ-lore', lore.lore));

      // habilidades
      const abilBox = el('div', 'champ-abilities');
      abilBox.append(el('div', 'champ-abil-header', 'HABILIDADES'));
      for (const ab of lore.abilities) {
        const row = el('div', 'champ-abil-row');
        const key = el('span', 'champ-abil-key', ab.key);
        const name = el('span', 'champ-abil-name', ab.name);
        const desc = el('span', 'champ-abil-desc', ab.desc);
        row.append(key, name, desc);
        abilBox.append(row);
      }
      infoCol.append(abilBox);

      panel.append(artCol, infoCol);
      s.append(panel);

      // ---- navegación ----
      const nav = el('div', 'champ-nav');
      const prev = el('button', 'champ-nav-btn', '◀ ANTERIOR');
      prev.onclick = () => { cur = (cur - 1 + ids.length) % ids.length; render(); };
      // thumbnails de todos
      const thumbs = el('div', 'champ-thumbs');
      ids.forEach((tid, i) => {
        const t = el('button', `champ-thumb${i === cur ? ' active' : ''}`);
        const ti = el('img');
        ti.src = CHARACTER_SPLASH[tid];
        ti.alt = GAME_CONFIG.characters[tid].name;
        ti.draggable = false;
        t.append(ti);
        t.onclick = () => { cur = i; render(); };
        thumbs.append(t);
      });
      const next = el('button', 'champ-nav-btn', 'SIGUIENTE ▶');
      next.onclick = () => { cur = (cur + 1) % ids.length; render(); };
      nav.append(prev, thumbs, next);
      s.append(nav);

      // controles abajo
      const controls = el('div', 'champ-controls');
      controls.innerHTML = '<b>CONTROLES P1:</b> A/D mover · W arriba · ESPACIO saltar · G atacar · H especial · F1 debug';
      s.append(controls);

      // volver
      const back = btn('VOLVER AL TÍTULO', () => this.actions.onMenu());
      back.classList.add('btn-smash', 'btn-outline-cyan');
      s.append(back);
    };

    render();
    this.root.append(s);
  }

  // ================================================================ LOBBY

  /** @param slots array editable de { type:'off'|'human'|'cpu', character, difficulty } */
  showLobby(slots) {
    this.clear();
    const s = el('div', 'ui-screen lobby-screen');

    // capas de movimiento de fondo (2 capas baked — 2 nodos en vez de ~23)
    const fx = el('div', 'lobby-fx');
    fx.append(el('div', 'fx-layer lobby-fx-smoke'), el('div', 'fx-layer lobby-fx-glints'));
    s.append(fx);

    // header arriba
    const header = el('div', 'lobby-header');
    header.append(
      el('div', 'ui-title', 'ELEGÍ TU PELEADOR'),
      el('div', 'ui-subtitle', 'Tocá la tarjeta para cambiar de personaje'),
    );
    // indicador de joystick conectado (Gamepad API)
    const pads = navigator.getGamepads ? [...navigator.getGamepads()].filter(Boolean) : [];
    if (pads.some((p) => p?.connected)) {
      header.append(el('div', 'lobby-gamepad-ind', '🎮 Joystick conectado — stick/d-pad: moverse · A: saltar · X: atacar · B/Y: especial'));
    }
    s.append(header);

    // centro despejado: ahí se ve el lineup 3D de los peleadores
    s.append(el('div', 'lobby-spacer'));

    const rerender = () => { this.showLobby(slots); };

    // grilla de puertos abajo-izquierda (1 fila ≤5; filas balanceadas si hay más)
    const scroll = el('div', 'lobby-slots-scroll');
    if (this._slotsCollapsed) scroll.classList.add('collapsed');
    const grid = el('div', 'lobby-grid');
    const cols = slots.length <= 5 ? slots.length : Math.ceil(slots.length / 2);
    grid.style.gridTemplateColumns = `repeat(${cols}, minmax(112px, 190px))`;
    scroll.append(grid);

    slots.forEach((slot, i) => {
      const card = el('div', `lobby-slot${slot.type === 'off' ? ' off' : ''}`);
      const inner = el('div', 'slot-inner');
      inner.append(el('div', 'slot-tag', `PUERTO ${i + 1}`));

      // tipo de slot: cerrado → humano → CPU
      const typeBtn = smallBtn(TYPE_LABEL[slot.type], () => {
        slot.type = slot.type === 'off' ? 'human' : slot.type === 'human' ? 'cpu' : 'off';
        rerender();
      });
      typeBtn.classList.add('slot-btn');

      // personaje (cicla) — tarjeta splash art estilo champion select
      const ch = GAME_CONFIG.characters[slot.character];
      const charBtn = smallBtn('', () => {
        const idx = CHARACTER_IDS.indexOf(slot.character);
        slot.character = CHARACTER_IDS[(idx + 1) % CHARACTER_IDS.length];
        rerender();
      });
      charBtn.classList.add('slot-btn', 'slot-char', 'slot-char-card');
      const charImg = document.createElement('img');
      charImg.alt = ch.name;
      charImg.draggable = false;
      charImg.src = CHARACTER_SPLASH[slot.character] || '/assets/ui/peleadores/Kenai/Kenai Splash Art.jfif';
      // zoom sutil escalonado (cardZoom en ui.css) — cada tarjeta con su fase
      charImg.style.animationDelay = `${i * 1.4}s`;
      const nameTag = el('div', 'slot-char-name', ch.name);
      nameTag.style.background = ch.color;
      charBtn.append(charImg, nameTag);

      // dificultad (solo si es CPU)
      const diffBtn = smallBtn(
        slot.type === 'cpu' ? `CPU ${DIFFICULTY_LABEL[slot.difficulty]}` : '—',
        () => {
          const idx = DIFFICULTIES.indexOf(slot.difficulty);
          slot.difficulty = DIFFICULTIES[(idx + 1) % DIFFICULTIES.length];
          rerender();
        });
      diffBtn.disabled = slot.type !== 'cpu';
      diffBtn.classList.add('slot-btn');

      // tipo + dificultad en una fila (ahorra alto con 2 filas de puertos)
      const actions = el('div', 'slot-actions');
      actions.append(typeBtn, diffBtn);

      inner.append(charBtn, actions);
      card.append(inner);
      grid.append(card);
    });
    s.append(scroll);

    // controles abajo-derecha: mapa + pelear + volver
    const active = slots.filter((x) => x.type !== 'off').length;
    const controls = el('div', 'lobby-controls');

    // con muchos puertos la grilla puede tapar la pantalla: toggle para colapsar
    if (slots.length >= 8) {
      const toggle = smallBtn(
        this._slotsCollapsed ? `MOSTRAR PUERTOS (${slots.length}) ▾` : `OCULTAR PUERTOS ▴`,
        () => { this._slotsCollapsed = !this._slotsCollapsed; rerender(); },
      );
      toggle.classList.add('slot-btn', 'lobby-slots-toggle');
      controls.append(toggle);
    }

    // selector de mapa: cicla por GAME_CONFIG.stages — al cambiar, el renderer
    // reconstruye el escenario 3D de fondo (onStageChange en main.js)
    const stageIds = Object.keys(GAME_CONFIG.stages);
    const stageBtn = btn(`MAPA: ${GAME_CONFIG.stages[this._stageId ?? GAME_CONFIG.defaultStage].name}`, () => {
      const cur = stageIds.indexOf(this._stageId ?? GAME_CONFIG.defaultStage);
      this._stageId = stageIds[(cur + 1) % stageIds.length];
      // avisar al renderer para que cambie el escenario 3D de fondo
      this.actions.onStageChange?.(this._stageId);
      rerender();
    });
    stageBtn.classList.add('btn-smash', 'lobby-stage-btn');
    controls.append(stageBtn);

    const fight = btn(`¡A PELEAR! (${active} jugadores)`, () => this.actions.onFight(slots, this._stageId ?? GAME_CONFIG.defaultStage));
    fight.disabled = active < 2;
    fight.classList.add('btn-smash', 'btn-primary', 'lobby-fight-btn');
    controls.append(fight);

    const back = btn('VOLVER', () => this.actions.onMenu());
    back.classList.add('btn-smash', 'btn-outline-cyan');
    controls.append(back);

    const bottomArea = el('div', 'lobby-bottom-area');
    bottomArea.append(scroll, controls);
    s.append(bottomArea);
    this.root.append(s);
  }

  // ================================================================ ONLINE

  /**
   * Pantalla de inicio online: crear sala (con código) o unirse con código.
   * @param ctx { onCreate, onJoin(código), onLeave, busy }
   */
  showOnlineHome(ctx = {}) {
    this.clear();
    const s = el('div', 'ui-screen lobby-screen screen-enter');
    s.append(el('div', 'ui-title', 'ONLINE'), el('div', 'ui-subtitle', 'Creá una sala o unite con el código de un amigo'));

    const grid = el('div', 'online-home-grid');

    const create = el('div', 'ui-panel online-panel');
    create.append(el('div', 'slot-tag', 'CREAR SALA'), el('div', 'online-panel-text', 'Generás un código, se lo mandás a tus amigos y cuando se unen, arrancás la pelea.'));
    const createBtn = btn('CREAR SALA', () => ctx.onCreate?.());
    createBtn.classList.add('btn-smash', 'btn-primary');
    create.append(createBtn);
    grid.append(create);

    const join = el('div', 'ui-panel online-panel');
    join.append(el('div', 'slot-tag', 'UNIRME'));
    const input = document.createElement('input');
    input.className = 'online-code-input';
    input.maxLength = 6;
    input.placeholder = 'CÓDIGO';
    input.autocapitalize = 'characters';
    input.spellcheck = false;
    join.append(input, el('div', 'online-panel-text', 'Pegá el código de 6 letras que te pasó el anfitrión.'));
    const joinBtn = btn('ENTRAR', () => ctx.onJoin?.(input.value.trim()));
    joinBtn.classList.add('btn-smash', 'btn-primary');
    joinBtn.disabled = ctx.busy;
    join.append(joinBtn);
    input.addEventListener('keydown', (e) => {
      e.stopPropagation();
      if (e.key === 'Enter' && input.value.trim()) ctx.onJoin?.(input.value.trim());
    });
    grid.append(join);

    s.append(grid);
    const back = btn('VOLVER', () => ctx.onLeave?.());
    back.classList.add('btn-smash', 'btn-outline-cyan');
    s.append(back);
    this.root.append(s);
    setTimeout(() => input.focus(), 50);
  }

  /**
   * Sala online: roster + configuración de la partida.
   * El host edita todo; cada guest solo su propio personaje.
   * @param ctx { room, selfId, isHost, onChar(i), onAddCpu, onRemoveCpu(i), onDiff(i), onStage(id), onStocks(n), onStart, onLeave }
   */
  showOnlineRoom(ctx) {
    this.clear();
    const { room, isHost } = ctx;
    const s = el('div', 'ui-screen lobby-screen');
    const code = room.code ?? '';
    s.append(el('div', 'ui-title', `SALA ${code}`), el('div', 'ui-subtitle', isHost ? 'Invitá con el código · cuando estén listos, ¡a pelear!' : 'Esperando que el anfitrión arranque'));

    // stage + stocks (solo el host los edita)
    if (isHost) {
      const opts = el('div', 'lobby-opts');
      const stageSel = document.createElement('select');
      stageSel.className = 'slot-btn';
      for (const id of Object.keys(GAME_CONFIG.stages)) {
        const o = document.createElement('option');
        o.value = id;
        o.textContent = GAME_CONFIG.stages[id].name;
        o.selected = id === room.stageId;
        stageSel.append(o);
      }
      stageSel.onchange = () => ctx.onStage?.(stageSel.value);
      const stockSel = document.createElement('select');
      stockSel.className = 'slot-btn';
      for (const n of [1, 2, 3, 5]) {
        const o = document.createElement('option');
        o.value = String(n);
        o.textContent = `${n} ${n === 1 ? 'vida' : 'vidas'}`;
        o.selected = n === room.stocks;
        stockSel.append(o);
      }
      stockSel.onchange = () => ctx.onStocks?.(Number(stockSel.value));
      opts.append(stageSel, stockSel);
      s.append(opts);
    }

    // filas de fighters (dueño humano / guest / cpu)
    const rows = el('div', 'lobby-slots');
    room.fighters.forEach((fg, i) => {
      const card = el('div', 'lobby-slot ui-panel');
      const member = room.members.find((m) => m.id === fg.owner);
      const isMe = fg.owner === ctx.selfId;
      const ownerLabel = fg.owner === 'cpu' ? 'CPU' : member ? member.name : fg.owner;
      const slotTag = fg.owner === 'cpu'
        ? `CPU ${i + 1}`
        : `${isMe ? 'VOS' : ownerLabel}${isHost && fg.owner !== 'cpu' && !isMe ? '' : ''}`;
      card.append(el('div', 'slot-tag', slotTag));

      // personaje: host edita el de cualquiera; guest solo el suyo
      const ch = GAME_CONFIG.characters[fg.character];
      const canEditChar = isHost || isMe;
      const charBtn = smallBtn('', () => canEditChar && ctx.onChar?.(i));
      charBtn.disabled = !canEditChar;
      charBtn.classList.add('slot-char');
      const sw = el('div', 'slot-swatch');
      sw.style.background = ch.color;
      charBtn.append(sw, el('div', '', ch.name));
      card.append(charBtn);

      // dificultad (solo CPU, solo host)
      if (fg.owner === 'cpu') {
        const diffBtn = smallBtn(`CPU ${DIFFICULTY_LABEL[fg.difficulty] ?? fg.difficulty}`, () => isHost && ctx.onDiff?.(i));
        diffBtn.disabled = !isHost;
        card.append(diffBtn);
      } else {
        card.append(el('div', 'slot-btn', '—'));
      }

      // quitar CPU (solo host)
      if (isHost && fg.owner === 'cpu') {
        const del = smallBtn('✕', () => ctx.onRemoveCpu?.(i));
        del.classList.add('slot-remove');
        card.append(del);
      }
      rows.append(card);
    });

    // agregar CPU (solo host, hasta maxPlayers)
    if (isHost && room.fighters.length < GAME_CONFIG.maxPlayers) {
      const add = el('div', 'lobby-slot ui-panel add-slot');
      const b = smallBtn('+ CPU', () => ctx.onAddCpu?.());
      b.classList.add('slot-btn');
      add.append(el('div', 'slot-tag', 'VACÍO'), b);
      rows.append(add);
    }
    s.append(rows);

    // miembros conectados (nombres)
    const roster = el('div', 'online-roster');
    for (const m of room.members) {
      const chip = el('span', 'online-chip', m.id === ctx.selfId ? `${m.name} (vos)` : m.name);
      roster.append(chip);
    }
    s.append(roster);

    const bottom = el('div', 'lobby-bottom');
    if (isHost) {
      const active = room.fighters.length;
      const start = btn(`¡A PELEAR! (${active} jugadores)`, () => ctx.onStart?.());
      start.disabled = active < 2;
      start.classList.add('btn-smash', 'btn-primary', 'lobby-fight-btn');
      bottom.append(start);
    } else {
      bottom.append(el('div', 'online-wait', '… esperando al anfitrión …'));
    }
    const leave = btn('SALIR DE LA SALA', () => ctx.onLeave?.());
    leave.classList.add('btn-smash', 'btn-outline-magenta');
    bottom.append(leave);
    s.append(bottom);
    this.root.append(s);
  }

  /** Aviso flotante breve (toasts de conexión, resync, etc.). */
  toast(msg, ms = 2600) {
    let t = this.root.querySelector('.ui-toast');
    if (!t) {
      t = el('div', 'ui-toast');
      this.root.append(t);
    }
    t.textContent = msg;
    t.classList.add('show');
    clearTimeout(this._toastTimer);
    this._toastTimer = setTimeout(() => t.classList.remove('show'), ms);
  }

  // ================================================================ HUD

  /** Crea la barra inferior con una tarjeta por luchador. */
  showHUD(match) {
    this.clear();
    const hud = el('div', '');
    hud.id = 'hud';
    // con 8+ luchadores las tarjetas se achican para entrar en pantalla
    if (match.fighters.length >= 8) hud.classList.add('many');
    this.hudCards = match.fighters.map((f) => {
      const slot = GAME_CONFIG.players[f.index % GAME_CONFIG.players.length];
      const card = el('div', 'hud-card');
      card.style.setProperty('--pcolor', slot.color);
      // cara en paralelogramo con CLOSE-UP del rostro (zoom por CSS con --fx/--fy)
      const face = el('div', 'hud-face');
      const img = el('img', 'hud-face-img');
      img.src = CHARACTER_SPLASH[f.characterId] || '/assets/ui/peleadores/Kenai/Kenai Splash Art.jfif';
      img.alt = f.spec.name;
      img.draggable = false;
      const pos = FACE_POS[f.characterId] || [0.5, 0.27];
      img.style.setProperty('--fx', pos[0]);
      img.style.setProperty('--fy', pos[1]);
      face.append(img);
      const info = el('div', 'hud-info');
      const name = el('div', 'hud-name', `${slot.short} · ${f.spec.name}`);
      // el % sin chip: es texto que cambia de color según el daño (updateHUD)
      const pct = el('div', 'hud-pct', '0%');
      // vidas: iconitos del personaje con aro del color del jugador
      const stocks = el('div', 'hud-stocks');
      info.append(name, pct, stocks);
      card.append(face, info);
      hud.append(card);
      return { card, pct, stocks, f, lastPct: f.percent, stockKey: '' };
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
      // el TEXTO del % cambia de color con el daño: blanco → amarillo → naranja → magenta
      const p = f.percent;
      c.pct.style.color = p >= 120 ? 'var(--color-cumbia-magenta)'
        : p >= 80 ? '#FF9A3C'
          : p >= 40 ? 'var(--color-bondi-yellow)'
            : 'var(--text-primary)';
      // sacudida de la tarjeta al recibir daño (reinicio con reflow para repetir)
      if (p > c.lastPct + 0.5) {
        c.card.classList.remove('shake-damage');
        void c.card.offsetWidth;
        c.card.classList.add('shake-damage');
      }
      c.lastPct = p;
      // vidas: iconitos del personaje — solo se reconstruyen si cambió el estado
      const stockKey = `${f.stocks}/${match.stocks}`;
      if (stockKey !== c.stockKey) {
        c.stockKey = stockKey;
        c.stocks.innerHTML = '';
        const splash = CHARACTER_SPLASH[f.characterId] || '/assets/ui/peleadores/Kenai/Kenai Splash Art.jfif';
        for (let i = 0; i < match.stocks; i++) {
          const dot = el('div', `hud-stock${i < f.stocks ? '' : ' lost'}`);
          const si = el('img');
          si.src = splash;
          si.alt = '';
          si.draggable = false;
          dot.append(si);
          c.stocks.append(dot);
        }
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

  // ================================================================ PAUSA

  /** Overlay de pausa (partida local): se apila sobre el HUD sin limpiarlo. */
  showPause(opts = {}) {
    if (this.pauseOverlay) return;
    const s = el('div', 'pause-overlay');
    const panel = el('div', 'pause-panel');
    panel.append(el('div', 'ui-title', 'PAUSA'));
    const resume = btn('CONTINUAR', () => opts.onResume?.());
    resume.classList.add('btn-smash', 'btn-primary');
    const quit = btn('ABANDONAR', () => opts.onQuit?.());
    quit.classList.add('btn-smash', 'btn-outline-magenta');
    panel.append(resume, quit, el('div', 'pause-hint', 'ESC para continuar · M silencia'));
    s.append(panel);
    this.root.append(s);
    this.pauseOverlay = s;
    resume.focus();
  }

  /** Cierra el overlay de pausa si existe (llamado al salir de playing). */
  hidePause() {
    if (!this.pauseOverlay) return;
    this.pauseOverlay.remove();
    this.pauseOverlay = null;
  }

  // ================================================================ RESULTADOS

  /**
   * @param opts.online true si es una partida online
   * @param opts.isHost true si este cliente es el anfitrión (único que puede dar revancha)
   * @param opts.onLeaveOnline callback de "salir de la sala" (solo online)
   */
  showResults(match, opts = {}) {
    this.clear();
    const s = el('div', 'ui-screen results-screen screen-enter');
    const w = match.winner;
    const winnerSlot = w >= 0 ? GAME_CONFIG.players[match.fighters[w].index % GAME_CONFIG.players.length] : null;

    if (w >= 0) {
      const f = match.fighters[w];
      const cid = f.characterId;
      const splash = CHARACTER_SPLASH[cid];
      const spec = f.spec;

      // confeti simple (puros divs animados, sin canvas)
      for (let i = 0; i < 28; i++) {
        const c = el('div', 'res-confetti');
        const colors = ['#FFD166', '#EF476F', '#06D6A0', '#118AB2', '#F5F1E6', '#9b59b6'];
        c.style.cssText = `left:${Math.random() * 100}vw;animation-delay:${Math.random() * 2.5}s;animation-duration:${2.5 + Math.random() * 2}s;background:${colors[i % colors.length]};width:${6 + Math.random() * 8}px;height:${10 + Math.random() * 12}px;`;
        s.append(c);
      }

      // fondo tenue del splash art del ganador
      const bg = el('div', 'res-bg');
      bg.style.backgroundImage = `url('${splash}')`;
      s.append(bg);

      // corona + título
      const crown = el('div', 'res-crown', '👑');
      const title = el('div', 'res-title', `¡GANÓ ${winnerSlot.short}!`);
      const name = el('div', 'res-name', spec.name);

      // splash art grande del campeón
      const artWrap = el('div', 'res-art-wrap');
      const art = el('img', 'res-art');
      art.src = splash;
      art.alt = spec.name;
      art.draggable = false;
      artWrap.append(art);

      // stats del ganador
      const fStats = el('div', 'res-stats');
      const stocksTxt = `${f.stocks} ${f.stocks === 1 ? 'vida' : 'vidas'}`;
      fStats.append(el('div', 'res-stat', `<b>${stocksTxt}</b> restantes`));
      fStats.append(el('div', 'res-stat', `<b>${f.kos}</b> ${f.kos === 1 ? 'KO' : 'KOs'}`));

      s.append(crown, title, name, artWrap, fStats);
    } else {
      s.append(
        el('div', 'res-crown', '💥'),
        el('div', 'res-title', 'EMPATE'),
        el('div', 'res-name', 'Nadie quedó en pie'),
      );
    }

    // tabla del podio: KO y daño de cada luchador (contadores del sim)
    const table = el('div', 'res-table');
    table.append(el('div', 'res-row res-head', '<span>POS</span><span>PELEADOR</span><span>KOs</span><span>DAÑO</span>'));
    const ranked = [...match.fighters].sort((a, b) =>
      b.stocks - a.stocks || a.percent - b.percent || b.damageDealt - a.damageDealt);
    ranked.forEach((f, i) => {
      const slot = GAME_CONFIG.players[f.index % GAME_CONFIG.players.length];
      const row = el('div', `res-row${f.index === w ? ' winner' : ''}`);
      row.innerHTML = `<span>${i + 1}º</span><span>${slot.short} · ${f.spec.name}</span><span>${f.kos}</span><span>${Math.round(f.damageDealt)}%</span>`;
      table.append(row);
    });
    s.append(table);

    // botones
    const btns = el('div', 'res-btns');
    if (opts.online) {
      const rematch = btn('REVANCHA', () => this.actions.onRematch());
      rematch.classList.add('btn-smash', 'btn-primary');
      rematch.disabled = !opts.isHost;
      if (!opts.isHost) rematch.title = 'Solo el anfitrión puede dar revancha';
      const leave = btn('SALIR DE LA SALA', () => opts.onLeaveOnline?.());
      leave.classList.add('btn-smash', 'btn-outline-magenta');
      btns.append(rematch, leave);
      if (!opts.isHost) btns.append(el('div', 'res-note', 'Esperando que el anfitrión decida…'));
    } else {
      const rematch = btn('REVANCHA', () => this.actions.onRematch());
      rematch.classList.add('btn-smash', 'btn-primary');
      const lobby = btn('LOBBY', () => this.actions.onLobby());
      lobby.classList.add('btn-smash', 'btn-outline-cyan');
      const menu = btn('MENÚ', () => this.actions.onMenu());
      menu.classList.add('btn-smash', 'btn-outline-magenta');
      btns.append(rematch, lobby, menu);
    }
    s.append(btns);
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
  // span interno: .btn-smash lo contrapendientea para que el texto quede derecho
  b.innerHTML = `<span>${label}</span>`;
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

