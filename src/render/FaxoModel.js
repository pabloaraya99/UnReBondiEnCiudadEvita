import * as THREE from 'three';

/**
 * Dr Faxo — modelado con primitivas (sin assets externos).
 * Basado en el splash art oficial (pilots/faxo.webp):
 * - FLACO y ALTO: cuello largo, contextura delgada
 * - RULOS RUBIOS/castaño claro (rizos abundantes arriba)
 * - Remera NEGRA lisa
 * - CÁMARA PROFESIONAL colgada del cuello: correa, cuerpo negro,
 *   lente grande, flash con pantalla VERDE brillante
 * - Auriculares in-ear con cable negro colgando
 * - Ojos grandes castaños, cejas finas, sonrisa leve
 * Origen en los pies (y=0), altura ≈ 1.9 (el más alto).
 *
 * Devuelve { group, mats, hoodieMat, parts } — misma interfaz que KenaiModel.
 */
export function buildFaxo() {
  const mats = [];
  const mkMat = (color, opts = {}) => {
    const m = new THREE.MeshStandardMaterial({ color, roughness: 0.65, metalness: 0.05, ...opts });
    m.userData.base = m.color.clone();
    mats.push(m);
    return m;
  };

  // paleta BEIGE (a pedido del usuario: tonos crema/arena/marrón claro)
  const PIEL = 0xc29a7c;       // piel clara cálida
  const BEIGE = 0xd9c8a9;      // remera beige claro
  const BEIGE_OSC = 0xbfa88a;  // beige sombra / costuras
  const MARRON = 0x8a6f52;     // pantalón marrón claro
  const MARRON_OSC = 0x6f5942;
  const PELO = 0x8a6a42;       // rulos rubios/castaño claro
  const PELO_OSC = 0x6b5133;
  const CREMA = 0xe8e0cf;      // suelas y detalles
  const CAM = 0x3a3730;        // cámara negra cálida
  const CAM_OSC = 0x4a463e;
  const LENTE = 0x1c1a16;
  const CORREA = 0x5d5344;     // correa marrón
  const CABLE = 0x3a3730;      // cable oscuro cálido
  const METAL = 0x9aa0a6;

  const pielMat = mkMat(PIEL);
  const remeraMat = mkMat(BEIGE, { roughness: 0.85 });
  const remeraOscMat = mkMat(BEIGE_OSC, { roughness: 0.9 });
  const jeanMat = mkMat(MARRON, { roughness: 0.8 });
  const peloMat = mkMat(PELO, { roughness: 0.9 });
  const peloOscMat = mkMat(PELO_OSC, { roughness: 0.9 });
  const zapaMat = mkMat(MARRON_OSC, { roughness: 0.5 });
  const suelaMat = mkMat(CREMA, { roughness: 0.4 });
  const camMat = mkMat(CAM, { roughness: 0.35, metalness: 0.3 });
  const camOscMat = mkMat(CAM_OSC, { roughness: 0.45, metalness: 0.3 });
  const lenteMat = mkMat(LENTE, { roughness: 0.15, metalness: 0.5 });
  const cristalMat = mkMat(0x4a6a4f, { transparent: true, opacity: 0.8, roughness: 0.1, metalness: 0.3 });
  const correaMat = mkMat(CORREA, { roughness: 0.9 });
  const cableMat = mkMat(CABLE, { roughness: 0.6 });
  const metalMat = mkMat(METAL, { metalness: 0.8, roughness: 0.3 });
  const negroMat = mkMat(0x14161a, { roughness: 0.5 });
  const blancoMat = mkMat(0xffffff, { roughness: 0.3 });
  const screenMat = mkMat(0x9be86e, { emissive: 0x7fd44c, emissiveIntensity: 0.9, roughness: 0.2 });
  const verdeLuzMat = mkMat(0x3fa34d, { emissive: 0x3fa34d, emissiveIntensity: 1.2, roughness: 0.3 });

  const root = new THREE.Group();
  const add = (mesh, parent = root) => {
    mesh.castShadow = true;
    parent.add(mesh);
    return mesh;
  };

  // ======================== zapatillas oscuras ========================
  for (const side of [-1, 1]) {
    const x = side * 0.14;
    const suela = add(new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.05, 0.5), suelaMat));
    suela.position.set(x, 0.025, 0.02);
    const zapa = add(new THREE.Mesh(new THREE.BoxGeometry(0.26, 0.12, 0.46), zapaMat));
    zapa.position.set(x, 0.11, 0.0);
  }

  // ======================== pantalón oscuro flaco ========================
  for (const side of [-1, 1]) {
    const x = side * 0.14;
    const pierna = add(new THREE.Mesh(new THREE.CapsuleGeometry(0.11, 0.6, 6, 12), jeanMat));
    pierna.position.set(x, 0.55, 0);
  }
  const cadera = add(new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.2, 0.26), jeanMat));
  cadera.position.set(0, 0.95, 0);

  // ======================== remera NEGRA lisa (flaco) ========================
  const torso = add(new THREE.Mesh(new THREE.CapsuleGeometry(0.22, 0.44, 8, 16), remeraMat));
  torso.position.set(0, 1.26, 0);
  // costuras sutiles de la remera
  for (const side of [-1, 1]) {
    const costura = add(new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.4, 0.02), remeraOscMat));
    costura.position.set(side * 0.18, 1.26, 0.2);
  }
  // dobladillo inferior
  const dobladillo = add(new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.05, 0.28), remeraOscMat));
  dobladillo.position.set(0, 1.02, 0);

  // ======================== brazos flacos ========================
  const armL = new THREE.Group();
  armL.position.set(-0.3, 1.52, 0);
  root.add(armL);
  const mangaL = add(new THREE.Mesh(new THREE.CapsuleGeometry(0.08, 0.14, 6, 10), remeraMat), armL);
  mangaL.position.set(0, -0.07, 0.04);
  mangaL.rotation.x = 0.5;
  const anteL = add(new THREE.Mesh(new THREE.CapsuleGeometry(0.07, 0.26, 6, 10), pielMat), armL);
  anteL.position.set(0.05, -0.1, 0.22);
  anteL.rotation.set(-1.1, 0, -0.4);
  const manoL = add(new THREE.Mesh(new THREE.SphereGeometry(0.08, 10, 8), pielMat), armL);
  manoL.position.set(0.08, 0.08, 0.34);
  manoL.scale.set(0.75, 1.2, 0.75);

  const armR = new THREE.Group();
  armR.position.set(0.3, 1.52, 0);
  root.add(armR);
  const mangaR = add(new THREE.Mesh(new THREE.CapsuleGeometry(0.08, 0.14, 6, 10), remeraMat), armR);
  mangaR.position.set(0, -0.07, 0.06);
  mangaR.rotation.x = 0.7;
  const anteR = add(new THREE.Mesh(new THREE.CapsuleGeometry(0.07, 0.26, 6, 10), pielMat), armR);
  anteR.position.set(-0.02, -0.14, 0.24);
  anteR.rotation.x = 1.2;
  const manoR = add(new THREE.Mesh(new THREE.SphereGeometry(0.08, 10, 8), pielMat), armR);
  manoR.position.set(-0.03, -0.18, 0.4);
  manoR.scale.set(0.75, 1.2, 0.75);

  // ======================== CÁMARA PROFESIONAL colgada del cuello ========================
  // correa: dos tiras que bajan del cuello al pecho
  for (const side of [-1, 1]) {
    const tira = add(new THREE.Mesh(new THREE.BoxGeometry(0.045, 0.5, 0.015), correaMat));
    tira.position.set(side * 0.13, 1.42, 0.22);
    tira.rotation.x = 0.12;
    tira.rotation.z = side * -0.12;
  }
  // cuerpo de la cámara (colgando en el pecho)
  const cam = new THREE.Group();
  cam.position.set(0, 1.16, 0.28);
  cam.rotation.x = -0.12;
  root.add(cam);
  const cuerpo = add(new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.15, 0.1), camMat), cam);
  // empuñadura lateral
  const grip = add(new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.15, 0.11), camOscMat), cam);
  grip.position.set(-0.13, 0, 0.01);
  // lente grande sobresaliendo
  const lente = add(new THREE.Mesh(new THREE.CylinderGeometry(0.055, 0.065, 0.14, 14), lenteMat), cam);
  lente.rotation.x = Math.PI / 2;
  lente.position.set(0.02, -0.01, 0.1);
  // anillo del lente (metal)
  const anilloLente = add(new THREE.Mesh(new THREE.CylinderGeometry(0.062, 0.062, 0.02, 14), metalMat), cam);
  anilloLente.rotation.x = Math.PI / 2;
  anilloLente.position.set(0.02, -0.01, 0.06);
  // cristal frontal verdoso
  const cristal = add(new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.045, 0.012, 14), cristalMat), cam);
  cristal.rotation.x = Math.PI / 2;
  cristal.position.set(0.02, -0.01, 0.175);
  // visor superior
  const visor = add(new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.06, 0.06), camOscMat), cam);
  visor.position.set(0.02, 0.1, 0);
  // FLASH arriba con pantalla VERDE brillante (lo más vistoso)
  const flash = add(new THREE.Mesh(new THREE.BoxGeometry(0.09, 0.07, 0.04), camMat), cam);
  flash.position.set(0.02, 0.14, 0.02);
  const pantalla = add(new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.05, 0.012), screenMat), cam);
  pantalla.position.set(0.02, 0.14, 0.045);
  // dial de modos + botón rojo de disparo
  const dial = add(new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, 0.02, 10), metalMat), cam);
  dial.position.set(-0.08, 0.085, 0);
  const botonRojo = add(new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.015, 0.012, 8), mkMat(0xd8352a)), cam);
  botonRojo.position.set(0.1, 0.082, 0.02);
  // luz verde de encendido
  const luz = add(new THREE.Mesh(new THREE.BoxGeometry(0.012, 0.012, 0.008), verdeLuzMat), cam);
  luz.position.set(0.02, 0.045, 0.055);

  // ======================== auriculares in-ear con cable ========================
  // cables que bajan de las orejas al pecho
  for (const side of [-1, 1]) {
    const cable = add(new THREE.Mesh(new THREE.CylinderGeometry(0.006, 0.006, 0.3, 5), cableMat));
    cable.position.set(side * 0.19, 1.52, 0.02);
    cable.rotation.x = 0.08;
    // auricular (botoncito en la oreja)
    const bud = add(new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.02, 0.03, 8), cableMat));
    bud.position.set(side * 0.19, 1.66, 0.03);
    bud.rotation.z = Math.PI / 2;
  }

  // ======================== cabeza: RULOS RUBIOS, ojos grandes ========================
  const head = new THREE.Group();
  head.position.set(0, 1.62, 0);
  root.add(head);
  // cuello LARGO (es alto y flaco)
  const cuello = add(new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.07, 0.14, 10), pielMat), head);
  cuello.position.y = -0.05;
  const craneo = add(new THREE.Mesh(new THREE.SphereGeometry(0.19, 18, 14), pielMat), head);
  craneo.position.y = 0.14;
  craneo.scale.set(0.92, 1.05, 0.95);
  for (const side of [-1, 1]) {
    const oreja = add(new THREE.Mesh(new THREE.SphereGeometry(0.045, 8, 6), pielMat), head);
    oreja.position.set(side * 0.175, 0.14, 0);
    oreja.scale.set(0.6, 1.15, 0.8);
  }
  // RULOS abundantes: esferitas rizadas por toda la parte superior
  const rulos = [
    // fila superior
    [0, 0.34, 0, 0.075], [-0.08, 0.32, 0.05, 0.07], [0.08, 0.32, 0.05, 0.07],
    [-0.06, 0.33, -0.07, 0.07], [0.06, 0.33, -0.07, 0.07], [0, 0.3, 0.12, 0.065],
    // costados y atrás
    [-0.13, 0.28, 0.02, 0.065], [0.13, 0.28, 0.02, 0.065],
    [-0.12, 0.27, -0.08, 0.06], [0.12, 0.27, -0.08, 0.06],
    [0, 0.29, -0.13, 0.07],
    // fila baja (flequillo rizado)
    [-0.09, 0.26, 0.1, 0.055], [0.09, 0.26, 0.1, 0.055],
    [-0.04, 0.27, 0.13, 0.05], [0.04, 0.27, 0.13, 0.05],
  ];
  for (const [rx, ry, rz, rr] of rulos) {
    const rulo = add(new THREE.Mesh(new THREE.SphereGeometry(rr, 9, 7), peloMat), head);
    rulo.position.set(rx, ry, rz);
    // mechón oscuro dentro de cada rulo para dar textura de rizo
    const sombra = add(new THREE.Mesh(new THREE.SphereGeometry(rr * 0.55, 7, 5), peloOscMat), head);
    sombra.position.set(rx * 1.02, ry - rr * 0.3, rz + rr * 0.25);
  }

  // ojos grandes castaños (mirada amable del splash art)
  for (const side of [-1, 1]) {
    const ojo = add(new THREE.Mesh(new THREE.SphereGeometry(0.042, 12, 10), blancoMat), head);
    ojo.position.set(side * 0.07, 0.15, 0.16);
    const iris = add(new THREE.Mesh(new THREE.SphereGeometry(0.022, 10, 8), mkMat(0x5d3d24)), head);
    iris.position.set(side * 0.07, 0.15, 0.19);
    const pupila = add(new THREE.Mesh(new THREE.SphereGeometry(0.011, 8, 6), negroMat), head);
    pupila.position.set(side * 0.07, 0.15, 0.205);
    const brillo = add(new THREE.Mesh(new THREE.SphereGeometry(0.007, 6, 5), blancoMat), head);
    brillo.position.set(side * 0.062, 0.158, 0.2);
    // cejas finas arqueadas
    const ceja = add(new THREE.Mesh(new THREE.BoxGeometry(0.075, 0.014, 0.012), peloOscMat), head);
    ceja.position.set(side * 0.075, 0.215, 0.165);
    ceja.rotation.z = side * -0.12;
  }
  const nariz = add(new THREE.Mesh(new THREE.ConeGeometry(0.024, 0.07, 6), pielMat), head);
  nariz.position.set(0, 0.1, 0.19);
  nariz.rotation.x = Math.PI / 2.5;
  // sonrisa leve (gesto tranquilo)
  const sonrisa = add(new THREE.Mesh(new THREE.BoxGeometry(0.09, 0.02, 0.015), mkMat(0x8f6350)), head);
  sonrisa.position.set(0, 0.045, 0.17);
  sonrisa.rotation.x = 0.1;

  return { group: root, mats, hoodieMat: remeraMat, parts: { armL, armR, head } };
}
