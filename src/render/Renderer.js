import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { GAME_CONFIG } from '../config.js';
import { CameraRig } from './CameraRig.js';
import { buildKenai } from './KenaiModel.js';
import { buildCoco } from './CocoModel.js';
import { buildDomono } from './DomonoModel.js';
import { buildFaxo } from './FaxoModel.js';

const FIGHTER_BUILDERS = {
  pablo: buildKenai,
  coco: buildCoco,
  domono: buildDomono,
  faxo: buildFaxo,
};

// Autos de Vita Machines (con créditos en README): se usan en el tráfico del escenario
// rotY: corrección de orientación del modelo (si van de culata/de costado, se ajusta acá)
const CAR_MODEL_FILES = [
  { id: 'corolla', url: '/assets/models/cars/corolla.glb', rotY: 0 },
  { id: 'clio', url: '/assets/models/cars/clio.glb', rotY: 0 },
  { id: 'peugeot', url: '/assets/models/cars/peugeot.glb', rotY: 0 },
  { id: 'moto', url: '/assets/models/cars/moto.glb', rotY: 0 },
];

// Modelos 3D de los peleadores (GLB). Solo Kenai tiene GLB por ahora.
const FIGHTER_MODEL_FILES = [
  { id: 'pablo', url: '/assets/models/kenai/Kenai.glb' },
];

const MOVES = GAME_CONFIG.moves;
const CAM = GAME_CONFIG.camera;
const GFX = GAME_CONFIG.graphics;

/**
 * Todo lo que se dibuja. Solo LEE el estado de la simulación (Match): nunca lo modifica.
 * Todo lo visual de esta etapa es provisorio (cajas y cápsulas de colores): la estética se cambia
 * acá y en src/config.js sin tocar las reglas del juego.
 */
export class Renderer {
  constructor(container) {
    this.renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, GFX.pixelRatioMax));
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.shadowMap.enabled = GFX.shadows;
    this.renderer.shadowMap.type = THREE.PCFShadowMap;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    container.appendChild(this.renderer.domElement);

    this.scene = new THREE.Scene();
    this.rig = new CameraRig(window.innerWidth / window.innerHeight);
    this.views = [];
    this.stageGroup = null;
    this.stage = null;
    this.debug = false;
    this.particles = [];
    this.projectileMeshes = new Map();
    this.carMeshes = new Map(); // autos del tráfico (hazards del Match)
    this.fighterModelPool = new Map(); // modelos 3D de los peleadores (GLB)
    this.tmp = new THREE.Vector3();
    this.tmpColor = new THREE.Color();

    this.setupLights();
    this.setupPostFX(container);
    this.loadCarModels();
    this.loadFighterModels();
    this.loadStageTextures();
    window.addEventListener('resize', () => this.resize());
  }

  /** Carga las texturas PBR del escenario (Poly Haven, CC0) en background.
   *  Cuando llegan todas, reconstruye el escenario actual para usarlas. */
  loadStageTextures() {
    if (this._stageTexLoading) return;
    this._stageTexLoading = true;
    this.stageTex = {};
    const loader = new THREE.TextureLoader();
    const defs = [
      ['asphalt', '/assets/textures/asphalt_diff.jpg'],
      ['asphaltRough', '/assets/textures/asphalt_rough.jpg'],
      ['concrete', '/assets/textures/concrete_diff.jpg'],
      ['grass', '/assets/textures/grass_diff.jpg'],
      ['marble', '/assets/textures/marble_diff.jpg'],
      ['dirt', '/assets/textures/dirt_diff.jpg'],
      ['metal', '/assets/textures/metal_diff.jpg'],
      ['wood', '/assets/textures/wood_diff.jpg'],
    ];
    let pending = defs.length;
    for (const [key, url] of defs) {
      loader.load(url, (tex) => {
        tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
        tex.colorSpace = key.endsWith('Rough') ? THREE.NoColorSpace : THREE.SRGBColorSpace;
        tex.anisotropy = 8;
        this.stageTex[key] = tex;
        if (--pending === 0 && this.stage) {
          // llegaron todas: reconstruir el escenario con las texturas reales
          const st = this.stage;
          this.setStage(st);
        }
      }, undefined, () => { pending--; });
    }
  }

  /** Carga los GLB de los autos de Vita Machines (una sola vez, en background). */
  loadCarModels() {
    if (this.carModelPool) return;
    this.carModelPool = new Map();
    const loader = new GLTFLoader();
    for (const def of CAR_MODEL_FILES) {
      loader.load(
        def.url,
        (gltf) => {
          const model = gltf.scene;
          // normalizar: escalar para que el largo sea ~4.2 y apoyar en y=0
          const box = new THREE.Box3().setFromObject(model);
          const size = box.getSize(new THREE.Vector3());
          const largo = Math.max(size.x, size.z);
          const escala = 4.2 / (largo || 1);
          model.scale.setScalar(escala);
          // recentrar tras escalar
          const box2 = new THREE.Box3().setFromObject(model);
          const c = box2.getCenter(new THREE.Vector3());
          model.position.x -= c.x;
          model.position.z -= c.z;
          model.position.y -= box2.min.y;
          model.traverse((o) => { if (o.isMesh) { o.castShadow = true; } });
          this.carModelPool.set(def.id, model);
        },
        undefined,
        () => { /* si falla, drawCars usa el auto procedural de fallback */ },
      );
    }
  }

  /** Carga los GLB de los peleadores (una sola vez, en background). */
  loadFighterModels() {
    if (this.fighterModelPool) return;
    this.fighterModelPool = new Map();
    const loader = new GLTFLoader();
    for (const def of FIGHTER_MODEL_FILES) {
      loader.load(
        def.url,
        (gltf) => {
          const model = gltf.scene;
          // Normalizar: escalar para que el alto sea ~1.8 y apoyar en y=0
          const box = new THREE.Box3().setFromObject(model);
          const size = box.getSize(new THREE.Vector3());
          const maxDim = Math.max(size.x, size.y, size.z);
          const escala = 1.8 / (maxDim || 1);
          model.scale.setScalar(escala);
          const box2 = new THREE.Box3().setFromObject(model);
          const c = box2.getCenter(new THREE.Vector3());
          model.position.x -= c.x;
          model.position.y -= box2.min.y;
          model.position.z -= c.z;
          // recolectar materiales (para flash de hitstun / tinte / opacidad) igual que los builders
          const mats = [];
          model.traverse((o) => {
            if (o.isMesh) {
              o.castShadow = true;
              const list = Array.isArray(o.material) ? o.material : [o.material];
              for (const m of list) {
                if (m && !mats.includes(m)) {
                  if (!m.userData.base) m.userData.base = m.color.clone();
                  mats.push(m);
                }
              }
            }
          });
          this.fighterModelPool.set(def.id, { scene: model, mats });
          // swap en caliente: si ya hay una vista primitiva de este personaje, la reemplazamos
          this._swapFighterView(def.id);
        },
        undefined,
        (err) => { console.warn('[GLB] fallo al cargar', def.url, err); },
      );
    }
  }

  /** Reemplaza la vista de un personaje cuando su GLB terminó de cargar (swap en caliente). */
  _swapFighterView(characterId) {
    const idx = this._lastMatch?.fighters.findIndex((f) => f.characterId === characterId);
    if (idx == null || idx < 0) return;
    const f = this._lastMatch.fighters[idx];
    const builder = FIGHTER_BUILDERS[characterId];
    if (!builder) return;
    const old = this.views[idx];
    if (!old) return;
    const newView = this.makeFighterView(f, builder);
    // conservar estado visual actual
    newView.group.position.copy(old.group.position);
    newView.turn = old.turn;
    // eliminar la vieja
    this.scene.remove(old.group);
    if (old.blob) this.scene.remove(old.blob);
    this.scene.remove(old.debugHurt, old.debugHit);
    this.views[idx] = newView;
  }

  setupLights() {
    this.scene.add(new THREE.HemisphereLight(0xcfe4ff, 0x3d6b35, 1.15));
    const sun = new THREE.DirectionalLight(0xfff1d6, 2.6);
    sun.position.set(-12, 28, 20);
    sun.castShadow = GFX.shadows;
    sun.shadow.mapSize.set(GFX.shadowMapSize, GFX.shadowMapSize);
    Object.assign(sun.shadow.camera, { left: -30, right: 30, top: 24, bottom: -18, near: 1, far: 90 });
    sun.shadow.bias = -0.0005;
    this.scene.add(sun);
    this.sun = sun;
    // luz de relleno fría desde el frente: despega a los personajes del fondo (rim/fill)
    const fill = new THREE.DirectionalLight(0xbfd9ff, 0.9);
    fill.position.set(8, 6, 30);
    this.scene.add(fill);
  }

  /** Post-processing: bloom sutil (brillan faros/ángel/partículas) + vignette CSS gratis. */
  setupPostFX(container) {
    this.composer = new EffectComposer(this.renderer);
    this.composer.addPass(new RenderPass(this.scene, this.rig.camera));
    if (GFX.bloom) {
      // bloom a media resolución: mismo look, mucho más barato (config.graphics)
      const w = GFX.bloomHalfRes ? window.innerWidth / 2 : window.innerWidth;
      const h = GFX.bloomHalfRes ? window.innerHeight / 2 : window.innerHeight;
      this.bloom = new UnrealBloomPass(
        new THREE.Vector2(w, h),
        GFX.bloomStrength,
        GFX.bloomRadius,
        GFX.bloomThreshold,
      );
      this.composer.addPass(this.bloom);
    }
    this.composer.addPass(new OutputPass());

    // vignette con CSS (cero costo de GPU)
    const vig = document.createElement('div');
    vig.style.cssText =
      'position:fixed;inset:0;pointer-events:none;z-index:5;' +
      'background:radial-gradient(ellipse at center, transparent 55%, rgba(8,10,20,0.42) 100%);';
    container.appendChild(vig);
  }

  resize() {
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.composer.setSize(window.innerWidth, window.innerHeight);
    this.rig.setAspect(window.innerWidth / window.innerHeight);
  }

  // ------------------------------------------------------------------ escenario

  setStage(stage) {
    if (this.stageGroup) {
      this.scene.remove(this.stageGroup);
      this.stageGroup.traverse((o) => {
        o.geometry?.dispose();
        o.material?.dispose?.();
      });
    }
    this.stage = stage;
    // Escenario "El Escritorio" (inspirado en el mapa desk de vita-machines)
    if (stage.name === 'El Escritorio') {
      this.buildDeskStage(stage);
      return;
    }
    const g = new THREE.Group();

    // ---- cielo con degradado (celeste arriba, casi blanco en el horizonte) ----
    this.scene.background = this.makeSkyTexture();
    this.scene.fog = new THREE.Fog(0x9fd4f5, 80, 230);

    const box = (w, h, d, color, x, y, z, opts = {}) => {
      const { shadow, ...matOpts } = opts;
      const m = new THREE.Mesh(
        new THREE.BoxGeometry(w, h, d),
        new THREE.MeshStandardMaterial({ color, roughness: 0.85, metalness: 0, ...matOpts }),
      );
      m.position.set(x, y, z);
      m.castShadow = shadow ?? true;
      m.receiveShadow = true;
      g.add(m);
      return m;
    };

    let cseed = 11;
    const crnd = () => ((cseed = (cseed * 16807) % 2147483647) / 2147483647);

    // ================================================================ CAPA JUEGO (sin parallax)
    // ---- EL PISO ES LA CALLE: asfalto PBR real (Poly Haven) o procedural de fallback ----
    const asphaltTex = this.stageTex?.asphalt ?? this.makeAsphaltTexture();
    const asphaltRough = this.stageTex?.asphaltRough ?? null;
    const grassTex = this.stageTex?.grass ?? this.makeGrassTexture();
    for (const s of stage.solids) {
      const w = s.r - s.l;
      const h = s.top - s.bottom;
      const cx = (s.l + s.r) / 2;
      // losa de asfalto con textura PBR real (grietas, manchas) o procedural
      const slabTex = asphaltTex.clone();
      slabTex.repeat.set(Math.max(1, w / 10), Math.max(1, h / 4));
      const slabMatOpts = { map: slabTex, roughness: 0.95, metalness: 0 };
      if (asphaltRough) {
        const roughTex = asphaltRough.clone();
        roughTex.repeat.copy(slabTex.repeat);
        slabMatOpts.roughnessMap = roughTex;
        slabMatOpts.roughness = 1;
      }
      const slab = new THREE.Mesh(
        new THREE.BoxGeometry(w, h, 9),
        new THREE.MeshStandardMaterial(slabMatOpts),
      );
      slab.position.set(cx, (s.top + s.bottom) / 2, 0);
      slab.castShadow = true;
      slab.receiveShadow = true;
      g.add(slab);
      // línea central quebrada
      for (let x = s.l + 2; x < s.r - 2; x += 6) {
        box(2.8, 0.06, 0.32, 0xf4f1e8, x, s.top + 0.03, 0, { shadow: false });
      }
      // bordes amarillos
      box(w, 0.1, 0.4, 0xf2c94c, cx, s.top + 0.05, 4.2, { shadow: false });
      box(w, 0.1, 0.4, 0xf2c94c, cx, s.top + 0.05, -4.2, { shadow: false });
      // hombros de pasto por fuera del asfalto (visual, sin colisión extra): pasto real si hay textura
      const grassShoulder = grassTex.clone();
      grassShoulder.repeat.set(Math.max(1, 4 / 3), Math.max(1, h / 3));
      const shoulderMat = this.stageTex?.grass
        ? new THREE.MeshStandardMaterial({ map: grassShoulder, roughness: 1, metalness: 0 })
        : new THREE.MeshStandardMaterial({ color: 0x58c24e, roughness: 0.85, metalness: 0 });
      const shoulderL = new THREE.Mesh(new THREE.BoxGeometry(4, h, 9), shoulderMat);
      shoulderL.position.set(s.l - 2, (s.top + s.bottom) / 2, 0);
      shoulderL.receiveShadow = true;
      g.add(shoulderL);
      const shoulderR = shoulderL.clone();
      shoulderR.position.set(s.r + 2, (s.top + s.bottom) / 2, 0);
      g.add(shoulderR);
    }

    // ---- terraplén de pasto (plataforma de spawn, losa fina para ver abajo) ----
    const spawn = stage.oneWays[0];
    if (spawn) {
      const cx = (spawn.l + spawn.r) / 2;
      const w = spawn.r - spawn.l;
      const topTex = grassTex.clone();
      topTex.repeat.set(Math.max(1, w / 6), 1);
      const topSlab = new THREE.Mesh(
        new THREE.BoxGeometry(w, 0.4, 6),
        new THREE.MeshStandardMaterial({ map: topTex, roughness: 0.9, metalness: 0 }),
      );
      topSlab.position.set(cx, spawn.top - 0.2, 0);
      topSlab.castShadow = true;
      topSlab.receiveShadow = true;
      g.add(topSlab);
      // tierra bajo la plataforma: textura PBR de tierra si está, si no color plano
      if (this.stageTex?.dirt) {
        const dirtTex = this.stageTex.dirt.clone();
        dirtTex.repeat.set(Math.max(1, w / 4), 1);
        const dirtSlab = new THREE.Mesh(
          new THREE.BoxGeometry(w - 0.3, 0.8, 5.7),
          new THREE.MeshStandardMaterial({ map: dirtTex, roughness: 1, metalness: 0 }),
        );
        dirtSlab.position.set(cx, spawn.top - 0.8, 0);
        dirtSlab.receiveShadow = true;
        g.add(dirtSlab);
      } else {
        box(w - 0.3, 0.8, 5.7, 0x8a5a33, cx, spawn.top - 0.8, 0, { roughness: 0.95 }); // tierra
      }
    }

    // ---- plataformas flotantes: guardarraíl de cemento + cartel verde fluor ----
    for (const o of stage.oneWays.slice(1)) {
      const cx = (o.l + o.r) / 2;
      const w = o.r - o.l;
      // ---- GUARDARRAÍL DE AUTOPISTA DE CEMENTO (barrera tipo la Richeri) +
      // CARTEL VERDE FLUOR de autopista arriba (estilo cartel de ruta real) ----
      const cementTex = this.stageTex?.concrete
        ? (() => { const t = this.stageTex.concrete.clone(); t.repeat.set(Math.max(1, w / 4), 1); return new THREE.MeshStandardMaterial({ map: t, color: 0xd4d0c8, roughness: 0.85, metalness: 0 }); })()
        : new THREE.MeshStandardMaterial({ color: 0xb8b4ac, roughness: 0.85, metalness: 0 });
      // base de cemento (la barrera de autopista, más ancha abajo = perfil Jersey)
      const base = new THREE.Mesh(new THREE.BoxGeometry(w, 0.5, 0.5), cementTex);
      base.position.set(cx, o.top - 0.4, 0);
      base.castShadow = true;
      base.receiveShadow = true;
      g.add(base);
      const perfil = new THREE.Mesh(new THREE.BoxGeometry(w, 0.34, 0.3), cementTex);
      perfil.position.set(cx, o.top - 0.06, 0);
      perfil.castShadow = true;
      g.add(perfil);
      // CARTEL VERDE FLUOR de autopista sobre el guardarraíl (plataforma vistosa)
      const cartel = new THREE.Mesh(
        new THREE.BoxGeometry(w * 0.92, 0.5, 0.1),
        new THREE.MeshStandardMaterial({ color: 0x0a7a3c, roughness: 0.5, metalness: 0.1, emissive: 0x0a5a2c, emissiveIntensity: 0.25 }),
      );
      cartel.position.set(cx, o.top + 0.32, 0);
      cartel.castShadow = true;
      g.add(cartel);
      // borde blanco del cartel (estilo cartel de autopista)
      const bordeCartel = new THREE.Mesh(
        new THREE.BoxGeometry(w * 0.92, 0.06, 0.11),
        new THREE.MeshStandardMaterial({ color: 0xf4f1e8, roughness: 0.5 }),
      );
      bordeCartel.position.set(cx, o.top + 0.55, 0);
      g.add(bordeCartel);
      const bordeCartelInf = bordeCartel.clone();
      bordeCartelInf.position.set(cx, o.top + 0.09, 0);
      g.add(bordeCartelInf);
      // postes del cartel (2, grises, bajando al guardarraíl de cemento)
      box(0.16, 0.5, 0.16, 0x8a8f96, cx - w / 4, o.top - 0.1, 0.06, { metalness: 0.5, roughness: 0.5 });
      box(0.16, 0.5, 0.16, 0x8a8f96, cx + w / 4, o.top - 0.1, 0.06, { metalness: 0.5, roughness: 0.5 });
      box(0.18, 1.0, 0.18, 0x7a7f85, cx - w / 2 + 0.45, o.top - 0.95, 0, { metalness: 0.6, roughness: 0.4 });
      box(0.18, 1.0, 0.18, 0x7a7f85, cx + w / 2 - 0.45, o.top - 0.95, 0, { metalness: 0.6, roughness: 0.4 });
    }

    // ---- cartel de ruta azul (primer plano, se mueve con el mundo) ----
    const sign = new THREE.Mesh(
      new THREE.PlaneGeometry(8.4, 5.2),
      new THREE.MeshStandardMaterial({ map: this.makeSignTexture(), roughness: 0.6, metalness: 0.1 }),
    );
    sign.position.set(-24, 0.5, -10);
    sign.rotation.y = 0.22;
    g.add(sign);
    box(0.35, 8.5, 0.35, 0x6b5637, -26.6, -3.3, -10.4, { shadow: false });
    box(0.35, 8.5, 0.35, 0x6b5637, -21.6, -3.3, -10.4, { shadow: false });

    // ================================================================ LA VEREDA (fiel a Ciudad Evita)
    // Vereda de hormigón que acompaña la calle de punta a punta, detrás del
    // borde amarillo (z≈-7), con su cordón y textura de hormigón real
    {
      const s = stage.solids[0];
      if (s) {
        const vx = (s.l + s.r) / 2;
        const vw = (s.r - s.l) + 14; // un poco más larga que la calle
        // cordón (el borde elevado que separa vereda de calle)
        const cordon = new THREE.Mesh(
          new THREE.BoxGeometry(vw, 0.22, 0.5),
          new THREE.MeshStandardMaterial({ color: 0xb8b4ac, roughness: 0.9, metalness: 0 }),
        );
        cordon.position.set(vx, s.top + 0.08, -5.6);
        cordon.castShadow = true;
        cordon.receiveShadow = true;
        g.add(cordon);
        // la vereda misma: losa de hormigón con textura, apenas más baja que la calle
        const veredaTex = this.stageTex?.concrete
          ? (() => { const t = this.stageTex.concrete.clone(); t.repeat.set(Math.max(1, vw / 8), 1); return new THREE.MeshStandardMaterial({ map: t, color: 0xcfcbc2, roughness: 0.95, metalness: 0 }); })()
          : new THREE.MeshStandardMaterial({ color: 0xb8b4ac, roughness: 0.9, metalness: 0 });
        const vereda = new THREE.Mesh(new THREE.BoxGeometry(vw, 0.3, 2.6), veredaTex);
        vereda.position.set(vx, s.top + 0.1, -7.2);
        vereda.castShadow = true;
        vereda.receiveShadow = true;
        g.add(vereda);
      }
    }

    // ================================================================ CAPA MEDIA (bgMid, parallax 0.7)
    this.bgMid = new THREE.Group();
    const mid = this.makeGrouper(this.bgMid);

    // pradera entre la calle de juego y el templo
    mid(360, 2, 90, 0x4a9e42, 0, -8.2, -34, { shadow: false });

    g.add(this.bgMid);

    // ================================================================ CAPA LEJANA (bgFar, parallax 0.88)
    this.bgFar = new THREE.Group();
    const far = this.makeGrouper(this.bgFar);

    // (colinas removidas a pedido: no eran correctas para el fondo del templo)

    // pasto lejano bajo el templo
    far(360, 2, 60, 0x55ab4e, 0, -7.8, -52, { shadow: false });

    // ---- EL TEMPLO: centrado, imponente, visible sobre el horizonte ----
    const temple = this.makeTemple();
    temple.scale.setScalar(1.5);
    // bajado un toque para que se vea la estatua dorada de la punta (ángel)
    temple.position.set(0, -8.2, -56);
    this.bgFar.add(temple);

    // ---- LA CALLE COLECTORA (Cam. de La Virgen María, fiel a la referencia
    // satelital): bordea el predio del templo curvando alrededor de él — NO es
    // paralela a la Richeri. Capa intermedia entre el templo y la autopista,
    // más chica y vista de lejos ----
    {
      // calle colectora: VISIBLE pero tranquila — calle de fondo que se lee como
      // camino, sin competir con la plataforma. Asfalto a nivel del terreno,
      // con línea central tenue (no blanco brillante que molestaba).
      const colectoraMat = this.stageTex?.asphalt
        ? (() => { const t = this.stageTex.asphalt.clone(); t.repeat.set(6, 1); return new THREE.MeshStandardMaterial({ map: t, roughness: 0.95 }); })()
        : new THREE.MeshStandardMaterial({ color: 0x474a4f, roughness: 0.95 });
      // calle colectora BIEN AL FONDO: baja en el horizonte, DETRÁS del templo
      // (no cruza el centro de la pantalla). Camino lejano de fondo, sutil.
      const colectora = new THREE.Group();
      const segLen = 90;
      const segW = 4.0;
      // un solo tramo horizontal bajo y detrás del templo, sin curvas que crucen la pantalla
      const seg = new THREE.Mesh(new THREE.BoxGeometry(segLen * 2.2, 0.16, segW), colectoraMat);
      seg.position.set(0, -8.35, -62); // detrás del templo (z=-56), baja en el horizonte
      seg.receiveShadow = true;
      colectora.add(seg);
      // línea central tenue, espaciada (apenas sugiere camino)
      for (let lx = -segLen; lx < segLen; lx += 9) {
        const linea = new THREE.Mesh(
          new THREE.BoxGeometry(2.0, 0.03, 0.18),
          new THREE.MeshStandardMaterial({ color: 0x9aa0a6, roughness: 0.9 }),
        );
        linea.position.set(lx, 0.1, 0);
        seg.add(linea);
      }
      this.bgFar.add(colectora);
    }

    // ---- LAS REJAS DEL TEMPLO (fiel a Los Mormones): cerco de ~2m que recorre
    // el predio, blanco como el templo, delante del edificio hacia la calle ----
    // El templo real tiene rejas bajas alrededor del terreno, no murallas altas.
    {
      const fenceZ = -53.5; // delante del templo, hacia la calle
      const fenceY = -8.2;  // base al nivel del terreno del templo
      const fenceH = 2.0;   // ~2 metros (los personajes miden ~1.8)
      const fenceLen = 120; // recorre todo el ancho del predio
      // postes cada ~2.4 unidades + 2 barras horizontales, blancos como el templo
      const fence = this.makeFence(fenceLen, fenceH, 0xf4f2ec);
      fence.position.set(0, fenceY, fenceZ);
      this.bgFar.add(fence);
      // portón central (entrada al templo, un toque más alto y con marco)
      const porton = this.makeFence(10, fenceH * 1.2, 0xeceae4);
      porton.position.set(0, fenceY, fenceZ);
      this.bgFar.add(porton);
    }

    // ---- PREDIO DEL TEMPLO BIEN DECORADO (fiel a la referencia): césped,
    // canteros de flores violetas y naranjas, arbustos redondeados, árboles y
    // una plaza con fuente delante de la entrada ----
    {
      const groundY = -8.2;
      // camino de hormigón que lleva a la entrada del templo
      const camino = new THREE.Mesh(
        new THREE.BoxGeometry(6, 0.25, 12),
        new THREE.MeshStandardMaterial({ color: 0xd8d5ce, roughness: 0.95 }),
      );
      camino.position.set(0, groundY + 0.05, -50.5);
      this.bgFar.add(camino);

      // FUENTE circular de la plaza (como la referencia): base clara + agua
      const fuenteBase = new THREE.Mesh(
        new THREE.CylinderGeometry(2.6, 2.9, 0.7, 20),
        new THREE.MeshStandardMaterial({ color: 0xeceae4, roughness: 0.7 }),
      );
      fuenteBase.position.set(0, groundY + 0.35, -51);
      this.bgFar.add(fuenteBase);
      const agua = new THREE.Mesh(
        new THREE.CylinderGeometry(2.2, 2.2, 0.2, 20),
        new THREE.MeshStandardMaterial({ color: 0x6fc3e8, roughness: 0.15, metalness: 0.3 }),
      );
      agua.position.set(0, groundY + 0.72, -51);
      this.bgFar.add(agua);
      // chorrito del centro
      const chorro = new THREE.Mesh(
        new THREE.ConeGeometry(0.25, 1.2, 8),
        new THREE.MeshStandardMaterial({ color: 0xbfe4fb, transparent: true, opacity: 0.8, roughness: 0.2 }),
      );
      chorro.position.set(0, groundY + 1.4, -51);
      this.bgFar.add(chorro);

      // CANTEROS DE FLORES (violetas y naranjas, como la referencia): alrededor
      // de la fuente y bordeando los caminos del predio
      const flores = [
        // alrededor de la fuente (curvas de color)
        [ -4.5, -51.5, 0x8a5fc0 ], [ 4.5, -51.5, 0x8a5fc0 ],
        [ -4.5, -50.3, 0xe8963c ], [ 4.5, -50.3, 0xe8963c ],
        // canteros a los costados del camino
        [ -5.5, -47.5, 0x8a5fc0 ], [ 5.5, -47.5, 0xe8963c ],
        [ -5.5, -46, 0xe8963c ], [ 5.5, -46, 0x8a5fc0 ],
        // canteros grandes lejanos a los costados del predio
        [ -18, -49, 0x8a5fc0 ], [ 18, -49, 0xe8963c ],
      ];
      for (const [fx, fz, fcol] of flores) {
        const cantero = new THREE.Group();
        // borde blanco del cantero
        const borde = new THREE.Mesh(
          new THREE.BoxGeometry(2.6, 0.35, 1.4),
          new THREE.MeshStandardMaterial({ color: 0xf4f2ec, roughness: 0.8 }),
        );
        borde.position.y = 0.18;
        cantero.add(borde);
        // las flores: varios puntitos de color encima
        for (let f = 0; f < 7; f++) {
          const flor = new THREE.Mesh(
            new THREE.SphereGeometry(0.22, 6, 5),
            new THREE.MeshStandardMaterial({ color: fcol, roughness: 0.8 }),
          );
          flor.position.set(-1 + (f % 4) * 0.66, 0.42, -0.4 + Math.floor(f / 4) * 0.7);
          cantero.add(flor);
        }
        cantero.position.set(fx, groundY, fz);
        this.bgFar.add(cantero);
      }

      // ARBUSTOS REDONDEADOS (borduras verdes prolijas) alrededor del predio
      const arbustoMat = new THREE.MeshStandardMaterial({ color: 0x3d8b3a, roughness: 0.9 });
      const arbustoOscMat = new THREE.MeshStandardMaterial({ color: 0x2e7a2e, roughness: 0.9 });
      const arbustosSpots = [
        [-10, -48], [-14, -50], [10, -48], [14, -50],
        [-24, -47], [24, -47], [-30, -51], [30, -51], [-8, -45.5], [8, -45.5],
      ];
      for (const [ax, az] of arbustosSpots) {
        const a = new THREE.Group();
        const bola = new THREE.Mesh(new THREE.SphereGeometry(0.9 + crnd() * 0.5, 10, 8), crnd() > 0.5 ? arbustoMat : arbustoOscMat);
        bola.scale.y = 0.8;
        bola.position.y = 0.6;
        bola.castShadow = true;
        a.add(bola);
        const bola2 = new THREE.Mesh(new THREE.SphereGeometry(0.6, 8, 6), arbustoMat);
        bola2.position.set(0.6, 0.45, 0.3);
        a.add(bola2);
        a.position.set(ax, groundY, az);
        this.bgFar.add(a);
      }

      // ÁRBOLES del predio (tronco + copa redonda, estilo prolijo de la referencia)
      const arbolSpots = [[-16, -46], [16, -46], [-22, -52], [22, -52], [-6, -44.5], [6, -44.5]];
      for (const [tx, tz] of arbolSpots) {
        const arbol = new THREE.Group();
        const tronco = new THREE.Mesh(
          new THREE.CylinderGeometry(0.16, 0.22, 1.6, 7),
          new THREE.MeshStandardMaterial({ color: 0x7a5c3a, roughness: 0.9 }),
        );
        tronco.position.y = 0.8;
        tronco.castShadow = true;
        arbol.add(tronco);
        const copa = new THREE.Mesh(
          new THREE.SphereGeometry(1.3 + crnd() * 0.4, 12, 10),
          new THREE.MeshStandardMaterial({ color: 0x4a9e42, roughness: 0.85 }),
        );
        copa.position.y = 2.2;
        copa.scale.y = 1.15;
        copa.castShadow = true;
        arbol.add(copa);
        arbol.position.set(tx, groundY, tz);
        this.bgFar.add(arbol);
      }
    }

    // palmeras junto al templo
    for (const [px, pz] of [[-20, -50], [-14, -54], [22, -51], [28, -55], [32, -50]]) {
      const palm = this.makePalm(5 + crnd() * 2);
      palm.position.set(px, -7, pz);
      this.bgFar.add(palm);
    }
    g.add(this.bgFar);

    // ---- nubes suaves (billboards con textura de nube puffy, en dos profundidades) ----
    if (!this._cloudTex) this._cloudTex = this.makeCloudTexture();
    this.clouds = [];
    for (let i = 0; i < 11; i++) {
      const cloud = new THREE.Group();
      const mat = new THREE.MeshBasicMaterial({
        map: this._cloudTex,
        transparent: true,
        depthWrite: false,
        opacity: 0.95,
        color: 0xffffff,
      });
      // cada nube: 1-2 planos grandes con la textura puffy (mucho más real que esferas)
      const w = 10 + crnd() * 9;
      const h = w * (0.42 + crnd() * 0.14);
      const plane = new THREE.Mesh(new THREE.PlaneGeometry(w, h), mat);
      cloud.add(plane);
      if (crnd() > 0.5) {
        const plane2 = new THREE.Mesh(new THREE.PlaneGeometry(w * 0.7, h * 0.7), mat);
        plane2.position.set(w * 0.25, h * 0.18, 0.1);
        cloud.add(plane2);
      }
      const lejos = i % 2 === 0;
      cloud.position.set(-70 + crnd() * 140, 10 + crnd() * 18, lejos ? -55 - crnd() * 20 : -20 - crnd() * 15);
      // las nubes lejanas un poco más tenues: material propio clonado para no afectar las demás
      if (lejos) cloud.traverse((m) => { if (m.isMesh) { m.material = m.material.clone(); m.material.opacity = 0.55; } });
      g.add(cloud);
      this.clouds.push({ group: cloud, speed: lejos ? 0.4 + crnd() * 0.5 : 0.9 + crnd() * 0.9 });
    }

    // ---- pájaros cruzando el cielo ----
    this.birds = [];
    for (let i = 0; i < 3; i++) {
      const bird = this.makeBird();
      bird.group.position.set(-80 - i * 25, 13 + i * 3, -30 - i * 8);
      g.add(bird.group);
      this.birds.push({ ...bird, speed: 5 + crnd() * 3, phase: crnd() * 6 });
    }

    // zona de KO (solo en modo debug)
    const b = stage.blast;
    const blast = new THREE.LineSegments(
      new THREE.EdgesGeometry(new THREE.BoxGeometry(b.right - b.left, b.top - b.bottom, 0.1)),
      new THREE.LineBasicMaterial({ color: 0xff3b3b }),
    );
    blast.position.set((b.left + b.right) / 2, (b.top + b.bottom) / 2, 0);
    blast.visible = this.debug;
    blast.name = 'blast';
    g.add(blast);

    this.stageGroup = g;
    this.scene.add(g);
  }

  /**
   * Escenario "El Escritorio" (inspirado en el mapa desk de vita-machines):
   * los personajes pelean SOBRE un escritorio gigante de madera barnizada; muy abajo
   * está el piso de la habitación (visual de la caída). Props: taza gigante, pilas de
   * libros (plataformas), lápices, goma, bloques de juguete, pelota y una planta.
   */
  buildDeskStage(stage) {
    const g = new THREE.Group();
    const box = this.makeGrouper(g);

    // ---- atmósfera de interior cálido (lámpara) con ventana fría de fondo ----
    this.scene.background = new THREE.Color(0x2a2118);
    this.scene.fog = new THREE.Fog(0x2a2118, 90, 260);
    // pared de fondo cálida (el cuarto)
    box(140, 70, 2, 0x6b5444, 0, 16, -26, { shadow: false });
    // ventana con luz azul de noche (como el ventanal del living de vita-machines)
    const ventana = new THREE.Mesh(
      new THREE.PlaneGeometry(26, 20),
      new THREE.MeshStandardMaterial({ color: 0x35507a, emissive: 0x2a4a80, emissiveIntensity: 0.7, roughness: 0.3 }),
    );
    ventana.position.set(-30, 14, -24.9);
    g.add(ventana);
    // marco de la ventana
    box(27.5, 1.4, 0.6, 0xeceae4, -30, 24.6, -24.8, { shadow: false });
    box(27.5, 1.4, 0.6, 0xeceae4, -30, 3.4, -24.8, { shadow: false });
    box(1.4, 22, 0.6, 0xeceae4, -43.6, 14, -24.8, { shadow: false });
    box(1.4, 22, 0.6, 0xeceae4, -16.4, 14, -24.8, { shadow: false });
    box(1.2, 20, 0.5, 0xeceae4, -30, 14, -24.8, { shadow: false });
    // repisa con plantita
    box(28, 0.8, 2.4, 0xa8764a, -30, 2.8, -23.6, { shadow: false });

    // ---- LA MESA (plataforma principal de pelea): madera barnizada PBR si está ----
    const woodTex = this.stageTex?.wood;
    const madera = woodTex
      ? (() => { const t = woodTex.clone(); t.repeat.set(3, 1); return new THREE.MeshStandardMaterial({ map: t, color: 0xb98a5e, roughness: 0.4, metalness: 0.05 }); })()
      : new THREE.MeshStandardMaterial({ color: 0x9c6b43, roughness: 0.42, metalness: 0.08 });
    const maderaOsc = new THREE.MeshStandardMaterial({ color: 0x7a5233, roughness: 0.5, metalness: 0.05 });
    const mesa = new THREE.Mesh(new THREE.BoxGeometry(52.5, 3.5, 12), madera);
    mesa.position.set(0, -8.25, 0);
    mesa.castShadow = true;
    mesa.receiveShadow = true;
    g.add(mesa);
    // vetas de la madera (líneas claras longitudinales)
    for (const [z, tone] of [[-4.4, 0xb08258], [-2.2, 0x8a5f3c], [0, 0xb08258], [2.2, 0x8a5f3c], [4.4, 0xb08258]]) {
      box(52.5, 0.06, 0.5, tone, 0, -6.47, z, { shadow: false });
    }
    // borde biselado de la mesa (frente)
    box(52.5, 0.7, 0.5, 0x8a5f3c, 0, -6.85, 6.1, { shadow: false });
    box(52.5, 0.7, 0.5, 0x8a5f3c, 0, -6.85, -6.1, { shadow: false });

    // ---- EL PISO DE LA HABITACIÓN (muy abajo: visual de la caída) ----
    const piso = new THREE.Mesh(
      new THREE.PlaneGeometry(160, 90),
      new THREE.MeshStandardMaterial({ color: 0x8a6a45, roughness: 0.9 }),
    );
    piso.rotation.x = -Math.PI / 2;
    piso.position.set(0, -19.5, 10);
    piso.receiveShadow = true;
    g.add(piso);
    // parquet: tablones alternados (como la referencia)
    for (let i = -10; i <= 10; i++) {
      box(160, 0.02, 1.6, i % 2 ? 0x9c7a50 : 0x7c5c3a, 0, -19.48, 10 + i * 3.2, { shadow: false });
    }
    // alfombra circular bajo la mesa (como la rug del escritorio de vita-machines)
    const rug = new THREE.Mesh(
      new THREE.CircleGeometry(14, 40),
      new THREE.MeshStandardMaterial({ color: 0x9c3d3d, roughness: 1 }),
    );
    rug.rotation.x = -Math.PI / 2;
    rug.position.set(6, -19.44, 4);
    g.add(rug);
    // patrón de la alfombra: anillos concéntricos
    for (const [r, c] of [[11, 0xd8b86a], [8, 0x9c3d3d], [5, 0xd8b86a]]) {
      const anillo = new THREE.Mesh(
        new THREE.RingGeometry(r - 0.8, r, 40),
        new THREE.MeshStandardMaterial({ color: c, roughness: 1 }),
      );
      anillo.rotation.x = -Math.PI / 2;
      anillo.position.set(6, -19.42, 4);
      g.add(anillo);
    }
    // patas de la mesa (bajan al piso, visibles desde los bordes)
    for (const x of [-23, 23]) {
      box(2.6, 9.5, 2.6, 0x7a5233, x, -14.2, 0);
    }

    // ======================= PROPS DE LA MESA (escala gigante, estilo vita-machines) =======================
    // ---- PILA DE LIBROS CENTRAL (la plataforma de spawn, top = 0) ----
    const libros = [
      { w: 21, h: 1.7, d: 8.6, color: 0x8a3d3d, x: 0, y: -1.7, z: 0 },    // rojo (abajo)
      { w: 19, h: 1.6, d: 8, color: 0x3d5a8a, x: 0.3, y: -3.35, z: 0.2 }, // azul (medio)
      { w: 17, h: 1.5, d: 7.4, color: 0x4a7a4a, x: -0.3, y: -4.9, z: -0.15 }, // verde (arriba, top≈0)
    ];
    // (apilados de arriba hacia abajo: el de arriba tiene top en y=0 = plataforma)
    for (const l of libros) {
      box(l.w, l.h, l.d, l.color, l.x, l.y + l.h / 2, l.z);
      // páginas claras del costado
      box(l.w * 0.96, l.h * 0.6, 0.25, 0xe8e0cf, l.x, l.y + l.h / 2, l.z + l.d / 2 + 0.01, { shadow: false });
      // lomo con título (franja dorada)
      box(l.w * 0.4, 0.18, 0.1, 0xf2c94c, l.x, l.y + l.h / 2 + l.h * 0.2, l.z - l.d / 2 - 0.01, { shadow: false });
    }

    // ---- LIBROS INDIVIDUALES (plataformas laterales, top = 2.6) ----
    for (const [cx, color, ry] of [[-16, 0x6a4a8a, 0.06], [16, 0xb0823d, -0.06]]) {
      const libro = new THREE.Group();
      const tapa = new THREE.Mesh(new THREE.BoxGeometry(6.4, 0.5, 9), new THREE.MeshStandardMaterial({ color, roughness: 0.6 }));
      tapa.position.y = 0.25;
      const paginas = new THREE.Mesh(new THREE.BoxGeometry(5.9, 1.6, 8.6), new THREE.MeshStandardMaterial({ color: 0xe8e0cf, roughness: 0.9 }));
      paginas.position.y = 1.3;
      const tapaSup = new THREE.Mesh(new THREE.BoxGeometry(6.4, 0.5, 9), new THREE.MeshStandardMaterial({ color, roughness: 0.6 }));
      tapaSup.position.y = 2.35;
      libro.add(tapa, paginas, tapaSup);
      libro.position.set(cx, 0, 0);
      libro.rotation.y = ry;
      libro.traverse((m) => { if (m.isMesh) { m.castShadow = true; m.receiveShadow = true; } });
      g.add(libro);
    }

    // ---- LA TAZA GIGANTE (plataforma alta central, top = 5.2) ----
    const taza = new THREE.Group();
    const cuerpo = new THREE.Mesh(
      new THREE.CylinderGeometry(2.6, 2.2, 3.4, 24),
      new THREE.MeshStandardMaterial({ color: 0xe8e0cf, roughness: 0.5 }),
    );
    cuerpo.position.y = 3.4;
    // franja terracota (como la mug de vita-machines)
    const banda = new THREE.Mesh(
      new THREE.CylinderGeometry(2.63, 2.63, 0.7, 24),
      new THREE.MeshStandardMaterial({ color: 0xc46a4a, roughness: 0.6 }),
    );
    banda.position.y = 4.3;
    // café adentro (superficie oscura arriba)
    const cafe = new THREE.Mesh(
      new THREE.CylinderGeometry(2.3, 2.3, 0.15, 24),
      new THREE.MeshStandardMaterial({ color: 0x4a2c1a, roughness: 0.3 }),
    );
    cafe.position.y = 5.05;
    // asa
    const asa = new THREE.Mesh(
      new THREE.TorusGeometry(1.1, 0.28, 10, 20, Math.PI),
      new THREE.MeshStandardMaterial({ color: 0xe8e0cf, roughness: 0.5 }),
    );
    asa.position.set(2.9, 3.7, 0);
    asa.rotation.z = -Math.PI / 2;
    taza.add(cuerpo, banda, cafe, asa);
    taza.position.set(0, 0.05, -1.2);
    taza.traverse((m) => { if (m.isMesh) { m.castShadow = true; m.receiveShadow = true; } });
    g.add(taza);
    // vaporcito del café (3 esferas transparentes subiendo)
    const vaporMat = new THREE.MeshStandardMaterial({ color: 0xd8d5ce, transparent: true, opacity: 0.35, roughness: 1 });
    for (let i = 0; i < 3; i++) {
      const vapor = new THREE.Mesh(new THREE.SphereGeometry(0.3 + i * 0.12, 8, 6), vaporMat);
      vapor.position.set((i % 2 ? 0.3 : -0.3), 5.6 + i * 0.55, -1.2);
      vapor.castShadow = false;
      g.add(vapor);
    }

    // ---- LÁPIZ gigante (decorativo, a la izquierda) ----
    const lapiz = new THREE.Group();
    const cuerpoLap = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.5, 14, 8), new THREE.MeshStandardMaterial({ color: 0xf2c94c, roughness: 0.6 }));
    cuerpoLap.rotation.z = Math.PI / 2;
    const mina = new THREE.Mesh(new THREE.ConeGeometry(0.5, 1.8, 8), new THREE.MeshStandardMaterial({ color: 0xd8b08a, roughness: 0.7 }));
    mina.rotation.z = -Math.PI / 2;
    mina.position.x = 7.9;
    const puntaMina = new THREE.Mesh(new THREE.ConeGeometry(0.2, 0.7, 8), new THREE.MeshStandardMaterial({ color: 0x2b2f38, roughness: 0.5 }));
    puntaMina.rotation.z = -Math.PI / 2;
    puntaMina.position.x = 8.6;
    const goma = new THREE.Mesh(new THREE.CylinderGeometry(0.52, 0.52, 0.9, 8), new THREE.MeshStandardMaterial({ color: 0xd88a9c, roughness: 0.7 }));
    goma.rotation.z = Math.PI / 2;
    goma.position.x = -7.4;
    const ferreula = new THREE.Mesh(new THREE.CylinderGeometry(0.54, 0.54, 0.6, 8), new THREE.MeshStandardMaterial({ color: 0x9aa0a6, metalness: 0.8, roughness: 0.3 }));
    ferreula.rotation.z = Math.PI / 2;
    ferreula.position.x = -6.6;
    lapiz.add(cuerpoLap, mina, puntaMina, goma, ferreula);
    lapiz.position.set(-20, -5.4, 2.5);
    lapiz.rotation.y = 0.35;
    lapiz.rotation.z = 0.08;
    lapiz.traverse((m) => { if (m.isMesh) m.castShadow = true; });
    g.add(lapiz);

    // ---- BLOQUES DE JUGUETE (decorativos, derecha) ----
    for (const [bx, bz, color, letra] of [[22, -3, 0xd8352a, 0.2], [21, 3.5, 0x3b6fd4, -0.25], [24, 0.5, 0xf2c94c, 0.5]]) {
      const bloque = new THREE.Group();
      const cubo = new THREE.Mesh(new THREE.BoxGeometry(2.2, 2.2, 2.2), new THREE.MeshStandardMaterial({ color, roughness: 0.5 }));
      cubo.position.y = 1.1;
      // letra del bloque (cara frontal clara)
      const cara = new THREE.Mesh(new THREE.BoxGeometry(1.4, 1.4, 0.06), new THREE.MeshStandardMaterial({ color: 0xf4f1e8, roughness: 0.6 }));
      cara.position.set(0, 1.1, 1.12);
      bloque.add(cubo, cara);
      bloque.position.set(bx, -6.5, bz);
      bloque.rotation.y = letra;
      bloque.traverse((m) => { if (m.isMesh) m.castShadow = true; });
      g.add(bloque);
    }

    // ---- PLANTA en maceta (fondo izquierdo, como la de vita-machines) ----
    const maceta = new THREE.Group();
    const tiesto = new THREE.Mesh(new THREE.CylinderGeometry(1.6, 1.2, 2.2, 14), new THREE.MeshStandardMaterial({ color: 0xb0684a, roughness: 0.8 }));
    tiesto.position.y = 1.1;
    const tierra = new THREE.Mesh(new THREE.CylinderGeometry(1.4, 1.4, 0.3, 14), new THREE.MeshStandardMaterial({ color: 0x3d2c1a, roughness: 1 }));
    tierra.position.y = 2.2;
    maceta.add(tiesto, tierra);
    // hojas (conos verdes apuntando a lados)
    const hojaMat = new THREE.MeshStandardMaterial({ color: 0x3fa34d, roughness: 0.8 });
    for (let i = 0; i < 7; i++) {
      const hoja = new THREE.Mesh(new THREE.ConeGeometry(0.5, 3 + (i % 3), 5), hojaMat);
      const a = (i / 7) * Math.PI * 2;
      hoja.position.set(Math.cos(a) * 0.7, 2.4 + (i % 2) * 0.4, Math.sin(a) * 0.7);
      hoja.rotation.set(Math.sin(a) * 1.2, 0, -Math.cos(a) * 1.2);
      maceta.add(hoja);
    }
    maceta.position.set(-23, -6.5, -3);
    maceta.traverse((m) => { if (m.isMesh) m.castShadow = true; });
    g.add(maceta);

    // ---- HOJAS DE PAPEL (detalle, fondo derecho) ----
    for (const [px, ry] of [[20, 0.3], [21.5, -0.2]]) {
      const hojaP = new THREE.Mesh(new THREE.PlaneGeometry(3, 4), new THREE.MeshStandardMaterial({ color: 0xf4f1e8, roughness: 0.9, side: THREE.DoubleSide }));
      hojaP.rotation.x = -Math.PI / 2;
      hojaP.rotation.z = ry;
      hojaP.position.set(px, -6.44, -4);
      g.add(hojaP);
      // renglones escritos
      for (let l = 0; l < 4; l++) {
        box(2.2 - l * 0.2, 0.02, 0.06, 0x8a8f96, px, -6.42, -5 + l * 0.7, { shadow: false });
      }
    }

    // ---- LÁMPARA colgante (luz cálida de interior, como el living de vita-machines) ----
    const cable = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 8, 6), new THREE.MeshStandardMaterial({ color: 0x1b1d22 }));
    cable.position.set(8, 26, -6);
    g.add(cable);
    const campana = new THREE.Mesh(
      new THREE.ConeGeometry(2.6, 2.2, 18, 1, true),
      new THREE.MeshStandardMaterial({ color: 0x2b6e5c, roughness: 0.5, side: THREE.DoubleSide }),
    );
    campana.position.set(8, 21.5, -6);
    g.add(campana);
    // bombilla cálida brillante (brilla con el bloom)
    const bombilla = new THREE.Mesh(
      new THREE.SphereGeometry(0.7, 12, 10),
      new THREE.MeshStandardMaterial({ color: 0xfff1c9, emissive: 0xffd98a, emissiveIntensity: 2.2, roughness: 0.3 }),
    );
    bombilla.position.set(8, 20.8, -6);
    g.add(bombilla);
    // halo de luz cálida bajo la lámpara (disco suave sobre la mesa)
    const halo = new THREE.Mesh(
      new THREE.CircleGeometry(9, 32),
      new THREE.MeshBasicMaterial({ color: 0xffd98a, transparent: true, opacity: 0.1 }),
    );
    halo.rotation.x = -Math.PI / 2;
    halo.position.set(8, -6.42, -4);
    g.add(halo);

    // zona de KO (solo en modo debug)
    const b = stage.blast;
    const blast = new THREE.LineSegments(
      new THREE.EdgesGeometry(new THREE.BoxGeometry(b.right - b.left, b.top - b.bottom, 0.1)),
      new THREE.LineBasicMaterial({ color: 0xff3b3b }),
    );
    blast.position.set((b.left + b.right) / 2, (b.top + b.bottom) / 2, 0);
    blast.visible = this.debug;
    blast.name = 'blast';
    g.add(blast);

    this.stageGroup = g;
    this.scene.add(g);
  }

  /** Helper: devuelve una función `box` que agrega meshes a un grupo dado. */
  makeGrouper(group) {
    return (w, h, d, color, x, y, z, opts = {}) => {
      const { shadow, ...matOpts } = opts;
      const m = new THREE.Mesh(
        new THREE.BoxGeometry(w, h, d),
        new THREE.MeshStandardMaterial({ color, roughness: 0.85, metalness: 0, ...matOpts }),
      );
      m.position.set(x, y, z);
      m.castShadow = shadow ?? true;
      m.receiveShadow = true;
      group.add(m);
      return m;
    };
  }

  /** Asfalto procedural: gris con ruido, manchas de aceite y grietas. */
  makeAsphaltTexture() {
    const c = document.createElement('canvas');
    c.width = c.height = 256;
    const ctx = c.getContext('2d');
    ctx.fillStyle = '#4a4d52';
    ctx.fillRect(0, 0, 256, 256);
    // ruido de granulado
    let s = 13;
    const rnd = () => ((s = (s * 16807) % 2147483647) / 2147483647);
    for (let i = 0; i < 2600; i++) {
      const v = rnd();
      ctx.fillStyle = v > 0.5 ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.09)';
      ctx.fillRect(rnd() * 256, rnd() * 256, 1.6, 1.6);
    }
    // manchas de aceite
    for (let i = 0; i < 7; i++) {
      ctx.fillStyle = 'rgba(20,22,26,0.16)';
      ctx.beginPath();
      ctx.ellipse(rnd() * 256, rnd() * 256, 12 + rnd() * 26, 8 + rnd() * 16, rnd() * 3, 0, 7);
      ctx.fill();
    }
    // grietas oscuras
    ctx.strokeStyle = 'rgba(25,27,31,0.55)';
    ctx.lineWidth = 1.4;
    for (let i = 0; i < 6; i++) {
      ctx.beginPath();
      let x = rnd() * 256, y = rnd() * 256;
      ctx.moveTo(x, y);
      for (let k = 0; k < 5; k++) { x += (rnd() - 0.5) * 46; y += (rnd() - 0.5) * 46; ctx.lineTo(x, y); }
      ctx.stroke();
    }
    const tex = new THREE.CanvasTexture(c);
    tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
    tex.colorSpace = THREE.SRGBColorSpace;
    return tex;
  }

  /** Pasto procedural: verde base con pinceladas de tonos (claro/oscuro). */
  makeGrassTexture() {
    const c = document.createElement('canvas');
    c.width = c.height = 256;
    const ctx = c.getContext('2d');
    ctx.fillStyle = '#58c24e';
    ctx.fillRect(0, 0, 256, 256);
    let s = 29;
    const rnd = () => ((s = (s * 16807) % 2147483647) / 2147483647);
    const tones = ['#4fb345', '#63d35a', '#55bd4a', '#6adb60', '#49a83f'];
    for (let i = 0; i < 900; i++) {
      ctx.strokeStyle = tones[(rnd() * tones.length) | 0];
      ctx.lineWidth = 1.6;
      const x = rnd() * 256, y = rnd() * 256;
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(x + (rnd() - 0.5) * 3, y - 3 - rnd() * 4);
      ctx.stroke();
    }
    const tex = new THREE.CanvasTexture(c);
    tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
    tex.colorSpace = THREE.SRGBColorSpace;
    return tex;
  }

  /** Sombra de contacto (radial negro con bordes suaves). */
  makeBlobTexture() {
    const c = document.createElement('canvas');
    c.width = c.height = 128;
    const ctx = c.getContext('2d');
    const grad = ctx.createRadialGradient(64, 64, 8, 64, 64, 62);
    grad.addColorStop(0, 'rgba(0,0,0,0.55)');
    grad.addColorStop(0.7, 'rgba(0,0,0,0.28)');
    grad.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 128, 128);
    const tex = new THREE.CanvasTexture(c);
    return tex;
  }

  /** Degradado vertical de cielo (canvas 1x256 estirado a toda la pantalla). */
  makeSkyTexture() {
    const c = document.createElement('canvas');
    c.width = 1; c.height = 256;
    const ctx = c.getContext('2d');
    const grad = ctx.createLinearGradient(0, 0, 0, 256);
    grad.addColorStop(0, '#2f8fdd');   // celeste más profundo arriba
    grad.addColorStop(0.45, '#6cc0f5');
    grad.addColorStop(0.8, '#bfe4fb');
    grad.addColorStop(1, '#eaf7ff');   // casi blanco cálido en el horizonte
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 1, 256);
    const tex = new THREE.CanvasTexture(c);
    tex.colorSpace = THREE.SRGBColorSpace;
    return tex;
  }

  /** Textura de nube suave (puffy) dibujada en canvas: varios círculos con
   *  gradiente radial que se funden — mucho más real que esferas duras. */
  makeCloudTexture() {
    const c = document.createElement('canvas');
    c.width = 256; c.height = 128;
    const ctx = c.getContext('2d');
    ctx.clearRect(0, 0, 256, 128);
    const puff = (x, y, r, a) => {
      const g = ctx.createRadialGradient(x, y, r * 0.15, x, y, r);
      g.addColorStop(0, `rgba(255,255,255,${a})`);
      g.addColorStop(0.75, `rgba(250,252,255,${a * 0.7})`);
      g.addColorStop(1, 'rgba(245,250,255,0)');
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.fill();
    };
    // forma de nube clásica: base ancha + bultos arriba
    puff(72, 92, 40, 0.95);
    puff(112, 74, 46, 1);
    puff(156, 70, 42, 1);
    puff(190, 88, 36, 0.95);
    puff(128, 96, 50, 0.9);
    puff(96, 100, 36, 0.85);
    puff(160, 100, 38, 0.85);
    const tex = new THREE.CanvasTexture(c);
    tex.colorSpace = THREE.SRGBColorSpace;
    return tex;
  }

  /** Pájaro simple en V con aleteo (dos planos, MeshBasic negro). */
  makeBird() {
    const group = new THREE.Group();
    const mat = new THREE.MeshBasicMaterial({ color: 0x22303c, side: THREE.DoubleSide });
    const wingL = new THREE.Mesh(new THREE.PlaneGeometry(1.1, 0.28), mat);
    const wingR = new THREE.Mesh(new THREE.PlaneGeometry(1.1, 0.28), mat);
    wingL.position.x = -0.5;
    wingR.position.x = 0.5;
    group.add(wingL, wingR);
    return { group, wingL, wingR };
  }

  /** Reja/cerco bajo estilo predio (postes + barras horizontales), fiel a Los
   *  Mormones: ~2m de alto, blanco como el templo, recorre el ancho del terreno. */
  makeFence(length, height, color) {
    const group = new THREE.Group();
    const mat = new THREE.MeshStandardMaterial({ color, roughness: 0.55, metalness: 0.35 });
    // postes verticales cada ~2.4 unidades
    const step = 2.4;
    const count = Math.max(2, Math.floor(length / step));
    for (let i = 0; i <= count; i++) {
      const x = -length / 2 + (i * length) / count;
      const post = new THREE.Mesh(new THREE.BoxGeometry(0.16, height, 0.16), mat);
      post.position.set(x, height / 2, 0);
      post.castShadow = true;
      group.add(post);
      // capitel simple arriba de cada poste (detalle)
      const cap = new THREE.Mesh(new THREE.BoxGeometry(0.26, 0.1, 0.26), mat);
      cap.position.set(x, height + 0.05, 0);
      group.add(cap);
    }
    // 2 barras horizontales (abajo y arriba del cerco)
    for (const y of [height * 0.35, height * 0.9]) {
      const rail = new THREE.Mesh(new THREE.BoxGeometry(length, 0.09, 0.09), mat);
      rail.position.set(0, y, 0);
      group.add(rail);
    }
    return group;
  }

  /** Templo de Buenos Aires: cuerpo blanco, frontón, agujas con ventanales, ángel dorado. */
  makeTemple() {
    const t = new THREE.Group();
    // mármol blanco PBR para el templo (como el templo real de Los Mormones)
    const marbleTex = this.stageTex?.marble;
    const blanco = marbleTex
      ? new THREE.MeshStandardMaterial({ map: marbleTex.clone(), roughness: 0.45, metalness: 0.05, color: 0xf4f2ec })
      : new THREE.MeshStandardMaterial({ color: 0xeceae4, roughness: 0.7, metalness: 0.05 });
    if (blanco.map) blanco.map.repeat.set(2, 2);
    const gris = new THREE.MeshStandardMaterial({ color: 0xd8d5ce, roughness: 0.8, metalness: 0.05 });
    const vidrio = new THREE.MeshStandardMaterial({ color: 0x2e3d54, roughness: 0.25, metalness: 0.4 });

    const add = (geo, mat, x, y, z) => {
      const m = new THREE.Mesh(geo, mat);
      m.position.set(x, y, z);
      m.castShadow = true;
      t.add(m);
      return m;
    };

    // cerco perimetral bajo (como en la foto)
    add(new THREE.BoxGeometry(30, 1.1, 0.5), blanco, 0, 0.55, 5.5);
    add(new THREE.BoxGeometry(0.5, 1.1, 11), blanco, -15, 0.55, 0);
    add(new THREE.BoxGeometry(0.5, 1.1, 11), blanco, 15, 0.55, 0);

    // cuerpo principal
    add(new THREE.BoxGeometry(24, 7, 7), blanco, 0, 3.5, 0);

    // ventanales verticales altos (rasgo típico del templo)
    for (let i = -5; i <= 5; i++) {
      if (i === 0) continue;
      add(new THREE.BoxGeometry(0.85, 3.6, 0.25), vidrio, i * 2.05, 4.1, 3.56);
    }
    // puerta central
    add(new THREE.BoxGeometry(2.3, 4, 0.3), vidrio, 0, 3, 3.58);

    // techo a dos aguas (prisma triangular) con ventana circular
    const tri = new THREE.Shape();
    tri.moveTo(-12.4, 0); tri.lineTo(0, 4.2); tri.lineTo(12.4, 0); tri.closePath();
    const roof = new THREE.Mesh(new THREE.ExtrudeGeometry(tri, { depth: 7, bevelEnabled: false }), gris);
    roof.position.set(0, 7, -3.5);
    roof.castShadow = true;
    t.add(roof);
    const round = new THREE.Mesh(new THREE.CylinderGeometry(0.9, 0.9, 0.3, 20), vidrio);
    round.rotation.x = Math.PI / 2;
    round.position.set(0, 8.4, 3.6);
    t.add(round);

    // anexo lateral derecho (más bajo)
    add(new THREE.BoxGeometry(10, 4.5, 6), blanco, 16, 2.25, 0);
    add(new THREE.BoxGeometry(10.6, 0.8, 6.6), gris, 16, 4.8, 0);
    for (let i = 0; i < 3; i++) add(new THREE.BoxGeometry(0.8, 2.4, 0.25), vidrio, 13.5 + i * 2.5, 2.4, 3.06);

    // agujas: base + tramo medio + ventanal + punta cónica.
    // baseY = altura de la superficie donde se APOYA la aguja (antes era fijo y=7
    // del cuerpo principal, y las agujas del anexo quedaban FLOTANDO 2.2 unidades)
    const spire = (x, z, base, mid, tip, baseY) => {
      // la base se entierra 0.6 en el techo para que nunca quede flotando
      const sunk = 0.6;
      add(new THREE.BoxGeometry(1.9, base + sunk, 1.9), blanco, x, baseY + (base + sunk) / 2 - sunk, z);
      add(new THREE.BoxGeometry(1.1, mid, 1.1), blanco, x, baseY + base + mid / 2, z);
      add(new THREE.BoxGeometry(0.6, mid * 0.7, 0.15), vidrio, x, baseY + base + mid / 2, z + 0.6);
      add(new THREE.ConeGeometry(0.65, tip, 4), gris, x, baseY + base + mid + tip / 2, z);
      return baseY + base + mid + tip;
    };
    // torre central (la más alta) con ángel Moroni dorado — apoyada en y=7 (cuerpo)
    const topY = spire(0, 0, 7, 5.5, 5, 7);
    const angel = new THREE.Mesh(
      new THREE.CapsuleGeometry(0.28, 0.9, 4, 8),
      new THREE.MeshStandardMaterial({ color: 0xf2c94c, metalness: 0.85, roughness: 0.25 }),
    );
    angel.position.set(0, topY + 0.8, 0);
    t.add(angel);
    // torres laterales sobre el cuerpo — apoyadas en y=7 (techo del cuerpo principal)
    spire(-8.5, 0, 4.5, 3.5, 3.5, 7);
    spire(8.5, 0, 4.5, 3.5, 3.5, 7);
    // agujas chicas del anexo — apoyadas en y=4.8 (techo del anexo, NO en y=7:
    // ese era el bug que las dejaba flotando)
    spire(13.5, 0, 3, 2.5, 2.5, 4.8);
    spire(18.5, 0, 3, 2.5, 2.5, 4.8);

    return t;
  }

  /** Palmera simple: tronco + hojas cónicas aplanadas. */
  makePalm(h = 5) {
    const p = new THREE.Group();
    const trunk = new THREE.Mesh(
      new THREE.CylinderGeometry(0.22, 0.34, h, 7),
      new THREE.MeshStandardMaterial({ color: 0x8a6a45, roughness: 0.9 }),
    );
    trunk.position.y = h / 2;
    trunk.castShadow = true;
    p.add(trunk);
    const leafMat = new THREE.MeshStandardMaterial({ color: 0x3fa34d, roughness: 0.8 });
    for (let i = 0; i < 6; i++) {
      const leaf = new THREE.Mesh(new THREE.ConeGeometry(0.5, 2.8, 5), leafMat);
      const a = (i / 6) * Math.PI * 2;
      leaf.position.set(Math.cos(a) * 1.2, h + 0.25, Math.sin(a) * 1.2);
      leaf.rotation.set(Math.sin(a) * 1.15, 0, -Math.cos(a) * 1.15);
      p.add(leaf);
    }
    return p;
  }

  /** Auto detallado: cuerpo + cabina + paragolpes + faros emissive + ruedas. */
  makeCar(color) {    const c = new THREE.Group();
    const body = new THREE.Mesh(
      new THREE.BoxGeometry(3.2, 0.8, 1.5),
      new THREE.MeshStandardMaterial({ color, roughness: 0.35, metalness: 0.45 }),
    );
    body.position.y = 0.75;
    body.castShadow = true;
    c.add(body);
    const cabin = new THREE.Mesh(
      new THREE.BoxGeometry(1.7, 0.65, 1.35),
      new THREE.MeshStandardMaterial({ color: 0x9fc6e8, roughness: 0.15, metalness: 0.35 }),
    );
    cabin.position.set(-0.2, 1.45, 0);
    cabin.castShadow = true;
    c.add(cabin);
    // paragolpes (más oscuros)
    const bumperMat = new THREE.MeshStandardMaterial({ color: 0x2b2e33, roughness: 0.6, metalness: 0.5 });
    const bFront = new THREE.Mesh(new THREE.BoxGeometry(0.35, 0.4, 1.55), bumperMat);
    bFront.position.set(1.68, 0.5, 0);
    c.add(bFront);
    const bBack = new THREE.Mesh(new THREE.BoxGeometry(0.35, 0.4, 1.55), bumperMat);
    bBack.position.set(-1.68, 0.5, 0);
    c.add(bBack);
    // faros delanteros (emissive: brillan con el bloom)
    const headMat = new THREE.MeshStandardMaterial({
      color: 0xfff6c9, emissive: 0xffe27a, emissiveIntensity: 1.6, roughness: 0.2,
    });
    for (const z of [-0.5, 0.5]) {
      const h = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.22, 0.34), headMat);
      h.position.set(1.62, 0.85, z);
      c.add(h);
    }
    // faros traseros (rojos)
    const tailMat = new THREE.MeshStandardMaterial({
      color: 0x8a1616, emissive: 0xd8352a, emissiveIntensity: 0.9, roughness: 0.2,
    });
    for (const z of [-0.5, 0.5]) {
      const t = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.2, 0.3), tailMat);
      t.position.set(-1.62, 0.85, z);
      c.add(t);
    }
    // patente blanca atrás
    const plate = new THREE.Mesh(
      new THREE.BoxGeometry(0.06, 0.22, 0.5),
      new THREE.MeshStandardMaterial({ color: 0xf4f1e8, roughness: 0.5 }),
    );
    plate.position.set(-1.79, 0.55, 0);
    c.add(plate);
    // ruedas
    const wheelGeo = new THREE.CylinderGeometry(0.38, 0.38, 0.3, 10);
    const wheelMat = new THREE.MeshStandardMaterial({ color: 0x1b1d22, roughness: 0.9 });
    const hubMat = new THREE.MeshStandardMaterial({ color: 0x8f959c, roughness: 0.3, metalness: 0.7 });
    for (const [wx, wz] of [[-1.05, 0.75], [1.05, 0.75], [-1.05, -0.75], [1.05, -0.75]]) {
      const w = new THREE.Mesh(wheelGeo, wheelMat);
      w.rotation.x = Math.PI / 2;
      w.position.set(wx, 0.38, wz);
      c.add(w);
      const hub = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.16, 0.32, 8), hubMat);
      hub.rotation.x = Math.PI / 2;
      hub.position.set(wx, 0.38, wz);
      c.add(hub);
    }
    return c;
  }

  /** Textura del cartel de ruta (azul con texto blanco, lore del barrio). */
  makeSignTexture() {
    const c = document.createElement('canvas');
    c.width = 512; c.height = 320;
    const ctx = c.getContext('2d');
    ctx.fillStyle = '#1d5fbf';
    ctx.fillRect(0, 0, 512, 320);
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 10;
    ctx.strokeRect(8, 8, 496, 304);
    ctx.fillStyle = '#ffffff';
    ctx.textAlign = 'center';
    ctx.font = '900 52px Arial, sans-serif';
    ctx.fillText('CIUDAD EVITA', 256, 90);
    ctx.font = '700 34px Arial, sans-serif';
    ctx.fillText('Los Mormones', 256, 155);
    ctx.fillText('Templo 400 m', 256, 210);
    ctx.font = '900 44px Arial, sans-serif';
    ctx.fillText('↓ salida ↓', 256, 285);
    const tex = new THREE.CanvasTexture(c);
    tex.colorSpace = THREE.SRGBColorSpace;
    return tex;
  }

  /** Mueve las nubes lentamente; recicla cuando salen de cuadro. */
  updateClouds(dt) {
    if (!this.clouds) return;
    for (const c of this.clouds) {
      c.group.position.x += c.speed * dt;
      if (c.group.position.x > 70) c.group.position.x = -70;
    }
  }

  /** Muestra los 4 personajes paraditos en el escenario (fondo del lobby). */
  showLineup() {
    this.clearLineup();
    this.lineup = new THREE.Group();
    const spots = [
      ['pablo', -5.2],
      ['coco', -1.8],
      ['faxo', 1.8],
      ['domono', 5.2],
    ];
    this.lineupBobs = [];
    for (const [id, x] of spots) {
      const builder = FIGHTER_BUILDERS[id];
      if (!builder) continue;
      const model = builder();
      model.group.position.set(x, 0, 1.6);
      model.group.rotation.y = Math.PI * 0.06 * (x < 0 ? 1 : -1);
      this.lineup.add(model.group);
      this.lineupBobs.push({ group: model.group, baseY: 0, phase: Math.abs(x) * 0.9 });
    }
    this.scene.add(this.lineup);
    // VISTA LEJANA DEL MAPA en el lobby: la cámara se aleja mostrando todo el
    // escenario (estilo "establishing shot"); al empezar la pelea se acerca sola
    this.cinematicView = { focus: new THREE.Vector3(0, 0.5, 0), distance: 44, elevation: 9 };
    // posición inicial ya lejos (el render suaviza hacia este punto)
    this.rig.focus.set(0, 1.2, 0);
    this.rig.distance = Math.max(this.rig.distance, 44);
  }

  /** Saca el lineup (al arrancar la partida). */
  clearLineup() {
    if (!this.lineup) return;
    this.scene.remove(this.lineup);
    this.lineup.traverse((o) => { o.geometry?.dispose(); o.material?.dispose?.(); });
    this.lineup = null;
    this.lineupBobs = [];
  }

  /** Bob sutil de los personajes en el lobby (llamado cada frame desde main). */
  updateLineup(dt) {
    if (!this.lineupBobs) return;
    const t = performance.now() / 1000;
    for (const b of this.lineupBobs) {
      b.group.position.y = b.baseY + Math.abs(Math.sin(t * 2.2 + b.phase)) * 0.12;
    }
  }

  /** Dibuja los autos del tráfico (hazards del Match, estilo Onett).
   *  Usa los GLB de Vita Machines cuando ya cargaron; si no, el auto procedural. */
  drawCars(match, alpha) {
    const seen = new Set();
    const carColors = [0xd8352a, 0xf4f1e8, 0x4d8bff, 0xf2c94c, 0x2dd4bf, 0xe5449d, 0x3fa34d];
    const poolIds = CAR_MODEL_FILES.map((d) => d.id);
    const floorTop = match.stage.solids[0]?.top ?? 0;
    for (const c of match.cars) {
      seen.add(c.id);
      let mesh = this.carMeshes.get(c.id);
      if (!mesh) {
        mesh = this.makeTrafficCar(c.id, carColors, poolIds);
        this.scene.add(mesh);
        this.carMeshes.set(c.id, mesh);
      }
      mesh.position.set(c.prevX + (c.x - c.prevX) * alpha, floorTop, 0.8);
      mesh.rotation.y = c.dir > 0 ? 0 : Math.PI;
    }
    for (const [id, mesh] of this.carMeshes) {
      if (seen.has(id)) continue;
      this.scene.remove(mesh);
      mesh.traverse((o) => { o.geometry?.dispose(); o.material?.dispose?.(); });
      this.carMeshes.delete(id);
    }
  }

  /** Crea el mesh de un auto del tráfico: GLB de Vita Machines si está listo, si no el procedural. */
  makeTrafficCar(id, carColors, poolIds) {
    const poolId = poolIds[id % poolIds.length];
    const def = CAR_MODEL_FILES.find((d) => d.id === poolId);
    const src = this.carModelPool?.get(poolId);
    if (src) {
      const clone = src.clone(true);
      if (def?.rotY) clone.rotation.y = def.rotY;
      const holder = new THREE.Group();
      holder.add(clone);
      return holder;
    }
    // fallback mientras cargan los GLB
    return this.makeCar(carColors[id % carColors.length]);
  }

  /** Pájaros cruzando el cielo con aleteo; recicla al salir de cuadro. */
  updateBirds(dt) {
    if (!this.birds) return;
    const t = performance.now() / 1000;
    for (const b of this.birds) {
      b.group.position.x += b.speed * dt;
      if (b.group.position.x > 85) {
        b.group.position.x = -85;
        b.group.position.y = 11 + Math.random() * 9;
      }
      // aleteo: las alas suben y bajan
      const flap = Math.sin(t * 9 + b.phase) * 0.55;
      b.wingL.rotation.z = 0.35 + flap;
      b.wingR.rotation.z = -0.35 - flap;
    }
  }

  // ------------------------------------------------------------------ peleadores

  setPlayers(match) {
    this._lastMatch = match;
    // al empezar la pelea se apaga la vista lejana del lobby: la cámara vuelve al
    // encuadre automático de los peleadores (efecto de acercarse al ring)
    this.cinematicView = null;
    for (const v of this.views) this.scene.remove(v.group);
    for (const v of this.views) this.scene.remove(v.debugHurt, v.debugHit);
    this.views = match.fighters.map((f) => this.makeView(f));
    this.rig.focus.set(0, 3, 0);
  }

  makeView(f) {
    // Personaje con modelo propio (Kenai y los de Vita Machines) o cápsula provisoria
    const builder = FIGHTER_BUILDERS[f.characterId];
    if (builder) return this.makeFighterView(f, builder);
    return this.makeCapsuleView(f);
  }

  /** Helpers compartidos por todas las vistas. */
  makeEdges(color) {
    const l = new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.BoxGeometry(1, 1, 1)), new THREE.LineBasicMaterial({ color }));
    l.visible = false;
    this.scene.add(l);
    return l;
  }

  makeBlob() {
    if (!this.blobTex) this.blobTex = this.makeBlobTexture();
    const blob = new THREE.Mesh(
      new THREE.PlaneGeometry(1, 1),
      new THREE.MeshBasicMaterial({ map: this.blobTex, transparent: true, depthWrite: false }),
    );
    blob.rotation.x = -Math.PI / 2;
    this.scene.add(blob);
    return blob;
  }

  makeSlotRing(f) {
    const slot = GAME_CONFIG.players[f.index % GAME_CONFIG.players.length];
    const ring = new THREE.Mesh(
      new THREE.TorusGeometry(f.spec.width * 0.62, 0.07, 8, 28),
      new THREE.MeshBasicMaterial({ color: new THREE.Color(slot.color) }),
    );
    ring.rotation.x = Math.PI / 2;
    ring.position.y = 0.06;
    return ring;
  }

  /** Vista de personaje con modelo detallado (Kenai, Coco, Domono, Faxo). */
  /** Vista de personaje: GLB si ya cargó, si no el modelo primitivo (luego se hace swap en caliente). */
  makeFighterView(f, builder) {
    const spec = f.spec;
    const color = new THREE.Color(spec.color);
    const entry = this.fighterModelPool?.get(f.characterId);
    if (entry) {
      const model = entry.scene.clone(true);
      const pivot = new THREE.Group();
      pivot.add(model);
      const ring = this.makeSlotRing(f);
      const group = new THREE.Group();
      group.add(pivot, ring);
      this.scene.add(group);
      const blob = this.makeBlob();
      // clones de materiales para que el flash/tinte de un jugador no afecte a otros
      const mats = [];
      const matMap = new Map();
      model.traverse((o) => {
        if (!o.isMesh) return;
        o.castShadow = true;
        const cloneMat = (m) => {
          if (!matMap.has(m)) {
            const c = m.clone();
            c.userData.base = c.color.clone();
            matMap.set(m, c);
          }
          return matMap.get(m);
        };
        if (Array.isArray(o.material)) o.material = o.material.map(cloneMat);
        else o.material = cloneMat(o.material);
      });
      for (const m of matMap.values()) mats.push(m);
      return {
        group, pivot, ring, blob,
        mat: mats[0] ?? new THREE.MeshStandardMaterial({ color: spec.color }),
        mats,
        isKenai: true,
        baseColor: color,
        turn: f.facing > 0 ? 0 : Math.PI,
        debugHurt: this.makeEdges(0x44ff77),
        debugHit: this.makeEdges(0xff4444),
      };
    }
    // fallback: modelo primitivo (cuando el GLB cargue se hace swap en caliente)
    const model = builder();
    const group = new THREE.Group();
    const pivot = new THREE.Group();
    pivot.add(model.group);
    const ring = this.makeSlotRing(f);
    group.add(pivot, ring);
    this.scene.add(group);
    const blob = this.makeBlob();
    return {
      group, pivot, ring, blob,
      mat: model.hoodieMat,
      mats: model.mats,
      isKenai: true,
      baseColor: color,
      turn: f.facing > 0 ? 0 : Math.PI,
      debugHurt: this.makeEdges(0x44ff77),
      debugHit: this.makeEdges(0xff4444),
    };
  }

  /** Compatibilidad con el nombre anterior. */
  makeKenaiView(f) {
    return this.makeFighterView(f, buildKenai);
  }

  /** Vista cápsula provisoria para el resto de los personajes. */
  makeCapsuleView(f) {
    const spec = f.spec;
    const group = new THREE.Group();
    const color = new THREE.Color(spec.color);
    const mat = new THREE.MeshStandardMaterial({ color, roughness: 0.55, metalness: 0.05, emissive: 0x000000 });
    const body = new THREE.Mesh(new THREE.CapsuleGeometry(spec.width / 2, spec.height - spec.width, 6, 14), mat);
    body.position.y = spec.height / 2;
    body.castShadow = true;
    const visor = new THREE.Mesh(
      new THREE.BoxGeometry(0.34, 0.2, 0.62),
      new THREE.MeshStandardMaterial({ color: 0x1b1d22, roughness: 0.3 }),
    );
    visor.position.set(spec.width * 0.34, spec.height * 0.78, 0);
    const pivot = new THREE.Group(); // lo que se inclina / aplasta / mira hacia un lado
    pivot.add(body, visor);
    const ring = this.makeSlotRing(f);
    group.add(pivot, ring);
    this.scene.add(group);
    const blob = this.makeBlob();
    return { group, pivot, body, mat, ring, blob, baseColor: color, turn: f.facing > 0 ? 0 : Math.PI, debugHurt: this.makeEdges(0x44ff77), debugHit: this.makeEdges(0xff4444) };
  }

  /** Altura del piso más alto debajo del personaje (para la sombra de contacto). */
  floorYUnder(fighter, stage) {
    let y = -Infinity;
    const hw = fighter.width / 2;
    for (const s of stage.solids) {
      if (fighter.x + hw > s.l && fighter.x - hw < s.r && fighter.y >= s.top - 0.01) y = Math.max(y, s.top);
    }
    for (const o of stage.oneWays) {
      if (fighter.x + hw > o.l && fighter.x - hw < o.r && fighter.y >= o.top - 0.01) y = Math.max(y, o.top);
    }
    return y === -Infinity ? stage.solids[0]?.top ?? 0 : y;
  }

  // ------------------------------------------------------------------ cuadro

  /**
   * @param match estado de la simulación
   * @param alpha 0..1: cuánto avanzó el cuadro actual entre dos pasos fijos (interpolación)
   * @param dt segundos reales desde el cuadro anterior
   */
  render(match, alpha, dt) {
    const f = match.fighters;
    const targets = [];

    f.forEach((fighter, i) => {
      const v = this.views[i];
      if (!v) return;
      const visible = fighter.alive;
      v.group.visible = visible;
      if (v.blob) v.blob.visible = visible;
      if (!visible) return;
      const x = fighter.prevX + (fighter.x - fighter.prevX) * alpha;
      const y = fighter.prevY + (fighter.y - fighter.prevY) * alpha;
      v.group.position.set(x, y, 0);
      targets.push({ x, y: y + fighter.height * 0.5 });

      // girar hacia donde mira
      const goal = fighter.facing > 0 ? 0 : Math.PI;
      let d = goal - v.turn;
      v.turn += d * (1 - Math.exp(-22 * dt));
      v.pivot.rotation.y = v.turn;

      // inclinación y aplastado según lo que hace
      let lean = 0;
      let sx = 1;
      let sy = 1;
      const t = performance.now() / 1000;
      if (fighter.state === 'run') {
        lean = -0.12 * fighter.facing;
        sy = 1 + Math.sin(t * 22) * 0.03;
      } else if (fighter.state === 'air') {
        const s = Math.max(-0.15, Math.min(0.15, fighter.vy * 0.012));
        sy = 1 + s;
        sx = 1 - s * 0.6;
      } else if (fighter.state === 'attack' && fighter.attack) {
        const m = MOVES[fighter.attack.id];
        const fr = fighter.attack.frame;
        const active = fr >= m.startup && fr < m.startup + m.active;
        lean = (active ? -0.35 : fr < m.startup ? 0.18 : -0.1) * fighter.facing;
        if (fighter.attack.id === 'up' || fighter.attack.id === 'upSpecial') lean *= 0.3;
      } else if (fighter.state === 'hitstun') {
        lean = (fighter.vx >= 0 ? 1 : -1) * 0.5 * (-1);
        sx = 1.08;
        sy = 0.92;
      }
      v.pivot.rotation.z += (lean - v.pivot.rotation.z) * (1 - Math.exp(-18 * dt));
      // tamaño del stance (Gordo/Flaco cambian el ancho y el alto reales) + bloque aplastado
      const wr = fighter.width / fighter.spec.width;
      const hr = fighter.height / fighter.spec.height;
      const block = fighter.state === 'blockForm';
      v.pivot.scale.set(sx * wr * (block ? 1.12 : 1), sy * hr * (block ? 0.82 : 1), wr);

      // color: hitstun = flash blanco-rojo · invulnerable = parpadeo · porcentaje alto = más rojizo
      const flash = fighter.state === 'hitstun' || fighter.hitlag > 0;
      const invOp = fighter.invuln > 0 ? (Math.floor(t * 14) % 2 ? 0.35 : 0.8) : 1;
      if (v.isKenai) {
        // Kenai tiene varios materiales: flash/opacity a todos, tinte de stance solo al hoodie
        for (const m of v.mats) {
          m.emissive.setRGB(flash ? 0.55 : 0, flash ? 0.12 : 0, flash ? 0.1 : 0);
          m.color.copy(m.userData.base);
          if (block) m.color.lerp(this.tmpColor.set(0x8d9096), 0.75);
          m.transparent = fighter.invuln > 0;
          m.opacity = invOp;
        }
        if (fighter.stance === 'gordo') v.mat.color.lerp(this.tmpColor.set(0x6b3a10), 0.3);
        else if (fighter.stance === 'flaco') v.mat.color.lerp(this.tmpColor.set(0xffe6b8), 0.3);
      } else {
        v.mat.emissive.setRGB(flash ? 0.55 : 0, flash ? 0.12 : 0, flash ? 0.1 : 0);
        v.mat.color.copy(v.baseColor).lerp(new THREE.Color(0xd8352a), Math.min(0.35, fighter.percent / 600));
        if (fighter.stance === 'gordo') v.mat.color.lerp(new THREE.Color(0x6b3a10), 0.3);
        else if (fighter.stance === 'flaco') v.mat.color.lerp(new THREE.Color(0xffe6b8), 0.3);
        if (block) v.mat.color.lerp(new THREE.Color(0x8d9096), 0.75);
        v.mat.transparent = fighter.invuln > 0;
        v.mat.opacity = invOp;
      }

      // sombra de contacto: sigue al personaje, se achica y desvanece con la altura
      if (v.blob) {
        const floorY = this.floorYUnder(fighter, match.stage);
        const heightAbove = Math.max(0, y - floorY);
        const spread = Math.max(0.35, 1 - heightAbove * 0.055);
        v.blob.position.set(x, floorY + 0.03, 0.9);
        v.blob.scale.set(fighter.width * 2.1 * spread, fighter.width * 2.1 * spread, 1);
        v.blob.material.opacity = Math.max(0, 0.85 - heightAbove * 0.06);
      }

      // cajas de debug
      v.debugHurt.visible = this.debug;
      if (this.debug) {
        const hb = fighter.hurtbox();
        v.debugHurt.position.set((hb.l + hb.r) / 2, (hb.b + hb.t) / 2, 0.5);
        v.debugHurt.scale.set(hb.r - hb.l, hb.t - hb.b, 0.4);
      }
      const hit = this.debug ? fighter.hitbox() : null;
      v.debugHit.visible = !!hit;
      if (hit) {
        v.debugHit.position.set((hit.l + hit.r) / 2, (hit.b + hit.t) / 2, 0.5);
        v.debugHit.scale.set(hit.r - hit.l, hit.t - hit.b, 0.5);
      }
    });

    this.drawProjectiles(match, alpha);
    this.drawCars(match, alpha);
    this.updateParticles(dt);
    this.updateClouds(dt);
    this.updateBirds(dt);
    // Vista cinematográfica (lobby): la cámara queda LEJOS mostrando todo el mapa,
    // ignorando el encuadre automático de los peleadores hasta que empiece la pelea
    if (this.cinematicView) {
      const cv = this.cinematicView;
      const k = 1 - Math.exp(-2.2 * dt);
      this.rig.focus.x += (cv.focus.x - this.rig.focus.x) * k;
      this.rig.focus.y += (cv.focus.y - this.rig.focus.y) * k;
      this.rig.distance += (cv.distance - this.rig.distance) * k;
      this.rig.camera.position.set(this.rig.focus.x, this.rig.focus.y + cv.elevation, this.rig.distance);
      this.rig.camera.lookAt(this.rig.focus.x, this.rig.focus.y + cv.elevation * 0.4, 0);
    } else {
      this.rig.update(dt, targets, match.stage, false);
    }

    // ---- parallax de fondo (estilo Smash: el fondo sigue apenas a la cámara) ----
    const fx = this.rig.focus.x;
    const fy = this.rig.focus.y;
    if (this.bgMid) this.bgMid.position.set(fx * 0.7, fy * 0.18, 0);
    if (this.bgFar) this.bgFar.position.set(fx * 0.88, fy * 0.32, 0);
    const blast = this.stageGroup?.getObjectByName('blast');
    if (blast) blast.visible = this.debug;
    this.composer.render();
  }

  drawProjectiles(match, alpha) {
    const seen = new Set();
    for (const p of match.projectiles) {
      seen.add(p.id);
      let mesh = this.projectileMeshes.get(p.id);
      if (!mesh) {
        const r = MOVES[p.move].projectile.radius;
        mesh = new THREE.Mesh(new THREE.SphereGeometry(r, 14, 10), new THREE.MeshBasicMaterial({ color: 0xffd23c }));
        this.scene.add(mesh);
        this.projectileMeshes.set(p.id, mesh);
      }
      mesh.position.set(p.prevX + (p.x - p.prevX) * alpha, p.y, 0);
    }
    for (const [id, mesh] of this.projectileMeshes) {
      if (seen.has(id)) continue;
      this.scene.remove(mesh);
      mesh.geometry.dispose();
      mesh.material.dispose();
      this.projectileMeshes.delete(id);
    }
  }

  // ------------------------------------------------------------------ efectos (se disparan con los eventos de la simulación)

  onEvents(events, match) {
    for (const e of events) {
      if (e.type === 'hit') {
        const strong = Math.min(1, e.kb / 22);
        this.burst(e.x, e.y, 6 + Math.floor(strong * 14), 0xfff2b0, 4 + strong * 12, 0.28 + strong * 0.2, 0.12 + strong * 0.1);
        this.burst(e.x, e.y, 4, 0xff6a3d, 3 + strong * 8, 0.22, 0.1);
        this.rig.addShake(CAM.shake.hit * (0.4 + strong));
      } else if (e.type === 'ko') {
        const c = this.views[e.i]?.baseColor.getHex() ?? 0xffffff;
        this.burst(e.x, e.y, 40, c, 22, 0.8, 0.25);
        this.burst(e.x, e.y, 24, 0xffffff, 30, 0.5, 0.15);
        this.rig.addShake(CAM.shake.ko);
      } else if (e.type === 'jump') {
        this.burst(e.x, e.y + 0.05, e.double ? 8 : 5, 0xe8eef5, 2.5, 0.3, 0.1);
      } else if (e.type === 'land' && e.speed > 6) {
        this.burst(e.x, e.y + 0.05, 6, 0xd6d0c4, 3, 0.3, 0.1);
      } else if (e.type === 'respawn') {
        this.burst(e.x, e.y + 0.9, 18, 0x9fe8ff, 6, 0.6, 0.14);
      } else if (e.type === 'shot-end') {
        this.burst(e.x, e.y, 6, 0xffd23c, 5, 0.25, 0.1);
      } else if (e.type === 'boost') {
        this.burst(e.x, e.y, 10, 0xffffff, 6, 0.35, 0.12);
      } else if (e.type === 'car-spawn') {
        // bocina de advertencia: flash amarillo en el borde por donde viene el auto
        const warnX = -e.dir * 22;
        this.burst(warnX, -5.2, 10, 0xffd23c, 5, 0.5, 0.18);
      } else if (e.type === 'car-hit') {
        // choque: explosión roja fuerte + shake grande
        this.burst(e.x, e.y + 1, 26, 0xff5a36, 16, 0.6, 0.22);
        this.burst(e.x, e.y + 1, 14, 0xffd23c, 10, 0.4, 0.14);
        this.rig.addShake(CAM.shake.ko * 0.8);
      }
    }
  }

  burst(x, y, count, color, speed, life, size) {
    for (let i = 0; i < count; i++) {
      if (this.particles.length > 220) return;
      const a = Math.random() * Math.PI * 2;
      const s = speed * (0.35 + Math.random() * 0.65);
      const mesh = new THREE.Mesh(new THREE.SphereGeometry(size, 6, 5), new THREE.MeshBasicMaterial({ color, transparent: true }));
      mesh.position.set(x, y, 0.4);
      this.scene.add(mesh);
      this.particles.push({ mesh, vx: Math.cos(a) * s, vy: Math.sin(a) * s, life: life * (0.6 + Math.random() * 0.4), max: life });
    }
  }

  updateParticles(dt) {
    const alive = [];
    for (const p of this.particles) {
      p.life -= dt;
      if (p.life <= 0) {
        this.scene.remove(p.mesh);
        p.mesh.geometry.dispose();
        p.mesh.material.dispose();
        continue;
      }
      p.vy -= 14 * dt;
      p.mesh.position.x += p.vx * dt;
      p.mesh.position.y += p.vy * dt;
      p.mesh.material.opacity = Math.min(1, p.life / (p.max * 0.5));
      p.mesh.scale.setScalar(0.4 + (p.life / p.max) * 0.8);
      alive.push(p);
    }
    this.particles = alive;
  }

  // ------------------------------------------------------------------ utilidades

  /** Posición en pantalla de un punto del mundo: { x, y } en píxeles y si está dentro del cuadro. */
  project(x, y) {
    this.tmp.set(x, y, 0).project(this.rig.camera);
    return {
      x: (this.tmp.x * 0.5 + 0.5) * window.innerWidth,
      y: (-this.tmp.y * 0.5 + 0.5) * window.innerHeight,
      inside: Math.abs(this.tmp.x) <= 1 && Math.abs(this.tmp.y) <= 1,
    };
  }

  snapCamera(match) {
    const targets = match.fighters.filter((f) => f.alive).map((f) => ({ x: f.x, y: f.y + f.height / 2 }));
    this.rig.update(0.016, targets, match.stage, true);
  }

  toggleDebug() {
    this.debug = !this.debug;
    return this.debug;
  }
}
