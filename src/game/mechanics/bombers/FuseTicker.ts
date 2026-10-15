import * as THREE from 'three';
import { REACH_DISTANCE } from '../../board';

export const TICK_START_DISTANCE = 7;
export const TICK_INTERVAL = { far: 0.9, near: 0.18 };

export class FuseTicker {
  private wait = 0;

  update(delta: number, distance: number): boolean {
    if (distance > TICK_START_DISTANCE) {
      this.wait = 0;
      return false;
    }
    this.wait -= delta;
    if (this.wait > 0) return false;
    this.wait = tickIntervalAt(distance);
    return true;
  }
}

export function tickIntervalAt(distance: number): number {
  const span = TICK_START_DISTANCE - REACH_DISTANCE;
  const progress = THREE.MathUtils.clamp((distance - REACH_DISTANCE) / span, 0, 1);
  return THREE.MathUtils.lerp(TICK_INTERVAL.near, TICK_INTERVAL.far, progress);
}
