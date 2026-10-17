import * as THREE from 'three';
import { CAMERA_FOV, CAMERA_POSITION, CAMERA_TARGET, frameBoard, type StageInsets } from './board';
import { CameraShake } from './CameraShake';
import type { Viewport } from './RenderHost';

export const CAMERA_INTRO_SECONDS = 1.8;

const CAMERA_NEAR = 0.1;
const CAMERA_FAR = 120;
const CAMERA_ASPECT = 1;
const INTRO_SCALE = 2.2;
const RESTING_SCALE = 1;
const INTRO_EASE_POWER = 3;
const INTRO_DONE = 1;
const SWAY = 0.35;
const SWAY_SPEED = 0.25;

export class CameraRig {
  readonly camera = new THREE.PerspectiveCamera(CAMERA_FOV, CAMERA_ASPECT, CAMERA_NEAR, CAMERA_FAR);
  private readonly target = new THREE.Vector3().copy(CAMERA_TARGET);
  private readonly shaker = new CameraShake();

  constructor() {
    this.camera.position.copy(CAMERA_POSITION).multiplyScalar(INTRO_SCALE);
    this.camera.lookAt(this.target);
  }

  shake(strength: number, seconds: number): void {
    this.shaker.start(strength, seconds);
  }

  update(elapsed: number, delta: number): void {
    this.camera.position.copy(CAMERA_POSITION).multiplyScalar(introScale(elapsed));
    this.camera.position.x += Math.sin(elapsed * SWAY_SPEED) * SWAY;
    this.shaker.apply(this.camera.position, delta);
    this.camera.lookAt(this.target);
  }

  fit({ width, height }: Viewport, insets: StageInsets): void {
    if (width <= 0 || height <= 0) return;
    const framing = frameBoard({ width, height, ...insets });
    this.camera.fov = framing.fov;
    this.camera.setViewOffset(width, framing.fullHeight, 0, framing.offsetY, width, height);
  }
}

function introScale(elapsed: number): number {
  const progress = Math.min(INTRO_DONE, elapsed / CAMERA_INTRO_SECONDS);
  const eased = INTRO_DONE - Math.pow(INTRO_DONE - progress, INTRO_EASE_POWER);
  return INTRO_SCALE - (INTRO_SCALE - RESTING_SCALE) * eased;
}
