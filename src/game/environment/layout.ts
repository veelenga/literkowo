import { CAMERA_POSITION, CLEARING_RADIUS } from '../arena';
import type { Region } from './scatter';

export const ARENA = {
  clearing: CLEARING_RADIUS,
  walkable: 14.5,
  props: 15.5,
};

export const STAGE: Region = { minX: -44, maxX: 44, minZ: -38, maxZ: 16 };
export const NEAR_STAGE: Region = { minX: -27, maxX: 27, minZ: -22, maxZ: 12 };

const VIEW_NEAR_EDGE_FROM_CAMERA = 6.5;
const VIEW_FAR_EDGE_FROM_CAMERA = 34.5;
const CAMERA_LANE_FROM_CAMERA = 8.5;
const VIEW_BOTTOM_Z = CAMERA_POSITION.z - VIEW_NEAR_EDGE_FROM_CAMERA;
const VIEW_TOP_Z = CAMERA_POSITION.z - VIEW_FAR_EDGE_FROM_CAMERA;
const VIEW_BOTTOM_HALF_WIDTH = 12;
const VIEW_WIDENING = 0.42;
const VIEW_WEIGHT_MARGIN = 3;
const OUTSIDE_VIEW_WEIGHT = 0.3;
const CAMERA_LANE_Z = CAMERA_POSITION.z - CAMERA_LANE_FROM_CAMERA;
const CAMERA_LANE_HALF_WIDTH = 16;

export const distance = (x: number, z: number): number => Math.hypot(x, z);

export function inView(x: number, z: number, margin = 0): boolean {
  if (z > VIEW_BOTTOM_Z + margin || z < VIEW_TOP_Z - margin) return false;
  const halfWidth = VIEW_BOTTOM_HALF_WIDTH + (VIEW_BOTTOM_Z - z) * VIEW_WIDENING;
  return Math.abs(x) <= halfWidth + margin;
}

export function viewWeight(x: number, z: number): number {
  return inView(x, z, VIEW_WEIGHT_MARGIN) ? 1 : OUTSIDE_VIEW_WEIGHT;
}

export function blocksCamera(x: number, z: number): boolean {
  return z > CAMERA_LANE_Z && Math.abs(x) < CAMERA_LANE_HALF_WIDTH;
}

export function tallPropAllowed(x: number, z: number, clearance = 0): boolean {
  return distance(x, z) >= ARENA.props + clearance && !blocksCamera(x, z);
}
