import { REACH_DISTANCE } from '../../board';
import { Boss } from '../../Boss';
import type { Enemy } from '../../Enemy';
import type { Phase } from '../../RunPlan';
import { SpecialEnemy } from '../enemyTypes/SpecialEnemy';
import { isPowerEnemy } from '../powerWords/PowerEnemy';

export const DANGER_DISTANCE = REACH_DISTANCE + 2.4;

const RESTING_PHASE: Phase['kind'] = 'warmup';

export function isResting(phase: Phase): boolean {
  return phase.kind === RESTING_PHASE;
}

export function isOpen(enemy: Enemy): boolean {
  return !(enemy instanceof Boss) && enemy.typedLength === 0;
}

export function nearestOf(enemies: readonly Enemy[]): Enemy | undefined {
  return [...enemies]
    .sort((first, second) => first.distanceToCenter - second.distanceToCenter)
    .at(0);
}

export function nearestOpenEnemy(enemies: readonly Enemy[]): Enemy | undefined {
  return nearestOf(enemies.filter(isOpen));
}

export function isThreat(enemy: Enemy): boolean {
  if (isPowerEnemy(enemy)) return false;
  return !(enemy instanceof SpecialEnemy && enemy.isHarmless);
}

export function enemiesWithin(enemies: readonly Enemy[], distance: number): Enemy[] {
  return enemies.filter((enemy) => enemy.distanceToCenter <= distance);
}
