import { GAME_CONFIG } from '../config.js';
import { IN, has } from './input.js';

const { physics: P, moves: MOVES, characters: CHARACTERS, physicsStep: DT, shotCooldown: SHOT_COOLDOWN, match: M } = GAME_CONFIG;
const EPS = 1e-4;

/**
 * Un peleador: estado + física + máquina de estados de acciones. No sabe nada de Three.js ni del DOM.
 *
 * state: 'idle' | 'run' | 'air' | 'attack' | 'hitstun' | 'swordSlashRise' | 'swordSlashFall' | 'blockForm' | 'stanceSwitch' | 'ko' | 'dead'
 */
export class Fighter {
  constructor(index, characterId, stocks) {
    this.index = index;
    this.characterId = characterId;
    this.spec = CHARACTERS[characterId];
    this.stocks = stocks;
    this.percent = 0;
    this.x = 0;
    this.y = 0;
    this.prevX = 0;
    this.prevY = 0;
    this.vx = 0;
    this.vy = 0;
    this.facing = 1;
    this.grounded = false;
    this.standingOn = null; // 'solid' | 'oneway' | null
    
    // --- Kirby mechanics: múltiples saltos ---
    this.maxJumps = this.spec.maxJumps ?? 2;
    this.jumpsLeft = this.maxJumps;
    this.jumpHeightMult = this.spec.jumpHeightMultiplier ?? 1.0;
    
    this.upSpecialUsed = false;
    this.fastFall = false;
    this.airFrames = 0;
    this.jumpHeld = false;
    this.state = 'air';
    this.hitstun = 0;
    this.hitlag = 0;
    this.invuln = 0;
    this.dropT = 0;
    this.shotCd = 0;
    this.hazardCd = 0; // inmunidad breve tras choque con hazard del escenario (autos)
    this.koTimer = 0;
    this.attack = null; // { id, frame, hit: [índices ya golpeados] }
    this.prevMask = 0;
    this.buf = { jump: 0, attack: 0, special: 0 };

    // --- Stance system (PabloQuemandoRuedas) ---
    this.stance = this.spec.stance ?? 'normal';
    this.stanceSwitchCd = 0;
    this.stanceData = this.getStanceData();
    
    // --- Sword Slash state ---
    this.swordSlashPhase = null; // 'rise' | 'fall' | null
    this.swordSlashPeakY = 0;
    this.swordSlashHitLanded = false;
    
    // --- Block Form state ---
    this.blockFormTimer = 0;
    this.blockFormActive = false;
    this.blockFormHitLanded = false;
  }

  // ============================================================ STANCE HELPERS

  getStanceData() {
    if (!this.spec.stances) return null;
    return this.spec.stances[this.stance] ?? this.spec.stances.normal ?? {};
  }

  /**
   * Datos de un especial de personaje ('swordSlash' | 'blockForm'): lo definido en `moves` (única fuente de verdad)
   * y, si la spec del personaje lo pisa, eso gana. Falla fuerte si falta un valor que se usa.
   */
  special(kind) {
    const ref = this.spec[kind];
    const move = MOVES[ref.moveId];
    if (!move) throw new Error(`Falta el move "${ref.moveId}" en config.moves`);
    return { ...move, ...ref };
  }

  getCurrentMoves() {
    const stanceData = this.getStanceData();
    return stanceData?.moves ?? {};
  }

  getMoveId(inputMove) {
    const moves = this.getCurrentMoves();
    return moves[inputMove] ?? (MOVES[inputMove] ? inputMove : 'jab');
  }

  /**
   * Valor base × multiplicador del stance actual. La base sale de la spec del personaje y, si el personaje
   * no la define (fallSpeed, fastFallSpeed), de `physics`. Si falta de verdad, falla fuerte en vez de tapar el error.
   */
  getEffectiveStat(baseStat, multKey) {
    const baseVal = this.spec[baseStat] ?? P[baseStat];
    if (!Number.isFinite(baseVal)) throw new Error(`Falta el valor base "${baseStat}" para ${this.characterId}`);
    const mult = this.getStanceData()?.[multKey] ?? 1.0;
    return baseVal * mult;
  }

  get width() {
    return this.getEffectiveStat('width', 'widthMult');
  }
  get height() {
    return this.getEffectiveStat('height', 'heightMult');
  }
  get weight() {
    return this.getEffectiveStat('weight', 'weightMult');
  }
  get power() {
    return this.getEffectiveStat('power', 'powerMult');
  }
  get runSpeed() {
    return this.getEffectiveStat('runSpeed', 'speedMult');
  }
  get airSpeed() {
    return this.getEffectiveStat('airSpeed', 'airSpeedMult');
  }
  get jumpSpeed() {
    return this.getEffectiveStat('jumpSpeed', 'jumpMult');
  }
  get doubleJumpSpeed() {
    return this.getEffectiveStat('doubleJumpSpeed', 'jumpMult');
  }
  get fallSpeed() {
    return this.getEffectiveStat('fallSpeed', 'fallMult');
  }
  get fastFallSpeed() {
    return this.getEffectiveStat('fastFallSpeed', 'fallMult');
  }
  get alive() {
    return this.state !== 'ko' && this.state !== 'dead';
  }

  // ============================================================ CORE

  place(x, y) {
    this.x = this.prevX = x;
    this.y = this.prevY = y;
    this.vx = this.vy = 0;
  }

  /** Caja donde te pueden pegar. */
  hurtbox() {
    const hw = this.width / 2;
    return { l: this.x - hw, r: this.x + hw, b: this.y, t: this.y + this.height };
  }

  /** Caja de golpe activa en este cuadro (o null). Coordenadas del mundo. */
  hitbox() {
    const a = this.attack;
    if (!a || this.hitlag > 0) return null;
    const m = MOVES[a.id];
    if (!m.box || a.frame < m.startup || a.frame >= m.startup + m.active) return null;
    const cx = this.x + this.facing * m.box.x;
    const cy = this.y + m.box.y;
    return { l: cx - m.box.w / 2, r: cx + m.box.w / 2, b: cy - m.box.h / 2, t: cy + m.box.h / 2 };
  }

  // ============================================================ PASO DE SIMULACIÓN

  step(mask, stage, ctx) {
    this.prevX = this.x;
    this.prevY = this.y;

    // Botones apretados recién (flancos), con buffer
    const pressed = mask & ~this.prevMask;
    this.prevMask = mask;
    if (pressed & IN.JUMP) this.buf.jump = P.bufferFrames;
    if (pressed & IN.ATTACK) this.buf.attack = P.bufferFrames;
    if (pressed & IN.SPECIAL) this.buf.special = P.bufferFrames;
    const jumpHeld = has(mask, IN.JUMP);

    if (this.state === 'dead') return;
    if (this.state === 'ko') return this.stepKo(stage, ctx);

    if (this.hitlag > 0) {
      this.hitlag--;
      this.tickBuffers();
      return;
    }
    if (this.invuln > 0) this.invuln--;
    if (this.dropT > 0) this.dropT--;
    if (this.shotCd > 0) this.shotCd--;
    if (this.hazardCd > 0) this.hazardCd--;
    if (this.stanceSwitchCd > 0) this.stanceSwitchCd--;

    const x = (has(mask, IN.RIGHT) ? 1 : 0) - (has(mask, IN.LEFT) ? 1 : 0);
    const up = has(mask, IN.UP);
    const down = has(mask, IN.DOWN);

    if (this.hitstun > 0) {
      this.hitstun--;
      this.attack = null;
      this.swordSlashPhase = null;
      if (this.hitstun === 0) this.state = this.grounded ? 'idle' : 'air';
    } else {
      // Estado especial: Sword Slash
      if (this.swordSlashPhase) {
        this.stepSwordSlash(x, up, down, pressed, jumpHeld, ctx);
      }
      // Estado especial: Block Form
      else if (this.blockFormActive) {
        this.stepBlockForm(x, up, down, pressed, jumpHeld, ctx);
      }
      // Estado especial: Stance Switch
      else if (this.state === 'stanceSwitch') {
        this.stepStanceSwitch(ctx);
      }
      // Estado normal
      else {
        this.act(x, up, down, pressed, jumpHeld, ctx);
      }
    }

    this.integrate(x, down, stage, ctx);
    this.jumpHeld = jumpHeld;
    this.tickBuffers();
  }

  tickBuffers() {
    for (const k in this.buf) if (this.buf[k] > 0) this.buf[k]--;
  }

  // ============================================================ ACT (estado normal)

  act(x, up, down, pressed, jumpHeld, ctx) {
    const a = this.attack;
    if (a && !MOVES[a.id]) {
      console.error(`[Fighter ${this.index}] Move inválido en attack: "${a.id}"`);
      this.attack = null;
    }
    const attackDone = !a || a.frame >= MOVES[a.id].startup + MOVES[a.id].active;

    // ---- avanzar ataque actual
    if (a) {
      const m = MOVES[a.id];
      if (!m) { this.attack = null; return; }
      if (a.frame === m.startup) {
        if (m.projectile) ctx.spawnProjectile(this, a.id);
        if (m.boost) {
          this.vy = P.upSpecialSpeed;
          this.vx = x * 4;
          this.upSpecialUsed = true;
          ctx.events.push({ type: 'boost', i: this.index, x: this.x, y: this.y });
        }
        if (m.lunge) this.vx = this.facing * m.lunge;
      }
      a.frame++;
      if (a.frame >= m.startup + m.active + m.recovery) {
        this.attack = null;
        this.state = this.grounded ? 'idle' : 'air';
      }
    }

    // ---- saltar (cancela recovery de ataque)
    if (this.buf.jump > 0 && (!this.attack || attackDone)) {
      if (this.grounded) {
        this.jump(this.jumpSpeed, ctx);
      } else if (this.jumpsLeft > 0) {
        this.jumpsLeft--;
        this.jump(this.doubleJumpSpeed * Math.pow(this.jumpHeightMult, this.maxJumps - this.jumpsLeft), ctx, true);
      }
    }

    // ---- empezar ataque nuevo
    if (!this.attack) {
      if (this.buf.attack > 0) {
        this.buf.attack = 0;
        let id = 'jab';
        if (up) id = 'up';
        else if (down) id = 'down';
        else if (x !== 0) {
          this.facing = x;
          id = 'side';
        }
        // Flaco tiene airDash como ataque aéreo neutral
        if (!this.grounded && this.stance === 'flaco' && x !== 0 && !up && !down) {
          id = 'airDash';
        }
        this.startAttack(this.getMoveId(id), ctx);
      } else if (this.buf.special > 0) {
        const neutral = !up && !down && x === 0;
        if (neutral && this.spec.stances) {
          // Stance Switch: especial neutro de los personajes con stances (Pablo). El proyectil sale con ← / →.
          if (this.stanceSwitchCd === 0) {
            this.startStanceSwitch(ctx);
            this.buf.special = 0;
          }
        } else if (up) {
          if (this.spec.swordSlash && !this.upSpecialUsed) {
            // Sword Slash: ↑ + Especial (reemplaza el upSpecial genérico)
            this.buf.special = 0;
            this.startSwordSlash(ctx);
          } else if (!this.spec.swordSlash && !this.upSpecialUsed && MOVES.upSpecial) {
            this.buf.special = 0;
            this.startAttack('upSpecial', ctx);
          }
        } else if (down && this.spec.blockForm) {
          // Block Form: ↓ + Especial
          this.buf.special = 0;
          this.startBlockForm(ctx);
        } else if (this.shotCd === 0) {
          // Proyectil: especial neutro (sin stances), o con ← / → (Pablo)
          this.buf.special = 0;
          this.shotCd = SHOT_COOLDOWN;
          if (x !== 0) this.facing = x;
          this.startAttack(this.getMoveId('shot'), ctx);
        }
      }
    }

    // ---- salto corto
    if (!jumpHeld && this.airFrames > 0 && this.airFrames <= P.jumpCutWindow && this.vy > P.jumpCutSpeed) this.vy = P.jumpCutSpeed;
    if (this.airFrames > 0) this.airFrames++;
  }

  startAttack(id, ctx) {
    if (!MOVES[id]) {
      console.error(`[Fighter ${this.index}] Move "${id}" no existe en MOVES. Stance: ${this.stance}`);
      id = 'jab';
    }
    this.attack = { id, frame: 0, hit: [] };
    this.state = 'attack';
    ctx.events.push({ type: 'attack', i: this.index, move: id, x: this.x, y: this.y });
  }

  jump(speed, ctx, double = false) {
    this.buf.jump = 0;
    this.vy = speed;
    this.grounded = false;
    this.standingOn = null;
    this.airFrames = 1;
    this.fastFall = false;
    if (this.attack) this.attack = null;
    this.swordSlashPhase = null;
    this.blockFormActive = false;
    // upSpecialUsed SOLO se resetea al tocar suelo (en land()), no en cada salto
    this.state = 'air';
    ctx.events.push({ type: 'jump', i: this.index, double, x: this.x, y: this.y });
  }

  // ============================================================ SWORD SLASH (Final Cutter)

  startSwordSlash(ctx) {
    const ss = this.special('swordSlash');
    this.attack = { id: ss.moveId, frame: 0, hit: [] };
    this.swordSlashPhase = 'rise';
    this.swordSlashPeakY = this.y + ss.maxHeight;
    this.swordSlashHitLanded = false;
    this.vy = ss.launchSpeed;
    this.vx = 0;
    this.grounded = false;
    this.standingOn = null;
    this.upSpecialUsed = true;
    this.state = 'swordSlashRise';
    ctx.events.push({ type: 'swordSlashStart', i: this.index, x: this.x, y: this.y });
  }

  stepSwordSlash(x, up, down, pressed, jumpHeld, ctx) {
    const ss = this.special('swordSlash');
    const move = MOVES[ss.moveId];
    const a = this.attack;

    if (this.swordSlashPhase === 'rise') {
      // Subiendo
      if (this.vy <= 0 || this.y >= this.swordSlashPeakY) {
        // Llegó al peak, empieza a caer
        this.swordSlashPhase = 'fall';
        this.vy = -Math.min(ss.fallSpeed, Math.abs(this.vy));
        this.state = 'swordSlashFall';
      }
      // Avanzar frame de ataque (hitbox en subida)
      if (a) {
        a.frame++;
        if (a.frame >= move.startup + move.active) {
          // Hitbox de subida terminó
        }
      }
    } else if (this.swordSlashPhase === 'fall') {
      // Cayendo rápido
      this.vy = -ss.fallSpeed;
      
      // Control horizontal leve durante la caída
      if (x !== 0) {
        this.facing = x;
        this.vx = approach(this.vx, x * this.airSpeed * 0.3, P.airAccel * DT);
      } else {
        this.vx *= 0.95;
      }

      // Cancel into Block Form con ↓ + Especial
      if (down && (pressed & IN.SPECIAL) && ss.canCancelIntoBlock) {
        this.startBlockForm(ctx);
        return;
      }

      // Detectar aterrizaje para hitbox de suelo
      if (this.grounded && !this.swordSlashHitLanded) {
        this.swordSlashHitLanded = true;
        this.createLandingHitbox(ctx, ss);
        this.swordSlashPhase = null;
        this.attack = null;
        this.state = 'idle';
        // Pequeño bounce
        this.vy = 4;
      }
    }
  }

  createLandingHitbox(ctx, ss) {
    // Hitbox circular en el suelo al aterrizar
    ctx.events.push({ 
      type: 'swordSlashLand', 
      i: this.index, 
      x: this.x, 
      y: this.y,
      damage: ss.landDamage,
      base: ss.landBase,
      growth: ss.landGrowth,
      angle: ss.landAngle,
      radius: ss.landRadius
    });
  }

  // ============================================================ BLOCK FORM (Stone)

  startBlockForm(ctx) {
    const bf = this.special('blockForm');
    this.blockFormActive = true;
    this.blockFormTimer = bf.maxDuration;
    this.blockFormHitLanded = false;
    this.vx = 0;
    this.vy = 0;
    this.fastFall = true;
    this.state = 'blockForm';
    this.attack = { id: bf.moveId, frame: 0, hit: [] };
    ctx.events.push({ type: 'blockFormStart', i: this.index, x: this.x, y: this.y });
  }

  stepBlockForm(x, up, down, pressed, jumpHeld, ctx) {
    const bf = this.special('blockForm');

    this.blockFormTimer--;

    // Caída ultra rápida
    this.vy = -bf.fallMultiplier * P.fallSpeed;

    // No control horizontal, pero se puede mover levemente
    if (x !== 0) {
      this.vx = approach(this.vx, x * this.airSpeed * 0.15, P.airAccel * DT * 0.3);
    }

    // Cancelar: soltar especial o saltar o tiempo agotado
    const specialHeld = has(this.prevMask, IN.SPECIAL);
    const jumpPressed = (pressed & IN.JUMP) || this.buf.jump > 0;
    
    if (!specialHeld || jumpPressed || this.blockFormTimer <= 0) {
      this.endBlockForm(ctx);
      if (jumpPressed && this.jumpsLeft > 0) {
        this.jumpsLeft--;
        this.jump(this.doubleJumpSpeed, ctx, true);
      }
      return;
    }

    // Detectar aterrizaje para shockwave
    if (this.grounded && !this.blockFormHitLanded) {
      this.blockFormHitLanded = true;
      this.createBlockFormShockwave(ctx, bf);
    }
  }

  endBlockForm(ctx) {
    const bf = this.special('blockForm');
    this.blockFormActive = false;
    this.fastFall = false;
    this.attack = null;
    this.state = this.grounded ? 'idle' : 'air';
    ctx.events.push({ type: 'blockFormEnd', i: this.index, x: this.x, y: this.y });
    // End lag
    this.hitstun = bf.endLag;
  }

  createBlockFormShockwave(ctx, bf) {
    ctx.events.push({ 
      type: 'blockFormLand', 
      i: this.index, 
      x: this.x, 
      y: this.y,
      damage: bf.landDamage,
      base: bf.landBase,
      growth: bf.landGrowth,
      angle: bf.landAngle,
      radius: bf.landRadius
    });
  }

  // ============================================================ STANCE SWITCH

  startStanceSwitch(ctx) {
    const stances = ['normal', 'gordo', 'flaco'];
    const currentIdx = stances.indexOf(this.stance);
    const nextIdx = (currentIdx + 1) % stances.length;
    this.stance = stances[nextIdx];
    this.stanceData = this.getStanceData();
    this.stanceSwitchCd = 60; // 1 segundo cooldown
    
    this.attack = { id: 'stanceSwitch', frame: 0, hit: [] };
    this.state = 'stanceSwitch';
    ctx.events.push({ type: 'stanceSwitch', i: this.index, stance: this.stance, x: this.x, y: this.y });
  }

  stepStanceSwitch(ctx) {
    const move = MOVES.stanceSwitch;
    const a = this.attack;
    a.frame++;
    if (a.frame >= move.startup + move.recovery) {
      this.attack = null;
      this.state = this.grounded ? 'idle' : 'air';
    }
  }

  // ============================================================ FÍSICA

  integrate(x, down, stage, ctx) {
    const stunned = this.hitstun > 0 || this.state === 'stanceSwitch';
    const attacking = !!this.attack && !this.swordSlashPhase && !this.blockFormActive;
    const inSpecialState = this.swordSlashPhase || this.blockFormActive;

    // ---- horizontal
    if (stunned) {
      const drag = P.knockbackDrag * DT;
      this.vx = Math.abs(this.vx) <= drag ? 0 : this.vx - Math.sign(this.vx) * drag;
    } else if (this.grounded && !inSpecialState) {
      if (attacking || x === 0) {
        const f = P.groundFriction * DT;
        this.vx = Math.abs(this.vx) <= f ? 0 : this.vx - Math.sign(this.vx) * f;
      } else {
        this.facing = x;
        this.vx = approach(this.vx, x * this.runSpeed, P.groundAccel * DT);
      }
    } else if (!this.grounded || inSpecialState) {
      const ctl = attacking ? P.airAttackControl : (inSpecialState ? 0.15 : 1);
      if (x !== 0 && !this.blockFormActive) {
        if (!attacking) this.facing = x;
        const target = x * this.airSpeed;
        if (Math.sign(this.vx) !== x || Math.abs(this.vx) < this.airSpeed) {
          this.vx = approach(this.vx, target, P.airAccel * ctl * DT);
        }
      } else {
        const f = P.airFriction * DT;
        this.vx = Math.abs(this.vx) <= f ? 0 : this.vx - Math.sign(this.vx) * f;
      }
    }

    // ---- vertical
    if (!this.grounded || this.vy > 0) {
      // Block form y sword slash fall manejan su propia gravedad
      if (!this.blockFormActive && this.swordSlashPhase !== 'fall') {
        this.vy -= P.gravity * DT;
        if (!stunned) {
          if (down && this.vy <= 0 && !this.grounded && !attacking && !inSpecialState) this.fastFall = true;
          const limit = this.fastFall ? this.fastFallSpeed : this.fallSpeed;
          if (this.vy < -limit) this.vy = -limit;
        }
      }
    } else {
      this.vy = -1;
    }

    // Bajada de plataforma
    if (this.grounded && this.standingOn === 'oneway' && down && !stunned && !attacking && !inSpecialState) {
      this.dropT = P.dropThroughFrames;
      this.grounded = false;
      this.standingOn = null;
      this.y -= 0.06;
    }

    this.collide(stage, ctx);

    // ---- estado visible
    if (!this.attack && this.hitstun === 0 && !this.swordSlashPhase && !this.blockFormActive && this.state !== 'stanceSwitch') {
      this.state = this.grounded ? (Math.abs(this.vx) > 0.5 ? 'run' : 'idle') : 'air';
    }
  }

  collide(stage, ctx) {
    const hw = this.width / 2;
    const h = this.height;

    // X: bloques macizos frenan el costado
    this.x += this.vx * DT;
    for (const s of stage.solids) {
      if (this.y < s.top - EPS && this.y + h > s.bottom + EPS && this.x + hw > s.l && this.x - hw < s.r) {
        const fromLeft = this.vx > 0 || (this.vx === 0 && this.x < (s.l + s.r) / 2);
        this.x = fromLeft ? s.l - hw : s.r + hw;
        this.vx = 0;
      }
    }

    // Y: aterrizar sobre macizos y plataformas finas; golpearse la cabeza
    const prevBottom = this.y;
    this.y += this.vy * DT;
    const wasGrounded = this.grounded;
    this.grounded = false;
    this.standingOn = null;
    
    for (const s of stage.solids) {
      if (this.x + hw > s.l && this.x - hw < s.r) {
        if (this.vy <= 0 && prevBottom >= s.top - EPS && this.y <= s.top) {
          this.land(s.top, 'solid');
        } else if (this.vy > 0 && prevBottom + h <= s.bottom + EPS && this.y + h > s.bottom) {
          this.y = s.bottom - h;
          this.vy = 0;
        }
      }
    }
    if (!this.grounded && this.dropT === 0) {
      for (const o of stage.oneWays) {
        if (this.vy <= 0 && this.x + hw > o.l && this.x - hw < o.r && prevBottom >= o.top - EPS && this.y <= o.top) {
          this.land(o.top, 'oneway');
          break;
        }
      }
    }
    if (this.grounded && !wasGrounded) {
      ctx.events.push({ type: 'land', i: this.index, x: this.x, y: this.y, speed: Math.abs(this.vy) });
      // Reset jumps on land
      this.jumpsLeft = this.maxJumps - 1;
      this.upSpecialUsed = false;
    }
  }

  land(top, kind) {
    this.y = top;
    this.vy = 0;
    this.grounded = true;
    this.standingOn = kind;
    this.jumpsLeft = this.maxJumps - 1;
    this.upSpecialUsed = false;
    this.fastFall = false;
    this.airFrames = 0;
    if (this.hitstun > 0 && this.vx !== 0) this.vx *= 0.6;
  }

  // ============================================================ VIDAS

  knockOut() {
    this.stocks--;
    this.percent = 0;
    this.attack = null;
    this.swordSlashPhase = null;
    this.blockFormActive = false;
    this.hitstun = this.hitlag = this.invuln = 0;
    this.vx = this.vy = 0;
    this.state = this.stocks > 0 ? 'ko' : 'dead';
    this.koTimer = M.respawnDelay;
  }

  stepKo(stage, ctx) {
    if (--this.koTimer > 0) return;
    const r = stage.respawn;
    this.place(r.x + (this.index - 1.5) * 1.2, r.y);
    this.state = 'air';
    this.grounded = false;
    this.facing = this.x < 0 ? 1 : -1;
    this.jumpsLeft = this.maxJumps - 1;
    this.upSpecialUsed = false;
    this.fastFall = false;
    this.airFrames = 0;
    this.invuln = M.respawnInvuln;
    this.stance = 'normal';
    this.stanceData = this.getStanceData();
    ctx.events.push({ type: 'respawn', i: this.index, x: this.x, y: this.y });
  }

  // ============================================================ ARMOR (Gordo stance)

  /** Called by Match.applyHit antes de aplicar knockback. Returns true si el hit se ignora por armadura. */
  tryArmor(damage, attacker) {
    if (this.blockFormActive) {
      this.hitlag = Math.min(2, this.hitlag);
      return true; // Block Form: superarmor contra todo
    }
    const stanceData = this.getStanceData();
    if (!stanceData) return false;
    if (stanceData.armorFrames && damage < (stanceData.armorThreshold ?? 999)) {
      // Armadura: no hitstun, no knockback, solo hitlag reducido
      this.hitlag = Math.min(2, this.hitlag);
      this.invuln = Math.max(this.invuln, 4);
      return true;
    }
    return false;
  }

  // ============================================================ SNAPSHOT / RESTORE

  snapshot() {
    const base = {
      index: this.index, characterId: this.characterId, stocks: this.stocks, percent: this.percent,
      x: this.x, y: this.y, vx: this.vx, vy: this.vy, facing: this.facing,
      grounded: this.grounded, standingOn: this.standingOn, jumpsLeft: this.jumpsLeft,
      upSpecialUsed: this.upSpecialUsed, fastFall: this.fastFall, airFrames: this.airFrames,
      jumpHeld: this.jumpHeld, state: this.state, hitstun: this.hitstun, hitlag: this.hitlag,
      invuln: this.invuln, dropT: this.dropT, shotCd: this.shotCd, hazardCd: this.hazardCd, koTimer: this.koTimer,
      prevMask: this.prevMask,
      attack: this.attack ? { id: this.attack.id, frame: this.attack.frame, hit: [...this.attack.hit] } : null,
      buf: { ...this.buf },
      // Stance
      stance: this.stance, stanceSwitchCd: this.stanceSwitchCd,
      // Sword slash
      swordSlashPhase: this.swordSlashPhase, swordSlashPeakY: this.swordSlashPeakY, swordSlashHitLanded: this.swordSlashHitLanded,
      // Block form
      blockFormActive: this.blockFormActive, blockFormTimer: this.blockFormTimer, blockFormHitLanded: this.blockFormHitLanded,
    };
    return base;
  }

  restore(s) {
    Object.assign(this, s);
    this.prevX = s.x;
    this.prevY = s.y;
    this.spec = CHARACTERS[s.characterId];
    this.stanceData = this.getStanceData();
    this.attack = s.attack ? { id: s.attack.id, frame: s.attack.frame, hit: [...s.attack.hit] } : null;
    this.buf = { ...s.buf };
  }
}

function approach(v, target, delta) {
  if (v < target) return Math.min(v + delta, target);
  if (v > target) return Math.max(v - delta, target);
  return v;
}