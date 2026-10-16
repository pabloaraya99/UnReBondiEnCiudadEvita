import * as THREE from 'three';

/**
 * Chubitcoin — modelado con primitivas (sin assets externos).
 * Basado en el splash art oficial (pilots/Chubitcoin Splash Art.jpg):
 * - Cabello NEGRO peinado para atrás (slicked back) con brillo
 * - Remera/botonería NEGRA de manga larga con botones DORADOS
 * - Boca abierta sonriendo con LENGUA PARA AFUERA (gesto canchero)
 * - Cejas gruesas, ojos oscuros, piel BLANCA clara
 * - RELOJ DORADO en la muñeca izquierda + ANILLO dorado en la mano
 * - COLGANTE bitcoin dorado con cadena sobre el pecho
 * - Contextura media tirando a robusta ("BILLETES PESADOS")
 * Origen en los pies (y=0), altura ~1.85.
 *
 * Devuelve { group, mats, hoodieMat, parts } — misma interfaz que FaxoModel.
 */
export function buildChubitcoin() {
  const mats = [];
  const mkMat = (color, opts = {}) => {
    const m = new THREE.MeshStandardMaterial({ color, roughness: 0.65, metalness: 0.05, ...opts });
    m.userData.base = m.color.clone();
    mats.push(m);
    return m;
  };

  // paleta: negro con acentos ORO (bitcoin) + piel BLANCA/clara
  const PIEL = 0xf2d0b0;       // piel blanca clara (a pedido del usuario)
  const PIEL_OSC = 0xdcb590;   // sombra de piel
  const NEGRO = 0x17171c;      // remera/botonería negra
  const NEGRO_CL = 0x2a2a32;   // negro claro (costuras, sombras)
  const ORO = 0xf0b429;        // oro bitcoin
  const ORO_OSC = 0xc8901a;    // oro sombra
  const PELO = 0x141116;       // cabello negro
  const PELO_BRILLO = 0x2e2a33; // brillo del pelo peinado
  const BLANCO = 0xf5f2ea;     // dientes / ojos
  const LENGUA = 0xe0607a;     // lengua rosa
  const BOCO_NEGRO = 0x2a1416; // interior de la boca
  const PANTALON = 0x232329;   // pantalón negro carbón
  const ZAPATO = 0x121216;     // zapatos negros
  const SUELA = 0xd8d2c4;      // suela clara

  const pielMat = mkMat(PIEL, { roughness: 0.7 });
  const pielOscMat = mkMat(PIEL_OSC, { roughness: 0.75 });
  const camisaMat = mkMat(NEGRO, { roughness: 0.85 });
  const camisaClMat = mkMat(NEGRO_CL, { roughness: 0.8 });
  const oroMat = mkMat(ORO, { metalness: 0.85, roughness: 0.28 });
  const oroOscMat = mkMat(ORO_OSC, { metalness: 0.8, roughness: 0.35 });
  const peloMat = mkMat(PELO, { roughness: 0.55 });
  const peloBrilloMat = mkMat(PELO_BRILLO, { roughness: 0.4 });
  const blancoMat = mkMat(BLANCO, { roughness: 0.4 });
  const lenguaMat = mkMat(LENGUA, { roughness: 0.6 });
  const bocaMat = mkMat(BOCO_NEGRO, { roughness: 0.9 });
  const pantalonMat = mkMat(PANTALON, { roughness: 0.85 });
  const zapatoMat = mkMat(ZAPATO, { roughness: 0.5 });
  const suelaMat = mkMat(SUELA, { roughness: 0.45 });
  const ojoOscMat = mkMat(0x241a14, { roughness: 0.3 });

  const root = new THREE.Group();
  const add = (mesh, parent = root) => {
    mesh.castShadow = true;
    parent.add(mesh);
    return mesh;
  };

  // ======================== zapatos negros con suela clara ========================
  for (const side of [-1, 1]) {
    const x = side * 0.15;
    const suela = add(new THREE.Mesh(new THREE.BoxGeometry(0.29, 0.05, 0.5), suelaMat));
    suela.position.set(x, 0.025, 0.03);
    const zapa = add(new THREE.Mesh(new THREE.BoxGeometry(0.27, 0.13, 0.47), zapatoMat));
    zapa.position.set(x, 0.115, 0.0);
    // agujetas doradas (toque crypto)
    const detalle = add(new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.02, 0.02), oroMat));
    detalle.position.set(x, 0.16, 0.2);
  }

  // ======================== pantalón negro (contextura robusta) ========================
  for (const side of [-1, 1]) {
    const x = side * 0.155;
    const pierna = add(new THREE.Mesh(new THREE.CapsuleGeometry(0.13, 0.58, 6, 12), pantalonMat));
    pierna.position.set(x, 0.55, 0);
  }
  const cadera = add(new THREE.Mesh(new THREE.BoxGeometry(0.44, 0.22, 0.28), pantalonMat));
  cadera.position.set(0, 0.96, 0);

  // ======================== remera/botonería NEGRA de manga larga ========================
  const torso = add(new THREE.Mesh(new THREE.CapsuleGeometry(0.24, 0.44, 8, 16), camisaMat));
  torso.position.set(0, 1.27, 0);
  torso.scale.set(1.05, 1, 0.92);
  // cuello de la camisa (puntas abiertas)
  for (const side of [-1, 1]) {
    const punta = add(new THREE.Mesh(new THREE.BoxGeometry(0.09, 0.16, 0.03), camisaClMat));
    punta.position.set(side * 0.07, 1.56, 0.19);
    punta.rotation.z = side * 0.5;
    punta.rotation.x = 0.25;
  }
  // botones DORADOS en la tira central
  for (let i = 0; i < 4; i++) {
    const boton = add(new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.018, 0.012, 10), oroMat));
    boton.rotation.x = Math.PI / 2;
    boton.position.set(0, 1.13 + i * 0.15, 0.235);
  }
  // dobladillo
  const dobladillo = add(new THREE.Mesh(new THREE.BoxGeometry(0.46, 0.05, 0.3), camisaClMat));
  dobladillo.position.set(0, 1.03, 0);

  // ======================== brazos negros con manos de piel ========================
  const armL = new THREE.Group();
  armL.position.set(-0.32, 1.5, 0);
  root.add(armL);
  const mangaL = add(new THREE.Mesh(new THREE.CapsuleGeometry(0.09, 0.3, 6, 10), camisaMat), armL);
  mangaL.position.set(0, -0.16, 0.04);
  mangaL.rotation.x = 0.35;
  const manoL = add(new THREE.Mesh(new THREE.SphereGeometry(0.085, 10, 8), pielMat), armL);
  manoL.position.set(0.02, -0.36, 0.16);
  manoL.scale.set(0.8, 1.15, 0.85);
  // RELOJ DORADO en la muñeca izquierda
  const reloj = add(new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.03, 12), oroMat), armL);
  reloj.rotation.x = Math.PI / 2 - 0.35;
  reloj.position.set(0.02, -0.3, 0.12);
  const caraReloj = add(new THREE.Mesh(new THREE.CylinderGeometry(0.036, 0.036, 0.012, 12), mkMat(0x1a1c22, { roughness: 0.2, metalness: 0.4 })), armL);
  caraReloj.rotation.x = Math.PI / 2 - 0.35;
  caraReloj.position.set(0.02, -0.29, 0.14);

  const armR = new THREE.Group();
  armR.position.set(0.32, 1.5, 0);
  root.add(armR);
  const mangaR = add(new THREE.Mesh(new THREE.CapsuleGeometry(0.09, 0.3, 6, 10), camisaMat), armR);
  mangaR.position.set(0, -0.16, 0.05);
  mangaR.rotation.x = 0.45;
  const manoR = add(new THREE.Mesh(new THREE.SphereGeometry(0.085, 10, 8), pielMat), armR);
  manoR.position.set(-0.02, -0.37, 0.19);
  manoR.scale.set(0.8, 1.15, 0.85);
  // ANILLO DORADO en el dedo de la mano derecha
  const anillo = add(new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.028, 0.02), oroMat), armR);
  anillo.position.set(-0.03, -0.4, 0.24);

  // ======================== cadena + COLGANTE bitcoin ========================
  for (const side of [-1, 1]) {
    const tira = add(new THREE.Mesh(new THREE.BoxGeometry(0.018, 0.4, 0.012), oroOscMat));
    tira.position.set(side * 0.1, 1.45, 0.2);
    tira.rotation.x = 0.1;
    tira.rotation.z = side * -0.14;
  }
  const coin = new THREE.Group();
  coin.position.set(0, 1.22, 0.25);
  coin.rotation.x = -0.1;
  root.add(coin);
  const disco = add(new THREE.Mesh(new THREE.CylinderGeometry(0.065, 0.065, 0.016, 16), oroMat), coin);
  disco.rotation.x = Math.PI / 2;
  // marca "B" del bitcoin (aproximada con dos barritas)
  const barraV = add(new THREE.Mesh(new THREE.BoxGeometry(0.014, 0.07, 0.02), oroOscMat), coin);
  barraV.position.set(-0.02, 0, 0.006);
  const barraH1 = add(new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.016, 0.02), oroOscMat), coin);
  barraH1.position.set(0.01, 0.018, 0.006);
  const barraH2 = add(new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.016, 0.02), oroOscMat), coin);
  barraH2.position.set(0.01, -0.018, 0.006);

  // ======================== cabeza ========================
  const head = new THREE.Group();
  head.position.set(0, 1.6, 0);
  root.add(head);
  const cuello = add(new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.08, 0.12, 10), pielOscMat), head);
  cuello.position.y = -0.05;
  const craneo = add(new THREE.Mesh(new THREE.SphereGeometry(0.2, 18, 14), pielMat), head);
  craneo.position.y = 0.15;
  craneo.scale.set(0.94, 1.05, 0.96);
  for (const side of [-1, 1]) {
    const oreja = add(new THREE.Mesh(new THREE.SphereGeometry(0.048, 8, 6), pielMat), head);
    oreja.position.set(side * 0.185, 0.15, 0);
    oreja.scale.set(0.6, 1.1, 0.8);
  }

  // cabello NEGRO peinado para atrás (slicked back)
  const capucha = add(new THREE.Mesh(new THREE.SphereGeometry(0.21, 16, 12, 0, Math.PI * 2, 0, Math.PI * 0.62), peloMat), head);
  capucha.position.set(0, 0.17, -0.015);
  capucha.scale.set(0.98, 1.1, 1.02);
  // flequillo peinado hacia atrás con brillo (delantero alto)
  const swoosh = add(new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.09, 0.22), peloBrilloMat), head);
  swoosh.position.set(0, 0.31, 0.05);
  swoosh.rotation.x = -0.35;
  const swoosh2 = add(new THREE.Mesh(new THREE.BoxGeometry(0.26, 0.08, 0.16), peloMat), head);
  swoosh2.position.set(0, 0.3, -0.09);
  swoosh2.rotation.x = 0.4;
  // patillas
  for (const side of [-1, 1]) {
    const patilla = add(new THREE.Mesh(new THREE.BoxGeometry(0.045, 0.14, 0.1), peloMat), head);
    patilla.position.set(side * 0.175, 0.16, 0.03);
  }

  // cejas GRUESAS arqueadas (gesto canchero)
  for (const side of [-1, 1]) {
    const ceja = add(new THREE.Mesh(new THREE.BoxGeometry(0.09, 0.026, 0.02), peloMat), head);
    ceja.position.set(side * 0.078, 0.225, 0.175);
    ceja.rotation.z = side * -0.14;
  }

  // ojos oscuros
  for (const side of [-1, 1]) {
    const ojo = add(new THREE.Mesh(new THREE.SphereGeometry(0.04, 12, 10), blancoMat), head);
    ojo.position.set(side * 0.075, 0.16, 0.165);
    const iris = add(new THREE.Mesh(new THREE.SphereGeometry(0.021, 10, 8), ojoOscMat), head);
    iris.position.set(side * 0.075, 0.16, 0.192);
    const pupila = add(new THREE.Mesh(new THREE.SphereGeometry(0.011, 8, 6), mkMat(0x0c0a09)), head);
    pupila.position.set(side * 0.075, 0.16, 0.205);
    const brillo = add(new THREE.Mesh(new THREE.SphereGeometry(0.006, 6, 5), blancoMat), head);
    brillo.position.set(side * 0.067, 0.168, 0.21);
  }

  const nariz = add(new THREE.Mesh(new THREE.ConeGeometry(0.026, 0.075, 6), pielMat), head);
  nariz.position.set(0, 0.105, 0.195);
  nariz.rotation.x = Math.PI / 2.5;

  // boca ABIERTA sonriendo con LENGUA PARA AFUERA
  const boca = add(new THREE.Mesh(new THREE.BoxGeometry(0.11, 0.06, 0.03), bocaMat), head);
  boca.position.set(0, 0.035, 0.175);
  const dientes = add(new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.022, 0.02), blancoMat), head);
  dientes.position.set(0, 0.058, 0.183);
  const lengua = add(new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.05, 0.035), lenguaMat), head);
  lengua.position.set(0, 0.006, 0.195);
  lengua.rotation.x = 0.45;
  // comisuras de la sonrisa
  for (const side of [-1, 1]) {
    const comisura = add(new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.03, 0.02), bocaMat), head);
    comisura.position.set(side * 0.062, 0.05, 0.165);
    comisura.rotation.z = side * -0.5;
  }

  return { group: root, mats, hoodieMat: camisaMat, parts: { armL, armR, head } };
}
