import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

/**
 * Optimiza un modelo de personaje SIN cambiar su aspecto. Se corre UNA sola vez
 * por personaje (al crear el prototipo) y después todos los luchadores clonan
 * ese prototipo compartiendo geometrías.
 *
 * 1) Nombra los grupos animables (parts: armL/armR/head) para poder reencontrarlos en un clon.
 * 2) Unifica materiales idénticos (mismo color/roughness/etc.): dos materiales con la misma
 *    clave pintan exactamente igual, así que pasan a ser UNA sola instancia.
 * 3) Fusiona mallas hermanas que comparten material en una sola malla por grupo
 *    (las ~70 mallas por personaje caen a ~20-35 → muchos menos draw calls).
 * 4) Marca las geometrías como compartidas (userData.sharedProto) para que al
 *    liberar vistas de pelea nunca se dispose una geometría que otros usan.
 *
 * Se conservan SIN TOCAR (mismos criterios que detecta Renderer.showLineup):
 * - el torso (cápsula en y 1.1-1.4): lo escala la respiración del lineup.
 * - los ojos (esferas con las coordenadas del parpadeo): los anima el blink.
 * - mallas transparentes (humo), mallas con hijos (antebrazo con tatuajes)
 *   y cualquier cosa marcada con userData.noMerge.
 */
export function optimizeModel(model) {
  nombrarParts(model);
  unificarMateriales(model);
  fusionarPorMaterial(model);
  model.group.traverse((o) => {
    if (o.geometry) o.geometry.userData.sharedProto = true;
  });
  return model;
}

/** Los grupos de parts quedan con nombre para resolverlos dentro de un clon (getObjectByName). */
function nombrarParts(model) {
  if (!model.parts) return;
  for (const [nombre, nodo] of Object.entries(model.parts)) {
    if (nodo) nodo.name = nombre;
  }
}

/** Clave de equivalencia: dos materiales con la misma clave renderizan igual. */
function matKey(m) {
  if (!m || Array.isArray(m)) return null;
  return [
    m.type,
    m.color ? m.color.getHex() : 0,
    m.emissive ? m.emissive.getHex() : 0,
    m.emissiveIntensity ?? 1,
    m.roughness ?? 1,
    m.metalness ?? 0,
    m.opacity,
    m.transparent ? 1 : 0,
    m.side,
    m.flatShading ? 1 : 0,
    m.map ? 1 : 0,
    m.visible ? 1 : 0,
  ].join('|');
}

/**
 * Materiales iguales → una sola instancia. El material del hoodie (hoodieMat) y sus
 * gemelos quedan FUERA de la unificación para no cambiar el alcance del tinte de stance.
 * Al final, mats queda con los materiales que siguen realmente en uso.
 */
function unificarMateriales(model) {
  const claveHoodie = model.hoodieMat ? matKey(model.hoodieMat) : null;
  const porClave = new Map();
  for (const m of model.mats) {
    const k = matKey(m);
    if (k && !porClave.has(k)) porClave.set(k, m);
  }
  const enUso = new Set();
  model.group.traverse((o) => {
    if (!o.isMesh || Array.isArray(o.material)) return;
    const k = matKey(o.material);
    if (!k) return;
    if (k !== claveHoodie) {
      const sobreviviente = porClave.get(k);
      if (sobreviviente && sobreviviente !== o.material) o.material = sobreviviente;
    }
    enUso.add(o.material);
  });
  model.mats = model.mats.filter((m) => enUso.has(m));
}

/** ¿Es el torso que escala la respiración? (copia exacta del criterio de showLineup) */
function esTorso(m, esRaiz) {
  return esRaiz && m.isMesh && m.geometry && m.geometry.type === 'CapsuleGeometry'
    && m.position.y > 1.1 && m.position.y < 1.4;
}

/** ¿Es un ojo del parpadeo? (copia exacta del criterio de showLineup) */
function esOjo(m) {
  return m.isMesh && m.geometry && m.geometry.type === 'SphereGeometry'
    && Math.abs(m.position.x) > 0.03 && Math.abs(m.position.x) < 0.14
    && m.position.y > 0.12 && m.position.y < 0.22 && m.position.z > 0.08;
}

/** Recorre cada contenedor (raíz y cada subgrupo) y fusiona sus mallas directas por material. */
function fusionarPorMaterial(model) {
  const raiz = model.group;

  const fusionarHijos = (cont, esRaiz, esGrupoRaiz) => {
    const porMat = new Map();
    for (const hijo of [...cont.children]) {
      if (!hijo.isMesh) continue;
      if (hijo.children.length) continue;                 // mallas con hijos (ej.: antebrazo con tatuajes)
      if (Array.isArray(hijo.material)) continue;
      if (hijo.material.transparent || hijo.material.visible === false) continue;
      if (hijo.userData.noMerge || hijo.material.userData.noMerge) continue;
      if (esTorso(hijo, esRaiz)) continue;                // lo escala la respiración
      if (esGrupoRaiz && esOjo(hijo)) continue;           // los anima el parpadeo
      if (!hijo.geometry || !hijo.geometry.attributes.position) continue;
      const lista = porMat.get(hijo.material) || [];
      lista.push(hijo);
      porMat.set(hijo.material, lista);
    }
    for (const [mat, lista] of porMat) {
      if (lista.length > 1) fusionarLista(cont, mat, lista);
    }
  };

  const recorrer = (nodo, esRaiz, esGrupoRaiz) => {
    fusionarHijos(nodo, esRaiz, esGrupoRaiz);
    for (const hijo of [...nodo.children]) {
      recorrer(hijo, false, nodo === raiz && hijo.isGroup);
    }
  };
  recorrer(raiz, true, false);
}

/**
 * Fusiona una lista de mallas hermanas con el mismo material en UNA sola malla.
 * Hornea cada transformación local (bake) y si mergeGeometries falla (atributos
 * incompatibles) se aborta sin tocar nada: quedan como estaban.
 */
function fusionarLista(cont, mat, lista) {
  const todasIndexadas = lista.every((m) => m.geometry.index);
  const geos = [];
  for (const m of lista) {
    m.updateMatrix();
    let g = m.geometry.clone();
    if (!todasIndexadas) g = g.toNonIndexed();
    g.applyMatrix4(m.matrix);
    geos.push(g);
  }
  const fusionada = mergeGeometries(geos, false);
  for (const g of geos) g.dispose();
  if (!fusionada) return false;
  const mesh = new THREE.Mesh(fusionada, mat);
  mesh.castShadow = lista.some((m) => m.castShadow);
  mesh.receiveShadow = lista.some((m) => m.receiveShadow);
  cont.add(mesh);
  for (const m of lista) {
    cont.remove(m);
    m.geometry.dispose(); // las geometrías de los modelos son únicas por malla (0 compartidas)
  }
  return true;
}
