import type { Vector3Like } from 'three';

export const CAMERA_POSITION: Vector3Like = { x: 0, y: 15, z: 15.5 };
export const CAMERA_TARGET: Vector3Like = { x: 0, y: 0.8, z: 0 };
export const SPAWN_RADIUS = 11;
export const BOSS_SPAWN_RADIUS = 12;
export const REACH_DISTANCE = 1.6;
export const CLEARING_RADIUS = 7;
export const MAX_ENEMIES = 6;

export const CAMERA_FOV = 42;
const MIN_HORIZONTAL_FOV = 62;
const DEGREES_PER_RADIAN = 180 / Math.PI;

export function cameraFovFor(aspect: number): number {
  const halfWidth = Math.tan(MIN_HORIZONTAL_FOV / 2 / DEGREES_PER_RADIAN);
  const fitted = 2 * Math.atan(halfWidth / aspect) * DEGREES_PER_RADIAN;
  return Math.max(CAMERA_FOV, fitted);
}
