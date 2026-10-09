import * as THREE from 'three';

/**
 * Dj Domono — modelado con primitivas (sin assets externos).
 * De Vita Machines: el más resistente (Peugeot Partner blanca). El DJ del barrio:
 * remera crema oversize con boombox, AURICULARES grandes al cuello, jogger gris,
 * zapatillas crema, anillos chunky, diente de oro. Más ancho que los demás
 * (weight 128: es el pesado). Origen en los pies (y=0), altura ≈ 1.95.
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
  const PIEL = 0xa86b42;
  const CREMA = 0xf3f0e8;      // su color: crema/blanco hueso
  const CREMA_OSC = 0xd8d2c2;
  const GRIS = 0x6b6f76;       // jogger gris
  const PELO = 0x241a12;       // rastas/pelo oscuro
  const ORO = 0xf2c94c;
  const NEGRO = 0x14161a;
  const VERDE = 0x3fa34d;      // acento verde (lore)

  const pielMat = mkMat(PIEL);
  const cremaMat = mkMat(CREMA);
  const cremaOscMat = mkMat(CREMA_OSC);
  const grisMat = mkMat(GRIS, { roughness: 0.8 });
  const peloMat = mkMat(PELO, { roughness: 0.9 });
  const oroMat = mkMat(ORO, { metalness: 0.85, roughness: 0.25 });
  const negroMat = mkMat(NEGRO, { roughness: 0.5 });
  const blancoMat = mkMat(0xffffff, { roughness: 0.3 });
  const verdeMat = mkMat(VERDE);

  const root = new THREE.Group();
  const add = (mesh, parent = root) => {
    mesh.castShadow = true;
    parent.add(mesh);
    return mesh;
  };

  // ======================== zapatillas crema chunky ========================
  for (const side of [-1, 1]) {
    const x = side * 0.22; // piernas más abiertas (es ancho)
    const suela = add(new THREE.Mesh(new THREE.BoxGeometry(0.38, 0.07, 0.62), blancoMat));
    suela.position.set(x, 0.035, 0.04);
    const zapa = add(new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.14, 0.56), cremaMat));
    zapa.position.set(x, 0.135, 0.03);
    const detalle = add(new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.06, 0.2), verdeMat));
    detalle.position.set(x, 0.16, 0.2);
  }

  // ======================== jogger gris ancho ========================
  for (const side of [-1, 1]) {
    const x = side * 0.22;
    const pierna = add(new THREE.Mesh(new THREE.CapsuleGeometry(0.2, 0.48, 6, 12), grisMat));
    pierna.position.set(x, 0.5, 0);
  }
  const cadera = add(new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.26, 0.38), grisMat));
  cadera.position.set(0, 0.9, 0);

  // ======================== remera crema oversize con boombox ========================
  const torso = add(new THREE.Mesh(new THREE.CapsuleGeometry(0.38, 0.44, 8, 16), cremaMat));
  torso.position.set(0, 1.24, 0);
  // boombox estampada: caja negra con 2 parlantes (círculos)
  const boombox = add(new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.2, 0.02), negroMat));
  boombox.position.set(0, 1.3, 0.37);
  for (const side of [-1, 1]) {
    const parlante = add(new THREE.Mesh(new THREE.CylinderGeometry(0.055, 0.055, 0.025, 14), grisMat));
    parlante.position.set(side * 0.1, 1.3, 0.385);
    parlante.rotation.x = Math.PI / 2;
    const centro = add(new THREE.Mesh(new THREE.CylinderGeometry(0.022, 0.022, 0.03, 10), verdeMat));
    centro.position.set(side * 0.1, 1.3, 0.39);
    centro.rotation.x = Math.PI / 2;
  }
  // bolsillo
  const bolsillo = add(new THREE.Mesh(new THREE.BoxGeometry(0.36, 0.16, 0.08), cremaOscMat));
  bolsillo.position.set(0, 1.05, 0.34);

  // ======================== brazos (pose de pelea, con anillos) ========================
  const armL = new THREE.Group();
  armL.position.set(-0.44, 1.5, 0);
  root.add(armL);
  const mangaL = add(new THREE.Mesh(new THREE.CapsuleGeometry(0.13, 0.26, 6, 10), cremaMat), armL);
  mangaL.position.set(0, -0.13, 0.05);
  mangaL.rotation.x = 0.5;
  const anteL = add(new THREE.Mesh(new THREE.CapsuleGeometry(0.11, 0.2, 6, 10), pielMat), armL);
  anteL.position.set(0.06, -0.08, 0.24);
  anteL.rotation.set(-1.1, 0, -0.4);
  const punoL = add(new THREE.Mesh(new THREE.SphereGeometry(0.12, 10, 8), pielMat), armL);
  punoL.position.set(0.09, 0.12, 0.36);
  // anillo chunky
  const anilloL = add(new THREE.Mesh(new THREE.TorusGeometry(0.05, 0.018, 8, 14), oroMat), armL);
  anilloL.position.set(0.09, 0.12, 0.36);
  anilloL.rotation.x = 1.2;

  const armR = new THREE.Group();
  armR.position.set(0.44, 1.5, 0);
  root.add(armR);
  const mangaR = add(new THREE.Mesh(new THREE.CapsuleGeometry(0.13, 0.26, 6, 10), cremaMat), armR);
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

  return { group: root, mats, hoodieMat: cremaMat, parts: { armL, armR, head } };
}
