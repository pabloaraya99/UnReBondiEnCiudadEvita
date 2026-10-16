# AGENTS.md — Un Re Bondi En Ciudad Evita

Guía para IAs y colaboradores que trabajen en este repo. Leé esto ANTES de tocar código.

## Qué es este proyecto

Juego web estilo Smash Bros con personajes del barrio (Ciudad Evita, La Matanza).
**Vite + Three.js**, simulación determinista a paso fijo (60 Hz), motor físico arcade propio,
sin dependencias de física externas. Deploy en Vercel.

- **Repo:** https://github.com/pabloaraya99/UnReBondiEnCiudadEvita
- **Inspiración arquitectónica:** https://github.com/matiasduclosmd-1778/vita-machines/

## Cómo correr

```powershell
npm install
npm run dev      # http://localhost:5173
npm run build    # build de producción en dist/
npm test         # tests de simulación (node --test)
```

## Estructura REAL del código

```
src/
  main.js            → controlador de estados (menu → lobby → playing → results),
                       loop con acumulador de tiempo (física 60 Hz + render interpolado)
  config.js          → GAME_CONFIG: física, moves, personajes, escenario, tráfico,
                       cámara, IA, controles de 4 jugadores. TODO se ajusta acá.
  sim/               → SIMULACIÓN PURA: sin Three.js, sin DOM, sin Math.random.
                       Determinista (mismo input → mismo resultado). Corre en Node (tests).
    index.js         → barrel export (Match, Fighter, AIController, IN, has)
    input.js         → bitmask de inputs (IN.LEFT/RIGHT/UP/DOWN/JUMP/ATTACK/SPECIAL)
    Fighter.js       → física del luchador + stance system (Pablo: gordo/flaco/normal)
                       + especiales (swordSlash, blockForm) + hazardCd (autos)
    Match.js         → partida: step(inputs), hitboxes, daño/knockback, blast zones,
                       vidas, TRÁFICO (autos con hitbox, spawn por hashFrame determinista)
    AI.js            → AIController.decide(match) devuelve máscara de input; RNG con semilla
  render/            → VISUAL: solo LEE el estado de la simulación, nunca lo modifica.
    Renderer.js      → escena Three.js, EffectComposer (bloom), escenario "Los Mormones",
                       partículas, eventos visuales, drawCars (tráfico), sombras de contacto
    CameraRig.js     → cámara compartida: encuadra luchadores, zoom acotado, shake
    KenaiModel.js    → modelo de Kenai con primitivas (hoodie/campera azul-gris, cargo, cadenas, blunt)
    CocoModel.js     → modelo de El Coco (cuero manchado de grasa, tatuajes, jogging azul, llave inglesa)
    DomonoModel.js   → modelo de Dj Domono (campera verde camuflada, consola de mano, auriculares)
    FaxoModel.js     → modelo de Dr Faxo (flaco, bata, anteojos, cámara, ojotas con medias)
    ChubitcoinModel.js → modelo de Chubitcoin (pelo negro peinado, camisa negra con botones dorados,
                         lengua afuera, reloj/anillo/colgante bitcoin — Pac-Man del equipo)
  ui/                → interfaz genérica HTML/CSS sobre el canvas
    UI.js            → pantallas: menú (logo 3D + nube de pelea animada + lineup champ-select con
                       bursts de caricatura), lobby (selección jugadores/personajes), HUD, resultados
                       + cutoutPng() (recorte de fondo de imágenes por flood fill)
    ui.css           → estilos + Google Fonts (Bungee, Rubik Spray Paint)
test/
  pablo.test.js      → 17 tests de simulación (node --test). Deben pasar siempre.
public/assets/
  models/            → GLB de modelos 3D (cuando se generen con IAs externas)
  concept/kenai/     → imágenes de referencia de personajes
  ui/                → logo SVG, fondos de menú
  ui/pilots/         → retratos de coco/domono/faxo (personas, sin autos; copiados de vita-machines);
                       Kenai usa /assets/concept/kenai/Kenai3Dreferencia.png (mismo recurso del menú)
ART_DIRECTION.md     → biblia visual: paleta, estilo "gangster de barrio verde", prompts para IAs
start-server.bat     → levanta el dev server en Windows con doble clic
```

## Reglas duras (NO romper)

1. **Simulación determinista**: dentro de `sim/` no se usa `Math.random()` sin semilla,
   `Date.now()`, DOM ni Three.js. El tráfico usa `hashFrame()` (mismo frame → mismo resultado).
2. **El render solo lee**: `render/` nunca modifica el estado de `sim/`.
3. **Paso fijo**: la física avanza por `config.physicsStep` (1/60), nunca por delta de frame.
4. **Comentarios y nombres en español** (estilo Vita Machines).
5. **`npm test` debe pasar** antes de considerar terminado un cambio de lógica.
6. **Config primero**: valores de gameplay se cambian en `src/config.js`, no hardcodeados.

## Estado actual (qué funciona)

- Título con splash art estático + lobby champion select con tarjetas splash art por personaje
  (coco/domono/faxo/pablo/chubit), selector de escenario, teclado P1 (WASD + ESPACIO/G/H) y JOYSTICK
  (Gamepad API: stick/d-pad, A saltar, X atacar, B/Y especial — 4 pads = 4 jugadores)
- Lobby con selección de 4 slots (humano/CPU/cerrado, personaje, dificultad)
- Partida: countdown, HUD con % y vidas, KO por blast zones, resultados, revancha
- 5 personajes con modelos 3D propios (primitivas): pablo/kenai (Kirby: stances, inhale, hammer,
  stone), coco (Ike: eruption, counter, quickDraw), domono (Ness: pkFire, pkThunder, pkMagnet),
  faxo (Richter: holyWater, whip, axe, uppercut), chubitcoin (Pac-Man: Bonus Fruit con carga por tier,
  Power Pellet, Pac-Jump con trampolín, Fire Hydrant con chorros de agua)
- IA: usa especiales neutros a rango real (sin marcha encima) y carga Bonus Fruit con Chubitcoin
- Escenario "Los Mormones": templo de fondo (parallax), calle = piso con autos que PEGAN
- Tráfico determinista de autos (hazards), guardarraíles como plataformas

## Qué falta / siguiente

- Pulir modelos 3D (más detalle por personaje sin pasar el presupuesto web) y sus poses en el lineup 3D
- Autos argentinos (Falcon, 128, Torino...) como variantes del tráfico
- HUD con retratos de personajes
- Online (netcode autoritativo, rollback — la simulación ya es determinista y tiene snapshot/restore)
- Audio (Web Audio sintetizado, estilo Vita Machines)
- Stats estilo Smash por champion (el usuario va a indicar qué peleador de Smash usa cada personaje)
- Git: todavía no hay user.name/email configurados → no se commiteó hasta autorización explícita
