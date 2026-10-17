import * as THREE from 'three';

/**
 * Dj Domono — modelado con primitivas (sin assets externos).
 * De Vita Machines: el más resistente (Peugeot Partner blanca). El DJ del barrio:
 * CAMPERA VERDE CAMUFLADA y su CONSOLA de mano, AURICULARES grandes al cuello,
 * jogger gris, zapatillas crema con detalle verde, anillos chunky, diente de oro.
 * Contextura FLACA estilo Faxo (a pedido del usuario). Origen en los pies (y=0), altura ≈ 1.95.
 *
 * Devuelve { group, mats, hoodieMat, parts } — misma interfaz que KenaiModel.
 */
export function buildDomono() {
  const mats = [];
  const mkMat = (color, opts = {}) => {
    const m = new THREE.MeshStandardMaterial({ color, roughness: 0.65, metalness: 0.05, ...opts });
    m.userData.base = m.color.clone();
    mats.push(m);
    return m;
  };

  // paleta
  const PIEL = 0xd4ac84;       // piel más blanca/clara (a pedido del usuario)
  const PIEL_OSC = 0xba9068;
  const CREMA = 0xf3f0e8;      // su color: crema/blanco hueso
  const CREMA_OSC = 0xd8d2c2;
  const GRIS = 0x6b6f76;       // jogger gris
  const PELO = 0x2a1e14;       // pelo oscuro
  const ORO = 0xf2c94c;
  const NEGRO = 0x14161a;
  const VERDE = 0x3fa34d;      // acento verde (lore)
  // camuflado con DISTINTOS TONOS DE VERDE (a pedido): bosque, oliva, selva, lima oscura, caqui
  const CAMO = 0x3f5a33;       // base oliva
  const CAMO_OSC = 0x26421d;   // verde bosque profundo
  const CAMO_CLARO = 0x5d8a48; // verde selva claro
  const CAMO_KHAKI = 0x7a7440; // caqui verdoso
  const CAMO_LIMA = 0x6fa03c;  // verde lima oscuro (quinto tono)

  const pielMat = mkMat(PIEL, { roughness: 0.5 });
  const pielOscMat = mkMat(PIEL_OSC, { roughness: 0.55 });
  const cremaMat = mkMat(CREMA);
  const cremaOscMat = mkMat(CREMA_OSC);
  const grisMat = mkMat(GRIS, { roughness: 0.8 });
  const peloMat = mkMat(PELO, { roughness: 0.9 });
  const oroMat = mkMat(ORO, { metalness: 0.85, roughness: 0.25 });
  const negroMat = mkMat(NEGRO, { roughness: 0.5 });
  const blancoMat = mkMat(0xffffff, { roughness: 0.3 });
  const verdeMat = mkMat(VERDE);
  const camoMat = mkMat(CAMO, { roughness: 0.85 });
  const camoOscMat = mkMat(CAMO_OSC, { roughness: 0.9 });
  const camoClaroMat = mkMat(CAMO_CLARO, { roughness: 0.85 });
  const camoKhakiMat = mkMat(CAMO_KHAKI, { roughness: 0.85 });
  const camoLimaMat = mkMat(CAMO_LIMA, { roughness: 0.85 });

  const root = new THREE.Group();
  const add = (mesh, parent = root) => {
    mesh.castShadow = true;
    parent.add(mesh);
    return mesh;
  };

  // ======================== zapatillas crema (flacas) ========================
  for (const side of [-1, 1]) {
    const x = side * 0.15;
    const suela = add(new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.07, 0.56), blancoMat));
    suela.position.set(x, 0.035, 0.05);
    const zapa = add(new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.14, 0.5), cremaMat));
    zapa.position.set(x, 0.13, 0.04);
    const detalle = add(new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.07, 0.2), verdeMat));
    detalle.position.set(x, 0.15, 0.18);
  }

  // ======================== jogger gris flaco ========================
  for (const side of [-1, 1]) {
    const x = side * 0.155;
    const pierna = add(new THREE.Mesh(new THREE.CapsuleGeometry(0.135, 0.6, 6, 12), grisMat));
    pierna.position.set(x, 0.55, 0);
  }
  const cadera = add(new THREE.Mesh(new THREE.BoxGeometry(0.44, 0.22, 0.3), grisMat));
  cadera.position.set(0, 0.92, 0);

  // ======================== campera verde CAMUFLADA (flaca) ========================
  const torso = add(new THREE.Mesh(new THREE.CapsuleGeometry(0.26, 0.46, 8, 16), camoMat));
  torso.position.set(0, 1.24, 0);
  // parches de camuflado con 5 TONOS DE VERDE distintos (bosque, oliva, selva, lima, caqui)
  const patchMats = [camoOscMat, camoClaroMat, camoKhakiMat, camoLimaMat, camoMat];
  for (const [x, y, z, s, r, mi] of [
    [-0.2, 1.32, 0.2, 0.16, 0.4, 0], [0.18, 1.22, 0.21, 0.13, -0.3, 1],
    [0.22, 1.4, 0.16, 0.11, 0.5, 3], [-0.18, 1.1, 0.2, 0.1, -0.6, 2],
    [0, 1.18, 0.27, 0.08, 0.2, 4], [-0.1, 1.42, 0.25, 0.09, 0.7, 1],
    [0.1, 1.05, 0.25, 0.1, -0.5, 3], [-0.26, 1.22, 0.08, 0.08, 0.9, 2],
  ]) {
    const patch = add(new THREE.Mesh(new THREE.BoxGeometry(s, s * 0.62, 0.03), patchMats[mi % patchMats.length]));
    patch.position.set(x, y, z);
    patch.rotation.z = r;
  }
  // cierre central adelante
  const cierre = add(new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.52, 0.02), camoOscMat));
  cierre.position.set(0, 1.24, 0.28);
  // cuello de la remera crema asomando (su color de identidad)
  const cuelloCrema = add(new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.06, 0.05), cremaMat));
  cuelloCrema.position.set(0, 1.42, 0.27);
  cuelloCrema.rotation.x = -0.35;
  // bolsillos grandes de la campera
  const bolsillo = add(new THREE.Mesh(new THREE.BoxGeometry(0.26, 0.17, 0.05), camoOscMat));
  bolsillo.position.set(0, 1.02, 0.28);

  // ======================== brazos (flacos, pose de pelea, con anillos) ========================
  const armL = new THREE.Group();
  armL.position.set(-0.33, 1.5, 0);
  root.add(armL);
  const mangaL = add(new THREE.Mesh(new THREE.CapsuleGeometry(0.09, 0.24, 6, 10), camoMat), armL);
  mangaL.position.set(0, -0.13, 0.05);
  mangaL.rotation.x = 0.5;
  // parche de camuflado en la manga
  const parcheL = add(new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.06, 0.03), camoClaroMat), armL);
  parcheL.position.set(0, -0.13, -0.02);
  const anteL = add(new THREE.Mesh(new THREE.CapsuleGeometry(0.075, 0.22, 6, 10), pielMat), armL);
  anteL.position.set(0.06, -0.08, 0.24);
  anteL.rotation.set(-1.1, 0, -0.4);
  manoConDedos(armL, 0.09, 0.08, 0.36, 1, pielMat);

  // ======================== CONSOLA DJ PIONEER GIGANTE (la lleva adelante, protagonista del modelo) ========================
  // correa que la sostiene del cuello
  const correaConsola = add(new THREE.Mesh(new THREE.TorusGeometry(0.26, 0.015, 8, 24, Math.PI * 1.1), negroMat));
  correaConsola.position.set(0, 1.52, 0.12);
  correaConsola.rotation.set(1.35, 0, 0);
  // mesa de mezclas completa: GIGANTE, casi tapa todo el torso — es su sello
  const consola = new THREE.Group();
  consola.position.set(0, 1.06, 0.5);
  consola.rotation.x = 0.4; // inclinada hacia él, como si la estuviera usando
  root.add(consola);
  // carcasa principal (MUY ancha, como una DDJ-800)
  const carcasa = add(new THREE.Mesh(new THREE.BoxGeometry(0.85, 0.07, 0.46), negroMat), consola);
  // borde plateado inferior
  const borde = add(new THREE.Mesh(new THREE.BoxGeometry(0.85, 0.025, 0.46), mkMat(0x4a4e55, { metalness: 0.7, roughness: 0.35 })), consola);
  borde.position.y = -0.045;
  // platos / jog wheels (lo más icónico y GRANDE): 2 círculos enormes con centro plateado y aro brillante
  for (const side of [-1, 1]) {
    const plato = add(new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.15, 0.02, 28), mkMat(0x0c0e12, { roughness: 0.2, metalness: 0.45 })), consola);
    plato.position.set(side * 0.24, 0.045, 0.06);
    // aro metálico brillante alrededor del jog
    const aro = add(new THREE.Mesh(new THREE.TorusGeometry(0.15, 0.008, 8, 28), mkMat(0x9aa0a6, { metalness: 0.9, roughness: 0.2 })), consola);
    aro.position.set(side * 0.24, 0.05, 0.06);
    aro.rotation.x = Math.PI / 2;
    const centro = add(new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.045, 0.026, 18), mkMat(0xd7dce2, { metalness: 0.9, roughness: 0.2 })), consola);
    centro.position.set(side * 0.24, 0.055, 0.06);
    // punto de marca del jog (rojo brillante)
    const marca = add(new THREE.Mesh(new THREE.BoxGeometry(0.015, 0.028, 0.04), mkMat(0xd8352a, { emissive: 0xd8352a, emissiveIntensity: 1.2 })), consola);
    marca.position.set(side * 0.24, 0.055, 0.19);
    // texto del jog (líneas radiales del plato)
    for (let a = 0; a < 8; a++) {
      const linea = add(new THREE.Mesh(new THREE.BoxGeometry(0.004, 0.022, 0.06), mkMat(0x3a3f47)), consola);
      const ang = (a / 8) * Math.PI * 2;
      linea.position.set(side * 0.24 + Math.sin(ang) * 0.1, 0.052, 0.06 + Math.cos(ang) * 0.1);
      linea.rotation.y = ang;
    }
  }
  // perillas (2 filas centrales, doradas y brillantes)
  for (let fila = 0; fila < 2; fila++) {
    for (let i = -3; i <= 3; i++) {
      const perilla = add(new THREE.Mesh(new THREE.CylinderGeometry(0.016, 0.019, 0.028, 10), oroMat), consola);
      perilla.position.set(i * 0.042, 0.05, -0.06 - fila * 0.055);
    }
  }
  // faders verticales (2 canales + master)
  for (const fx of [-0.07, 0.07, 0]) {
    const canal = add(new THREE.Mesh(new THREE.BoxGeometry(0.024, 0.012, 0.15), mkMat(0x2b2f38)), consola);
    canal.position.set(fx, 0.04, -0.13);
    const fader = add(new THREE.Mesh(new THREE.BoxGeometry(0.036, 0.024, 0.024), blancoMat), consola);
    fader.position.set(fx, 0.05, -0.1);
  }
  // crossfader horizontal grande
  const crossCanal = add(new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.012, 0.02), mkMat(0x2b2f38)), consola);
  crossCanal.position.set(0, 0.04, -0.19);
  const cross = add(new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.024, 0.028), blancoMat), consola);
  cross.position.set(0, 0.05, -0.19);
  // botones amarillos brillantes (2 bancos de pads, más grandes)
  for (const [bx, bz] of [[-0.36, -0.14], [-0.3, -0.14], [-0.36, -0.08], [-0.3, -0.08], [-0.36, -0.02], [-0.3, -0.02], [0.3, -0.14], [0.36, -0.14], [0.3, -0.08], [0.36, -0.08], [0.3, -0.02], [0.36, -0.02]]) {
    const pad = add(new THREE.Mesh(
      new THREE.BoxGeometry(0.045, 0.014, 0.045),
      mkMat(0xf2c94c, { emissive: 0xf2c94c, emissiveIntensity: 0.9, roughness: 0.3 }),
    ), consola);
    pad.position.set(bx, 0.045, bz);
  }
  // botón PLAY verde brillante y CUE rojo (grandes, llamativos)
  const playBtn = add(new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.016, 14), mkMat(0x3fa34d, { emissive: 0x3fa34d, emissiveIntensity: 1.1 })), consola);
  playBtn.position.set(-0.36, 0.048, 0.19);
  const cueBtn = add(new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.016, 14), mkMat(0xd8352a, { emissive: 0xd8352a, emissiveIntensity: 1.1 })), consola);
  cueBtn.position.set(0.36, 0.048, 0.19);
  // pantalla LCD central GRANDE y brillante
  const lcd = add(new THREE.Mesh(
    new THREE.BoxGeometry(0.2, 0.014, 0.09),
    mkMat(0x7fd0ff, { emissive: 0x5fc0ff, emissiveIntensity: 1.0, roughness: 0.2 }),
  ), consola);
  lcd.position.set(0, 0.045, 0.13);
  // ondas de audio en la pantalla (detalle)
  for (let i = -4; i <= 4; i++) {
    const onda = add(new THREE.Mesh(new THREE.BoxGeometry(0.012, 0.016, 0.02 + Math.abs(Math.sin(i * 1.3)) * 0.04), mkMat(0x1a5c8f, { emissive: 0x2f9fd4, emissiveIntensity: 0.5 })), consola);
    onda.position.set(i * 0.02, 0.05, 0.13);
  }
  // logo de marca (placa blanca grande al frente, como "PIONEER DJ")
  const logo = add(new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.014, 0.04), blancoMat), consola);
  logo.position.set(0, 0.04, 0.22);
  // cables colgando de la consola (2, más visibles)
  const cable1 = add(new THREE.Mesh(new THREE.CylinderGeometry(0.01, 0.01, 0.24, 6), negroMat), consola);
  cable1.position.set(0.38, -0.08, -0.1);
  cable1.rotation.z = 0.5;
  const cable2 = add(new THREE.Mesh(new THREE.CylinderGeometry(0.01, 0.01, 0.18, 6), negroMat), consola);
  cable2.position.set(0.4, -0.06, 0.02);
  cable2.rotation.z = 0.7;

  // parche rojo/blanco del hombro (como el splash art)
  const parcheHombro = add(new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.09, 0.03), mkMat(0xd8352a)), armL);
  parcheHombro.position.set(0, -0.02, 0.1);
  const franjaParche = add(new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.03, 0.032), blancoMat), armL);
  franjaParche.position.set(0, -0.005, 0.1);

  const armR = new THREE.Group();
  armR.position.set(0.33, 1.5, 0);
  root.add(armR);
  const mangaR = add(new THREE.Mesh(new THREE.CapsuleGeometry(0.09, 0.24, 6, 10), camoMat), armR);
  mangaR.position.set(0, -0.13, 0.08);
  mangaR.rotation.x = 0.7;
  const anteR = add(new THREE.Mesh(new THREE.CapsuleGeometry(0.075, 0.22, 6, 10), pielMat), armR);
  anteR.position.set(-0.02, -0.17, 0.26);
  anteR.rotation.x = 1.2;
  const punoR = add(new THREE.Mesh(new THREE.SphereGeometry(0.085, 10, 8), pielMat), armR);
  punoR.position.set(-0.03, -0.22, 0.44);
  // reloj plateado grande en la muñeca (como el splash art)
  const reloj = add(new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.045, 0.025, 16), mkMat(0xd7dce2, { metalness: 0.9, roughness: 0.2 })), armR);
  reloj.position.set(-0.03, -0.19, 0.34);
  reloj.rotation.x = Math.PI / 2.1;
  const esfera = add(new THREE.Mesh(new THREE.CylinderGeometry(0.033, 0.033, 0.028, 16), blancoMat), armR);
  esfera.position.set(-0.03, -0.19, 0.34);
  esfera.rotation.x = Math.PI / 2.1;

  // cadena con vinilo colgando
  const cadena = add(new THREE.Mesh(new THREE.TorusGeometry(0.16, 0.014, 8, 22), oroMat));
  cadena.position.set(0, 1.56, 0.1);
  cadena.rotation.x = 1.35;
  const vinilo = add(new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.07, 0.012, 18), negroMat));
  vinilo.position.set(0, 1.42, 0.36);
  vinilo.rotation.x = Math.PI / 2;
  const selloVinilo = add(new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, 0.016, 12), verdeMat));
  selloVinilo.position.set(0, 1.42, 0.365);
  selloVinilo.rotation.x = Math.PI / 2;

  // ======================== cabeza con auriculares DJ ========================
  const head = new THREE.Group();
  head.position.set(0, 1.6, 0);
  root.add(head);
  const cuello = add(new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.09, 0.1, 10), pielMat), head);
  cuello.position.y = -0.02;
  const craneo = add(new THREE.Mesh(new THREE.SphereGeometry(0.2, 18, 14), pielMat), head);
  craneo.position.y = 0.16;
  for (const side of [-1, 1]) {
    const oreja = add(new THREE.Mesh(new THREE.SphereGeometry(0.045, 8, 6), pielMat), head);
    oreja.position.set(side * 0.19, 0.16, 0);
  }
  // pelo ENCRESPADO: textura afro con muchos mechones cortos irregulares en todas direcciones
  const tapaPelo = add(new THREE.Mesh(
    new THREE.SphereGeometry(0.195, 16, 10, 0, Math.PI * 2, 0, Math.PI * 0.5),
    peloMat,
  ), head);
  tapaPelo.position.y = 0.185;
  // mechones encrespados: conitos irregulares, distintos tamaños y ángulos (textura frizzy)
  const encreSpados = [
    [0, 0.36, 0.02, 0.045, 0.11, 0.2, -0.3], [-0.07, 0.34, 0.07, 0.04, 0.1, 0.5, 0.4], [0.07, 0.34, 0.07, 0.045, 0.09, -0.4, 0.5],
    [-0.06, 0.35, -0.06, 0.04, 0.1, -0.3, -0.5], [0.06, 0.35, -0.06, 0.045, 0.11, 0.4, 0.3],
    [0, 0.32, 0.13, 0.04, 0.09, 0.7, 0.1], [-0.13, 0.3, 0.03, 0.04, 0.1, 0.3, 0.9], [0.13, 0.3, 0.03, 0.04, 0.1, 0.3, -0.9],
    [-0.12, 0.31, -0.06, 0.038, 0.09, -0.5, 0.7], [0.12, 0.31, -0.06, 0.038, 0.09, -0.5, -0.7],
    [0, 0.34, -0.11, 0.045, 0.11, -0.7, 0], [-0.1, 0.33, 0.11, 0.035, 0.08, 0.8, 0.5], [0.1, 0.33, 0.11, 0.035, 0.08, 0.8, -0.5],
    [-0.16, 0.26, -0.02, 0.035, 0.08, 0.1, 1.1], [0.16, 0.26, -0.02, 0.035, 0.08, 0.1, -1.1],
    [0.03, 0.37, 0.06, 0.04, 0.1, 0.3, 0.2], [-0.03, 0.37, -0.03, 0.04, 0.1, -0.2, -0.3],
  ];
  for (const [rx, ry, rz, rr, len, tiltX, tiltZ] of encreSpados) {
    const mech = add(new THREE.Mesh(new THREE.ConeGeometry(rr, len, 5), peloMat), head);
    mech.position.set(rx, ry, rz);
    mech.rotation.set(tiltX, 0, tiltZ);
  }

  // AURICULARES DJ al cuello (el accesorio icónico)
  const banda = add(new THREE.Mesh(new THREE.TorusGeometry(0.17, 0.028, 8, 20, Math.PI), negroMat), head);
  banda.position.set(0, 0.02, 0.02);
  banda.rotation.set(0.3, 0, 0);
  for (const side of [-1, 1]) {
    const cup = add(new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.07, 0.05, 14), negroMat), head);
    cup.position.set(side * 0.13, -0.03, 0.14);
    cup.rotation.z = Math.PI / 2;
    const cupIn = add(new THREE.Mesh(new THREE.CylinderGeometry(0.047, 0.047, 0.055, 12), verdeMat), head);
    cupIn.position.set(side * 0.13, -0.03, 0.14);
    cupIn.rotation.z = Math.PI / 2;
  }

  // ojos + cejas
  for (const side of [-1, 1]) {
    const ojo = add(new THREE.Mesh(new THREE.SphereGeometry(0.036, 10, 8), blancoMat), head);
    ojo.position.set(side * 0.075, 0.18, 0.175);
    const pupila = add(new THREE.Mesh(new THREE.SphereGeometry(0.016, 8, 6), negroMat), head);
    pupila.position.set(side * 0.075, 0.18, 0.205);
    const ceja = add(new THREE.Mesh(new THREE.BoxGeometry(0.085, 0.025, 0.02), peloMat), head);
    ceja.position.set(side * 0.077, 0.24, 0.185);
    ceja.rotation.z = side * -0.1;
  }
  const nariz = add(new THREE.Mesh(new THREE.SphereGeometry(0.032, 8, 6), pielMat), head);
  nariz.position.set(0, 0.14, 0.2);
  // sonrisa con diente de oro
  const sonrisa = add(new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.045, 0.02), blancoMat), head);
  sonrisa.position.set(0, 0.07, 0.19);
  const diente = add(new THREE.Mesh(new THREE.BoxGeometry(0.028, 0.045, 0.022), oroMat), head);
  diente.position.set(-0.032, 0.07, 0.192);

  /**
   * Mano con dedos: palma + 4 dedos + pulgar. `dir` = 1 si la mano mira hacia
   * adelante (+z) o -1 si apunta hacia atrás. Evita el look de "esfera lisa".
   */
  function manoConDedos(parent, x, y, z, dir, mat) {
    const palma = add(new THREE.Mesh(new THREE.BoxGeometry(0.13, 0.15, 0.085), mat), parent);
    palma.position.set(x, y, z);
    for (let i = 0; i < 4; i++) {
      const dedo = add(new THREE.Mesh(new THREE.CapsuleGeometry(0.021, 0.055, 4, 8), mat), parent);
      dedo.position.set(x - 0.047 + i * 0.031, y + 0.1, z + dir * 0.02);
      dedo.rotation.x = dir * 0.5;
    }
    const pulgar = add(new THREE.Mesh(new THREE.CapsuleGeometry(0.023, 0.048, 4, 8), mat), parent);
    pulgar.position.set(x + dir * 0.085, y + 0.02, z + dir * 0.03);
    pulgar.rotation.z = dir * 1.1;
  }

  return { group: root, mats, hoodieMat: camoMat, parts: { armL, armR, head } };
}
