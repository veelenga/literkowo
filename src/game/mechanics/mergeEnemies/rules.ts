import { Enemy } from '../../Enemy';

export const MERGED_TAG = 'merged';

const MERGE_DISTANCE = 1.3;
const MAX_MERGED_LENGTH = 10;
const HERO_CLEARANCE = 4;
const TARGET_CLASS = 'is-target';

export type EnemyPair = readonly [Enemy, Enemy];

export function isFusible(enemy: Enemy): boolean {
  return isPlainEnemy(enemy) && !enemy.isFrozen && !isTargeted(enemy);
}

function isPlainEnemy(enemy: Enemy): boolean {
  return Object.getPrototypeOf(enemy) === Enemy.prototype;
}

export function isClearOfHero(enemy: Enemy): boolean {
  return enemy.distanceToCenter >= HERO_CLEARANCE;
}

export function fitTogether(first: Enemy, second: Enemy): boolean {
  return first !== second && joinedWord(first, second).length <= MAX_MERGED_LENGTH;
}

export function joinedWord(first: Enemy, second: Enemy): string {
  return first.word + second.word;
}

export function distanceBetween(first: Enemy, second: Enemy): number {
  return first.object.position.distanceTo(second.object.position);
}

export function findTouchingPair(candidates: readonly Enemy[]): EnemyPair | undefined {
  for (const [index, first] of candidates.entries()) {
    const second = candidates.slice(index + 1).find((other) => areTouching(first, other));
    if (second) return [first, second];
  }
  return undefined;
}

function areTouching(first: Enemy, second: Enemy): boolean {
  return fitTogether(first, second) && distanceBetween(first, second) <= MERGE_DISTANCE;
}

function isTargeted(enemy: Enemy): boolean {
  return enemy.label.classList.contains(TARGET_CLASS);
}
