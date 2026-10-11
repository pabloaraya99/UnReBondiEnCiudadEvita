import * as THREE from 'three';

/**
 * Dr Faxo — modelado con primitivas (sin assets externos).
 * De Vita Machines: el más manejable (Renault Clio gris topo). El doctor del barrio:
 * bata gris abierta sobre camiseta de fútbol, short, OJOTAS CON MEDIAS, anteojos,
 * pelo canoso con entradas y CÁMARA de fotos en la mano (cro­nista del barrio).
 * Más FLACO y petiso. Origen en los pies (y=0), altura ≈ 1.8.
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

  // paleta
  const PIEL = 0xaa847a;       // piel (del retrato, más oscura que la anterior)
  const BATA = 0x9aa0a6;       // gris topo (su color)
  const BATA_OSC = 0x7d838d;
  const FUTBOL = 0x3b6fd4;     // camiseta de fútbol (rayas)
  const FUTBOL_B = 0xf4f1e8;
  const SHORT = 0x2b2f38;
  const PELO = 0xb9bec6;       // canoso
  const MEDIA = 0xf4f1e8;      // medias blancas con las ojotas
  const MATE = 0x6b4a2f;       // calabaza del mate
  const NEGRO = 0x14161a;

  const pielMat = mkMat(PIEL);
  const bataMat = mkMat(BATA);
  const bataOscMat = mkMat(BATA_OSC);
  const futbolMat = mkMat(FUTBOL);
  const futbolBMat = mkMat(FUTBOL_B, { roughness: 0.4 });
  const shortMat = mkMat(SHORT, { roughness: 0.8 });
  const peloMat = mkMat(PELO, { roughness: 0.85 });
  const mediaMat = mkMat(MEDIA, { roughness: 0.5 });
  const mateMat = mkMat(MATE, { roughness: 0.7 });
  const negroMat = mkMat(NEGRO, { roughness: 0.5 });
  const blancoMat = mkMat(0xffffff, { roughness: 0.3 });
  const metalMat = mkMat(0x9aa0a6, { metalness: 0.8, roughness: 0.3 });

  const root = new THREE.Group();
  const add = (mesh, parent = root) => {
    mesh.castShadow = true;
    parent.add(mesh);
    return mesh;
  };

  // ======================== OJOTAS CON MEDIAS (detalle cómico) ========================
  for (const side of [-1, 1]) {
    const x = side * 0.15;
    // media blanca
    const media = add(new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.12, 0.2, 10), mediaMat));
    media.position.set(x, 0.12, 0);
    // ojota (suela marrón + tira)
    const suela = add(new THREE.Mesh(new THREE.BoxGeometry(0.26, 0.045, 0.52), mateMat));
    suela.position.set(x, 0.025, 0.03);
    const tira = add(new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.02, 0.16), mateMat));
    tira.position.set(x, 0.16, 0.12);
    tira.rotation.x = -0.5;
  }

  // ======================== piernas flacas + short de fútbol ========================
  for (const side of [-1, 1]) {
    const x = side * 0.15;
    const pierna = add(new THREE.Mesh(new THREE.CapsuleGeometry(0.1, 0.5, 6, 10), pielMat));
    pierna.position.set(x, 0.5, 0);
  }
  const short = add(new THREE.Mesh(new THREE.BoxGeometry(0.44, 0.3, 0.3), shortMat));
  short.position.set(0, 0.92, 0);
  // franja del short
  const franjaShort = add(new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.3, 0.31), futbolBMat));
  franjaShort.position.set(-0.19, 0.92, 0);

  // ======================== camiseta de fútbol + bata abierta (flaco) ========================
  // camiseta (con 2 rayas blancas)
  const camiseta = add(new THREE.Mesh(new THREE.CapsuleGeometry(0.21, 0.38, 8, 14), futbolMat));
  camiseta.position.set(0, 1.24, 0);
  for (const dy of [1.12, 1.3]) {
    const raya = add(new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.06, 0.02), futbolBMat));
    raya.position.set(0, dy, 0.26);
  }
  // bata gris abierta (dos paneles que no se cierran al frente)
  const bataL = add(new THREE.Mesh(new THREE.BoxGeometry(0.17, 0.62, 0.08), bataMat));
  bataL.position.set(-0.2, 1.26, 0.1);
  bataL.rotation.y = 0.15;
  const bataR = add(new THREE.Mesh(new THREE.BoxGeometry(0.17, 0.62, 0.08), bataMat));
  bataR.position.set(0.2, 1.26, 0.1);
  bataR.rotation.y = -0.15;
  const bataEspalda = add(new THREE.Mesh(new THREE.BoxGeometry(0.36, 0.62, 0.06), bataMat));
  bataEspalda.position.set(0, 1.26, -0.16);
  // bolsillo de la bata con lapicera verde
  const bolsillo = add(new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.12, 0.03), bataOscMat));
  bolsillo.position.set(-0.22, 1.16, 0.18);
  const lapicera = add(new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, 0.12, 6), mkMat(0x3fa34d)));
  lapicera.position.set(-0.22, 1.24, 0.18);

  // ======================== brazos flacos ========================
  const armL = new THREE.Group();
  armL.position.set(-0.34, 1.5, 0);
  root.add(armL);
  // manga de bata izquierda
  const mangaL = add(new THREE.Mesh(new THREE.CapsuleGeometry(0.085, 0.22, 6, 10), bataMat), armL);
  mangaL.position.set(0, -0.13, 0.05);
  mangaL.rotation.x = 0.4;
  const anteL = add(new THREE.Mesh(new THREE.CapsuleGeometry(0.07, 0.18, 6, 10), pielMat), armL);
  anteL.position.set(0.04, -0.1, 0.2);
  anteL.rotation.set(-1.0, 0, -0.3);
  const punoL = add(new THREE.Mesh(new THREE.SphereGeometry(0.08, 10, 8), pielMat), armL);
  punoL.position.set(0.07, 0.08, 0.3);

  const armR = new THREE.Group();
  armR.position.set(0.34, 1.5, 0);
  root.add(armR);
  const mangaR = add(new THREE.Mesh(new THREE.CapsuleGeometry(0.085, 0.22, 6, 10), bataMat), armR);
  mangaR.position.set(0, -0.13, 0.06);
  mangaR.rotation.x = 0.5;
  const anteR = add(new THREE.Mesh(new THREE.CapsuleGeometry(0.07, 0.18, 6, 10), pielMat), armR);
  anteR.position.set(-0.02, -0.1, 0.22);
  anteR.rotation.x = 0.9;
  const punoR = add(new THREE.Mesh(new THREE.SphereGeometry(0.08, 10, 8), pielMat), armR);
  punoR.position.set(-0.03, -0.12, 0.38);

  // CÁMARA en la mano derecha (el doctor inmortaliza el barrio)
  const cam = new THREE.Group();
  cam.position.set(-0.03, -0.08, 0.5);
  cam.rotation.z = 0.18;
  armR.add(cam);
  const cuerpo = add(new THREE.Mesh(new THREE.BoxGeometry(0.15, 0.11, 0.08), negroMat), cam);
  const lente = add(new THREE.Mesh(new THREE.CylinderGeometry(0.032, 0.038, 0.07, 12), metalMat), cam);
  lente.rotation.x = Math.PI / 2;
  lente.position.z = 0.06;
  const cristal = add(new THREE.Mesh(
    new THREE.CylinderGeometry(0.026, 0.026, 0.01, 14),
    mkMat(0x9fc6e8, { transparent: true, opacity: 0.75, roughness: 0.1, metalness: 0.2 }),
  ), cam);
  cristal.rotation.x = Math.PI / 2;
  cristal.position.z = 0.095;
  const visor = add(new THREE.Mesh(new THREE.BoxGeometry(0.055, 0.04, 0.05), negroMat), cam);
  visor.position.set(0, 0.085, 0);
  const flash = add(new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.02, 0.015), mkMat(0xffffff, { emissive: 0xffffff, emissiveIntensity: 1.6, roughness: 0.3 })), cam);
  flash.position.set(0.05, 0.02, 0.045);
  // correa de la cámara
  for (const side of [-1, 1]) {
    const correa = add(new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.02, 0.02), mkMat(0x3a3f47)), cam);
    correa.position.set(0, side * 0.02, -0.04);
    correa.rotation.x = side * 0.06;
  }

  // ======================== cabeza canosa con anteojos ========================
  const head = new THREE.Group();
  head.position.set(0, 1.58, 0);
  root.add(head);
  const cuello = add(new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.09, 0.08, 10), pielMat), head);
  cuello.position.y = -0.02;
  const craneo = add(new THREE.Mesh(new THREE.SphereGeometry(0.2, 18, 14), pielMat), head);
  craneo.position.y = 0.16;
  for (const side of [-1, 1]) {
    const oreja = add(new THREE.Mesh(new THREE.SphereGeometry(0.045, 8, 6), pielMat), head);
    oreja.position.set(side * 0.2, 0.16, 0);
  }
  // pelo canoso con entradas (solo costados y atrás)
  const peloL = add(new THREE.Mesh(new THREE.SphereGeometry(0.08, 8, 6), peloMat), head);
  peloL.position.set(-0.14, 0.26, -0.02);
  const peloR = add(new THREE.Mesh(new THREE.SphereGeometry(0.08, 8, 6), peloMat), head);
  peloR.position.set(0.14, 0.26, -0.02);
  const peloAtras = add(new THREE.Mesh(
    new THREE.SphereGeometry(0.19, 14, 10, 0, Math.PI * 2, Math.PI * 0.3, Math.PI * 0.35),
    peloMat,
  ), head);
  peloAtras.position.y = 0.2;

  // ANTEOJOS (el rasgo del doctor): 2 círculos + puente + patillas
  const anteojoMat = mkMat(0x2b2f38, { metalness: 0.6, roughness: 0.3 });
  for (const side of [-1, 1]) {
    const aro = add(new THREE.Mesh(new THREE.TorusGeometry(0.055, 0.008, 8, 18), anteojoMat), head);
    aro.position.set(side * 0.075, 0.17, 0.2);
    const cristal = add(new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.006, 16), mkMat(0x9fc6e8, { transparent: true, opacity: 0.5, roughness: 0.1, metalness: 0.2 })), head);
    cristal.position.set(side * 0.075, 0.17, 0.2);
    cristal.rotation.x = Math.PI / 2;
    const patilla = add(new THREE.Mesh(new THREE.BoxGeometry(0.01, 0.012, 0.14), anteojoMat), head);
    patilla.position.set(side * 0.13, 0.175, 0.13);
    patilla.rotation.y = side * -0.35;
  }
  const puente = add(new THREE.Mesh(new THREE.BoxGeometry(0.045, 0.012, 0.012), anteojoMat), head);
  puente.position.set(0, 0.17, 0.2);

  // ojos detrás de los cristales
  for (const side of [-1, 1]) {
    const ojo = add(new THREE.Mesh(new THREE.SphereGeometry(0.032, 10, 8), blancoMat), head);
    ojo.position.set(side * 0.075, 0.165, 0.185);
    const pupila = add(new THREE.Mesh(new THREE.SphereGeometry(0.015, 8, 6), negroMat), head);
    pupila.position.set(side * 0.075, 0.165, 0.21);
  }
  // cejas canosas
  for (const side of [-1, 1]) {
    const ceja = add(new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.022, 0.02), peloMat), head);
    ceja.position.set(side * 0.075, 0.23, 0.19);
    ceja.rotation.z = side * -0.1;
  }
  const nariz = add(new THREE.Mesh(new THREE.SphereGeometry(0.03, 8, 6), pielMat), head);
  nariz.position.set(0, 0.12, 0.2);
  // sonrisa sabia
  const sonrisa = add(new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.035, 0.02), blancoMat), head);
  sonrisa.position.set(0, 0.06, 0.19);

  return { group: root, mats, hoodieMat: bataMat, parts: { armL, armR, head } };
}
