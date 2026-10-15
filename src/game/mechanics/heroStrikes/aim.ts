import * as THREE from 'three';
import type { Enemy } from '../../Enemy';

const HAND_HEIGHT = 1.2;
const HAND_REACH = 0.35;

type Striking = Pick<Enemy, 'typedLength' | 'isComplete' | 'distanceToCenter'>;

export function strikeTarget<T extends Striking>(enemies: readonly T[]): T | undefined {
  let nearest: T | undefined;
  for (const enemy of enemies) {
    if (!isBeingTyped(enemy)) continue;
    if (!nearest || enemy.distanceToCenter < nearest.distanceToCenter) nearest = enemy;
  }
  return nearest;
}

export function handToward(
  hero: THREE.Vector3,
  target: THREE.Vector3,
  hand: THREE.Vector3,
): THREE.Vector3 {
  hand.set(target.x - hero.x, 0, target.z - hero.z).normalize();
  return hand
    .multiplyScalar(HAND_REACH)
    .add(hero)
    .setY(hero.y + HAND_HEIGHT);
}

export function handAhead(hero: THREE.Object3D, hand: THREE.Vector3): THREE.Vector3 {
  const yaw = hero.rotation.y;
  hand.set(Math.sin(yaw), 0, Math.cos(yaw));
  return hand
    .multiplyScalar(HAND_REACH)
    .add(hero.position)
    .setY(hero.position.y + HAND_HEIGHT);
}

function isBeingTyped(enemy: Striking): boolean {
  return enemy.typedLength > 0 && !enemy.isComplete;
}
