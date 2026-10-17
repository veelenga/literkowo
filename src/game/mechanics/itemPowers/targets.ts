import { Boss } from '../../Boss';
import type { Enemy } from '../../Enemy';
import type { Phase } from '../../RunPlan';
import { SpecialEnemy } from '../enemyTypes/SpecialEnemy';
import { isPowerEnemy } from '../powerWords/PowerEnemy';

const RESTING_PHASES: ReadonlySet<Phase['kind']> = new Set(['warmup', 'test']);

export function isResting(phase: Phase): boolean {
  return RESTING_PHASES.has(phase.kind);
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

export function isActiveThreat(enemy: Enemy): boolean {
  return isThreat(enemy) && !enemy.isFrozen;
}

export function enemiesWithin(enemies: readonly Enemy[], distance: number): Enemy[] {
  return enemies.filter((enemy) => enemy.distanceToCenter <= distance);
}
