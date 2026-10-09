import * as THREE from 'three';
import { GAME_CONFIG } from '../config.js';

const CAM = GAME_CONFIG.camera;

/**
 * Cámara compartida: encuadra a todos los luchadores, zoom acotado entre
 * minDistance y maxDistance, con suavizado y shake opcional.
 */
export class CameraRig {
  constructor(aspect = 1) {
    this.camera = new THREE.PerspectiveCamera(CAM.fov, aspect, 0.1, 500);
    this.focus = new THREE.Vector3(0, 0, 0);
    this.distance = CAM.minDistance;
    this.shakeAmount = 0;
  }

  /**
   * @param {number} dt - delta time en segundos
   * @param {Array<{x:number,y:number}>} targets - posiciones (centro) de los fighters vivos
   * @param {object} stage - escenario actual (usa camera.minWidth y padding)
   * @param {boolean} shake - si aplica screen shake residual
   */
  update(dt, targets, stage, shake = false) {
    // Punto medio de todos los targets
    let cx = 0, cy = 0;
    let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
    if (targets && targets.length > 0) {
      for (const t of targets) {
        cx += t.x;
        cy += t.y;
        if (t.x < minX) minX = t.x;
        if (t.x > maxX) maxX = t.x;
        if (t.y < minY) minY = t.y;
        if (t.y > maxY) maxY = t.y;
      }
      cx /= targets.length;
      cy /= targets.length;
    }

    // Zoom necesario para encuadrar (respetando un ancho mínimo de escena)
    const stageCam = stage?.camera ?? { minWidth: 20, padding: 6 };
    const spreadX = targets && targets.length > 0 ? (maxX - minX) : 0;
    const spreadY = targets && targets.length > 0 ? (maxY - minY) : 0;
    const neededWidth = Math.max(spreadX, spreadY * 1.6, stageCam.minWidth) + stageCam.padding * 2;

    // Distancia necesaria según el FOV
    const fovRad = (CAM.fov * Math.PI) / 180;
    const neededDistance = neededWidth / (2 * Math.tan(fovRad / 2) * this.camera.aspect);
    const clamped = Math.min(Math.max(neededDistance, CAM.minDistance), CAM.maxDistance);

    // Suavizado de posición y zoom
    const posK = 1 - Math.exp(-CAM.smoothing * dt);
    const zoomK = 1 - Math.exp(-CAM.zoomSmoothing * dt);
    this.focus.x += (cx - this.focus.x) * posK;
    this.focus.y += (cy - this.focus.y) * posK;
    this.distance += (clamped - this.distance) * zoomK;

    // Shake residual (decae exponencialmente)
    if (shake) {
      this.shakeAmount = Math.max(this.shakeAmount, 0.2);
    }
    this.shakeAmount *= Math.exp(-CAM.shake.decay * dt);
    const sx = (Math.random() - 0.5) * this.shakeAmount;
    const sy = (Math.random() - 0.5) * this.shakeAmount;

    // Posicionar la cámara: mira el centro, ligeramente elevada
    this.camera.position.set(
      this.focus.x + sx,
      this.focus.y + CAM.elevation + sy,
      this.distance
    );
    this.camera.lookAt(this.focus.x + sx, this.focus.y + CAM.elevation * 0.5 + sy, 0);
  }

  addShake(amount) {
    this.shakeAmount = Math.max(this.shakeAmount, amount);
  }

  setAspect(aspect) {
    this.camera.aspect = aspect;
    this.camera.updateProjectionMatrix();
  }
}
