import * as THREE from 'three';

/**
 * Dj Domono — modelado con primitivas (sin assets externos).
 * De Vita Machines: el más resistente (Peugeot Partner blanca). El DJ del barrio:
 * CAMPERA VERDE CAMUFLADA y su CONSOLA de mano, AURICULARES grandes al cuello,
 * jogger gris, zapatillas crema con detalle verde, anillos chunky, diente de oro.
 * Más ancho que los demás (weight 128: es el pesado). Origen en los pies (y=0), altura ≈ 1.95.
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
  const PIEL = 0xa78063;       // piel (del retrato)
  const CREMA = 0xf3f0e8;      // su color: crema/blanco hueso
  const CREMA_OSC = 0xd8d2c2;
  const GRIS = 0x6b6f76;       // jogger gris
  const PELO = 0x241a12;       // rastas/pelo oscuro
  const ORO = 0xf2c94c;
  const NEGRO = 0x14161a;
  const VERDE = 0x3fa34d;      // acento verde (lore)
  // camuflado: base oliva + parches claro/oscuro + caqui (sin texturas: paneles)
  const CAMO = 0x3f5a33;
  const CAMO_OSC = 0x2c4025;
  const CAMO_CLARO = 0x587a44;
  const CAMO_KHAKI = 0x75693f;

  const pielMat = mkMat(PIEL);
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

  const root = new THREE.Group();
  const add = (mesh, parent = root) => {
    mesh.castShadow = true;
    parent.add(mesh);
    return mesh;
  };

  // ======================== zapatillas crema chunky ========================
  for (const side of [-1, 1]) {
    const x = side * 0.25; // piernas aún más abiertas para resaltar ancho
    const suela = add(new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.08, 0.68), blancoMat));
    suela.position.set(x, 0.04, 0.05);
    const zapa = add(new THREE.Mesh(new THREE.BoxGeometry(0.38, 0.16, 0.6), cremaMat));
    zapa.position.set(x, 0.15, 0.04);
    const detalle = add(new THREE.Mesh(new THREE.BoxGeometry(0.38, 0.08, 0.25), verdeMat));
    detalle.position.set(x, 0.18, 0.2);
  }

  // ======================== jogger gris ancho ========================
  for (const side of [-1, 1]) {
    const x = side * 0.28; // piernas más abiertas (es ancho)
    const pierna = add(new THREE.Mesh(new THREE.CapsuleGeometry(0.22, 0.55, 6, 12), grisMat));
    pierna.position.set(x, 0.55, 0);
  }
  const cadera = add(new THREE.Mesh(new THREE.BoxGeometry(0.65, 0.28, 0.4), grisMat));
  cadera.position.set(0, 0.92, 0);

  // ======================== campera verde CAMUFLADA oversize ========================
  const torso = add(new THREE.Mesh(new THREE.CapsuleGeometry(0.38, 0.44, 8, 16), camoMat));
  torso.position.set(0, 1.24, 0);
  // parches de camuflado (paneles sin texturas: claro/oscuro/caqui)
  for (const [x, y, z, s, r] of [
    [-0.2, 1.32, 0.36, 0.2, 0.4], [0.18, 1.22, 0.36, 0.16, -0.3],
    [0.22, 1.4, 0.25, 0.14, 0.5], [-0.18, 1.1, 0.3, 0.13, -0.6],
    [0, 1.18, 0.35, 0.1, 0.2],
  ]) {
    const patchMat = (r % 3 < 1) ? camoOscMat : (r % 3 < 2) ? camoClaroMat : camoKhakiMat;
    const patch = add(new THREE.Mesh(new THREE.BoxGeometry(s, s * 0.62, 0.03), patchMat));
    patch.position.set(x, y, z);
    patch.rotation.z = r;
  }
  // cierre central adelante
  const cierre = add(new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.52, 0.02), camoOscMat));
  cierre.position.set(0, 1.24, 0.4);
  // cuello de la remera crema asomando (su color de identidad)
  const cuelloCrema = add(new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.06, 0.05), cremaMat));
  cuelloCrema.position.set(0, 1.42, 0.36);
  cuelloCrema.rotation.x = -0.35;
  // bolsillos grandes de la campera
  const bolsillo = add(new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.2, 0.05), camoOscMat));
  bolsillo.position.set(0, 1.02, 0.38);

  // ======================== brazos (pose de pelea, con anillos) ========================
  const armL = new THREE.Group();
  armL.position.set(-0.44, 1.5, 0);
  root.add(armL);
  const mangaL = add(new THREE.Mesh(new THREE.CapsuleGeometry(0.13, 0.26, 6, 10), camoMat), armL);
  mangaL.position.set(0, -0.13, 0.05);
  mangaL.rotation.x = 0.5;
  // parche de camuflado en la manga
  const parcheL = add(new THREE.Mesh(new THREE.BoxGeometry(0.09, 0.07, 0.03), camoClaroMat), armL);
  parcheL.position.set(0, -0.13, -0.02);
  const anteL = add(new THREE.Mesh(new THREE.CapsuleGeometry(0.11, 0.2, 6, 10), pielMat), armL);
  anteL.position.set(0.06, -0.08, 0.24);
  anteL.rotation.set(-1.1, 0, -0.4);
  const punoL = add(new THREE.Mesh(new THREE.SphereGeometry(0.12, 10, 8), pielMat), armL);
  punoL.position.set(0.09, 0.12, 0.36);

  // CONSOLA de mano en la mano izquierda (screen + botones, estilo retro)
  const consola = new THREE.Group();
  consola.position.set(0.09, 0.12, 0.5);
  armL.add(consola);
  const carcasa = add(new THREE.Mesh(new THREE.BoxGeometry(0.13, 0.07, 0.16), negroMat), consola);
  const screen = add(new THREE.Mesh(
    new THREE.BoxGeometry(0.08, 0.045, 0.012),
    mkMat(0xbfe3ff, { emissive: 0x7fd0ff, emissiveIntensity: 0.45, roughness: 0.2 }),
  ), consola);
  screen.position.set(0, 0.013, 0.085);
  for (const [bx, bz] of [[-0.03, -0.05], [0.03, -0.05]]) {
    const boton = add(new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, 0.012, 8), verdeMat), consola);
    boton.position.set(bx, -0.026, bz);
  }
  // anillo chunky
  const anilloL = add(new THREE.Mesh(new THREE.TorusGeometry(0.05, 0.018, 8, 14), oroMat), armL);
  anilloL.position.set(0.09, 0.12, 0.36);
  anilloL.rotation.x = 1.2;

  const armR = new THREE.Group();
  armR.position.set(0.44, 1.5, 0);
  root.add(armR);
  const mangaR = add(new THREE.Mesh(new THREE.CapsuleGeometry(0.13, 0.26, 6, 10), camoMat), armR);
  mangaR.position.set(0, -0.13, 0.08);
  mangaR.rotation.x = 0.7;
  const anteR = add(new THREE.Mesh(new THREE.CapsuleGeometry(0.11, 0.2, 6, 10), pielMat), armR);
  anteR.position.set(-0.02, -0.17, 0.26);
  anteR.rotation.x = 1.2;
  const punoR = add(new THREE.Mesh(new THREE.SphereGeometry(0.12, 10, 8), pielMat), armR);
  punoR.position.set(-0.03, -0.22, 0.44);
  const anilloR = add(new THREE.Mesh(new THREE.TorusGeometry(0.05, 0.018, 8, 14), oroMat), armR);
  anilloR.position.set(-0.03, -0.22, 0.44);
  anilloR.rotation.x = 1.2;

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
  const cuello = add(new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.11, 0.08, 10), pielMat), head);
  cuello.position.y = -0.02;
  const craneo = add(new THREE.Mesh(new THREE.SphereGeometry(0.22, 18, 14), pielMat), head);
  craneo.position.y = 0.16;
  for (const side of [-1, 1]) {
    const oreja = add(new THREE.Mesh(new THREE.SphereGeometry(0.05, 8, 6), pielMat), head);
    oreja.position.set(side * 0.215, 0.16, 0);
  }
  // rastas cortas: mechones cilíndricos
  const rastas = [
    [-0.1, 0.3, 0.1], [0, 0.32, 0.12], [0.1, 0.3, 0.1],
    [-0.14, 0.26, 0], [0.14, 0.26, 0], [0, 0.34, -0.05],
  ];
  for (const [rx, ry, rz] of rastas) {
    const mechon = add(new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.035, 0.16, 6), peloMat), head);
    mechon.position.set(rx, ry, rz);
    mechon.rotation.set((rx * 1.5), 0, (rx * 2));
  }
  const tapaPelo = add(new THREE.Mesh(
    new THREE.SphereGeometry(0.225, 16, 10, 0, Math.PI * 2, 0, Math.PI * 0.45),
    peloMat,
  ), head);
  tapaPelo.position.y = 0.2;

  // AURICULARES DJ al cuello (el accesorio icónico)
  const banda = add(new THREE.Mesh(new THREE.TorusGeometry(0.19, 0.028, 8, 20, Math.PI), negroMat), head);
  banda.position.set(0, 0.02, 0.02);
  banda.rotation.set(0.3, 0, 0);
  for (const side of [-1, 1]) {
    const cup = add(new THREE.Mesh(new THREE.CylinderGeometry(0.075, 0.075, 0.05, 14), negroMat), head);
    cup.position.set(side * 0.14, -0.03, 0.14);
    cup.rotation.z = Math.PI / 2;
    const cupIn = add(new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.055, 12), verdeMat), head);
    cupIn.position.set(side * 0.14, -0.03, 0.14);
    cupIn.rotation.z = Math.PI / 2;
  }

  // ojos + cejas
  for (const side of [-1, 1]) {
    const ojo = add(new THREE.Mesh(new THREE.SphereGeometry(0.038, 10, 8), blancoMat), head);
    ojo.position.set(side * 0.078, 0.18, 0.19);
    const pupila = add(new THREE.Mesh(new THREE.SphereGeometry(0.017, 8, 6), negroMat), head);
    pupila.position.set(side * 0.078, 0.18, 0.22);
    const ceja = add(new THREE.Mesh(new THREE.BoxGeometry(0.09, 0.025, 0.02), peloMat), head);
    ceja.position.set(side * 0.08, 0.245, 0.2);
    ceja.rotation.z = side * -0.1;
  }
  const nariz = add(new THREE.Mesh(new THREE.SphereGeometry(0.034, 8, 6), pielMat), head);
  nariz.position.set(0, 0.14, 0.215);
  // sonrisa con diente de oro
  const sonrisa = add(new THREE.Mesh(new THREE.BoxGeometry(0.13, 0.045, 0.02), blancoMat), head);
  sonrisa.position.set(0, 0.07, 0.2);
  const diente = add(new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.045, 0.022), oroMat), head);
  diente.position.set(-0.035, 0.07, 0.202);

  return { group: root, mats, hoodieMat: camoMat, parts: { armL, armR, head } };
}
