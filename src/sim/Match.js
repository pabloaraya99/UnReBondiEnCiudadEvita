import { GAME_CONFIG } from '../config.js';
import { Fighter } from './Fighter.js';

const { physics: P, moves: MOVES, physicsStep: DT, match: M } = GAME_CONFIG;

const overlap = (a, b) => a.l < b.r && a.r > b.l && a.b < b.t && a.t > b.b;
const approach = (cur, target, step) => cur < target ? Math.min(cur + step, target) : Math.max(cur - step, target);
const circleOverlap = (cx, cy, r, box) => {
  const dx = Math.max(box.l - cx, 0, cx - box.r);
  const dy = Math.max(box.b - cy, 0, cy - box.t);
  return dx * dx + dy * dy <= r * r;
};
/** Hash pseudoaleatorio del frame: mismo frame → mismo número (determinista, snapshot-safe). */
const hashFrame = (n) => {
  let x = (n * 2654435761) >>> 0;
  x ^= x >>> 15;
  x = Math.imul(x, 2246822519) >>> 0;
  x ^= x >>> 13;
  return x >>> 0;
};

/**
 * Una partida completa: peleadores, proyectiles, golpes, vidas y reglas. Es 100 % determinista:
 * el mismo estado inicial y la misma secuencia de entradas dan siempre el mismo resultado.
 * No usa Three.js, DOM, Math.random ni relojes, así que corre igual en el navegador, en Node (tests)
 * y, más adelante, en el anfitrión del online.
 */
export class Match {
  constructor({ stageId = GAME_CONFIG.defaultStage, players, stocks = M.stocks, timeLimitSeconds = M.timeLimitSeconds }) {
    this.stageId = stageId;
    this.stage = GAME_CONFIG.stages[stageId];
    if (!this.stage) throw new Error(`Escenario desconocido: ${stageId}`);
    this.stocks = stocks;
    this.timeLimitSeconds = timeLimitSeconds;
    this.players = players;
    this.fighters = players.map((p, i) => {
      const f = new Fighter(i, p.character, stocks);
      const s = this.stage.spawns[i % this.stage.spawns.length];
      f.place(s.x, s.y);
      f.facing = s.x < 0 ? 1 : -1;
      f.grounded = true;
      f.standingOn = 'solid';
      // Inicializar saltos según personaje (Kirby-like)
      f.jumpsLeft = (f.maxJumps ?? 2) - 1;
      f.state = 'idle';
      return f;
    });
    this.projectiles = [];
    this.nextProjectileId = 1;
    this.flames = []; // llamas persistentes (Holy Water / PK Fire)
    // tráfico del escenario (autos con hitbox, estilo Onett)
    this.cars = [];
    this.nextCarId = 1;
    this.nextCarFrame = null; // se fija cuando arranca la pelea
    this.frame = 0;
    this.fightFrames = 0;
    this.phase = 'countdown';
    this.finishTimer = 0;
    this.winner = null;
    this.events = [];
  }

  get canRematch() {
    return this.phase === 'finished' && this.finishTimer >= M.finishFrames;
  }

  /** Avanza un cuadro. `inputs[i]` es la máscara del jugador i (ver input.js). */
  step(inputs) {
    this.events = [];
    this.frame++;
    const ctx = {
      events: this.events,
      spawnProjectile: (f, moveId) => this.spawnProjectile(f, moveId),
    };
    const fighting = this.phase === 'fighting';

    for (const f of this.fighters) f.step(fighting ? (inputs[f.index] ?? 0) : 0, this.stage, ctx);

    if (this.phase === 'countdown') {
      const left = M.countdownFrames - this.frame;
      if (left >= 0 && left % 60 === 0 && left > 0) this.events.push({ type: 'countdown', n: left / 60 });
      if (this.frame >= M.countdownFrames) {
        this.phase = 'fighting';
        this.events.push({ type: 'go' });
      }
      return;
    }

    if (this.phase === 'finished') {
      this.finishTimer++;
      this.updateProjectiles(ctx);
      return;
    }

    this.fightFrames++;
    this.updateProjectiles(ctx);
    this.updateFlames();
    this.updateTraffic(ctx);
    this.resolveVortex();      // Inhale de Kirby: succión hacia el atacante
    this.resolveHits();
    this.resolveSpecialHits(); // swordSlashLand, blockFormLand, burst
    this.checkBlastZones();
    this.checkEnd();
  }

  /** Inhale (Kirby/Kenai): durante los frames activos, atrae al rival hacia el
   *  atacante. El daño y el escupitajo salen del hitbox normal (resolveHits). */
  resolveVortex() {
    for (const a of this.fighters) {
      const atk = a.attack;
      if (!atk) continue;
      const m = MOVES[atk.id];
      if (!m?.vortex) continue;
      if (atk.frame < m.startup || atk.frame >= m.startup + m.active) continue;
      // atrae al rival dentro del área de succión hacia el atacante
      const cx = a.x + a.facing * m.box.x;
      const cy = a.y + m.box.y;
      const area = { l: cx - m.box.w / 2, r: cx + m.box.w / 2, b: cy - m.box.h / 2, t: cy + m.box.h / 2 };
      for (const v of this.fighters) {
        if (v === a || !v.alive || v.invuln > 0) continue;
        if (overlap(area, v.hurtbox())) {
          // succión: acelera al rival hacia el atacante
          const dir = Math.sign(a.x - v.x) || a.facing;
          v.vx = approach(v.vx, dir * (m.vortexPull ?? 0.3) * 20, 2.5);
          v.hitstun = Math.max(v.hitstun, 4); // lo mantiene atrapado
          if (atk.frame === m.startup) this.events.push({ type: 'inhale', attacker: a.index, victim: v.index, x: v.x, y: v.y });
        }
      }
    }
  }

  // ------------------------------------------------------------------ tráfico (autos con hitbox)

  /** Autos que cruzan el piso y pegan (estilo Onett). Determinista: el spawn
   *  sale de hashFrame, así que un snapshot/restore repite el mismo tráfico. */
  updateTraffic(ctx) {
    const tr = this.stage.traffic;
    if (!tr) return;
    if (this.nextCarFrame === null) this.nextCarFrame = this.frame + tr.startDelay;

    // ---- spawn fuera de cuadro, dirección y velocidad salen del hash del frame
    if (this.frame >= this.nextCarFrame) {
      const h = hashFrame(this.nextCarFrame);
      const dir = h % 2 === 0 ? 1 : -1;
      const speed = tr.speed[0] + (((h >> 4) % 100) / 100) * (tr.speed[1] - tr.speed[0]);
      this.cars.push({
        id: this.nextCarId++,
        x: -dir * tr.spawnX,
        prevX: -dir * tr.spawnX,
        dir,
        speed,
      });
      this.events.push({ type: 'car-spawn', dir, x: -dir * tr.spawnX });
      const iv = tr.interval;
      this.nextCarFrame += iv[0] + ((h >> 9) % (iv[1] - iv[0]));
    }

    // ---- mover + chocar
    const floorTop = this.stage.solids[0]?.top ?? 0;
    const hw = tr.car.w / 2;
    const keep = [];
    for (const c of this.cars) {
      c.prevX = c.x;
      c.x += c.dir * c.speed * DT;
      const box = { l: c.x - hw, r: c.x + hw, b: floorTop, t: floorTop + tr.car.h };
      for (const v of this.fighters) {
        if (!v.alive || v.invuln > 0 || v.hazardCd > 0) continue;
        if (overlap(box, v.hurtbox())) {
          this.applyHit(v, null, tr.car, c.dir, { x: v.x, y: v.y + v.height * 0.5 });
          v.hazardCd = tr.hazardCd;
          this.events.push({ type: 'car-hit', i: v.index, x: v.x, y: v.y, dir: c.dir });
          break; // el auto sigue de largo tras pegarle a uno
        }
      }
      if (Math.abs(c.x) < tr.despawnX) keep.push(c);
    }
    this.cars = keep;
  }

  // ------------------------------------------------------------------ proyectiles

  spawnProjectile(f, moveId) {
    const m = MOVES[moveId];
    this.projectiles.push({
      id: this.nextProjectileId++,
      owner: f.index,
      move: moveId,
      x: f.x + f.facing * 0.7,
      y: f.y + m.projectile.y,
      prevX: f.x + f.facing * 0.7,
      prevY: f.y + m.projectile.y,
      vx: f.facing * m.projectile.speed,
      dir: f.facing,
      life: m.projectile.life,
    });
    this.events.push({ type: 'shot', i: f.index, x: f.x, y: f.y + m.projectile.y });
  }

  updateProjectiles() {
    const keep = [];
    for (const p of this.projectiles) {
      p.prevX = p.x;
      p.prevY = p.y;
      const m = MOVES[p.move];
      // Axe (Richter): vuela en ARCO — sube y cae con gravedad
      if (m.projectile.arc) {
        p.vy = (p.vy ?? m.arcHeight ?? 4) - P.gravity * DT * 0.9;
        p.y += p.vy * DT;
      }
      p.x += p.vx * DT;
      p.life--;
      const r = m.projectile.radius;
      let dead = p.life <= 0;
      let hitGround = false;
      for (const s of this.stage.solids) {
        if (p.x + r > s.l && p.x - r < s.r && p.y + r > s.bottom && p.y - r < s.top) { dead = true; hitGround = true; }
      }
      if (!dead && this.phase === 'fighting') {
        const box = { l: p.x - r, r: p.x + r, b: p.y - r, t: p.y + r };
        for (const v of this.fighters) {
          if (v.index === p.owner || !v.alive || v.invuln > 0) continue;
          if (overlap(box, v.hurtbox())) {
            this.applyHit(v, this.fighters[p.owner], m, p.dir, { x: p.x, y: p.y });
            dead = true;
            break;
          }
        }
      }
      if (dead) {
        // BURST (Eruption de Ike / PK Fire de Ness): estalla en llamas con AoE
        if (m.burst) {
          this.events.push({ type: 'burst', i: p.owner, x: p.x, y: p.y, radius: m.burstRadius, damage: m.burstDamage, base: m.burstBase, growth: m.burstGrowth, angle: m.burstAngle, move: p.move });
        }
        // Holy Water / PK Fire con llama persistente: deja una llama en el suelo
        if ((m.groundFlame || m.lingering) && hitGround) {
          this.flames.push({
            x: p.x, y: p.y, owner: p.owner, move: p.move,
            frames: m.flameFrames ?? m.lingerFrames ?? 60,
            radius: m.flameRadius ?? m.burstRadius ?? 0.9,
            damage: m.flameDamage ?? m.burstDamage ?? 5,
            base: m.flameBase ?? m.burstBase ?? 3,
            growth: m.flameGrowth ?? m.burstGrowth ?? 8,
            angle: 60,
          });
          this.events.push({ type: 'flame-start', x: p.x, y: p.y, move: p.move });
        }
        this.events.push({ type: 'shot-end', x: p.x, y: p.y });
      } else keep.push(p);
    }
    this.projectiles = keep;
  }

  /** Llamas persistentes en el suelo (Holy Water / PK Fire): dañan por contacto. */
  updateFlames() {
    const keep = [];
    for (const f of this.flames) {
      f.frames--;
      if (f.frames <= 0) { this.events.push({ type: 'flame-end', x: f.x, y: f.y }); continue; }
      if (this.phase === 'fighting' && f.frames % 12 === 0) { // daña cada 12 frames (no cada frame)
        const move = { damage: f.damage, base: f.base, growth: f.growth, angle: f.angle };
        for (const v of this.fighters) {
          if (v.index === f.owner || !v.alive || v.invuln > 0) continue;
          const box = { l: f.x - f.radius, r: f.x + f.radius, b: f.y - 0.2, t: f.y + 1.2 };
          if (overlap(box, v.hurtbox())) {
            const dir = v.x > f.x ? 1 : -1;
            this.applyHit(v, this.fighters[f.owner], move, dir, { x: f.x, y: f.y });
          }
        }
      }
      keep.push(f);
    }
    this.flames = keep;
  }

  // ------------------------------------------------------------------ golpes normales (hitboxes rectangulares)

  resolveHits() {
    const hits = [];
    for (const a of this.fighters) {
      const hb = a.hitbox();
      if (!hb) continue;
      for (const v of this.fighters) {
        if (v === a || !v.alive || v.invuln > 0 || a.attack?.hit.includes(v.index)) continue;
        if (overlap(hb, v.hurtbox())) hits.push({ a, v, hb, attack: a.attack, moveId: a.attack.id, dir: a.facing });
      }
    }
    for (const { a, v, hb, attack, moveId, dir } of hits) {
      attack.hit.push(v.index);
      const point = { x: (Math.max(hb.l, v.x - v.width / 2) + Math.min(hb.r, v.x + v.width / 2)) / 2, y: (Math.max(hb.b, v.y) + Math.min(hb.t, v.y + v.height)) / 2 };
      this.applyHit(v, a, MOVES[moveId], dir, point);
    }
  }

  // ------------------------------------------------------------------ golpes especiales (circulares: swordSlashLand, blockFormLand)

  resolveSpecialHits() {
    for (const e of this.events) {
      if (e.type === 'swordSlashLand' || e.type === 'blockFormLand' || e.type === 'burst') {
        const attacker = this.fighters[e.i];
        if (!attacker || !attacker.alive) continue;

        const radius = e.radius ?? 1.5;
        const cx = e.x;
        const cy = e.y;
        
        for (const v of this.fighters) {
          if (v === attacker || !v.alive || v.invuln > 0) continue;
          if (circleOverlap(cx, cy, radius, v.hurtbox())) {
            // Crear move temporal con los parámetros del evento
            const move = { 
              damage: e.damage, 
              base: e.base, 
              growth: e.growth, 
              angle: e.angle 
            };
            const point = { x: cx, y: cy };
            const dir = v.x > cx ? 1 : -1;
            this.applyHit(v, attacker, move, dir, point);
          }
        }
      }
    }
  }

  // ------------------------------------------------------------------ aplicación de daño

  /** Daño + empuje + hitstun + hitlag. `dir` = ±1 hacia donde empuja (mira el atacante).
   *  `attacker` puede ser null (hazards del escenario, ej. los autos): power = 1. */
  applyHit(victim, attacker, move, dir, point) {
    const power = attacker ? attacker.power : 1; // incluye el multiplicador del stance
    const damage = move.damage * power;

    // ---- PK MAGNET (Ness/Domono): absorbe el golpe — reduce daño y cura un poco ----
    if (victim.blockFormActive && victim._bfData?.magnetMode) {
      const bf = victim._bfData;
      const absorbed = damage * bf.absorbMult;
      victim.percent += absorbed;                       // daño reducido ×absorbMult
      victim.percent = Math.max(0, victim.percent - bf.healPerHit); // y cura
      victim.hitlag = 2;
      this.events.push({ type: 'magnet', victim: victim.index, attacker: attacker ? attacker.index : -1, x: point.x, y: point.y, damage: absorbed, healed: bf.healPerHit });
      return;
    }

    // ---- COUNTER (Ike/Coco): anula el golpe recibido y contraataca ×counterMult ----
    if (victim.blockFormActive && victim._bfData?.counterMode && attacker && attacker !== victim) {
      const bf = victim._bfData;
      victim.blockFormActive = false;
      victim._bfData = null;
      victim.fastFall = false;
      victim.state = victim.grounded ? 'idle' : 'air';
      // contraataque inmediato sobre el atacante
      const counterMove = { damage: bf.counterDamage * bf.counterMult, base: bf.counterBase, growth: 12, angle: bf.counterAngle };
      this.events.push({ type: 'counter', victim: victim.index, attacker: attacker.index, x: point.x, y: point.y });
      this.applyHit(attacker, victim, counterMove, -dir, point);
      return;
    }

    // Armor check (Gordo stance)
    if (victim.tryArmor(damage, attacker)) {
      // Hit absorvido por armadura: solo hitlag mínimo, sin knockback ni hitstun
      const lag = Math.min(2, Math.floor(P.hitlagBase + damage * P.hitlagPerDamage));
      victim.hitlag = lag;
      if (attacker && attacker !== victim) attacker.hitlag = Math.max(attacker.hitlag, lag);
      this.events.push({ type: 'armor', victim: victim.index, attacker: attacker ? attacker.index : -1, x: point.x, y: point.y, damage });
      return;
    }

    victim.percent += damage;
    const kb = (move.base + (move.growth * victim.percent) / 100) * (100 / victim.weight) * power; // el peso también cambia con el stance
    const rad = (move.angle * Math.PI) / 180;
    victim.vx = Math.cos(rad) * kb * dir;
    victim.vy = Math.sin(rad) * kb;
    victim.hitstun = Math.floor(P.hitstunBase + kb * P.hitstunPerKb);
    victim.attack = null;
    victim.swordSlashPhase = null;
    victim.blockFormActive = false;
    victim.state = 'hitstun';
    victim.fastFall = false;
    victim.airFrames = 0;
    victim.facing = -dir;
    if (victim.vy > 0.5) {
      victim.grounded = false;
      victim.standingOn = null;
    }
    const lag = Math.min(P.hitlagMax, Math.floor(P.hitlagBase + damage * P.hitlagPerDamage));
    victim.hitlag = lag;
    if (attacker && attacker !== victim) attacker.hitlag = Math.max(attacker.hitlag, lag);
    this.events.push({ 
      type: 'hit', 
      victim: victim.index, 
      attacker: attacker?.index ?? -1, 
      x: point.x, 
      y: point.y, 
      damage, 
      percent: victim.percent, 
      kb, 
      dir, 
      angle: move.angle 
    });
  }

  // ------------------------------------------------------------------ reglas

  checkBlastZones() {
    const b = this.stage.blast;
    for (const f of this.fighters) {
      if (!f.alive) continue;
      const out = f.x < b.left || f.x > b.right || f.y < b.bottom || f.y + f.height > b.top;
      if (!out) continue;
      const cx = Math.max(b.left, Math.min(b.right, f.x));
      const cy = Math.max(b.bottom, Math.min(b.top, f.y));
      f.knockOut();
      this.events.push({ type: 'ko', i: f.index, x: cx, y: cy, stocks: f.stocks, from: f.x < b.left ? 'left' : f.x > b.right ? 'right' : f.y < b.bottom ? 'bottom' : 'top' });
    }
  }

  checkEnd() {
    const alive = this.fighters.filter((f) => f.state !== 'dead');
    let winner = null;
    if (alive.length <= 1 && this.fighters.length > 1) {
      winner = alive.length === 1 ? alive[0].index : -1;
    } else if (this.timeLimitSeconds > 0 && this.fightFrames >= this.timeLimitSeconds * 60) {
      const ranked = [...alive].sort((x, y) => y.stocks - x.stocks || x.percent - y.percent);
      const [a, b] = ranked;
      winner = b && a.stocks === b.stocks && a.percent === b.percent ? -1 : a.index;
    }
    if (winner === null) return;
    this.phase = 'finished';
    this.winner = winner;
    this.finishTimer = 0;
    this.projectiles = [];
    this.cars = []; // se frena el tráfico al terminar
    this.events.push({ type: 'win', winner });
  }

  // ------------------------------------------------------------------ red / repeticiones

  /** Estado completo en JSON plano: sirve para sincronizar online y para volver atrás (rollback). */
  snapshot() {
    return {
      stageId: this.stageId,
      frame: this.frame,
      fightFrames: this.fightFrames,
      phase: this.phase,
      finishTimer: this.finishTimer,
      winner: this.winner,
      nextProjectileId: this.nextProjectileId,
      nextCarId: this.nextCarId,
      nextCarFrame: this.nextCarFrame,
      cars: this.cars.map((c) => ({ ...c })),
      fighters: this.fighters.map((f) => f.snapshot()),
      projectiles: this.projectiles.map((p) => ({ ...p })),
    };
  }

  restore(s) {
    this.frame = s.frame;
    this.fightFrames = s.fightFrames;
    this.phase = s.phase;
    this.finishTimer = s.finishTimer;
    this.winner = s.winner;
    this.nextProjectileId = s.nextProjectileId;
    this.nextCarId = s.nextCarId;
    this.nextCarFrame = s.nextCarFrame;
    this.cars = s.cars.map((c) => ({ ...c }));
    s.fighters.forEach((fs, i) => this.fighters[i].restore(fs));
    this.projectiles = s.projectiles.map((p) => ({ ...p }));
    this.events = [];
  }
}