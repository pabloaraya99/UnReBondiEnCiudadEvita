import { GAME_CONFIG } from './config.js';
import { Match } from './sim/Match.js';
import { AIController } from './sim/AI.js';
import { Renderer } from './render/Renderer.js';
import { IN } from './sim/input.js';
import { UI } from './ui/UI.js';
import { Room, ROLLBACK_FRAMES } from './net/Room.js';
import { hostLink, guestLink, randomCode } from './net/peerLink.js';
import { wireHost, wireGuest } from './net/wire.js';
import { audio } from './audio.js';
import './ui/ui.css';

// El navegador solo deja sonar audio después de un gesto del jugador.
// init() precarga y decodifica todas las pistas apenas carga la página
// (el ctx queda suspended); unlock() con el primer gesto las arranca.
audio.init();
const unlockAudio = () => audio.unlock();
window.addEventListener('pointerdown', unlockAudio, true);
window.addEventListener('keydown', unlockAudio, true);

// ================================================================
// Controlador principal: máquina de estados de la aplicación.
//   menu → lobby → playing → results → (revancha / lobby / menú)
//   menu → online-home → online-room → playing (con Room + rollback)
// La simulación (Match) es la misma de siempre: la UI solo la
// configura, la muestra y la reinicia.
// ================================================================

// ---- teclado global ----
const keys = {};
window.addEventListener('keydown', (e) => { keys[e.code] = true; });
window.addEventListener('keyup', (e) => { keys[e.code] = false; });

// ---- JOYSTICK / GAMEPAD (Gamepad API): cada joystick controla un jugador ----
// Mapeo estándar (Xbox/PS): stick izq. o d-pad = moverse · A/Cross = saltar ·
// X/Square = atacar · B/Circle o Y/Triangle = especial · LB/RB = especial también
const DEADZONE = 0.35;
function readGamepad(playerIndex) {
  const pads = navigator.getGamepads ? navigator.getGamepads() : [];
  const gp = pads[playerIndex];
  if (!gp || !gp.connected) return 0;
  let mask = 0;
  const ax0 = gp.axes[0] ?? 0; // stick izquierdo X
  const ax1 = gp.axes[1] ?? 0; // stick izquierdo Y
  const btn = (i) => gp.buttons[i]?.pressed;
  // movimiento: stick izquierdo o d-pad
  if (ax0 < -DEADZONE || btn(14)) mask |= IN.LEFT;
  if (ax0 > DEADZONE || btn(15)) mask |= IN.RIGHT;
  if (ax1 < -DEADZONE || btn(12)) mask |= IN.UP;
  if (ax1 > DEADZONE || btn(13)) mask |= IN.DOWN;
  // saltar: A / Cross (botón 0)
  if (btn(0)) mask |= IN.JUMP;
  // atacar: X / Square (botón 2)
  if (btn(2)) mask |= IN.ATTACK;
  // especial: B / Circle (1), Y / Triangle (3), o gatillos LB/RB
  if (btn(1) || btn(3) || btn(4) || btn(5)) mask |= IN.SPECIAL;
  return mask;
}

function readMask(playerIndex) {
  const p = GAME_CONFIG.players[playerIndex];
  if (!p || !p.controls) return readGamepad(playerIndex);
  const c = p.controls;
  let mask = 0;
  if (keys[c.left]) mask |= IN.LEFT;
  if (keys[c.right]) mask |= IN.RIGHT;
  if (keys[c.up]) mask |= IN.UP;
  if (keys[c.down]) mask |= IN.DOWN;
  if (keys[c.jump]) mask |= IN.JUMP;
  if (keys[c.attack]) mask |= IN.ATTACK;
  if (keys[c.special]) mask |= IN.SPECIAL;
  // joystick: se suma al teclado (cualquiera de los dos controla al jugador)
  mask |= readGamepad(playerIndex);
  return mask;
}

// ---- estado global de la aplicación ----
const app = {
  state: 'menu', // 'menu' | 'lobby' | 'online-home' | 'online-room' | 'playing' | 'results'
  match: null,
  cpus: [],
  slots: defaultSlots(),
  online: null, // { room, link, isHost, selfId } cuando hay sala abierta
  onlineRematch: false, // la partida actual es online
};

/** Lobby por defecto: P1 humano (Pablo) + 3 CPU + resto de puertos cerrados. */
function defaultSlots() {
  return [
    { type: 'human', character: 'pablo', difficulty: 'normal' },
    { type: 'cpu', character: 'coco', difficulty: 'normal' },
    { type: 'cpu', character: 'chubit', difficulty: 'normal' },
    { type: 'cpu', character: 'domono', difficulty: 'normal' },
    ...Array.from({ length: GAME_CONFIG.maxPlayers - 4 }, (_, i) => ({
      type: 'off', character: ['faxo', 'pablo', 'coco', 'domono', 'chubit', 'faxo'][i % 6], difficulty: 'normal',
    })),
  ];
}

// ---- render base: el escenario se ve de fondo en todas las pantallas ----
const renderer = new Renderer(document.body);
renderer.setStage(GAME_CONFIG.stages[GAME_CONFIG.defaultStage]);
// Match vacío solo para tener qué dibujar detrás del menú/lobby.
const emptyMatch = new Match({ players: [] });

// ---- interfaz ----
const ui = new UI(document.body, {
  onPlay: () => setState('lobby'),
  onOnline: () => setState('online-home'),
  onChampions: () => setState('champions'),
  onFight: (slots, stageId) => startMatch(slots, stageId),
  onRematch: () => {
    if (app.onlineRematch && app.online) {
      if (app.online.isHost) app.online.room.start(); // manda start a todos
      else ui.toast('Esperando que el anfitrión dé la revancha');
    } else {
      startMatch(app.slots, app.stageId);
    }
  },
  onLobby: () => setState('lobby'),
  onMenu: () => leaveOnline(() => setState('menu')),
  // al ciclar el mapa en el lobby: reconstruir el escenario 3D de fondo
  onStageChange: (stageId) => {
    renderer.setStage(GAME_CONFIG.stages[stageId]);
    // re-mostrar el lineup sobre el escenario nuevo
    if (app.state === 'lobby') renderer.showLineup();
  },
});

function setState(s) {
  app.state = s;
  // música de fondo según la pantalla (archivos en public/assets/music/)
  if (s === 'menu' || s === 'lobby' || s === 'online-home' || s === 'online-room') audio.playMusic('menu');
  else if (s === 'champions') audio.playMusic('champions');
  else if (s === 'playing') audio.playMusic('battle');
  else if (s === 'results') audio.playMusic('results');
  // el canvas 3D se oculta en el menú y champions (pantallas de solo UI)
  // y se muestra en el resto (lobby usa el lineup 3D, playing usa el escenario)
  const canvas = renderer.renderer.domElement;
  if (s === 'menu' || s === 'champions') {
    canvas.style.display = 'none';
    renderer.clearLineup();
    if (s === 'menu') ui.showMenu();
    else ui.showChampions();
  } else {
    canvas.style.display = '';
    if (s === 'lobby') { renderer.showLineup(); ui.showLobby(app.slots); }
    else if (s === 'online-home') { renderer.showLineup(); showOnlineHome(); }
    else if (s === 'online-room') { renderer.showLineup(); showOnlineRoom(); }
  }
}

/** Crea una partida local con los slots activos del lobby.
 *  Humanos primero: así quien juega con teclado siempre cae en P1 (WASD+F/G/H). */
function startMatch(slots, stageId = GAME_CONFIG.defaultStage) {
  const active = slots
    .filter((s) => s.type !== 'off')
    .sort((a, b) => (b.type === 'human') - (a.type === 'human'));
  if (active.length < 2) return;
  app.slots = slots;
  app.onlineRematch = false;
  app.stageId = stageId;
  renderer.clearLineup();
  // el escenario cambia según el mapa elegido en el lobby
  renderer.setStage(GAME_CONFIG.stages[stageId]);
  app.match = new Match({
    stageId,
    players: active.map((s) => ({
      character: s.character,
      ai: s.type === 'cpu' ? s.difficulty : null,
    })),
  });
  app.cpus = app.match.players.map((p, i) =>
    p.ai ? new AIController(i, p.ai, 1) : null
  );
  renderer.setPlayers(app.match);
  renderer.snapCamera(app.match);
  ui.showHUD(app.match);
  app.state = 'playing';
  audio.playMusic('battle');
}

// ================================================================
// ONLINE
// ================================================================

const MY_NAME = 'Jugador';

function showOnlineHome() {
  ui.showOnlineHome({
    busy: false,
    onCreate: async () => {
      ui.showOnlineHome({ busy: true });
      try {
        const code = randomCode();
        const link = await hostLink(code);
        const room = new Room({ host: true, selfId: 'host' });
        room.setupHost({
          stageId: GAME_CONFIG.defaultStage,
          stocks: GAME_CONFIG.match.stocks,
          fighters: [{ owner: 'host', character: 'pablo', ai: null }],
          name: MY_NAME,
        });
        app.online = { room, link, isHost: true, selfId: 'host' };
        wireHost(link, room, makeOnlineHooks());
        room.code = link.code;
        setState('online-room');
        ui.toast(`Sala creada: ${link.code}`);
      } catch (err) {
        console.error('[online] host error:', err);
        ui.showOnlineHome({ busy: false });
        ui.toast('No se pudo crear la sala (¿internet?)');
      }
    },
    onJoin: async (rawCode) => {
      const code = (rawCode || '').toUpperCase().replace(/[^A-Z0-9]/g, '');
      if (code.length !== 6) { ui.toast('El código tiene 6 caracteres'); return; }
      ui.showOnlineHome({ busy: true });
      try {
        const link = await guestLink(code);
        // esperar el welcome del host
        const room = new Room({ host: false, selfId: '' });
        app.online = { room, link, isHost: false, selfId: '' };
        wireGuest(link, room, makeOnlineHooks());
        room.code = code;
        link.send({ t: 'hello', name: MY_NAME });
        setState('online-room');
      } catch (err) {
        console.error('[online] join error:', err);
        ui.showOnlineHome({ busy: false });
        const msg = err?.message === 'no-existe'
          ? 'No existe esa sala (revisá el código)'
          : err?.message === 'sin-respuesta'
            ? 'La sala no responde (¿el anfitrión está abierto?)'
            : 'No se pudo conectar (¿internet? ¿firewall?)';
        ui.toast(msg);
      }
    },
    onLeave: () => setState('menu'),
  });
}

function showOnlineRoom() {
  const on = app.online;
  if (!on) return setState('menu');
  const { room, isHost, selfId } = on;
  ui.showOnlineRoom({
    room, isHost, selfId,
    onChar: (i) => {
      const ids = Object.keys(GAME_CONFIG.characters);
      const cur = ids.indexOf(room.fighters[i].character);
      const next = ids[(cur + 1) % ids.length];
      room.setCharacter(i, next);
      if (isHost) showOnlineRoom(); // el broadcastConfig ya re-renderiza vía evento
    },
    onAddCpu: () => {
      if (!isHost || room.fighters.length >= GAME_CONFIG.maxPlayers) return;
      room.fighters.push({ owner: 'cpu', character: 'coco', difficulty: 'normal' });
      room.broadcastConfig();
      showOnlineRoom();
    },
    onRemoveCpu: (i) => {
      if (!isHost || room.fighters[i]?.owner !== 'cpu') return;
      room.fighters.splice(i, 1);
      room.broadcastConfig();
      showOnlineRoom();
    },
    onDiff: (i) => {
      if (!isHost || room.fighters[i]?.owner !== 'cpu') return;
      const diffs = Object.keys(GAME_CONFIG.ai.difficulties);
      const cur = diffs.indexOf(room.fighters[i].difficulty);
      room.fighters[i] = { ...room.fighters[i], difficulty: diffs[(cur + 1) % diffs.length] };
      room.broadcastConfig();
      showOnlineRoom();
    },
    onStage: (id) => { if (isHost) { room.stageId = id; room.broadcastConfig(); } },
    onStocks: (n) => { if (isHost) { room.stocks = n; room.broadcastConfig(); } },
    onStart: () => { if (isHost) room.start(); },
    onLeave: () => leaveOnline(() => setState('menu')),
  });
}

/** Hooks de UI para wireHost/wireGuest (mismo comportamiento que el glue inline de antes). */
function makeOnlineHooks() {
  return {
    maxPlayers: GAME_CONFIG.maxPlayers,
    toast: (m) => ui.toast(m),
    // host: re-render solo si estamos en la pantalla de sala
    onLobbyChange: () => { if (app.state === 'online-room') showOnlineRoom(); },
    // guest: el welcome pinta la sala (igual que antes, incondicional)
    onWelcome: (msg) => {
      app.online.selfId = msg.selfId;
      showOnlineRoom();
    },
    // guest: se cortó la conexión con el anfitrión
    onHostLost: () => leaveOnline(() => setState('menu')),
    onEvent: (type, data) => {
      if (type === 'config' && app.state === 'online-room') showOnlineRoom();
      else if (type === 'roster' && app.state === 'online-room') showOnlineRoom();
      else if (type === 'start') startOnlineMatch();
      else if (type === 'resync') { /* lo consume stepOnline */ }
      else if (type === 'leave' && data?.name) ui.toast(`${data.name} se fue`);
      else if (type === 'closed') { ui.toast('La sala ya empezó'); leaveOnline(() => setState('menu')); }
      else if (type === 'rtt' && data != null && app.state === 'online-room') {
        // ping respondido: nada que hacer, room.rtt ya quedó guardado
      }
    },
  };
}

/** Construye la partida online a partir de la config de la sala (idéntica en todos los peers). */
function startOnlineMatch() {
  const { room } = app.online;
  app.onlineRematch = true;
  renderer.clearLineup();
  app.match = new Match({
    stageId: room.stageId,
    stocks: room.stocks,
    players: room.fighters.map((f) => ({ character: f.character, ai: f.ai ?? null })),
  });
  // Las CPUs corren la IA localmente en TODOS los peers, con la MISMA semilla
  // (1): decide() es función pura del estado, así que todos generan la misma
  // máscara sin depender de la red. (Antes solo el host la calculaba y la
  // mandaba; los guests la pisaban con la suya → divergían.)
  app.cpus = app.match.players.map((p, i) =>
    room.fighters[i]?.ai ? new AIController(i, room.fighters[i].ai, 1) : null
  );
  // limpiar buffers de red de la partida anterior
  room.recv.clear();
  room.used.clear();
  room.localUsed.clear();
  room.lastReal.clear();
  room.leaveAt.clear();
  room.snapshots.clear();
  room.myHashes.clear();
  room.corrections.clear();
  room.resyncSnap = null;
  room.frame = 0;
  renderer.setPlayers(app.match);
  renderer.snapCamera(app.match);
  ui.showHUD(app.match);
  app.state = 'playing';
  audio.playMusic('battle');
}

/** Sale de la sala online (botón o desconexión) y limpia todo. */
function leaveOnline(after) {
  const on = app.online;
  app.online = null;
  app.onlineRematch = false;
  if (on) {
    // indices de los fighters que yo controlaba (para que el host los libere)
    const myIdxs = on.room.playerOwner
      .map((o, i) => (o === on.selfId ? i : -1))
      .filter((i) => i >= 0);
    try { on.room.leave(myIdxs, MY_NAME); } catch { /* nada */ }
    try { on.link.close(); } catch { /* nada */ }
  }
  after?.();
}

/** Un paso de la partida online: inputs por red + predicción + rollback. */
function stepOnline() {
  const { room } = app.online;
  const m = app.match;

  // ¿llegó un resync del anfitrión? (prioridad absoluta)
  const resync = room.takeResync();
  if (resync) {
    m.restore(resync);
    room.corrections.clear();
    room.requestedSnap = false;
    ui.toast('Partida resincronizada');
  }

  const N = m.frame + 1; // el frame que vamos a ejecutar

  // 1. inputs locales: los humanos míos + las CPU (estas últimas NO viajan por
  // red: cada peer las calcula localmente con la misma semilla).
  const localMasks = {};
  for (let i = 0; i < m.players.length; i++) {
    const owner = room.playerOwner[i];
    if (owner === room.selfId) localMasks[i] = readMask(0);
    else if (owner === 'cpu' && app.cpus[i]) localMasks[i] = app.cpus[i].decide(m);
  }

  // 2. mandar solo MIS inputs humanos por red (con redundancia de 3 frames).
  // Las CPUs se excluyen: se calculan localmente en todos los peers.
  const humanMasks = {};
  for (const k in localMasks) {
    if (room.playerOwner[Number(k)] !== 'cpu') humanMasks[k] = localMasks[k];
  }
  const prev = [];
  for (let d = 1; d <= 2; d++) {
    const loc = room.localUsed.get(N - d);
    if (loc) {
      const p = {};
      for (const k in loc) {
        if (room.playerOwner[Number(k)] !== 'cpu') p[k] = loc[k];
      }
      if (Object.keys(p).length) prev.push([N - d, p]);
    }
  }
  if (Object.keys(humanMasks).length) {
    room.send({ t: 'in', f: N, masks: humanMasks, prev: prev.length ? prev : undefined });
  }

  // 3. rollback si algún input real corrigió una predicción vieja
  // (durante el countdown los inputs no afectan la simulación: no hace falta)
  if (m.phase === 'countdown') {
    room.corrections.clear();
  } else {
    const rb = room.takeRollbackTo();
    if (rb !== null && rb >= 1) executeRollback(rb, N);
  }

  // 4. guardar el estado previo (para poder volver) y dar un paso
  room.saveSnapshot(m.frame, m.snapshot());
  const inputs = room.resolve(N, localMasks);
  m.step(inputs);
  audio.onEvents(m.events);
  renderer.onEvents(m.events, m);
  room.confirmFrame(N);

  // 5. hash de desvío periódico (el anfitrión arbitra)
  room.sendHashIfDue(N, m.snapshot());
}

/** Restaura el snapshot del frame `rb - 1` y re-simula hasta `upTo - 1` sin efectos. */
function executeRollback(rb, upTo) {
  const { room } = app.online;
  const m = app.match;
  const snap = room.snapshots.get(rb - 1);
  if (!snap) return;
  m.restore(snap);
  for (let k = rb; k < upTo; k++) {
    const inputs = [];
    for (let i = 0; i < m.players.length; i++) inputs[i] = room.inputForFrame(i, k);
    m.step(inputs);
    m.events = []; // los frames rehechos no repiten partículas ni sonidos
  }
}

// ================================================================
// loop principal (física a paso fijo, render interpolado)
// ================================================================
const DT = GAME_CONFIG.physicsStep;
const MAX_STEPS = 50;
let last = performance.now();
let accumulator = 0;
let lastStepAt = performance.now();

function loop(now) {
  let frameTime = (now - last) / 1000;
  last = now;
  if (frameTime > 0.25) frameTime = 0.25;

  // online + pestaña dormida (más de ~0.2s sin poder simular): pedir resync
  // en vez de intentar recuperar tiempo perdido (eso desincronizaría).
  if (app.state === 'playing' && app.onlineRematch && frameTime > 0.2 && app.online) {
    accumulator = 0;
    app.online.room.requestedSnap = false;
    app.online.room.send({ t: 'need-snap', f: app.online.room.frame });
    lastStepAt = now;
    requestAnimationFrame(loop);
    return;
  }

  accumulator += frameTime;

  if (app.state === 'playing' && app.match) {
    let steps = 0;
    while (accumulator >= DT && steps < MAX_STEPS) {
      if (app.onlineRematch && app.online) {
        stepOnline();
      } else {
        const inputs = app.match.players.map((p, i) =>
          app.cpus[i] ? app.cpus[i].decide(app.match) : readMask(i)
        );
        app.match.step(inputs);
        audio.onEvents(app.match.events);
        renderer.onEvents(app.match.events, app.match);
      }
      accumulator -= DT;
      lastStepAt = now;
      steps++;
    }
    renderer.render(app.match, accumulator / DT, DT);
    ui.updateHUD(app.match);

    // fin de partida → resultados (cuando ya se puede revancha)
    if (app.match.phase === 'finished' && app.match.canRematch) {
      app.state = 'results';
      if (app.onlineRematch && app.online) {
        ui.showResults(app.match, {
          online: true,
          isHost: app.online.isHost,
          onLeaveOnline: () => leaveOnline(() => setState('menu')),
        });
      } else {
        ui.showResults(app.match);
      }
    }

    // ESC → online: salir con confirmación / local: volver al lobby
    if (keys['Escape']) {
      keys['Escape'] = false;
      if (app.onlineRematch && app.online) {
        if (confirm('¿Abandonar la sala online?')) leaveOnline(() => setState('menu'));
      } else {
        setState('lobby');
      }
    }
    // F1 → mostrar/ocultar hitboxes de debug
    if (keys['F1']) {
      keys['F1'] = false;
      renderer.toggleDebug();
    }
    // M → silenciar / activar sonido
    if (keys['KeyM']) {
      keys['KeyM'] = false;
      ui.toast(audio.toggleMute() ? 'Sonido silenciado (M)' : 'Sonido activado (M)');
    }
  } else {
    // menú / lobby / resultados: solo el escenario de fondo + lineup si estamos en lobby
    accumulator = 0;
    if (app.state === 'lobby') renderer.updateLineup(frameTime);
    renderer.render(emptyMatch, 0, DT);
  }

  requestAnimationFrame(loop);
}

setState('menu');
requestAnimationFrame(loop);

console.log('Un Re Bondi En Ciudad Evita - iniciado');
// avisar al boot del index.html que la UI ya montó (saca el indicador de carga)
window.__bootDone?.();
