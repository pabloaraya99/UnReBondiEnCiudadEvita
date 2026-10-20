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

    // capa de barrio: poste con lámpara de sodio y tendido eléctrico (sobre el bg)
    const posteImg = document.createElement('img');
    posteImg.src = '/assets/ui/props/poste-cables-wide.png';
    posteImg.alt = '';
    posteImg.draggable = false;
    posteImg.style.cssText = 'position:absolute;left:0;right:0;bottom:0;width:100%;pointer-events:none;user-select:none;';

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
    const champions = document.createElement('button');
    champions.textContent = 'CHAMPIONS';
    champions.style.cssText = 'position:absolute;top:calc(2% + 120px);left:50%;transform:translateX(-50%);padding:10px 28px;font-size:clamp(12px,1.6vw,17px);font-weight:900;letter-spacing:0.05em;color:#14161a;background:#9b59b6;border:3px solid #14161a;border-radius:10px;cursor:pointer;z-index:51;pointer-events:auto;animation:diagPulse 1.5s ease-in-out infinite;';
    champions.onclick = () => this.actions.onChampions?.();
    const help = document.createElement('div');
    help.textContent = 'P1: A/D mover · ESPACIO saltar · G atacar · H especial';
    help.style.cssText = 'position:absolute;top:calc(2% + 164px);left:0;right:0;margin:0 auto;width:max-content;font-size:clamp(11px,1.5vw,15px);font-weight:700;color:rgba(244,241,232,0.85);text-shadow:0 1px 3px rgba(0,0,0,0.9);z-index:50;';

    const version = document.createElement('div');
    version.textContent = 'v5';
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

    s.append(bgShake, posteImg, flash, fxLayer, titleWrap, play, online, champions, help, version);
    this.root.append(s);
  }

  // ================================================================ CHAMPIONS (galería)

  /** Galería de champions: splash art grande, lore, habilidades, stats y controles. */
  showChampions(startId = 'pablo') {
    this.clear();
    const s = el('div', 'ui-screen champions-screen');
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
      const back = el('button', 'champ-back', 'VOLVER AL TÍTULO');
      back.onclick = () => this.actions.onMenu();
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

    // grilla scrolleable: con 8-10 puertos no empuja el botón de pelea
    const scroll = el('div', 'lobby-slots-scroll');
    if (this._slotsCollapsed) scroll.classList.add('collapsed');
    scroll.append(row);

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
    s.append(scroll);

    const active = slots.filter((x) => x.type !== 'off').length;
    const bottom = el('div', 'lobby-bottom');

    // con muchos puertos la grilla puede tapar la pantalla: toggle para colapsar
    if (slots.length >= 8) {
      const toggle = smallBtn(
        this._slotsCollapsed ? `MOSTRAR PUERTOS (${slots.length}) ▾` : `OCULTAR PUERTOS ▴`,
        () => { this._slotsCollapsed = !this._slotsCollapsed; rerender(); },
      );
      toggle.classList.add('slot-btn', 'lobby-slots-toggle');
      bottom.append(toggle);
    }

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
    bottom.append(fight, back);
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
      card.style.setProperty('--pcolor', slot.color);
      // rectángulo con CLOSE-UP del rostro (zoom + centrado por CSS según FACE_POS)
      const face = el('div', 'hud-face');
      const img = el('img', 'hud-face-img');
      img.src = CHARACTER_SPLASH[f.characterId] || '/assets/ui/pilots/Kenai3d 1.png';
      img.alt = f.spec.name;
      img.draggable = false;
      const pos = FACE_POS[f.characterId] || [0.5, 0.27];
      img.style.setProperty('--fx', pos[0]);
      img.style.setProperty('--fy', pos[1]);
      // el % queda integrado abajo del rectángulo del rostro (chip de color llamativo)
      const pct = el('div', 'hud-pct', '0%');
      face.append(img, pct);
      const info = el('div', 'hud-info');
      const name = el('div', 'hud-name', `${slot.short} · ${f.spec.name}`);
      const stocks = el('div', 'hud-stocks');
      info.append(name, stocks);
      card.append(face, info);
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
      // chip del %: amarillo bondi → naranja → rojo (texto oscuro siempre encima)
      const t = Math.min(1, f.percent / 150);
      c.pct.style.background = `rgb(242, ${Math.round(201 - 140 * t)}, ${Math.round(76 - 60 * t)})`;
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
    const s = el('div', 'ui-screen results-screen');
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
        const colors = ['#e9c46a', '#d8352a', '#2dd4bf', '#4d8bff', '#f4f1e8', '#9b59b6'];
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

      // stats de la pelea
      const fStats = el('div', 'res-stats');
      const stocksTxt = `${f.stocks} ${f.stocks === 1 ? 'vida' : 'vidas'}`;
      fStats.append(el('div', 'res-stat', `<b>${stocksTxt}</b> restantes`));
      const pct = Math.round(f.percent);
      fStats.append(el('div', 'res-stat', `<b>${pct}%</b> de daño recibido`));

      s.append(crown, title, name, artWrap, fStats);
    } else {
      s.append(
        el('div', 'res-crown', '💥'),
        el('div', 'res-title', 'EMPATE'),
        el('div', 'res-name', 'Nadie quedó en pie'),
      );
    }

    // botones
    const btns = el('div', 'res-btns');
    if (opts.online) {
      const rematch = btn('REVANCHA', () => this.actions.onRematch());
      rematch.disabled = !opts.isHost;
      if (!opts.isHost) rematch.title = 'Solo el anfitrión puede dar revancha';
      const leave = btn('SALIR DE LA SALA', () => opts.onLeaveOnline?.());
      leave.classList.add('secondary');
      btns.append(rematch, leave);
      if (!opts.isHost) btns.append(el('div', 'res-note', 'Esperando que el anfitrión decida…'));
    } else {
      const rematch = btn('REVANCHA', () => this.actions.onRematch());
      const lobby = btn('LOBBY', () => this.actions.onLobby());
      lobby.classList.add('secondary');
      const menu = btn('MENÚ', () => this.actions.onMenu());
      menu.classList.add('secondary');
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

