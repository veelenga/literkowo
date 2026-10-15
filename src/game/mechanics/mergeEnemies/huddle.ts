import * as THREE from 'three';
import type { Enemy } from '../../Enemy';
import { distanceBetween, fitTogether } from './rules';

const ATTRACT_RANGE = 4;
const ATTRACT_SPEED = 0.4;

interface Drift {
  enemy: Enemy;
  step: THREE.Vector3;
}

export function huddle(candidates: readonly Enemy[], delta: number): void {
  const drifts = candidates.flatMap((enemy) => driftOf(enemy, candidates, delta));
  for (const { enemy, step } of drifts) enemy.object.position.add(step);
}

function driftOf(enemy: Enemy, candidates: readonly Enemy[], delta: number): Drift[] {
  const partner = nearestPartner(enemy, candidates);
  if (!partner) return [];
  const length = Math.min(ATTRACT_SPEED * delta, distanceBetween(enemy, partner) / 2);
  const step = partner.object.position.clone().sub(enemy.object.position).setLength(length);
  return [{ enemy, step }];
}

function nearestPartner(enemy: Enemy, candidates: readonly Enemy[]): Enemy | undefined {
  let nearest: Enemy | undefined;
  let nearestGap = ATTRACT_RANGE;
  for (const other of candidates) {
    if (!fitTogether(enemy, other)) continue;
    const gap = distanceBetween(enemy, other);
    if (gap >= nearestGap) continue;
    nearest = other;
    nearestGap = gap;
  }
  return nearest;
}
