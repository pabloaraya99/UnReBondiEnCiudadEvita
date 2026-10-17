/**
 * Room: lógica pura de la sala online (rollback + lobby + protocolo).
 *
 * NO importa PeerJS ni DOM: el transporte se inyecta (`send`) y los mensajes
 * entran por `receive(msg, fromId)`. Así se puede testear en Node con un
 * transporte simulado con jitter y pérdida de paquetes.
 *
 * Diseño (estrella vía anfitrión):
 *  - El anfitrión es el relé: todo mensaje de un guest pasa por él y se
 *    retransmite a los demás (más los suyos).
 *  - Todos corren la MISMA simulación. Cada peer manda su máscara por frame
 *    con redundancia ×3 (los últimos 3 frames juntos): si se pierde un
 *    paquete, el siguiente trae el dato igual.
 *  - Predicción "hold": si el input remoto del frame N no llegó, se repite el
 *    último conocido. Si el real llega tarde y difiere → corrección → rollback.
 *  - El anfitrión es autoritativo en los hashes: si los de un peer no coinciden
 *    con los suyos, le manda su snapshot y el peer resincroniza.
 */

/** Hash FNV-1a sobre un string: barato y determinista (para detectar desvíos). */
export function hashString(s) {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619) >>> 0;
  }
  return h >>> 0;
}

/** Hash de un snapshot: JSON con claves en orden de inserción (mismo código → mismo string). */
export function hashSnapshot(snap) {
  return hashString(JSON.stringify(snap));
}

/** Cuántos frames hacia atrás se puede hacer rollback (y cuántos snapshots guardar). */
export const ROLLBACK_FRAMES = 14;
/** Cada cuántos frames se manda el hash de desvío. */
export const HASH_INTERVAL = 120;

export class Room {
  /**
   * @param opts.host soy el anfitrión
   * @param opts.selfId mi id de miembro ('host' para el anfitrión)
   */
  constructor({ host = false, selfId = host ? 'host' : '' } = {}) {
    this.isHost = host;
    this.selfId = selfId;
    this.state = 'lobby'; // 'lobby' | 'playing'
    this.closed = false; // la sala ya empezó: no se aceptan joins

    // ---- lobby ----
    this.members = []; // [{ id, name }]
    this.fighters = []; // [{ owner: memberId | 'cpu', character, ai }] — config de la partida
    this.stageId = null;
    this.stocks = 3;

    // ---- transporte (lo inyecta el glue de PeerJS o el test) ----
    this.send = () => {}; // fn(msg) — manda a todos los demás (el relé ya está resuelto)
    this.onEvent = () => {}; // fn(type, data) — 'roster' | 'start' | 'leave' | 'resync' | 'closed' | 'rtt'

    // ---- juego ----
    this.frame = 0; // espejo de match.frame (lo empuja main con confirmStep)
    this.playerOwner = []; // fighterIdx → memberId | 'cpu'
    this.recv = new Map(); // fighterIdx → Map(frame → mask real recibido)
    this.used = new Map(); // fighterIdx → Map(frame → mask con que se jugó)
    this.localUsed = new Map(); // frame → { fighterIdx: mask } (los míos, para re-simular)
    this.cpuMaskCache = new Map(); // frame → { fighterIdx: mask } (CPU del host, reintegra igual)
    this.lastReal = new Map(); // fighterIdx → último mask real (predicción hold)
    this.leaveAt = new Map(); // fighterIdx → frame en que se desconectó (mask forzada a 0)
    this.snapshots = new Map(); // frame → snapshot (ring, últimos ROLLBACK_FRAMES + margen)
    this.myHashes = new Map(); // frame → mi hash (para que el anfitrión compare)
    this.corrections = new Set(); // frames con input real ≠ usado (pendientes de re-hacer)
    this.resyncSnap = null; // snapshot del anfitrión para resincronizar
    this.requestedSnap = false; // ya pedí resync (evita spam)
    this.justResync = false; // aplicué un resync en este paso (no reintegrar todavía)
    this.rtt = null; // ida y vuelta en ms (para el HUD)
    this._pingTs = 0;
    this._memberSeq = 0;
  }

  // ================================================================ lobby

  /** El anfitrión arma la sala inicial. */
  setupHost({ stageId, stocks, fighters, name = 'Anfitrión' }) {
    this.stageId = stageId;
    this.stocks = stocks;
    this.fighters = fighters;
    this.members = [{ id: 'host', name }];
  }

  /** Mensaje de bienvenida para un guest recién conectado. */
  welcomeFor(guestId, guestName) {
    return {
      t: 'welcome',
      selfId: guestId,
      stageId: this.stageId,
      stocks: this.stocks,
      fighters: this.fighters,
      members: this.members,
    };
  }

  /** El anfitrión registra a un guest que mandó hello. Devuelve su id. */
  addMember(name) {
    const id = `g${++this._memberSeq}`;
    this.members.push({ id, name });
    return id;
  }

  removeMember(id) {
    this.members = this.members.filter((m) => m.id !== id);
    // el fighter que controlaba queda con input forzado a 0 desde este frame
    this.fighters.forEach((fg, i) => {
      if (fg.owner === id) this.forceLeave(i, this.frame);
    });
  }

  /** Fuerza mask 0 para un fighter a partir del frame f (desconexión). Determinista en todos los peers. */
  forceLeave(fighterIdx, f) {
    this.leaveAt.set(fighterIdx, f);
  }

  // ================================================================ mensajes de entrada

  /**
   * Procesa un mensaje entrante (ya retransmitido si corresponde).
   * `fromId` = quién lo mandó originalmente.
   */
  receive(msg, fromId) {
    switch (msg.t) {
      case 'config': {
        this.stageId = msg.stageId;
        this.stocks = msg.stocks;
        this.fighters = msg.fighters;
        this.onEvent('config');
        break;
      }
      case 'roster': {
        this.members = msg.members;
        this.onEvent('roster');
        break;
      }
      case 'start': {
        this.stageId = msg.stageId ?? this.stageId;
        this.stocks = msg.stocks ?? this.stocks;
        this.fighters = msg.fighters ?? this.fighters;
        this.closed = true;
        this.state = 'playing';
        this.playerOwner = this.fighters.map((f) => f.owner);
        this.onEvent('start');
        break;
      }
      case 'in': {
        const store = (f, masksObj) => {
          for (const key in masksObj) this.storeReal(Number(key), f, masksObj[key]);
        };
        store(msg.f, msg.masks);
        // redundancia: los frames viejos viajan juntos en el mismo paquete
        if (msg.prev) for (const p of msg.prev) store(p[0], p[1]);
        break;
      }
      case 'hash': {
        if (this.isHost) this.checkHash(msg, fromId);
        else this.myHashes.set(msg.f, msg.h);
        break;
      }
      case 'need-snap': {
        if (this.isHost) {
          const snap = this.snapshots.get(msg.f) ?? this.snapshots.get(this.nearestSnap(msg.f));
          if (snap) this.send({ t: 'snap', f: msg.f, snap });
        }
        break;
      }
      case 'snap': {
        this.resyncSnap = msg.snap;
        this.onEvent('resync');
        break;
      }
      case 'leave': {
        // msg.i = índice de fighter (o array de índices) que queda con input forzado a 0
        const idxs = Array.isArray(msg.i) ? msg.i : msg.i >= 0 ? [msg.i] : [];
        for (const i of idxs) this.forceLeave(i, msg.f);
        this.onEvent('leave', { i: idxs, name: msg.name });
        break;
      }
      case 'ping': {
        if (this.isHost) this.send({ t: 'pong', ts: msg.ts });
        break;
      }
      case 'pong': {
        this.rtt = performance.now() - msg.ts;
        this.onEvent('rtt', this.rtt);
        break;
      }
      case 'closed': {
        this.closed = true;
        this.onEvent('closed');
        break;
      }
    }
  }

  /** Guarda un input real recibido y detecta si corrige una predicción ya jugada. */
  storeReal(i, f, mask) {
    let buf = this.recv.get(i);
    if (!buf) this.recv.set(i, (buf = new Map()));
    const had = buf.has(f);
    buf.set(f, mask);
    this.lastReal.set(i, mask);
    if (!had) {
      const usedBuf = this.used.get(i);
      if (usedBuf && usedBuf.has(f) && usedBuf.get(f) !== mask && f < this.frame) {
        this.corrections.add(f);
      }
    }
  }

  // ================================================================ tick de juego

  /**
   * Predicción de inputs remotos: determinista y compartida entre peers.
   *
   * Si el input real del frame N aún no llegó, TODOS los peers predicen lo
   * MISMO: no depende del estado de red local ni del orden en que llegaron
   * los paquetes. La predicción es función pura de (i, N), así que todos
   * simulan la misma secuencia exacta incluso con pérdida de paquetes.
   *
   * Cuando el input real llega y difiere de lo predicho, se marca una
   * corrección y se reintegra con rollback el mismo tramo en todos los peers
   * (la ventana de rollback es la misma: ROLLBACK_FRAMES). Esto reemplaza el
   * hold sobre `lastReal`, que divergía entre peers según el orden de llegada.
   *
   * `this.recv` se usa SOLO para saber si el real ya llegó (para marcar la
   * corrección), nunca para predecir.
   */
  /**
   * Índices de los fighters CPU: corren la IA localmente en TODOS los peers
   * (misma semilla → misma máscara, sin depender de la red).
   */
  cpuIndices() {
    const out = [];
    for (let i = 0; i < this.playerOwner.length; i++) {
      if (this.playerOwner[i] === 'cpu') out.push(i);
    }
    return out;
  }

  predictedInput(i, N) {
    const leave = this.leaveAt.get(i);
    if (leave !== undefined && N >= leave) return 0;
    // Las CPUs corren la IA localmente en todos los peers (misma semilla →
    // misma máscara). Nunca usamos `recv` para un índice CPU: si el anfitrión
    // manda su máscara por red y el guest la aceptara, pisaría la suya propia
    // y divergirían.
    if (this.playerOwner[i] === 'cpu') return 0;
    const buf = this.recv.get(i);
    if (buf && buf.has(N)) return buf.get(N);
    // predicción compartida: función pura de (i, N) — idéntica en todos los peers
    return ((N * 7 + i * 13) & 0x7f);
  }

  /**
   * Resuelve los inputs del frame N: locales (recién calculados) + remotos
   * (reales si llegaron, si no predicción determinista). Registra qué se usó.
   * @param localMasks { fighterIdx: mask } inputs míos para el frame N
   */
  resolve(N, localMasks = null) {
    if (localMasks) this.localUsed.set(N, localMasks);
    const inputs = [];
    const n = Math.max(this.playerOwner.length, this.fighters.length, 1);
    const cpuCached = this.cpuMaskCache.get(N);
    for (let i = 0; i < n; i++) {
      let mask;
      // CPU del host: en un rollback (sin localMasks frescos) se reintegra la
      // mask REAL que se jugó (cacheada), NO se recalcula — el RNG de decide()
      // avanza con cada llamada y recalcular produciría otra mask, divergiendo
      // de los guests (que predicen con la fórmula determinista).
      if (!localMasks && cpuCached && cpuCached[i] !== undefined) {
        mask = cpuCached[i];
      } else {
        mask = this.predictedInput(i, N);
      }
      // lo mío (humano o CPU en el paso normal) es definitivo
      if (localMasks && localMasks[i] !== undefined) mask = localMasks[i];
      inputs[i] = mask;
      this.markUsed(i, N, mask);
    }
    return inputs;
  }

  markUsed(i, f, mask) {
    let buf = this.used.get(i);
    if (!buf) this.used.set(i, (buf = new Map()));
    buf.set(f, mask);
  }

  /** Input definitivo para re-simular un frame viejo (sin locales frescos). */
  inputForFrame(i, f) {
    // CPU: la mask ya se jugó y quedó registrada en `used`. La reintegramos
    // igual en el rollback en vez de recalcular decide() (el RNG avanzaría y
    // produciría otra mask) ni de usar la fórmula compartida.
    if (this.playerOwner[i] === 'cpu') {
      const buf = this.used.get(i);
      if (buf && buf.has(f)) return buf.get(f);
    }
    // CPU del host (legacy): la mask cacheada
    const cpu = this.cpuMaskCache.get(f);
    if (cpu && cpu[i] !== undefined) return cpu[i];
    return this.predictedInput(i, f);
  }

  /**
   * El frame N ya se jugó con predicciones: guardá el snapshot previo y
   * confirmá el paso. Devuelve el snapshot a guardar (o null).
   */
  beforeStep(N) {
    return N; // main guarda snapshots[N-1] antes del step que llega a N
  }

  /** Frame N terminó de jugarse: limpia correcciones ya re-hechas y poda buffers. */
  confirmFrame(N) {
    this.frame = N;
    for (const f of [...this.corrections]) {
      if (f <= N) this.corrections.delete(f);
    }
    // Poda: los inputs se guardan ~5s (por si hay que resincronizar hacia atrás
    // tras un hash desviado); los snapshots solo ~2.5s (rollback + respuestas de hash).
    const cutoffInputs = N - 300;
    const cutoffSnaps = N - 160;
    if (cutoffInputs > 0) {
      for (const buf of this.used.values()) pruneMap(buf, cutoffInputs);
      for (const buf of this.recv.values()) pruneMap(buf, cutoffInputs);
      pruneMap(this.localUsed, cutoffInputs);
    }
    if (cutoffSnaps > 0) {
      pruneMap(this.snapshots, cutoffSnaps);
      pruneMap(this.myHashes, cutoffSnaps);
    }
  }

  /** Guarda un snapshot del match (objeto plano de Match.snapshot()). */
  saveSnapshot(N, snap) {
    this.snapshots.set(N, snap);
  }

  /**
   * El rollback más viejo pendiente que podemos hacer, o null.
   *
   * Solo se reintegra si el tramo completo a rehacer (desde el frame
   * corregido hasta el frame actual) cabe en la ventana de snapshots
   * ROLLBACK_FRAMES. Si no, se pide resync al anfitrión en lugar de
   * reintegrar: reintegrar una ventana más larga en un solo peer y no en
   * los demás los desincroniza (cada peer reintegra distinto tramo).
   */
  takeRollbackTo() {
    if (this.corrections.size === 0) return null;
    let min = Infinity;
    for (const f of this.corrections) if (f < min) min = f;
    // ventana de rollback: el tramo a rehacer debe caber en los snapshots
    // que conservamos (ROLLBACK_FRAMES). Fuera de eso → resync.
    const window = this.frame - min + 1;
    if (!this.snapshots.has(min - 1) || window > ROLLBACK_FRAMES) {
      if (!this.requestedSnap) {
        this.requestedSnap = true;
        this.send({ t: 'need-snap', f: Math.max(1, this.frame - ROLLBACK_FRAMES) });
      }
      this.corrections.clear();
      return null;
    }
    this.corrections.delete(min);
    return min;
  }

  /** Las correcciones se re-hicieron: limpiá las que ya no importan. */
  clearCorrectionsUpTo(N) {
    for (const f of [...this.corrections]) {
      if (f <= N) this.corrections.delete(f);
    }
  }

  // ================================================================ hash / desvíos

  /** Manda mi hash del frame N (cada HASH_INTERVAL). */
  sendHashIfDue(N, snap) {
    if (N % HASH_INTERVAL !== 0 || N === 0) return false;
    const h = hashSnapshot(snap);
    this.myHashes.set(N, h);
    this.send({ t: 'hash', f: N, h });
    return true;
  }

  /** Anfitrión: si el hash de un peer difiere del mismo frame, le mando snapshot. */
  checkHash(msg, fromId) {
    const mine = this.myHashes.get(msg.f);
    if (mine !== undefined && mine !== msg.h) {
      const snap = this.snapshots.get(msg.f) ?? this.snapshots.get(this.nearestSnap(msg.f));
      if (snap) this.send({ t: 'snap', f: msg.f, snap });
    }
  }

  nearestSnap(f) {
    let best = null;
    let bestD = Infinity;
    for (const k of this.snapshots.keys()) {
      const d = Math.abs(k - f);
      if (d < bestD) { bestD = d; best = k; }
    }
    return best;
  }

  /** El peer tomó el resync del anfitrión. */
  takeResync() {
    const s = this.resyncSnap;
    this.resyncSnap = null;
    this.requestedSnap = false;
    return s;
  }

  // ================================================================ utilidades de lobby

  ping() {
    this._pingTs = typeof performance !== 'undefined' ? performance.now() : Date.now();
    this.send({ t: 'ping', ts: this._pingTs });
  }

  /** Cambia el personaje de un fighter (host) o pide el propio (guest). */
  setCharacter(fighterIdx, character) {
    if (this.isHost) {
      this.fighters[fighterIdx] = { ...this.fighters[fighterIdx], character };
      this.broadcastConfig();
    } else {
      this.send({ t: 'want-char', fighterIdx, character });
    }
  }

  broadcastConfig() {
    this.send({ t: 'config', stageId: this.stageId, stocks: this.stocks, fighters: this.fighters });
    this.onEvent('config');
  }

  /** El host arranca la partida (manda start a todos). */
  start() {
    this.send({ t: 'start', stageId: this.stageId, stocks: this.stocks, fighters: this.fighters });
    this.closed = true;
    this.state = 'playing';
    this.playerOwner = this.fighters.map((f) => f.owner);
    this.onEvent('start');
  }

  /** Se va un jugador: el host avisa a todos con el frame exacto y los índices afectados. */
  leave(fighterIdxs = [], name = '') {
    this.send({ t: 'leave', i: fighterIdxs, f: this.frame, name });
  }
}

function pruneMap(map, cutoff) {
  for (const k of map.keys()) {
    if (k < cutoff) map.delete(k);
  }
}
