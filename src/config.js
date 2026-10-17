/**
 * GAME_CONFIG: todos los valores ajustables del juego, en un solo lugar (igual que en Vita Machines).
 * Unidades: metros y segundos. El eje Y apunta hacia arriba. La simulación corre a `physicsStep` fijo.
 *
 * Este archivo NO importa nada del navegador ni de Three.js: la simulación (src/sim/) lo usa tal cual
 * y por eso también corre en Node (tests, y más adelante el anfitrión del online).
 */

export const GAME_CONFIG = {
  /** Paso fijo de la simulación (60 Hz). Todo lo que pasa en el juego ocurre en múltiplos de este paso. */
  physicsStep: 1 / 60,

  // ------------------------------------------------------------------ partida
  match: {
    stocks: 3, // vidas por jugador
    countdownFrames: 180, // 3-2-1 antes de empezar
    respawnDelay: 80, // cuadros entre que te sacan y reaparecés
    respawnInvuln: 130, // cuadros de invulnerabilidad al reaparecer
    finishFrames: 150, // cuadros de festejo antes de habilitar la revancha
    timeLimitSeconds: 0, // 0 = sin límite de tiempo
  },

  // ------------------------------------------------------------------ física base
  physics: {
    gravity: 38,
    fallSpeed: 17, // velocidad máxima de caída
    fastFallSpeed: 27, // caída rápida (abajo mientras caés)
    groundAccel: 70,
    groundFriction: 55,
    airAccel: 26,
    airFriction: 3.5, // frena la velocidad horizontal en el aire si no tocás nada
    jumpCutSpeed: 7, // soltar el salto temprano limita la subida a esta velocidad
    jumpCutWindow: 9, // cuadros durante los que soltar el salto lo recorta (salto corto)
    bufferFrames: 5, // un botón apretado un poco antes de poder usarlo se guarda este tiempo
    dropThroughFrames: 14, // cuadros en que atravesás una plataforma al bajar
    airAttackControl: 0.45, // control en el aire mientras atacás (1 = total)
    knockbackDrag: 5, // frena el empuje horizontal mientras estás en hitstun
    hitstunBase: 8, // cuadros de hitstun = base + knockback * perKb
    hitstunPerKb: 1.4,
    hitlagBase: 3, // cuadros de congelamiento al golpear = base + daño * perDamage
    hitlagPerDamage: 0.35,
    hitlagMax: 12,
    upSpecialSpeed: 17, // impulso hacia arriba del especial de recuperación (una vez por salto)
  },

  // ------------------------------------------------------------------ movimientos
  // Cuadros: startup (antes de pegar) + active (pega) + recovery (después). Las cajas son relativas al
  // personaje: x = distancia hacia adelante, y = altura desde los pies. Ángulo en grados (0 = adelante,
  // 90 = arriba). Knockback = (base + growth × porcentaje/100) × (100 / peso) × poder del personaje.
  moves: {
    // --- Base moves (genéricos, usados por otros personajes) ---
    jab: { startup: 3, active: 3, recovery: 9, box: { x: 0.85, y: 0.95, w: 0.9, h: 0.6 }, damage: 3, base: 3.5, growth: 5, angle: 35 },
    side: { startup: 10, active: 4, recovery: 17, box: { x: 1.1, y: 0.95, w: 1.35, h: 0.8 }, damage: 11, base: 7, growth: 11.7, angle: 38, lunge: 3 },
    up: { startup: 7, active: 5, recovery: 15, box: { x: 0.2, y: 1.85, w: 1.1, h: 1.1 }, damage: 9, base: 7.5, growth: 30, angle: 88 },
    down: { startup: 6, active: 4, recovery: 13, box: { x: 0.95, y: 0.35, w: 1.5, h: 0.55 }, damage: 7, base: 5.5, growth: 12.6, angle: 28 },
    // Especial neutro: lanza un proyectil
    shot: { startup: 10, active: 0, recovery: 18, projectile: { speed: 15, life: 55, radius: 0.32, y: 1.05 }, damage: 5, base: 4.5, growth: 11, angle: 22 },
    // Especial hacia arriba: impulso de recuperación que además pega un poco
    upSpecial: { startup: 4, active: 12, recovery: 14, box: { x: 0.1, y: 1.1, w: 1.1, h: 1.9 }, damage: 6, base: 6, growth: 20, angle: 82, boost: true },

    // --- PabloQuemandoRuedas: Sword Slash (Final Cutter style) ---
    // ↑ + Especial: salta alto, cae rápido, pega al aterrizar
    swordSlash: { 
      startup: 6, 
      active: 3, 
      recovery: 8, 
      box: { x: 0.8, y: 1.6, w: 1.3, h: 0.9 }, 
      damage: 12, 
      base: 8, 
      growth: 16, 
      angle: 85,
      // Custom flags (leídos por Fighter.js)
      launchesUp: true,      // lanza hacia arriba al inicio
      launchSpeed: 18,       // velocidad vertical inicial
      maxHeight: 6,          // altura máx extra
      fallSpeed: 35,         // caída rápida
      landsWithHit: true,    // crea hitbox al tocar suelo
      landDamage: 18,        // daño del aterrizaje
      landBase: 10,
      landGrowth: 20,
      landAngle: 75,
      landRadius: 1.2,       // radio de la onda al aterrizar
      canCancelIntoBlock: true  // durante la caída puede activar blockForm
    },

    // --- PabloQuemandoRuedas: Block Form (Stone) ---
    // ↓ + Especial: se vuelve bloque/piedra, superarmor, cae rápido, shockwave al aterrizar
    blockForm: { 
      startup: 3, 
      active: 0, 
      recovery: 0,  // se mantiene hasta soltar botón o tiempo máx
      box: null,    // no pega al activar
      damage: 0,
      base: 0,
      growth: 0,
      angle: 0,
      // Custom
      isStance: true,        // es un stance, no un ataque
      maxDuration: 180,      // 3 segundos máx (frames)
      fallMultiplier: 3.5,   // cae rapidísimo
      landShockwave: true,   // onda al aterrizar
      landDamage: 22,
      landBase: 12,
      landGrowth: 22,
      landAngle: 80,
      landRadius: 2.5,
      endLag: 15             // frames de recovery al cancelar
    },

    // --- PabloQuemandoRuedas: Stance Switch ---
    // Especial neutro (sin dirección): cambia entre Gordo / Flaco / Normal
    stanceSwitch: { 
      startup: 12, 
      active: 0, 
      recovery: 8,
      box: null,
      damage: 0,
      base: 0,
      growth: 0,
      angle: 0,
      isStance: true
    },

    // --- GORDO: pesado, armadura, rango corto, mucho daño ---
    gordo_jab: { startup: 5, active: 3, recovery: 12, box: { x: 0.7, y: 1.0, w: 0.9, h: 0.7 }, damage: 8, base: 4, growth: 8, angle: 30 },
    gordo_side: { startup: 14, active: 5, recovery: 22, box: { x: 1.0, y: 1.0, w: 1.6, h: 1.0 }, damage: 18, base: 10, growth: 15, angle: 35, lunge: 2 },
    gordo_up: { startup: 10, active: 4, recovery: 18, box: { x: 0.2, y: 1.8, w: 1.2, h: 1.3 }, damage: 15, base: 9, growth: 35, angle: 85 },
    gordo_down: { startup: 8, active: 4, recovery: 15, box: { x: 0.8, y: 0.3, w: 1.8, h: 0.6 }, damage: 12, base: 7, growth: 14, angle: 25 },
    gordo_shot: { startup: 16, active: 0, recovery: 25, projectile: { speed: 10, life: 60, radius: 0.45, y: 1.2 }, damage: 14, base: 6, growth: 12, angle: 30 },

    // --- FLACO: rápido, rango largo, poco daño, combo-heavy ---
    flaco_jab: { startup: 2, active: 2, recovery: 6, box: { x: 1.2, y: 1.1, w: 1.0, h: 0.7 }, damage: 2, base: 1.5, growth: 3, angle: 40 },
    flaco_side: { startup: 7, active: 3, recovery: 12, box: { x: 1.5, y: 1.0, w: 1.8, h: 0.8 }, damage: 7, base: 4, growth: 8, angle: 38, lunge: 4 },
    flaco_up: { startup: 5, active: 3, recovery: 10, box: { x: 0.3, y: 2.0, w: 1.0, h: 1.4 }, damage: 6, base: 5, growth: 20, angle: 88 },
    flaco_down: { startup: 4, active: 3, recovery: 8, box: { x: 1.1, y: 0.3, w: 2.0, h: 0.5 }, damage: 4, base: 3, growth: 6, angle: 20 },
    flaco_shot: { startup: 8, active: 0, recovery: 14, projectile: { speed: 22, life: 40, radius: 0.25, y: 1.3 }, damage: 4, base: 2, growth: 5, angle: 15 },
    flaco_airDash: { startup: 3, active: 8, recovery: 10, box: { x: 0.5, y: 0.0, w: 2.5, h: 0.8 }, damage: 6, base: 3, growth: 6, angle: 0 }, // dash aéreo horizontal

    // ================================================================
    // ESPECIALES ESTILO SMASH (por personaje, para testear variables)
    // ================================================================

    // --- KENAI (Kirby): Inhale (especial neutro) ---
    // Succiona al rival hacia adentro y lo escupe con daño (como el Inhale de Kirby)
    inhale: {
      startup: 10, active: 14, recovery: 16,
      box: { x: 1.2, y: 1.0, w: 2.2, h: 1.4 },   // área de succión delante
      damage: 8, base: 6, growth: 12, angle: 45,
      vortex: true,          // atrae al rival durante active
      vortexPull: 0.35,      // fuerza de succión (arrastra hacia Kenai)
    },
    // --- KENAI (Kirby): Hammer (especial de costado) ---
    // Martillazo lento pero muy fuerte (el Hammer de Kirby)
    hammer: {
      startup: 18, active: 5, recovery: 24,
      box: { x: 1.3, y: 1.1, w: 1.7, h: 1.3 },
      damage: 20, base: 12, growth: 22, angle: 40, lunge: 2,
    },

    // --- COCO (Ike): Eruption (especial neutro) ---
    // Carga de espada de fuego que estalla delante (el Eruption de Ike)
    eruption: {
      startup: 16, active: 0, recovery: 22,
      projectile: { speed: 9, life: 30, radius: 0.5, y: 0.9, fire: true },
      damage: 14, base: 9, growth: 16, angle: 32,
      burst: true,           // estalla en llamas al impacto
      burstRadius: 1.6, burstDamage: 8, burstBase: 6, burstGrowth: 14, burstAngle: 60,
    },
    // --- COCO (Ike): Quick Draw (especial de costado) ---
    // Embestida rápida con la espada (el Quick Draw de Ike)
    quickDraw: {
      startup: 8, active: 4, recovery: 18,
      box: { x: 1.2, y: 1.0, w: 1.9, h: 1.1 },
      damage: 15, base: 9, growth: 15, angle: 36, lunge: 9,
    },
    // --- COCO (Ike): Counter (especial hacia abajo) ---
    // Postura de contraataque: reduce daño y devuelve el golpe (el Counter de Ike)
    counter: {
      startup: 3, active: 0, recovery: 0,
      box: null, damage: 0, base: 0, growth: 0, angle: 0,
      isStance: true, maxDuration: 40,
      counterMode: true,     // al recibir golpe: anula y contraataca ×1.2
      counterMult: 1.2, counterDamage: 12, counterBase: 8, counterAngle: 40,
      endLag: 14,
    },

    // --- DOMONO (Ness): PK Fire (especial neutro) ---
    // Proyectil que estalla en llamas al impacto (el PK Fire de Ness)
    pkFire: {
      startup: 11, active: 0, recovery: 20,
      projectile: { speed: 14, life: 40, radius: 0.34, y: 1.0, fire: true },
      damage: 6, base: 4, growth: 10, angle: 25,
      burst: true, burstRadius: 1.8, burstDamage: 9, burstBase: 5, burstGrowth: 13, burstAngle: 55,
      lingering: true, lingerFrames: 50, // la llama queda un rato en el suelo
    },
    // --- DOMONO (Ness): PK Thunder (especial de costado / proyectil eléctrico) ---
    // Esfera eléctrica que daña y puede golpearlo para lanzarlo (el PK Thunder de Ness)
    pkThunder: {
      startup: 12, active: 0, recovery: 22,
      projectile: { speed: 16, life: 50, radius: 0.4, y: 1.1, electric: true },
      damage: 10, base: 7, growth: 14, angle: 30,
    },
    // --- DOMONO (Ness): PK Thunder recovery (especial hacia arriba) ---
    // Impulso eléctrico hacia arriba que además pega (recuperación de Ness)
    pkThunderUp: {
      startup: 5, active: 12, recovery: 15,
      box: { x: 0.1, y: 1.2, w: 1.2, h: 1.9 },
      damage: 8, base: 6, growth: 18, angle: 80, boost: true, electric: true,
    },
    // --- DOMONO (Ness): PK Magnet (especial hacia abajo) ---
    // Campo de absorción: reduce daño recibido y cura un poco (el PK Magnet de Ness)
    pkMagnet: {
      startup: 3, active: 0, recovery: 0,
      box: null, damage: 0, base: 0, growth: 0, angle: 0,
      isStance: true, maxDuration: 70,
      magnetMode: true,      // absorbe: reduce daño ×0.4 y cura un poco por golpe
      absorbMult: 0.4, healPerHit: 4, endLag: 10,
    },

    // --- FAXO (Richter): Holy Water (especial neutro) ---
    // Agua bendita que deja llamas en el suelo (el Holy Water de Richter)
    holyWater: {
      startup: 12, active: 0, recovery: 20,
      projectile: { speed: 11, life: 35, radius: 0.36, y: 0.8, holy: true },
      damage: 5, base: 4, growth: 8, angle: 20,
      groundFlame: true,     // deja una llama azul en el suelo
      flameFrames: 70, flameDamage: 6, flameBase: 3, flameGrowth: 8, flameRadius: 0.9,
    },
    // --- FAXO (Richter): Uppercut Whip (especial hacia arriba) ---
    // Latigazo ascendente de recuperación (el Uppercut de Richter)
    uppercut: {
      startup: 6, active: 4, recovery: 16,
      box: { x: 0.5, y: 2.1, w: 1.4, h: 1.2 },
      damage: 9, base: 6, growth: 16, angle: 85,
      launchesUp: true, launchSpeed: 17, maxHeight: 5, fallSpeed: 20,
    },
    // --- FAXO (Richter): Vampire Killer Whip (especial de costado) ---
    // El látigo largo de Richter: alcance enorme hacia adelante
    whip: {
      startup: 12, active: 5, recovery: 20,
      box: { x: 2.2, y: 0.9, w: 2.6, h: 0.7 },   // alcance muy largo (el látigo)
      damage: 13, base: 8, growth: 13, angle: 35,
    },
    // --- FAXO (Richter): Axe (especial hacia abajo / proyectil en arco) ---
    // Hacha que vuela en arco (el Axe de Richter)
    axe: {
      startup: 11, active: 0, recovery: 19,
      projectile: { speed: 13, life: 60, radius: 0.4, y: 1.2, arc: true },
      damage: 11, base: 8, growth: 13, angle: 30,
      arcHeight: 4.5,        // altura del arco
    },

    // --- CHUBITCOIN (Pac-Man): Bonus Fruit (especial neutro) ---
    // Mantené el especial para cargar: el ciclo de frutas sube de tier
    // (cereza → fresa → naranja → manzana → melón → Galaxian → campana → llave).
    // Soltalo para tirar la fruta cargada: más tier = más daño.
    bonusFruit: {
      startup: 10, active: 0, recovery: 18,
      projectile: { speed: 14, life: 60, radius: 0.3, y: 1.1 },
      damage: 4, base: 4, growth: 8, angle: 30,
      fruitCharge: true,     // se carga manteniendo el especial y se lanza al soltar
      tiered: true,          // el tier cargado escala daño/repulsión (p tiers)
      fruitFrames: 12,       // cuadros por fruta del ciclo
    },
    // --- CHUBITCOIN (Pac-Man): Power Pellet (especial de costado) ---
    // Embestida con la cápsula amarilla comiendo todo (el Power Pellet)
    powerPellet: {
      startup: 10, active: 6, recovery: 20,
      box: { x: 1.3, y: 1.0, w: 2.2, h: 1.2 },
      damage: 13, base: 8, growth: 14, angle: 34, lunge: 11,
    },
    // --- CHUBITCOIN (Pac-Man): Pac-Jump (especial hacia arriba) ---
    // Impulso hacia arriba que deja un trampolín (recuperación de Pac-Man)
    pacJump: {
      startup: 4, active: 10, recovery: 16,
      box: { x: 0.1, y: 0.9, w: 1.2, h: 1.6 },
      damage: 6, base: 5, growth: 16, angle: 80, boost: true,
    },
    // --- CHUBITCOIN (Pac-Man): Fire Hydrant (especial hacia abajo) ---
    // Manguera que queda en el piso y dispara chorros de agua al rival
    fireHydrant: {
      startup: 14, active: 0, recovery: 26,
      projectile: { speed: 0, life: 480, radius: 0.45, y: 0.45 },
      damage: 7, base: 5, growth: 10, angle: 55,
      hydrant: { interval: 55, shot: 'waterShot' }, // chorros cada N frames
      burst: true, burstRadius: 1.5, burstDamage: 6, burstBase: 5, burstGrowth: 12, burstAngle: 60,
      water: true,
    },
    // --- CHUBITCOIN (Pac-Man): chorro de agua de la Fire Hydrant ---
    waterShot: {
      startup: 0, active: 0, recovery: 0,
      projectile: { speed: 16, life: 55, radius: 0.2, y: 0, water: true },
      damage: 4, base: 3, growth: 6, angle: 25,
    },
  },
  shotCooldown: 24, // cuadros antes de poder lanzar otro proyectil

  // ------------------------------------------------------------------ personajes
  // peso: más alto = vuela menos · power: multiplica daño y knockback de sus golpes.
  characters: {
    // === COCO = IKE (espada pesada, fuerte y lento) ===
    coco: {
      name: 'El Coco', color: '#4d8bff',
      weight: 118, power: 1.25, runSpeed: 6.6, airSpeed: 5.4, jumpSpeed: 12.6, doubleJumpSpeed: 11.6,
      width: 0.85, height: 1.85,
      // Especiales estilo Ike
      specials: {
        neutral: 'eruption',   // Eruption (carga de fuego)
        up: 'swordSlash',      // Aether (sube y baja con la espada)
        side: 'quickDraw',     // Quick Draw (embestida con espada)
        down: 'counter',       // Counter (postura de contraataque)
      },
    },
    // === DOMONO = NESS (flota, PK powers, rápido y liviano) ===
    domono: {
      name: 'Dj Domono', color: '#f3f0e8',
      weight: 88, power: 0.92, runSpeed: 7.8, airSpeed: 6.8, jumpSpeed: 13.0, doubleJumpSpeed: 12.4,
      width: 0.8, height: 1.85,
      floaty: 0.82,            // cae más lento (Ness es flotante)
      // Especiales estilo Ness
      specials: {
        neutral: 'pkFire',     // PK Fire (proyectil que estalla)
        up: 'pkThunderUp',     // PK Thunder recovery (impulso eléctrico)
        side: 'pkThunder',     // PK Thunder (proyectil eléctrico controlable)
        down: 'pkMagnet',      // PK Magnet (absorción/curación)
      },
    },
    // === FAXO = RICHTER (látigo largo, sub-armas, alcance) ===
    faxo: {
      name: 'Dr Faxo', color: '#9aa0a6',
      weight: 96, power: 1.05, runSpeed: 7.6, airSpeed: 6.2, jumpSpeed: 13.2, doubleJumpSpeed: 12.3,
      width: 0.8, height: 1.8,
      // Especiales estilo Richter
      specials: {
        neutral: 'holyWater',  // Holy Water (llama en el suelo)
        up: 'uppercut',        // Uppercut Whip (latigazo de recuperación)
        side: 'whip',          // Vampire Killer (látigo largo)
        down: 'axe',           // Axe (hacha en arco)
      },
    },

    // === PABLO QUEMANDO RUEDAS (Kenai) = KIRBY ===
    pablo: { 
      name: 'Kenai', 
      color: '#ff8a1f', 
      
      // Base stats (se modifican por stance)
      weight: 95,        
      power: 1.0,        
      runSpeed: 7.0,     
      airSpeed: 5.8,
      jumpSpeed: 13.5,
      doubleJumpSpeed: 12.5,
      width: 0.85,
      height: 1.85,
      
      // === KIRBY MECHANICS ===
      maxJumps: 6,                    // 1 suelo + 5 aéreos (Kirby tiene 5-6)
      jumpHeightMultiplier: 0.95,     // saltos subsiguientes un poco más bajos

      // Especiales estilo Kirby
      specials: {
        neutral: 'inhale',     // Inhale (succiona y escupe)
        up: 'swordSlash',      // Final Cutter (sube y baja)
        side: 'hammer',        // Hammer (martillazo fuerte)
        down: 'blockForm',     // Stone (piedra)
      },

      // === STANCE SYSTEM ===
      stance: 'normal',               // 'gordo' | 'flaco' | 'normal'
      
      // Stats por stance (se aplican multiplicadores al base)
      stances: {
        gordo: {
          weightMult: 1.5,      
          powerMult: 1.35,      
          speedMult: 0.65,      
          airSpeedMult: 0.55,
          jumpMult: 0.85,
          fallMult: 1.3,
          widthMult: 1.35,      
          heightMult: 1.1,
          armorFrames: 4,        // frames de armadura al recibir golpe
          armorThreshold: 8,     // daño mínimo para romper armadura
          moves: {
            jab: 'gordo_jab',
            side: 'gordo_side', 
            up: 'gordo_up',
            down: 'gordo_down',
            shot: 'gordo_shot'
          }
        },
        flaco: {
          weightMult: 0.65,     
          powerMult: 0.75,      
          speedMult: 1.45,      
          airSpeedMult: 1.5,
          jumpMult: 1.15,
          fallMult: 0.8,
          widthMult: 0.7,       
          heightMult: 1.15,
          armorFrames: 0,
          armorThreshold: 0,
          moves: {
            jab: 'flaco_jab',
            side: 'flaco_side',
            up: 'flaco_up',
            down: 'flaco_down',
            shot: 'flaco_shot',
            airDash: 'flaco_airDash'  // move extra: dash aéreo con ataque
          }
        },
        normal: {
          weightMult: 1.0,
          powerMult: 1.0,
          speedMult: 1.0,
          airSpeedMult: 1.0,
          jumpMult: 1.0,
          fallMult: 1.0,
          widthMult: 1.0,
          heightMult: 1.0,
          moves: {
            jab: 'jab',
            side: 'side',
            up: 'up',
            down: 'down',
            shot: 'shot'
          }
        }
      },
      
      // === Especiales de personaje: los números viven en `moves` (swordSlash, blockForm) ===
      swordSlash: { moveId: 'swordSlash' }, // ↑ + Especial (reemplaza el upSpecial genérico)
      blockForm: { moveId: 'blockForm' }, // ↓ + Especial
    },

    // === CHUBITCOIN = PAC-MAN (frutas, Power Pellet, manguera) ===
    // Stats del splash art: "PESO: BILLETES PESADOS · AGILIDAD: HODL MAESTRO ·
    // PODER: VALOR EXPLOSIVO" → medio-pesado, tirando fuerte y veloz.
    chubit: {
      name: 'Chubitcoin', color: '#ffd23c',
      weight: 104, power: 1.12, runSpeed: 7.4, airSpeed: 6.0, jumpSpeed: 12.9, doubleJumpSpeed: 12.0,
      width: 0.85, height: 1.85,
      // Especiales estilo Pac-Man
      specials: {
        neutral: 'bonusFruit',  // Bonus Fruit: cargar manteniendo el especial, lanzar al soltar
        up: 'pacJump',          // Pac-Jump: impulso de recuperación + trampolín
        side: 'powerPellet',    // Power Pellet: embestida mordiendo todo
        down: 'fireHydrant',    // Fire Hydrant: manguera que tira chorros de agua
      },
    },
  },

  // ------------------------------------------------------------------ escenarios
  stages: {
    mormones: {
      name: 'Los Mormones',
      // EL PISO ES LA CALLE: ancha y segura de borde a borde (los bordes del
      // blast quedan solo para KOs volando, como en Onett del Melee).
      solids: [{ l: -26, r: 26, top: -6.5, bottom: -10 }],
      oneWays: [
        { l: -10, r: 10, top: 0 },       // terraplén de pasto (acá spawnean)
        { l: -7.5, r: -3.5, top: 3.6 },  // guardarraíl izquierdo
        { l: 3.5, r: 7.5, top: 3.6 },    // guardarraíl derecho
        { l: -2.2, r: 2.2, top: 6.9 },   // guardarraíl alto central
      ],
      spawns: [
        { x: -6, y: 0 }, { x: 6, y: 0 }, { x: -2.5, y: 0 }, { x: 2.5, y: 0 },
        { x: -8.5, y: 0 }, { x: 8.5, y: 0 },
      ],
      respawn: { x: 0, y: 11 },
      blast: { left: -30, right: 30, bottom: -19, top: 24 },
      camera: { minWidth: 22, padding: 7 },
      // Tráfico: los autos circulan por el piso (z=0) y pegan. Determinista:
      // el spawn sale de un hash del frame (snapshot-safe, sin RNG de estado).
      traffic: {
        startDelay: 240,            // frames de pelea antes del primer auto
        interval: [320, 520],       // rango de frames entre autos (menos simultáneos = más fluido)
        speed: [9, 14],             // rango de velocidad (u/s)
        spawnX: 32,                 // aparecen fuera de cuadro
        despawnX: 34,               // se reciclan al salir
        car: { w: 3.6, h: 1.7, damage: 16, base: 11, growth: 18, angle: 28 },
        hazardCd: 45,               // frames de inmunidad tras un choque
      },
    },
    escritorio: {
      name: 'El Escritorio',
      // EL PISO ES LA MESA GIGANTE (como el mapa desk de vita-machines): ancha y
      // segura de borde a borde; los bordes del blast quedan para KOs volando.
      // Abajo, muy abajo, está el piso de la habitación (visual de la caída).
      solids: [{ l: -26, r: 26, top: -6.5, bottom: -10 }],
      oneWays: [
        { l: -10, r: 10, top: 0 },       // pila de libros central (acá spawnean)
        { l: -19, r: -13, top: 2.6 },    // lomo del libro izquierdo
        { l: 13, r: 19, top: 2.6 },      // lomo del libro derecho
        { l: -3.5, r: 3.5, top: 5.2 },   // la taza gigante (plataforma alta)
      ],
      spawns: [{ x: -6, y: 0 }, { x: 6, y: 0 }, { x: -2.5, y: 0 }, { x: 2.5, y: 0 }],
      respawn: { x: 0, y: 11 },
      blast: { left: -30, right: 30, bottom: -19, top: 24 },
      camera: { minWidth: 22, padding: 7 },
      // Sin tráfico en este mapa (es interior). El Renderer dibuja el escritorio.
      traffic: null,
    },
  },
  defaultStage: 'mormones',

  // ------------------------------------------------------------------ computadora
  ai: {
    difficulties: {
      easy: { reaction: 26, aggression: 0.35, shotChance: 0.01, recovery: 0.75 },
      normal: { reaction: 14, aggression: 0.6, shotChance: 0.02, recovery: 0.92 },
      hard: { reaction: 6, aggression: 0.85, shotChance: 0.03, recovery: 1 },
    },
  },

  // ------------------------------------------------------------------ cámara compartida
  camera: {
    fov: 28,
    minDistance: 22,
    maxDistance: 62,
    smoothing: 5,
    zoomSmoothing: 3,
    elevation: 1.5,
    shake: { hit: 0.18, ko: 0.6, decay: 7 },
  },

  // ------------------------------------------------------------------ gráficos / performance
  // Ajustes para que el juego corra fluido sin perder el look (bloom y sombras
  // se mantienen pero a menor resolución; el pixelRatio queda acotado).
  graphics: {
    pixelRatioMax: 1.5,     // tope de devicePixelRatio (en retina no renderiza 2x)
    shadows: true,          // sombras del sol sobre la escena (el blob fake de contacto va aparte)
    shadowMapSize: 1024,    // 1024 en vez de 2048: mitad de memoria, se ve casi igual
    bloom: true,            // bloom sutil (se renderiza a media resolución)
    bloomStrength: 0.26,
    bloomRadius: 0.55,
    bloomThreshold: 0.85,
    bloomHalfRes: true,     // bloom a media resolución: mismo look, mucho más barato
  },

  // ------------------------------------------------------------------ jugadores locales (teclado y joystick)
  // En online cada jugador usa el set de P1 en su propia máquina; P2-P6 son para
  // varios humanos en una sola compu (teclado + joysticks).
  players: [
    { short: 'P1', color: '#4d8bff', label: 'WASD + ESP/G/H', controls: { left: 'KeyA', right: 'KeyD', up: 'KeyW', down: 'KeyS', jump: 'Space', attack: 'KeyG', special: 'KeyH' } },
    { short: 'P2', color: '#ff5a36', label: 'Flechas + , . /', controls: { left: 'ArrowLeft', right: 'ArrowRight', up: 'ArrowUp', down: 'ArrowDown', jump: 'Comma', attack: 'Period', special: 'Slash' } },
    { short: 'P3', color: '#5cc24a', label: 'IJKL + U/O/P', controls: { left: 'KeyJ', right: 'KeyL', up: 'KeyI', down: 'KeyK', jump: 'KeyU', attack: 'KeyO', special: 'KeyP' } },
    { short: 'P4', color: '#ffc93c', label: 'Num 8456 + 1/2/3', controls: { left: 'Numpad4', right: 'Numpad6', up: 'Numpad8', down: 'Numpad5', jump: 'Numpad1', attack: 'Numpad2', special: 'Numpad3' } },
    { short: 'P5', color: '#ff6ec7', label: 'Teclas 1-7', controls: { left: 'Digit1', right: 'Digit2', up: 'Digit3', down: 'Digit4', jump: 'Digit5', attack: 'Digit6', special: 'Digit7' } },
    { short: 'P6', color: '#4dd0e1', label: 'Num 7/9/0/. + * ¼', controls: { left: 'Numpad7', right: 'Numpad9', up: 'Numpad0', down: 'NumpadDecimal', jump: 'NumpadAdd', attack: 'NumpadMultiply', special: 'NumpadDivide' } },
  ],
  maxPlayers: 6,
};