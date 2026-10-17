import test from 'node:test';
import assert from 'node:assert/strict';
import { Match, AIController } from '../src/sim/index.js';
import { Room, hashSnapshot, ROLLBACK_FRAMES } from '../src/net/Room.js';

// ================================================================
// Red simulada (estrella vía anfitrión) con jitter y pérdida.
// Cada paquete tiene latencia aleatoria y puede perderse. Sincroniza
// por ticks: avanzar el reloj entrega lo que ya venció.
// ================================================================

function rng(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

class Hub {
  constructor(lossRate = 0, maxJitter = 4) {
    this.lossRate = lossRate;
    this.jitter = maxJitter > 0 ? rng(0xc0ffee) : null;
    this.maxJitter = maxJitter;
    this.peers = new Map();
    this.queue = [];
    this.tick = 0;
  }
  add(name, peer) {
    this.peers.set(name, peer);
  }
  /** Encola un paquete de `from` a `to`, con pérdida y latencia aleatoria. */
  send(from, to, msg) {
    // pérdida independiente por paquete
    if (this.jitter && this.jitter() < this.lossRate) return;
    const delay = this.jitter ? 1 + Math.floor(this.jitter() * this.maxJitter) : 1;
    this.queue.push({ at: this.tick + delay, from, to, msg });
  }
  step() {
    this.tick++;
    const due = this.queue.filter((q) => q.at <= this.tick);
    this.queue = this.queue.filter((q) => q.at > this.tick);
    for (const q of due) {
      const p = this.peers.get(q.to);
      if (p) p.receive(q.from, q.msg);
    }
  }
}

/** Un peer de la sala: corre Room + Match, cables a un hub. */
class Peer {
  constructor(name, hub, isHost, selfId, fighters) {
    this.name = name;
    this.hub = hub;
    this.isHost = isHost;
    this.room = new Room({ host: isHost, selfId });
    this.room.fighters = fighters.map((f) => ({ ...f }));
    this.room.playerOwner = fighters.map((f) => f.owner);
    this.room.stageId = 'mormones';
    this.room.stocks = 3;
    this.match = new Match({
      stageId: 'mormones',
      stocks: 3,
      players: fighters.map((f) => ({ character: f.character, ai: f.ai })),
    });
    // la CPU corre en TODOS los peers con la MISMA semilla (1): decide() es
    // función pura del estado, así que todos generan la misma máscara sin
    // depender de la red. (Antes solo el host la calculaba y la mandaba; los
    // guests la predecían con una fórmula distinta → divergencia.)
    this.ai = fighters.some((f) => f.owner === 'cpu')
      ? new AIController(fighters.findIndex((f) => f.owner === 'cpu'), 'normal', 1)
      : null;
    this.room.send = (msg) => this.send(msg);
    hub.add(name, this);
  }
  send(msg) {
    if (this.isHost) {
      for (const [name, peer] of this.hub.peers) {
        if (name !== this.name) this.hub.send(this.name, name, msg);
      }
    } else {
      this.hub.send(this.name, 'host', msg);
    }
  }
  receive(from, msg) {
    this.room.receive(msg, from);
  }
}

// fighters compartidos por todos los peers (idéntica config de sala)
const FIGHTERS = [
  { owner: 'host', character: 'pablo', ai: null },
  { owner: 'g1', character: 'coco', ai: null },
  { owner: 'g2', character: 'domono', ai: null },
  { owner: 'cpu', character: 'faxo', ai: 'normal' },
];

function localMasks(p, N, m) {
  const masks = {};
  for (let i = 0; i < m.players.length; i++) {
    const owner = p.room.playerOwner[i];
    if (owner === p.room.selfId && p.room.selfId !== '') {
      // patrón determinista por frame y fighter (simula teclado)
      masks[i] = (N * 7 + i * 13) & 0x7f;
    } else if (owner === 'cpu' && p.ai) {
      // la CPU corre en TODOS los peers con la MISMA semilla sobre su propio
      // estado (determinista): así todos predicen el mismo input sin depender
      // de la red. decide() es función pura de (estado, RNG semillado), así
      // que un rollback que reintegra el estado correcto regenera la misma
      // máscara. (El host NO la manda por red: eso hacía diverger.)
      masks[i] = p.ai.decide(m);
    }
  }
  return masks;
}

/** Un paso online (igual que stepOnline de main.js). */
function stepOnline(p, N) {
  const { room, match: m } = p;
  const resync = room.takeResync();
  if (resync) {
    m.restore(resync);
    room.corrections.clear();
  }
  const local = localMasks(p, N, m);
  // Solo viajan por red los inputs HUMANOS. Las CPUs se calculan localmente
  // en todos los peers (misma semilla), así que excluirlas evita que el
  // anfitrión pise la máscara local del guest.
  const human = {};
  for (const k in local) {
    if (p.room.playerOwner[Number(k)] !== 'cpu') human[k] = local[k];
  }
  const prev = [];
  for (let d = 1; d <= 2; d++) {
    const loc = room.localUsed.get(N - d);
    if (loc) {
      const copy = {};
      for (const k in loc) {
        if (p.room.playerOwner[Number(k)] !== 'cpu') copy[k] = loc[k];
      }
      if (Object.keys(copy).length) prev.push([N - d, copy]);
    }
  }
  if (Object.keys(human).length) {
    room.send({ t: 'in', f: N, masks: human, prev: prev.length ? prev : undefined });
  }
  const rb = room.takeRollbackTo();
  if (rb !== null && rb >= 1) {
    const snap = room.snapshots.get(rb - 1);
    if (snap) {
      m.restore(snap);
      for (let k = rb; k < N; k++) {
        const inputs = [];
        for (let i = 0; i < m.players.length; i++) inputs[i] = room.inputForFrame(i, k);
        m.step(inputs);
        m.events = [];
      }
    }
  }
  room.saveSnapshot(m.frame, m.snapshot());
  const inputs = room.resolve(N, local);
  m.step(inputs);
  m.events = [];
  room.confirmFrame(N);
  room.sendHashIfDue(N, m.snapshot());
}

/** Arma host + 2 guests en un hub y arranca la partida (manda start). */
function setup(hub) {
  const host = new Peer('host', hub, true, 'host', FIGHTERS);
  const g1 = new Peer('g1', hub, false, 'g1', FIGHTERS);
  const g2 = new Peer('g2', hub, false, 'g2', FIGHTERS);
  const peers = [host, g1, g2];
  // el host arranca la sala: start a todos (playerOwner queda seteado)
  host.room.start();
  for (const p of peers) p.room.playerOwner = FIGHTERS.map((f) => f.owner);
  return { host, g1, g2, peers };
}

test('la simulación es determinista: dos Match idénticos dan el mismo snapshot', () => {
  const players = FIGHTERS.map((f) => ({ character: f.character, ai: f.ai }));
  const a = new Match({ stageId: 'mormones', stocks: 3, players });
  const b = new Match({ stageId: 'mormones', stocks: 3, players });
  const ai = new AIController(3, 'normal', 1);
  for (let N = 1; N <= 240; N++) {
    const ia = ai.decide(a);
    const ib = ai.decide(b);
    const inA = [];
    const inB = [];
    for (let i = 0; i < a.players.length; i++) {
      const owner = FIGHTERS[i].owner;
      if (owner === 'cpu') { inA[i] = ia; inB[i] = ib; }
      else { inA[i] = inB[i] = (N * 7 + i * 13) & 0x7f; }
    }
    a.step(inA);
    b.step(inB);
  }
  assert.equal(hashSnapshot(a.snapshot()), hashSnapshot(b.snapshot()));
});

test('3 peers sin pérdida convergen al mismo estado', () => {
  const hub = new Hub(0, 0);
  const { peers } = setup(hub);
  for (let N = 1; N <= 480; N++) {
    for (const p of peers) stepOnline(p, N);
    hub.step();
  }
  const frames = peers.map((p) => p.match.frame);
  assert.equal(frames[0], frames[1]);
  assert.equal(frames[1], frames[2]);
  const hashes = peers.map((p) => hashSnapshot(p.match.snapshot()));
  assert.equal(hashes[0], hashes[1], 'host y g1 coinciden');
  assert.equal(hashes[1], hashes[2], 'g1 y g2 coinciden');
});

test('la sala sobrevive a pérdida de paquetes (25%) y converge', () => {
  const hub = new Hub(0.25, 4);
  const { peers } = setup(hub);
  for (let N = 1; N <= 480; N++) {
    for (const p of peers) stepOnline(p, N);
    hub.step();
  }
  const frames = peers.map((p) => p.match.frame);
  assert.equal(frames[0], frames[1]);
  assert.equal(frames[1], frames[2]);
  const hashes = peers.map((p) => hashSnapshot(p.match.snapshot()));
  assert.equal(hashes[0], hashes[1], 'host y g1 coinciden tras pérdidas');
  assert.equal(hashes[1], hashes[2], 'g1 y g2 coinciden tras pérdidas');
});

test('la sala sobrevive a pérdida alta (40%) y a un desvío forzado con resync', () => {
  const hub = new Hub(0.4, 3);
  const { host, g1, peers } = setup(hub);
  for (let N = 1; N <= 360; N++) {
    for (const p of peers) stepOnline(p, N);
    hub.step();
  }
  const hashes = peers.map((p) => hashSnapshot(p.match.snapshot()));
  assert.equal(hashes[0], hashes[1], 'host y g1 coinciden con pérdida alta');
  assert.equal(hashes[1], hashes[2]);

  // forzar un desvío: corrompemos el estado de g1
  const bad = g1.match.snapshot();
  bad.fighters[0].x += 0.5;
  g1.match.restore(bad);
  const diverged = hashSnapshot(g1.match.snapshot());
  assert.notEqual(diverged, hashSnapshot(host.match.snapshot()), 'g1 quedó desviado');

  // el host manda su snapshot actual (need-snap → snap). Con 40% de pérdida el
  // snap puede caerse, así que reintentamos hasta que g1 lo reciba.
  const target = host.room.frame;
  for (let tries = 0; tries < 20 && g1.room.resyncSnap == null; tries++) {
    g1.room.send({ t: 'need-snap', f: target });
    for (let i = 0; i < 8 && g1.room.resyncSnap == null; i++) hub.step();
  }
  assert.notEqual(g1.room.resyncSnap, null, 'g1 recibió el snapshot del host');

  // un paso de g1 aplica el resync (restaura el estado PREVIO al step target,
  // o sea frame target-1) y luego avanza al paso target: queda en el MISMO
  // frame y con el MISMO estado que el host, que no se movió.
  stepOnline(g1, target);
  assert.equal(g1.match.frame, host.match.frame, 'frames alineados tras resync');
  assert.equal(hashSnapshot(g1.match.snapshot()), hashSnapshot(host.match.snapshot()), 'g1 resincronizado');
});
