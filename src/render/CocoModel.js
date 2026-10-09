import * as THREE from 'three';

/**
 * El Coco — modelado con primitivas (sin assets externos).
 * De Vita Machines: el más veloz (Corolla azul medianoche). Pibito ágil del barrio:
 * jogging azul con franja blanca, headband, rizos oscuros, zapatillas deportivas,
 * reloj dorado. Origen en los pies (y=0), altura ≈ 1.8.
 *
 * Devuelve { group, mats, hoodieMat, parts } — misma interfaz que KenaiModel.
 */
export function buildCoco() {
  const mats = [];
  const mkMat = (color, opts = {}) => {
    const m = new THREE.MeshStandardMaterial({ color, roughness: 0.65, metalness: 0.05, ...opts });
    m.userData.base = m.color.clone();
    mats.push(m);
    return m;
  };

  // paleta
  const PIEL = 0xb8764a;       // piel trigueña
  const AZUL = 0x4d8bff;       // jogging azul (su color)
  const AZUL_OSC = 0x3568c9;
  const BLANCO = 0xf4f1e8;
  const PELO = 0x1b1512;       // rizos bien oscuros
  const ORO = 0xf2c94c;
  const ZAPA = 0xe8e8e8;

  const pielMat = mkMat(PIEL);
  const azulMat = mkMat(AZUL);
  const azulOscMat = mkMat(AZUL_OSC);
  const blancoMat = mkMat(BLANCO, { roughness: 0.4 });
  const peloMat = mkMat(PELO, { roughness: 0.9 });
  const oroMat = mkMat(ORO, { metalness: 0.85, roughness: 0.25 });
  const zapaMat = mkMat(ZAPA, { roughness: 0.45 });
  const negroMat = mkMat(0x14161a, { roughness: 0.5 });

  const root = new THREE.Group();
  const add = (mesh, parent = root) => {
    mesh.castShadow = true;
    parent.add(mesh);
    return mesh;
  };

  // ======================== zapatillas deportivas ========================
  for (const side of [-1, 1]) {
    const x = side * 0.17;
    const suela = add(new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.06, 0.58), blancoMat));
    suela.position.set(x, 0.03, 0.04);
    const zapa = add(new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.13, 0.52), zapaMat));
    zapa.position.set(x, 0.125, 0.03);
    // franja azul en la zapatilla
    const franja = add(new THREE.Mesh(new THREE.BoxGeometry(0.31, 0.05, 0.3), azulMat));
    franja.position.set(x, 0.15, 0.1);
  }

  // ======================== jogging azul con franja blanca ========================
  for (const side of [-1, 1]) {
    const x = side * 0.17;
    const pierna = add(new THREE.Mesh(new THREE.CapsuleGeometry(0.16, 0.5, 6, 12), azulMat));
    pierna.position.set(x, 0.5, 0);
    // franja blanca lateral del jogging
    const franja = add(new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.55, 0.3), blancoMat));
    franja.position.set(side * 0.32, 0.5, 0);
  }
  const cadera = add(new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.22, 0.32), azulMat));
  cadera.position.set(0, 0.88, 0);

  // ======================== remera azul atlética ========================
  const torso = add(new THREE.Mesh(new THREE.CapsuleGeometry(0.3, 0.42, 8, 16), azulMat));
  torso.position.set(0, 1.2, 0);
  // franja blanca central de la remera
  const franjaRemera = add(new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.45, 0.02), blancoMat));
  franjaRemera.position.set(0, 1.2, 0.3);
  // número deportivo (10) como caja blanca atrás
  const numero = add(new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.2, 0.02), blancoMat));
  numero.position.set(0, 1.28, -0.3);

  // ======================== brazos atléticos (pose de pelea) ========================
  const armL = new THREE.Group();
  armL.position.set(-0.37, 1.46, 0);
  root.add(armL);
  const mangaL = add(new THREE.Mesh(new THREE.CapsuleGeometry(0.1, 0.22, 6, 10), azulMat), armL);
  mangaL.position.set(0, -0.12, 0.05);
  mangaL.rotation.x = 0.5;
  const anteL = add(new THREE.Mesh(new THREE.CapsuleGeometry(0.09, 0.2, 6, 10), pielMat), armL);
  anteL.position.set(0.05, -0.08, 0.22);
  anteL.rotation.set(-1.1, 0, -0.4);
  const punoL = add(new THREE.Mesh(new THREE.SphereGeometry(0.1, 10, 8), pielMat), armL);
  punoL.position.set(0.08, 0.1, 0.32);

  const armR = new THREE.Group();
  armR.position.set(0.37, 1.46, 0);
  root.add(armR);
  const mangaR = add(new THREE.Mesh(new THREE.CapsuleGeometry(0.1, 0.22, 6, 10), azulMat), armR);
  mangaR.position.set(0, -0.12, 0.08);
  mangaR.rotation.x = 0.7;
  const anteR = add(new THREE.Mesh(new THREE.CapsuleGeometry(0.09, 0.2, 6, 10), pielMat), armR);
  anteR.position.set(-0.02, -0.16, 0.24);
  anteR.rotation.x = 1.2;
  const punoR = add(new THREE.Mesh(new THREE.SphereGeometry(0.1, 10, 8), pielMat), armR);
  punoR.position.set(-0.03, -0.2, 0.4);
  // reloj dorado en la muñeca derecha (detalle de facha)
  const reloj = add(new THREE.Mesh(new THREE.TorusGeometry(0.07, 0.018, 8, 16), oroMat), armR);
  reloj.position.set(-0.03, -0.2, 0.3);
  reloj.rotation.x = Math.PI / 2.2;

  // ======================== cabeza con rizos y headband ========================
  const head = new THREE.Group();
  head.position.set(0, 1.56, 0);
  root.add(head);
  const cuello = add(new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.09, 0.08, 10), pielMat), head);
  cuello.position.y = -0.02;
  const craneo = add(new THREE.Mesh(new THREE.SphereGeometry(0.2, 18, 14), pielMat), head);
  craneo.position.y = 0.16;
  for (const side of [-1, 1]) {
    const oreja = add(new THREE.Mesh(new THREE.SphereGeometry(0.045, 8, 6), pielMat), head);
    oreja.position.set(side * 0.2, 0.16, 0);
  }
  // rizos: varias esferitas oscuras arriba (textura afro)
  const rizos = [
    [0, 0.34, 0.02, 0.1], [-0.09, 0.3, 0.06, 0.09], [0.09, 0.3, 0.06, 0.09],
    [-0.06, 0.3, -0.07, 0.09], [0.06, 0.3, -0.07, 0.09], [0, 0.27, 0.12, 0.08],
    [-0.13, 0.24, 0, 0.08], [0.13, 0.24, 0, 0.08],
  ];
  for (const [rx, ry, rz, rr] of rizos) {
    const rizo = add(new THREE.Mesh(new THREE.SphereGeometry(rr, 8, 6), peloMat), head);
    rizo.position.set(rx, ry, rz);
  }
  // headband blanca (vincha)
  const headband = add(new THREE.Mesh(new THREE.TorusGeometry(0.205, 0.035, 8, 20), blancoMat), head);
  headband.position.y = 0.22;
  headband.rotation.x = Math.PI / 2 - 0.12;
  // ojos + cejas
  for (const side of [-1, 1]) {
    const ojo = add(new THREE.Mesh(new THREE.SphereGeometry(0.036, 10, 8), blancoMat), head);
    ojo.position.set(side * 0.07, 0.17, 0.175);
    const pupila = add(new THREE.Mesh(new THREE.SphereGeometry(0.016, 8, 6), negroMat), head);
    pupila.position.set(side * 0.07, 0.17, 0.205);
    const ceja = add(new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.022, 0.02), peloMat), head);
    ceja.position.set(side * 0.075, 0.23, 0.185);
    ceja.rotation.z = side * -0.12;
  }
  const nariz = add(new THREE.Mesh(new THREE.SphereGeometry(0.03, 8, 6), pielMat), head);
  nariz.position.set(0, 0.13, 0.2);
  // sonrisa confiada
  const sonrisa = add(new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.04, 0.02), blancoMat), head);
  sonrisa.position.set(0, 0.07, 0.185);
  sonrisa.rotation.x = 0.1;

  return { group: root, mats, hoodieMat: azulMat, parts: { armL, armR, head } };
}
