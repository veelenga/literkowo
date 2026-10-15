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
const MIN_BAND_SHARE = 0.4;
const MAX_SIDE_SHARE = 0.25;
const DEGREES_PER_RADIAN = 180 / Math.PI;

export interface StageInsets {
  readonly top: number;
  readonly bottom: number;
  readonly side: number;
}

export const NO_INSETS: StageInsets = { top: 0, bottom: 0, side: 0 };

export interface StageView extends StageInsets {
  readonly width: number;
  readonly height: number;
}

export interface ArenaFraming {
  readonly fov: number;
  readonly fullHeight: number;
  readonly offsetY: number;
}

export function cameraFovFor(aspect: number): number {
  const halfWidth = Math.tan(MIN_HORIZONTAL_FOV / 2 / DEGREES_PER_RADIAN);
  const fitted = 2 * Math.atan(halfWidth / aspect) * DEGREES_PER_RADIAN;
  return Math.max(CAMERA_FOV, fitted);
}

export function frameArena(view: StageView): ArenaFraming {
  const { top, band } = visibleBand(view);
  const center = top + band / 2;
  const fullHeight = 2 * Math.max(center, view.height - center);
  const bandWidth = view.width - 2 * Math.min(view.side, view.width * MAX_SIDE_SHARE);
  const bandHalfTan = Math.tan(cameraFovFor(bandWidth / band) / 2 / DEGREES_PER_RADIAN);
  const fov = 2 * Math.atan((bandHalfTan * fullHeight) / band) * DEGREES_PER_RADIAN;
  return { fov, fullHeight, offsetY: fullHeight / 2 - center };
}

function visibleBand({ height, top, bottom }: StageView): { top: number; band: number } {
  const covered = top + bottom;
  const maxCovered = height * (1 - MIN_BAND_SHARE);
  const scale = covered > maxCovered ? maxCovered / covered : 1;
  return { top: top * scale, band: height - covered * scale };
}
