import { GAME_CONFIG } from '../config.js';

const CHARACTER_IDS = Object.keys(GAME_CONFIG.characters);
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
    const online = document.createElement('button');
    online.textContent = 'JUGAR EN LÍNEA';
    online.style.cssText = 'position:absolute;top:calc(2% + 62px);left:50%;transform:translateX(-50%);padding:12px 36px;font-size:clamp(13px,1.8vw,19px);font-weight:900;letter-spacing:0.05em;color:#f4f1e8;background:#3d6b8c;border:3px solid #14161a;border-radius:12px;cursor:pointer;z-index:51;pointer-events:auto;animation:diagPulse 1.5s ease-in-out infinite;';
    online.onclick = () => this.actions.onOnline?.();
    const help = document.createElement('div');
    help.textContent = 'P1: A/D mover · ESPACIO saltar · G atacar · H especial';
    help.style.cssText = 'position:absolute;top:calc(2% + 116px);left:0;right:0;margin:0 auto;width:max-content;font-size:clamp(11px,1.5vw,15px);font-weight:700;color:rgba(244,241,232,0.85);text-shadow:0 1px 3px rgba(0,0,0,0.9);z-index:50;';

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

    s.append(bgShake, flash, fxLayer, titleWrap, play, online, help, version);
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

  // ================================================================ ONLINE

  /**
   * Pantalla de inicio online: crear sala (con código) o unirse con código.
   * @param ctx { onCreate, onJoin(código), onLeave, busy }
   */
  showOnlineHome(ctx = {}) {
    this.clear();
    const s = el('div', 'ui-screen lobby-screen');
    s.append(el('div', 'ui-title', 'ONLINE'), el('div', 'ui-subtitle', 'Creá una sala o unite con el código de un amigo'));

    const grid = el('div', 'online-home-grid');

    const create = el('div', 'ui-panel online-panel');
    create.append(el('div', 'slot-tag', 'CREAR SALA'), el('div', 'online-panel-text', 'Generás un código, se lo mandás a tus amigos y cuando se unen, arrancás la pelea.'));
    const createBtn = btn('CREAR SALA', () => ctx.onCreate?.());
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
    joinBtn.disabled = ctx.busy;
    join.append(joinBtn);
    input.addEventListener('keydown', (e) => {
      e.stopPropagation();
      if (e.key === 'Enter' && input.value.trim()) ctx.onJoin?.(input.value.trim());
    });
    grid.append(join);

    s.append(grid);
    const back = btn('VOLVER', () => ctx.onLeave?.());
    back.classList.add('secondary');
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
      bottom.append(start);
    } else {
      bottom.append(el('div', 'online-wait', '… esperando al anfitrión …'));
    }
    const leave = btn('SALIR DE LA SALA', () => ctx.onLeave?.());
    leave.classList.add('secondary');
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

  /**
   * @param opts.online true si es una partida online
   * @param opts.isHost true si este cliente es el anfitrión (único que puede dar revancha)
   * @param opts.onLeaveOnline callback de "salir de la sala" (solo online)
   */
  showResults(match, opts = {}) {
    this.clear();
    const s = el('div', 'ui-screen');
    const w = match.winner;
    const winnerSlot = w >= 0 ? GAME_CONFIG.players[match.fighters[w].index % GAME_CONFIG.players.length] : null;
    if (w >= 0) {
      const f = match.fighters[w];
      s.append(
        el('div', 'ui-title', `¡GANÓ ${winnerSlot.short}!`),
        el('div', 'ui-subtitle', `${f.spec.name} — quedó con ${f.stocks} ${f.stocks === 1 ? 'vida' : 'vidas'}`),
      );
    } else {
      s.append(el('div', 'ui-title', 'EMPATE'), el('div', 'ui-subtitle', 'Nadie quedó en pie'));
    }

    if (opts.online) {
      const rematch = btn('REVANCHA', () => this.actions.onRematch());
      rematch.disabled = !opts.isHost;
      if (!opts.isHost) rematch.title = 'Solo el anfitrión puede dar revancha';
      const leave = btn('SALIR DE LA SALA', () => opts.onLeaveOnline?.());
      leave.classList.add('secondary');
      const note = el('div', 'controls-help', opts.isHost ? 'La revancha reinicia la sala para todos' : 'Esperando que el anfitrión decida');
      s.append(rematch, leave, note);
    } else {
      const rematch = btn('REVANCHA', () => this.actions.onRematch());
      const lobby = btn('LOBBY', () => this.actions.onLobby());
      lobby.classList.add('secondary');
      const menu = btn('MENÚ', () => this.actions.onMenu());
      menu.classList.add('secondary');
      s.append(rematch, lobby, menu);
    }
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

