import { GAME_CONFIG } from '../config.js';
import { IN } from './input.js';

/** Generador pseudoaleatorio con semilla (mulberry32): la CPU decide igual con la misma semilla. */
export function makeRng(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Piloto de la computadora: lee el estado de la partida y devuelve una MÁSCARA DE ENTRADA, igual que
 * un teclado. No hace trampa: usa los mismos movimientos y reglas que un jugador (como en Vita Machines).
 * Vive fuera de la simulación: online solo corre en el anfitrión y lo que se manda por red son sus entradas.
 */
export class AIController {
  constructor(index, difficulty = 'normal', seed = 1) {
    this.index = index;
    this.cfg = GAME_CONFIG.ai.difficulties[difficulty] ?? GAME_CONFIG.ai.difficulties.normal;
    this.rng = makeRng(seed * 7919 + index * 104729);
    this.think = 0; // cuadros hasta la próxima decisión de ataque
    this.hold = 0; // cuadros que mantiene apretado el botón de acción actual
    this.action = 0; // botones de acción (saltar / atacar / especial) que está apretando
    this.rest = 0; // cuadros sin apretar entre dos acciones (para que cuente como un botón nuevo)
    this.stuck = 0;
  }

  decide(match) {
    const me = match.fighters[this.index];
    if (!me || !me.alive || match.phase !== 'fighting') return 0;
    const st = match.stage;
    const main = st.solids[0];

    // Un botón de acción se mantiene un par de cuadros y se suelta un rato: así el juego lo cuenta como "apretó"
    if (this.hold > 0) {
      this.hold--;
      if (this.hold === 0) this.rest = 3;
    }
    if (this.rest > 0) this.rest--;
    const press = (bits) => {
      if (this.hold > 0 || this.rest > 0) return;
      this.action = bits;
      this.hold = 2;
    };
    if (this.hold === 0) this.action = 0;

    let mask = 0;
    const move = (dir) => {
      mask |= dir > 0 ? IN.RIGHT : IN.LEFT;
    };

    // ---- recuperación: si estoy afuera o por caer del escenario, vuelvo
    const edgeMargin = 0.4;
    const outsideX = me.x < main.l - edgeMargin || me.x > main.r + edgeMargin;
    const lowY = me.y < main.top - 0.8;
    if (!me.grounded && (outsideX || lowY) && this.rng() < this.cfg.recovery + 0.05) {
      const center = (main.l + main.r) / 2;
      move(center - me.x);
      if (me.vy <= 1 && me.y < main.top + 1) {
        if (me.jumpsLeft > 0) press(IN.JUMP);
        else if (!me.upSpecialUsed && me.y < main.top - 0.5) {
          mask |= IN.UP;
          press(IN.SPECIAL);
        }
      }
      return mask | this.action;
    }

    // ---- elegir objetivo: el enemigo vivo más cercano
    let target = null;
    let best = Infinity;
    for (const f of match.fighters) {
      if (f === me || !f.alive) continue;
      const d = Math.abs(f.x - me.x) + Math.abs(f.y - me.y) * 0.6;
      if (d < best) {
        best = d;
        target = f;
      }
    }
    if (!target) return 0;

    const dx = target.x - me.x;
    const dy = target.y - me.y;
    const dist = Math.abs(dx);
    const dir = Math.sign(dx) || me.facing;

    // ---- acercarse (o quedarse a distancia de golpe)
    if (dist > 1.5) move(dir);
    else if (dist < 0.7 && this.rng() < 0.4) move(-dir);

    // ---- subir o bajar de plataforma
    if (dy > 2.2 && me.grounded) press(IN.JUMP);
    else if (dy > 2.2 && !me.grounded && me.jumpsLeft > 0 && me.vy < 0 && this.rng() < 0.08) press(IN.JUMP);
    if (dy < -2.2 && me.grounded && me.standingOn === 'oneway') mask |= IN.DOWN;

    // ---- atacar
    if (this.think > 0) this.think--;
    if (this.think === 0 && !me.attack && me.hitstun === 0) {
      const inReach = dist < 1.9 && Math.abs(dy) < 2.2;
      if (inReach && this.rng() < this.cfg.aggression) {
        if (dy > 1.2) mask |= IN.UP;
        else if (dy < -1 && me.grounded) mask |= IN.DOWN;
        else if (this.rng() < 0.55) mask |= dir > 0 ? IN.RIGHT : IN.LEFT; // golpe lateral (fuerte)
        press(IN.ATTACK);
        this.think = this.cfg.reaction + Math.floor(this.rng() * this.cfg.reaction);
      } else if (dist > 5 && dist < 14 && Math.abs(dy) < 2 && me.facing === dir && me.shotCd === 0 && this.rng() < this.cfg.shotChance * 10) {
        if (me.spec.stances) mask |= dir > 0 ? IN.RIGHT : IN.LEFT; // con stances, el especial neutro cambia de stance: el proyectil sale con ← / →
        else mask &= ~(IN.LEFT | IN.RIGHT); // sin stances: especial NEUTRO de verdad (sin la marcha encima)
        press(IN.SPECIAL);
        // Bonus Fruit (Pac-Man): mantiene el especial un buen rato para cargar la fruta antes de tirarla
        const spNeutral = GAME_CONFIG.moves[me.spec.specials?.neutral];
        if (this.hold > 0 && spNeutral?.fruitCharge) this.hold = 45;
        this.think = this.cfg.reaction;
      } else if (dist > 4 && dist < 9 && Math.abs(dy) < 1.5 && me.grounded && me.shotCd === 0
        && GAME_CONFIG.moves[me.spec.specials?.down]?.hydrant && this.rng() < 0.15) {
        // Fire Hydrant (Pac-Man): planta la manguera a rango medio (↓ + especial)
        mask |= IN.DOWN;
        press(IN.SPECIAL);
        this.think = this.cfg.reaction;
      } else {
        this.think = Math.max(2, Math.floor(this.cfg.reaction / 3));
      }
    }

    // ---- no quedarse trabado contra una pared o en el mismo lugar
    if (me.grounded && Math.abs(me.vx) < 0.1 && mask & (IN.LEFT | IN.RIGHT) && !me.attack) {
      if (++this.stuck > 40) {
        press(IN.JUMP);
        this.stuck = 0;
      }
    } else this.stuck = 0;

    return mask | this.action;
  }
}
