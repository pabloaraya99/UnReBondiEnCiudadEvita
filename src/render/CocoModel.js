import * as THREE from 'three';

/**
 * El Coco — modelado con primitivas (sin assets externos).
 * Basado en el splash art oficial (pilots/coco.webp):
 * - Torso DESNUDO flaco, manchado de grasa negra del taller
 * - Tatuajes en pecho y brazos (tigre en el pecho, bandas tribales)
 * - LLAVE INGLESA GRANDE en la mano derecha (su herramienta de siempre)
 * - Mirada de loco: ojos saltones grandes, sonrisa dentada ancha
 * - Cigarrillo colgando de la boca
 * - Pelo morocho corto y despeinado (mechones parados)
 * - Pantalón cargo negro manchado + botas de trabajo
 * Origen en los pies (y=0), altura ≈ 1.85. Contextura: flaco y alto.
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

  // paleta (calibrada al splash art)
  const PIEL = 0xa97c63;       // piel trigueña
  const PIEL_OSC = 0x8f6350;
  const GRASA = 0x1c1a16;      // manchas de grasa del taller
  const TINTA = 0x171a20;      // tatuajes
  const CARGO = 0x23262b;      // pantalón cargo negro
  const CARGO_OSC = 0x17191d;
  const BOTA = 0x1b1d22;       // botas de trabajo
  const PELO = 0x241a12;       // morocho oscuro
  const METAL = 0xb9bec5;      // llave inglesa
  const DIENTES = 0xf4f1e8;
  const CIG = 0xd8cfc0;        // cigarrillo
  const BRASA = 0xff7a2a;

  const pielMat = mkMat(PIEL);
  const pielOscMat = mkMat(PIEL_OSC);
  const grasaMat = mkMat(GRASA, { roughness: 0.95 });
  const tintaMat = mkMat(TINTA, { roughness: 0.9 });
  const cargoMat = mkMat(CARGO, { roughness: 0.85 });
  const cargoOscMat = mkMat(CARGO_OSC, { roughness: 0.9 });
  const botaMat = mkMat(BOTA, { roughness: 0.6 });
  const peloMat = mkMat(PELO, { roughness: 0.9 });
  const metalMat = mkMat(METAL, { metalness: 0.85, roughness: 0.3 });
  const metalOscMat = mkMat(0x4a4e55, { metalness: 0.8, roughness: 0.4 });
  const dientesMat = mkMat(DIENTES, { roughness: 0.4 });
  const negroMat = mkMat(0x14161a, { roughness: 0.5 });
  const blancoMat = mkMat(0xffffff, { roughness: 0.3 });
  const cigMat = mkMat(CIG, { roughness: 0.7 });
  const brasaMat = mkMat(BRASA, { emissive: 0xff7a2a, emissiveIntensity: 2.0 });

  const root = new THREE.Group();
  const add = (mesh, parent = root) => {
    mesh.castShadow = true;
    parent.add(mesh);
    return mesh;
  };

  // ======================== botas de trabajo ========================
  for (const side of [-1, 1]) {
    const x = side * 0.15;
    const suela = add(new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.06, 0.5), botaMat));
    suela.position.set(x, 0.03, 0.02);
    const bota = add(new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.16, 0.46), botaMat));
    bota.position.set(x, 0.13, 0.0);
    const punta = add(new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.1, 0.12), botaMat));
    punta.position.set(x, 0.1, 0.24);
  }

  // ======================== pantalón cargo negro manchado ========================
  for (const side of [-1, 1]) {
    const x = side * 0.15;
    const pierna = add(new THREE.Mesh(new THREE.CapsuleGeometry(0.14, 0.55, 6, 12), cargoMat));
    pierna.position.set(x, 0.5, 0);
    // bolsillo cargo grande
    const bolsillo = add(new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.2, 0.08), cargoOscMat));
    bolsillo.position.set(side * 0.28, 0.55, 0.05);
    // manchas de grasa en las piernas
    const mancha = add(new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.14, 0.02), grasaMat));
    mancha.position.set(side * 0.1, 0.62 + side * 0.08, 0.14);
    mancha.rotation.z = side * 0.4;
  }
  const cadera = add(new THREE.Mesh(new THREE.BoxGeometry(0.44, 0.22, 0.3), cargoMat));
  cadera.position.set(0, 0.9, 0);
  // cinturón con hebilla
  const cinturon = add(new THREE.Mesh(new THREE.BoxGeometry(0.46, 0.06, 0.32), cargoOscMat));
  cinturon.position.set(0, 1.0, 0);
  const hebilla = add(new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.05, 0.02), metalMat));
  hebilla.position.set(0, 1.0, 0.17);

  // ======================== torso DESNUDO flaco con grasa y tatuajes ========================
  const torso = add(new THREE.Mesh(new THREE.CapsuleGeometry(0.22, 0.42, 8, 16), pielMat));
  torso.position.set(0, 1.28, 0);
  // costillas marcadas (es flaco): dos curvas suaves a los costados
  for (const side of [-1, 1]) {
    const costilla = add(new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.2, 0.02), pielOscMat));
    costilla.position.set(side * 0.17, 1.24, 0.2);
    costilla.rotation.z = side * 0.25;
  }
  // ombligo
  const ombligo = add(new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.03, 0.02), pielOscMat));
  ombligo.position.set(0, 1.14, 0.215);

  // manchas de grasa por todo el torso (del splash art)
  for (const [x, y, z, s, r] of [
    [-0.08, 1.38, 0.2, 0.09, 0.3], [0.06, 1.32, 0.21, 0.07, -0.4],
    [0.0, 1.44, 0.19, 0.06, 0.15], [-0.14, 1.24, 0.2, 0.07, 0.5],
    [0.12, 1.18, 0.2, 0.08, -0.2], [-0.03, 1.1, 0.21, 0.06, 0.6],
  ]) {
    const mancha = add(new THREE.Mesh(new THREE.BoxGeometry(s, s * 0.8, 0.02), grasaMat));
    mancha.position.set(x, y, z);
    mancha.rotation.z = r;
  }

  // ======================== TATUAJES por TODO el torso (mucho más vistosos) ========================
  // TIGRE del pecho (del splash art): cabeza de tigre grande a la izquierda del esternón
  const tigreCabeza = add(new THREE.Mesh(new THREE.BoxGeometry(0.11, 0.11, 0.015), tintaMat));
  tigreCabeza.position.set(-0.07, 1.42, 0.2);
  tigreCabeza.rotation.z = 0.15;
  // orejas del tigre
  for (const dx of [-0.04, 0.04]) {
    const oreja = add(new THREE.Mesh(new THREE.ConeGeometry(0.02, 0.04, 4), tintaMat));
    oreja.position.set(-0.07 + dx, 1.49, 0.2);
    oreja.rotation.z = dx * 5;
  }
  // ojos del tigre (puntos)
  for (const dx of [-0.025, 0.025]) {
    const ojoT = add(new THREE.Mesh(new THREE.SphereGeometry(0.008, 6, 5), tintaMat));
    ojoT.position.set(-0.07 + dx, 1.43, 0.205);
  }
  // hocico del tigre
  const hocico = add(new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.03, 0.015), tintaMat));
  hocico.position.set(-0.07, 1.375, 0.2);
  // rayas del tigre
  for (let i = 0; i < 3; i++) {
    const raya = add(new THREE.Mesh(new THREE.BoxGeometry(0.008, 0.05, 0.015), tintaMat));
    raya.position.set(-0.1 - i * 0.012, 1.44 - i * 0.02, 0.2);
    raya.rotation.z = 0.3;
  }
  // TEXTO bajo el tigre ("NEVER" o similar, como el splash art)
  const texto1 = add(new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.025, 0.015), tintaMat));
  texto1.position.set(0.02, 1.36, 0.21);
  texto1.rotation.z = -0.08;
  const texto2 = add(new THREE.Mesh(new THREE.BoxGeometry(0.09, 0.02, 0.015), tintaMat));
  texto2.position.set(0.03, 1.32, 0.21);
  texto2.rotation.z = -0.08;
  // ROSA del otro lado del pecho (como la manga del splash art)
  const rosaCentro = add(new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.015, 8), tintaMat));
  rosaCentro.rotation.x = Math.PI / 2;
  rosaCentro.position.set(0.09, 1.44, 0.19);
  for (let p = 0; p < 5; p++) {
    const petalo = add(new THREE.Mesh(new THREE.SphereGeometry(0.018, 6, 5), tintaMat));
    const ang = (p / 5) * Math.PI * 2;
    petalo.position.set(0.09 + Math.cos(ang) * 0.03, 1.44 + Math.sin(ang) * 0.03, 0.19);
    petalo.scale.set(1, 1, 0.4);
  }
  // hoja de la rosa
  const hoja = add(new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.015, 0.012), tintaMat));
  hoja.position.set(0.13, 1.41, 0.19);
  hoja.rotation.z = 0.5;
  // cadena/espinas cruzando el pecho (detalle extra vistoso)
  for (let i = 0; i < 5; i++) {
    const eslabon = add(new THREE.Mesh(new THREE.BoxGeometry(0.025, 0.008, 0.012), tintaMat));
    eslabon.position.set(-0.12 + i * 0.05, 1.52 - Math.abs(i - 2) * 0.015, 0.19);
    eslabon.rotation.z = (i - 2) * 0.15;
  }
  // estrella en el hombro derecho
  const estrella = add(new THREE.Mesh(new THREE.ConeGeometry(0.025, 0.03, 5), tintaMat));
  estrella.position.set(0.17, 1.5, 0.1);
  estrella.rotation.x = -0.3;

  // ======================== brazos largos y flacos con tatuajes ========================
  const tatuajeBrazo = (brazo, lado) => {
    // MANGA COMPLETA: bandas tribales apiladas (3 bandas, como el splash art)
    for (const [dy, s] of [[-0.06, 0.1], [0.01, 0.095], [0.08, 0.09]]) {
      const banda = new THREE.Mesh(new THREE.CylinderGeometry(s, s, 0.045, 12), tintaMat);
      banda.position.y = dy;
      brazo.add(banda);
      // dientes tribales sobre la banda (zigzag)
      for (let d = 0; d < 6; d++) {
        const diente = new THREE.Mesh(new THREE.ConeGeometry(0.012, 0.025, 4), tintaMat);
        const ang = (d / 6) * Math.PI * 2;
        diente.position.set(Math.cos(ang) * s, dy + 0.045, Math.sin(ang) * s);
        diente.rotation.z = -Math.cos(ang) * 1.2;
        diente.rotation.x = Math.sin(ang) * 1.2;
        brazo.add(diente);
      }
    }
    // figura grande alargada (flecha/tribal, como la manga del splash art)
    const fig = new THREE.Mesh(new THREE.BoxGeometry(0.035, 0.14, 0.014), tintaMat);
    fig.position.set(0, 0.02, 0.1 * lado);
    fig.rotation.z = 0.4 * lado;
    brazo.add(fig);
    // punta de la flecha
    const punta = new THREE.Mesh(new THREE.ConeGeometry(0.025, 0.05, 4), tintaMat);
    punta.position.set(0, 0.11, 0.1 * lado);
    punta.rotation.z = 0.4 * lado;
    brazo.add(punta);
    // puntos decorativos junto a la flecha
    for (let d = 0; d < 3; d++) {
      const punto = new THREE.Mesh(new THREE.SphereGeometry(0.008, 6, 5), tintaMat);
      punto.position.set(0.025 * lado, -0.03 - d * 0.025, 0.095 * lado);
      brazo.add(punto);
    }
  };

  // brazo izquierdo (pose de guardia)
  const armL = new THREE.Group();
  armL.position.set(-0.3, 1.5, 0);
  root.add(armL);
  const braL = add(new THREE.Mesh(new THREE.CapsuleGeometry(0.075, 0.24, 6, 10), pielMat), armL);
  braL.position.set(0, -0.12, 0.05);
  braL.rotation.x = 0.5;
  const anteL = add(new THREE.Mesh(new THREE.CapsuleGeometry(0.07, 0.24, 6, 10), pielMat), armL);
  anteL.position.set(0.05, -0.08, 0.24);
  anteL.rotation.set(-1.1, 0, -0.4);
  tatuajeBrazo(anteL, 1);
  const manoL = add(new THREE.Mesh(new THREE.SphereGeometry(0.09, 10, 8), pielMat), armL);
  manoL.position.set(0.08, 0.1, 0.36);
  manoL.scale.set(0.8, 1.15, 0.8);

  // brazo derecho (sostiene la LLAVE en alto)
  const armR = new THREE.Group();
  armR.position.set(0.3, 1.5, 0);
  root.add(armR);
  const braR = add(new THREE.Mesh(new THREE.CapsuleGeometry(0.075, 0.24, 6, 10), pielMat), armR);
  braR.position.set(0, -0.12, 0.08);
  braR.rotation.x = 0.7;
  const anteR = add(new THREE.Mesh(new THREE.CapsuleGeometry(0.07, 0.24, 6, 10), pielMat), armR);
  anteR.position.set(-0.02, -0.16, 0.26);
  anteR.rotation.x = 1.2;
  tatuajeBrazo(anteR, -1);
  const manoR = add(new THREE.Mesh(new THREE.SphereGeometry(0.09, 10, 8), pielMat), armR);
  manoR.position.set(-0.03, -0.2, 0.42);
  manoR.scale.set(0.8, 1.15, 0.8);

  // ======================== LLAVE INGLESA GRANDE (herramienta icónica) ========================
  const llave = new THREE.Group();
  llave.position.set(-0.03, -0.2, 0.6);
  llave.rotation.z = 0.12;
  armR.add(llave);
  // mango largo
  const mango = add(new THREE.Mesh(new THREE.CylinderGeometry(0.028, 0.036, 0.52, 10), metalMat), llave);
  mango.rotation.x = Math.PI / 2;
  // agarre oscuro
  const grip = add(new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 0.16, 10), metalOscMat), llave);
  grip.rotation.x = Math.PI / 2;
  grip.position.z = -0.12;
  // cabeza ajustable (la rosca característica)
  const cabeza = new THREE.Group();
  cabeza.position.z = 0.3;
  llave.add(cabeza);
  const cuerpo = add(new THREE.Mesh(new THREE.BoxGeometry(0.09, 0.07, 0.14), metalMat), cabeza);
  const quijadaSup = add(new THREE.Mesh(new THREE.BoxGeometry(0.09, 0.06, 0.14), metalMat), cabeza);
  quijadaSup.position.y = 0.075;
  quijadaSup.rotation.x = -0.25;
  const quijadaInf = add(new THREE.Mesh(new THREE.BoxGeometry(0.09, 0.055, 0.14), metalMat), cabeza);
  quijadaInf.position.y = -0.07;
  const rosca = add(new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, 0.09, 8), metalOscMat), cabeza);
  rosca.rotation.z = Math.PI / 2;
  rosca.position.set(0, -0.02, 0.04);
  // agujero del extremo del mango (como la llave real del splash art)
  const puntaMango = add(new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, 0.02, 12), metalMat), llave);
  puntaMango.rotation.x = Math.PI / 2;
  puntaMango.position.z = -0.27;

  // ======================== cabeza: ojos de loco, sonrisa dentada, cigarrillo ========================
  const head = new THREE.Group();
  head.position.set(0, 1.62, 0);
  root.add(head);
  const cuello = add(new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.08, 0.1, 10), pielMat), head);
  cuello.position.y = -0.03;
  const craneo = add(new THREE.Mesh(new THREE.SphereGeometry(0.2, 18, 14), pielMat), head);
  craneo.position.y = 0.14;
  craneo.scale.set(0.9, 1.05, 0.95); // cara alargada (es flaco)
  for (const side of [-1, 1]) {
    const oreja = add(new THREE.Mesh(new THREE.SphereGeometry(0.045, 8, 6), pielMat), head);
    oreja.position.set(side * 0.185, 0.14, 0);
    oreja.scale.set(0.6, 1.2, 0.8); // orejas grandes y salidas
  }
  // pelo morocho despeinado: mechones parados
  const mechones = [
    [0, 0.33, 0.02, 0.07, 0.16], [-0.07, 0.31, 0.06, 0.06, 0.13], [0.07, 0.31, 0.06, 0.06, 0.14],
    [-0.05, 0.32, -0.06, 0.06, 0.12], [0.05, 0.32, -0.06, 0.06, 0.13], [0, 0.3, 0.12, 0.055, 0.11],
    [-0.11, 0.27, 0, 0.05, 0.1], [0.11, 0.27, 0, 0.05, 0.11],
  ];
  for (const [rx, ry, rz, rr, len] of mechones) {
    const mech = add(new THREE.Mesh(new THREE.ConeGeometry(rr, len, 6), peloMat), head);
    mech.position.set(rx, ry, rz);
    mech.rotation.set((rz * 2) + 0.2, 0, -rx * 2.2);
  }

  // OJOS SALTONES de loco: grandes, blancos, mirando para lados distintos
  for (const side of [-1, 1]) {
    const ojo = add(new THREE.Mesh(new THREE.SphereGeometry(0.048, 12, 10), blancoMat), head);
    ojo.position.set(side * 0.075, 0.17, 0.17);
    // pupila chica y descentrada (mirada de loco)
    const pupila = add(new THREE.Mesh(new THREE.SphereGeometry(0.017, 8, 6), negroMat), head);
    pupila.position.set(side * 0.075 + (side > 0 ? 0.012 : -0.012), 0.175 + (side > 0 ? 0.01 : -0.008), 0.21);
    // cejas levantadas y finas (gesto maníaco)
    const ceja = add(new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.018, 0.015), peloMat), head);
    ceja.position.set(side * 0.08, 0.24, 0.175);
    ceja.rotation.z = side * -0.35;
  }
  const nariz = add(new THREE.Mesh(new THREE.ConeGeometry(0.028, 0.08, 6), pielMat), head);
  nariz.position.set(0, 0.12, 0.2);
  nariz.rotation.x = Math.PI / 2.4;
  // SONRISA DENTADA ancha de loco: boca grande con dientes
  const boca = add(new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.06, 0.02), negroMat), head);
  boca.position.set(0, 0.035, 0.175);
  boca.rotation.x = 0.15;
  const dientes = add(new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.035, 0.022), dientesMat), head);
  dientes.position.set(0, 0.055, 0.178);
  // separaciones de los dientes
  for (const dx of [-0.045, -0.015, 0.015, 0.045]) {
    const sep = add(new THREE.Mesh(new THREE.BoxGeometry(0.006, 0.036, 0.024), negroMat), head);
    sep.position.set(dx, 0.055, 0.179);
  }
  // CIGARRILLO colgando del labio
  const pucho = add(new THREE.Mesh(new THREE.CylinderGeometry(0.008, 0.008, 0.09, 6), cigMat), head);
  pucho.position.set(0.08, 0.03, 0.19);
  pucho.rotation.z = -1.1;
  const brasa = add(new THREE.Mesh(new THREE.SphereGeometry(0.01, 6, 5), brasaMat), head);
  brasa.position.set(0.115, 0.005, 0.19);
  // filtros del pucho
  const filtro = add(new THREE.Mesh(new THREE.CylinderGeometry(0.0085, 0.0085, 0.02, 6), mkMat(0xd8a13a)), head);
  filtro.position.set(0.065, 0.042, 0.19);
  filtro.rotation.z = -1.1;

  return { group: root, mats, hoodieMat: pielMat, parts: { armL, armR, head } };
}
