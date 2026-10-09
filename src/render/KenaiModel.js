import * as THREE from 'three';

/**
 * Kenai "Pablo QuemandoRuedas" modelado con primitivas (sin assets externos).
 * Basado en las referencias: hoodie gris oversize con gráfico, cargo negro baggy,
 * zapatillas chunky, cadenas de plata, fade, sonrisa confiada, pose de pelea
 * y blunt con brasa. Origen en los pies (y=0), altura ≈ 1.85.
 *
 * Devuelve { group, mats, hoodieMat, parts }.
 * Cada material tiene userData.base (color original) para los tintes de stance/hitstun.
 */
export function buildKenai() {
  const mats = [];
  const mkMat = (color, opts = {}) => {
    const m = new THREE.MeshStandardMaterial({ color, roughness: 0.65, metalness: 0.05, ...opts });
    m.userData.base = m.color.clone();
    mats.push(m);
    return m;
  };

  // paleta (de las referencias)
  const PIEL = 0xc98a5f;
  const HOODIE = 0x9ba1ab;
  const HOODIE_OSC = 0x7d838d;
  const CARGO = 0x20232a;
  const CARGO_BOL = 0x2b2f38;
  const ZAPA = 0x16181d;
  const SUELA = 0xf4f1e8;
  const PELO = 0x3a2a1e;
  const CADENA = 0xd7dce2;
  const AZUL = 0x3b6fd4;
  const ROJO = 0xd8352a;

  const hoodieMat = mkMat(HOODIE);
  const pielMat = mkMat(PIEL);
  const peloMat = mkMat(PELO, { roughness: 0.85 });
  const cargoMat = mkMat(CARGO, { roughness: 0.8 });
  const hoodieOscMat = mkMat(HOODIE_OSC);
  const zapaMat = mkMat(ZAPA, { roughness: 0.5 });
  const suelaMat = mkMat(SUELA, { roughness: 0.4 });
  const cadenaMat = mkMat(CADENA, { metalness: 0.9, roughness: 0.25 });
  const blancoMat = mkMat(0xffffff, { roughness: 0.3 });
  const negroMat = mkMat(0x14161a, { roughness: 0.5 });
  const azulMat = mkMat(AZUL);
  const rojoMat = mkMat(ROJO);
  const brasaMat = mkMat(0xff7a2a, { emissive: 0xff7a2a, emissiveIntensity: 2.2 });
  const humoMat = mkMat(0x9fb3a5, { transparent: true, opacity: 0.5, roughness: 1 });

  const root = new THREE.Group();
  const add = (mesh, parent = root) => {
    mesh.castShadow = true;
    parent.add(mesh);
    return mesh;
  };

  // ======================== zapatillas chunky ========================
  for (const side of [-1, 1]) {
    const x = side * 0.19;
    const suela = add(new THREE.Mesh(new THREE.BoxGeometry(0.36, 0.07, 0.62), suelaMat));
    suela.position.set(x, 0.035, 0.04);
    const zapa = add(new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.14, 0.56), zapaMat));
    zapa.position.set(x, 0.135, 0.03);
    const punta = add(new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.1, 0.14), suelaMat));
    punta.position.set(x, 0.14, 0.3);
  }

  // ======================== cargo baggy ========================
  for (const side of [-1, 1]) {
    const x = side * 0.19;
    const pierna = add(new THREE.Mesh(new THREE.CapsuleGeometry(0.18, 0.46, 6, 12), cargoMat));
    pierna.position.set(x, 0.47, 0);
    const bolsillo = add(new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.2, 0.15), mkMat(CARGO_BOL)));
    bolsillo.position.set(side * 0.37, 0.52, 0.04);
  }
  const cadera = add(new THREE.Mesh(new THREE.BoxGeometry(0.54, 0.24, 0.36), cargoMat));
  cadera.position.set(0, 0.86, 0);

  // ======================== hoodie oversize ========================
  const torso = add(new THREE.Mesh(new THREE.CapsuleGeometry(0.33, 0.42, 8, 16), hoodieMat));
  torso.position.set(0, 1.18, 0);
  // bolsillo canguro
  const bolsillo = add(new THREE.Mesh(new THREE.BoxGeometry(0.36, 0.18, 0.1), hoodieOscMat));
  bolsillo.position.set(0, 1.0, 0.3);
  // gráfico del frente (azul con detalle rojo)
  const grafico = add(new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.26, 0.02), azulMat));
  grafico.position.set(0, 1.32, 0.325);
  const graficoR = add(new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.1, 0.022), rojoMat));
  graficoR.position.set(0, 1.34, 0.328);
  // capucha atrás
  const capucha = add(new THREE.Mesh(
    new THREE.SphereGeometry(0.17, 14, 10, 0, Math.PI * 2, 0, Math.PI * 0.55),
    hoodieOscMat,
  ));
  capucha.position.set(0, 1.44, -0.2);
  capucha.rotation.x = -0.5;

  // ======================== brazos (grupos para animar) ========================
  // izquierdo: guardia junto a la cara
  const armL = new THREE.Group();
  armL.position.set(-0.4, 1.45, 0);
  root.add(armL);
  const mangaL = add(new THREE.Mesh(new THREE.CapsuleGeometry(0.11, 0.24, 6, 10), hoodieMat), armL);
  mangaL.position.set(0, -0.12, 0.05);
  mangaL.rotation.x = 0.5;
  const anteL = add(new THREE.Mesh(new THREE.CapsuleGeometry(0.1, 0.2, 6, 10), hoodieMat), armL);
  anteL.position.set(0.06, -0.1, 0.24);
  anteL.rotation.set(-1.1, 0, -0.5);
  const punoL = add(new THREE.Mesh(new THREE.SphereGeometry(0.11, 10, 8), pielMat), armL);
  punoL.position.set(0.1, 0.1, 0.34);

  // derecho: jab adelante con el blunt
  const armR = new THREE.Group();
  armR.position.set(0.4, 1.45, 0);
  root.add(armR);
  const mangaR = add(new THREE.Mesh(new THREE.CapsuleGeometry(0.11, 0.24, 6, 10), hoodieMat), armL);
  mangaR.position.set(0, -0.12, 0.08);
  mangaR.rotation.x = 0.7;
  const anteR = add(new THREE.Mesh(new THREE.CapsuleGeometry(0.1, 0.2, 6, 10), hoodieMat), armR);
  anteR.position.set(-0.02, -0.16, 0.26);
  anteR.rotation.x = 1.2;
  const punoR = add(new THREE.Mesh(new THREE.SphereGeometry(0.11, 10, 8), pielMat), armR);
  punoR.position.set(-0.04, -0.2, 0.42);

  // blunt con brasa (brilla con el bloom) y humito
  const blunt = add(new THREE.Mesh(new THREE.CylinderGeometry(0.022, 0.022, 0.13, 8), mkMat(0x6b4a2f)), armR);
  blunt.position.set(-0.04, -0.16, 0.5);
  blunt.rotation.x = Math.PI / 2.3;
  const brasa = add(new THREE.Mesh(new THREE.SphereGeometry(0.03, 8, 6), brasaMat), armR);
  brasa.position.set(-0.04, -0.12, 0.55);
  for (let i = 0; i < 3; i++) {
    const h = add(new THREE.Mesh(new THREE.SphereGeometry(0.035 + i * 0.015, 8, 6), humoMat), armR);
    h.position.set(-0.04 + (i % 2 ? 0.02 : -0.02), -0.05 + i * 0.08, 0.55);
    h.castShadow = false;
  }

  // ======================== cadenas de plata ========================
  for (const [r, z] of [[0.13, 0.09], [0.165, 0.07]]) {
    const cad = add(new THREE.Mesh(new THREE.TorusGeometry(r, 0.013, 8, 22), cadenaMat));
    cad.position.set(0, 1.52, z);
    cad.rotation.x = 1.35;
  }

  // ======================== cabeza ========================
  const head = new THREE.Group();
  head.position.set(0, 1.56, 0);
  root.add(head);
  const cuello = add(new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.1, 0.08, 10), pielMat), head);
  cuello.position.y = -0.02;
  const craneo = add(new THREE.Mesh(new THREE.SphereGeometry(0.21, 18, 14), pielMat), head);
  craneo.position.y = 0.16;
  for (const side of [-1, 1]) {
    const oreja = add(new THREE.Mesh(new THREE.SphereGeometry(0.05, 8, 6), pielMat), head);
    oreja.position.set(side * 0.21, 0.16, 0);
  }
  // pelo con fade (solo arriba) + flequillo
  const pelo = add(new THREE.Mesh(
    new THREE.SphereGeometry(0.225, 18, 12, 0, Math.PI * 2, 0, Math.PI * 0.5),
    peloMat,
  ), head);
  pelo.position.y = 0.2;
  const flequillo = add(new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.07, 0.08), peloMat), head);
  flequillo.position.set(0, 0.28, 0.16);
  flequillo.rotation.x = -0.25;
  // ojos (blanco + pupila) y cejas
  for (const side of [-1, 1]) {
    const ojo = add(new THREE.Mesh(new THREE.SphereGeometry(0.038, 10, 8), blancoMat), head);
    ojo.position.set(side * 0.075, 0.18, 0.185);
    const pupila = add(new THREE.Mesh(new THREE.SphereGeometry(0.017, 8, 6), negroMat), head);
    pupila.position.set(side * 0.075, 0.18, 0.215);
    const ceja = add(new THREE.Mesh(new THREE.BoxGeometry(0.09, 0.025, 0.02), peloMat), head);
    ceja.position.set(side * 0.08, 0.245, 0.19);
    ceja.rotation.z = side * -0.15;
  }
  // nariz y sonrisa
  const nariz = add(new THREE.Mesh(new THREE.SphereGeometry(0.032, 8, 6), pielMat), head);
  nariz.position.set(0, 0.14, 0.21);
  const sonrisa = add(new THREE.Mesh(new THREE.BoxGeometry(0.13, 0.045, 0.02), blancoMat), head);
  sonrisa.position.set(0, 0.075, 0.195);
  sonrisa.rotation.x = 0.1;

  return { group: root, mats, hoodieMat, parts: { armL, armR, head } };
}
