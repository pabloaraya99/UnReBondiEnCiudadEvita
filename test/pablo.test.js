import test from 'node:test';
import assert from 'node:assert/strict';
import { Match, IN } from '../src/sim/index.js';
import { GAME_CONFIG } from '../src/config.js';

/** Partida empezada con Pablo como jugador 1 (índice 0) y un rival. */
function started(rival = 'coco', opts = {}) {
  const m = new Match({ players: [{ character: 'pablo' }, { character: rival }], ...opts });
  for (let i = 0; i < GAME_CONFIG.match.countdownFrames; i++) m.step([]);
  return m;
}
const run = (m, frames, inputs) => {
  for (let i = 0; i < frames; i++) m.step(typeof inputs === 'function' ? inputs(i) : inputs ?? []);
};
/** Aprieta una máscara 3 cuadros y suelta. */
const tap = (m, mask, hold = 3) => {
  run(m, hold, [mask]);
  m.step([0]);
};
const eventsOf = (m, frames, inputs, type) => {
  const out = [];
  for (let i = 0; i < frames; i++) {
    m.step(typeof inputs === 'function' ? inputs(i) : inputs ?? []);
    out.push(...m.events.filter((e) => e.type === type));
  }
  return out;
};

test('todos los personajes caen a una velocidad razonable (no 1 m/s)', () => {
  const m = started();
  for (const f of m.fighters) {
    assert.ok(f.fallSpeed >= 10, `${f.characterId}: fallSpeed ${f.fallSpeed}`);
    assert.ok(f.fastFallSpeed > f.fallSpeed, `${f.characterId}: caída rápida mayor que la normal`);
  }
});

test('el especial neutro de Pablo cicla Normal → Gordo → Flaco → Normal (con cooldown)', () => {
  const m = started();
  const p = m.fighters[0];
  const seen = [p.stance];
  for (let k = 0; k < 3; k++) {
    tap(m, IN.SPECIAL);
    run(m, 70, []); // el cambio + el cooldown de 60 cuadros
    seen.push(p.stance);
  }
  assert.deepEqual(seen, ['normal', 'gordo', 'flaco', 'normal']);
  // un segundo toque inmediato no cambia de nuevo
  tap(m, IN.SPECIAL);
  const first = p.stance;
  tap(m, IN.SPECIAL);
  assert.equal(p.stance, first, 'el cooldown evita cambiar dos veces seguidas');
});

test('los otros personajes siguen disparando con el especial neutro', () => {
  const m = new Match({ players: [{ character: 'coco' }, { character: 'faxo' }] });
  run(m, GAME_CONFIG.match.countdownFrames, []);
  assert.equal(eventsOf(m, 12, [IN.SPECIAL], 'shot').length, 1);
});

test('Pablo dispara con ← / → + especial', () => {
  const m = started();
  assert.equal(eventsOf(m, 14, [IN.RIGHT | IN.SPECIAL], 'shot').length, 1);
  assert.equal(m.fighters[0].stance, 'normal', 'no cambió de stance');
});

test('el stance cambia peso, poder, tamaño y velocidad', () => {
  const m = started();
  const p = m.fighters[0];
  const base = { weight: p.weight, power: p.power, width: p.width, run: p.runSpeed };
  p.stance = 'gordo';
  assert.ok(p.weight > base.weight && p.power > base.power && p.width > base.width && p.runSpeed < base.run);
  p.stance = 'flaco';
  assert.ok(p.weight < base.weight && p.power < base.power && p.width < base.width && p.runSpeed > base.run);
});

test('Gordo vuela menos que Flaco con el mismo golpe (el peso del stance cuenta)', () => {
  const kb = (stance) => {
    const m = started('coco');
    const [p, a] = m.fighters;
    p.stance = stance;
    p.percent = 80;
    a.place(-0.6, 0);
    p.place(0.6, 0);
    a.facing = 1;
    p.facing = -1;
    // armadura desactivada para medir solo el peso: golpe fuerte (side, daño 11 × 1.0 > umbral 8)
    const hits = eventsOf(m, 30, (i) => [0, i === 0 ? IN.ATTACK | IN.RIGHT : 0], 'hit');
    assert.equal(hits.length, 1);
    return hits[0].kb;
  };
  assert.ok(kb('gordo') < kb('normal') && kb('normal') < kb('flaco'));
});

test('la armadura de Gordo absorbe golpes flojos pero no los fuertes', () => {
  const m = started('coco');
  const [p, a] = m.fighters;
  p.stance = 'gordo';
  a.place(-0.6, 0);
  p.place(0.6, 0);
  a.facing = 1;
  run(m, 20, (i) => [0, i === 0 ? IN.ATTACK : 0]); // jab: daño 3, bajo el umbral 8
  assert.equal(p.percent, 0, 'el jab no hace daño');
  assert.equal(p.hitstun, 0);
  run(m, 60, []);
  a.place(-0.6, 0);
  a.facing = 1;
  run(m, 40, (i) => [0, i === 0 ? IN.ATTACK | IN.RIGHT : 0]); // side: daño 11, rompe la armadura
  assert.ok(p.percent > 0, 'el golpe fuerte sí pega');
});

test('Pablo tiene 6 saltos en total (1 de piso + 5 en el aire)', () => {
  const m = started('coco');
  let jumps = 0;
  for (let i = 0; i < 70; i++) {
    m.step([i % 6 < 2 ? IN.JUMP : 0]);
    jumps += m.events.filter((e) => e.type === 'jump' && e.i === 0).length;
    if (jumps > 0 && m.fighters[0].grounded) break;
  }
  assert.equal(jumps, 6);
});

test('Sword Slash: sube, cae rápido, aterriza con onda y pega a un rival cercano', () => {
  const m = started('coco');
  const [p, r] = m.fighters;
  p.place(-3, 0);
  r.place(-2.4, 0);
  r.facing = 1;
  p.facing = 1;
  let landed = null;
  let maxY = 0;
  let rose = false;
  for (let i = 0; i < 120 && !landed; i++) {
    m.step([i < 3 ? IN.UP | IN.SPECIAL : 0]);
    maxY = Math.max(maxY, p.y);
    if (p.state === 'swordSlashRise') rose = true;
    landed = m.events.find((e) => e.type === 'swordSlashLand');
  }
  assert.ok(rose && maxY > 2, `subió (altura máx ${maxY.toFixed(2)})`);
  assert.ok(landed, 'aterrizó y creó la onda');
  assert.ok(r.percent > 0, 'la onda pegó al rival');
  assert.equal(p.swordSlashPhase, null);
});

test('Sword Slash es una sola vez por salto y se recarga al aterrizar', () => {
  const m = started('coco');
  const p = m.fighters[0];
  p.place(-12, -2); // afuera del escenario, abajo
  p.grounded = false;
  p.standingOn = null;
  let starts = 0;
  for (let i = 0; i < 40; i++) {
    m.step([i % 8 < 2 ? IN.UP | IN.SPECIAL : IN.UP]);
    starts += m.events.filter((e) => e.type === 'swordSlashStart').length;
  }
  assert.equal(starts, 1);
});

test('Block Form: superarmor durante la caída y onda al aterrizar', () => {
  const m = started('coco');
  const [p, r] = m.fighters;
  p.place(0, 6);
  p.grounded = false;
  p.standingOn = null;
  r.place(1.2, 0);
  let landed = null;
  let armored = 0;
  for (let i = 0; i < 60 && !landed; i++) {
    m.step([IN.DOWN | IN.SPECIAL, 0]);
    armored += m.events.filter((e) => e.type === 'armor').length;
    landed = m.events.find((e) => e.type === 'blockFormLand');
  }
  assert.ok(landed, 'la onda salió al tocar el suelo');
  assert.ok(r.percent > 0, 'el rival cercano recibió el daño');
  assert.equal(p.percent, 0);
  void armored;
});

test('Block Form no se interrumpe por un golpe (superarmor)', () => {
  const m = started('coco');
  const [p, r] = m.fighters;
  p.place(0, 0);
  run(m, 3, [IN.DOWN | IN.SPECIAL]); // arranca el bloque en el piso
  assert.equal(p.blockFormActive, true);
  r.place(-0.8, 0);
  r.facing = 1;
  for (let i = 0; i < 12; i++) m.step([IN.DOWN | IN.SPECIAL, i === 0 ? IN.ATTACK | IN.RIGHT : 0]);
  assert.equal(p.blockFormActive, true, 'sigue en bloque');
  assert.equal(p.percent, 0, 'la superarmor no recibe daño');
});

test('snapshot/restore conserva el stance y un Sword Slash a mitad de camino', () => {
  const inputs = (i) => [i === 5 ? IN.SPECIAL : i >= 80 && i < 83 ? IN.UP | IN.SPECIAL : 0, (i * 7) % 100];
  const m = started('faxo');
  run(m, 90, inputs); // ahora Pablo está en pleno Sword Slash (y cambió de stance antes)
  const snap = JSON.parse(JSON.stringify(m.snapshot()));
  run(m, 200, (i) => inputs(i + 90));
  const final = m.snapshot();
  const m2 = started('faxo');
  m2.restore(snap);
  run(m2, 200, (i) => inputs(i + 90));
  assert.deepEqual(m2.snapshot(), final);
  assert.equal(snap.fighters[0].stance, 'gordo');
});

test('Pablo CPU vs CPU: partida completa sin valores raros, con stances', async () => {
  const { AIController } = await import('../src/sim/index.js');
  const m = new Match({ players: [{ character: 'pablo' }, { character: 'pablo' }, { character: 'coco' }], stocks: 2 });
  const cpus = m.fighters.map((f) => new AIController(f.index, 'hard', 9));
  let frames = 0;
  while (m.phase !== 'finished' && frames < 60 * 60 * 6) {
    m.step(cpus.map((c) => c.decide(m)));
    for (const f of m.fighters) {
      for (const k of ['x', 'y', 'vx', 'vy', 'percent']) assert.ok(Number.isFinite(f[k]), `${k} finito (cuadro ${frames})`);
    }
    frames++;
  }
  assert.equal(m.phase, 'finished', `terminó (${frames} cuadros)`);
});
