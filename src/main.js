import { GAME_CONFIG } from './config.js';
import { Match } from './sim/Match.js';
import { AIController } from './sim/AI.js';
import { Renderer } from './render/Renderer.js';
import { IN } from './sim/input.js';
import { UI } from './ui/UI.js';
import './ui/ui.css';

// ================================================================
// Controlador principal: máquina de estados de la aplicación.
//   menu → lobby → playing → results → (revancha / lobby / menú)
// La simulación (Match) es la misma de siempre: la UI solo la
// configura, la muestra y la reinicia.
// ================================================================

// ---- teclado global ----
const keys = {};
window.addEventListener('keydown', (e) => { keys[e.code] = true; });
window.addEventListener('keyup', (e) => { keys[e.code] = false; });

function readMask(playerIndex) {
  const p = GAME_CONFIG.players[playerIndex];
  if (!p || !p.controls) return 0;
  const c = p.controls;
  let mask = 0;
  if (keys[c.left]) mask |= IN.LEFT;
  if (keys[c.right]) mask |= IN.RIGHT;
  if (keys[c.up]) mask |= IN.UP;
  if (keys[c.down]) mask |= IN.DOWN;
  if (keys[c.jump]) mask |= IN.JUMP;
  if (keys[c.attack]) mask |= IN.ATTACK;
  if (keys[c.special]) mask |= IN.SPECIAL;
  return mask;
}

// ---- estado global de la aplicación ----
const app = {
  state: 'menu', // 'menu' | 'lobby' | 'playing' | 'results'
  match: null,
  cpus: [],
  slots: defaultSlots(),
};

/** Lobby por defecto: P1 humano (Pablo) + 3 CPU. */
function defaultSlots() {
  return [
    { type: 'human', character: 'pablo', difficulty: 'normal' },
    { type: 'cpu', character: 'coco', difficulty: 'normal' },
    { type: 'cpu', character: 'faxo', difficulty: 'normal' },
    { type: 'cpu', character: 'domono', difficulty: 'normal' },
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
  onFight: (slots, stageId) => startMatch(slots, stageId),
  onRematch: () => startMatch(app.slots, app.stageId),
  onLobby: () => setState('lobby'),
  onMenu: () => setState('menu'),
});

function setState(s) {
  app.state = s;
  // el canvas 3D se oculta en el menú (title screen estático = solo la imagen)
  // y se muestra en el resto (lobby usa el lineup 3D, playing usa el escenario)
  const canvas = renderer.renderer.domElement;
  if (s === 'menu') {
    canvas.style.display = 'none';
    renderer.clearLineup();
    ui.showMenu();
  } else {
    canvas.style.display = '';
    if (s === 'lobby') { renderer.showLineup(); ui.showLobby(app.slots); }
  }
}

/** Crea una partida con los slots activos del lobby.
 *  Humanos primero: así quien juega con teclado siempre cae en P1 (WASD+F/G/H). */
function startMatch(slots, stageId = GAME_CONFIG.defaultStage) {
  const active = slots
    .filter((s) => s.type !== 'off')
    .sort((a, b) => (b.type === 'human') - (a.type === 'human'));
  if (active.length < 2) return;
  app.slots = slots;
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
}

// ---- loop principal (física a paso fijo, render interpolado) ----
const DT = GAME_CONFIG.physicsStep;
let last = performance.now();
let accumulator = 0;

function loop(now) {
  let frameTime = (now - last) / 1000;
  last = now;
  if (frameTime > 0.25) frameTime = 0.25;
  accumulator += frameTime;

  if (app.state === 'playing' && app.match) {
    while (accumulator >= DT) {
      const inputs = app.match.players.map((p, i) =>
        app.cpus[i] ? app.cpus[i].decide(app.match) : readMask(i)
      );
      app.match.step(inputs);
      renderer.onEvents(app.match.events, app.match);
      accumulator -= DT;
    }
    renderer.render(app.match, accumulator / DT, DT);
    ui.updateHUD(app.match);

    // fin de partida → resultados (cuando ya se puede revancha)
    if (app.match.phase === 'finished' && app.match.canRematch) {
      app.state = 'results';
      ui.showResults(app.match);
    }

    // ESC → volver al lobby (atajo de depuración)
    if (keys['Escape']) {
      keys['Escape'] = false;
      setState('lobby');
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
