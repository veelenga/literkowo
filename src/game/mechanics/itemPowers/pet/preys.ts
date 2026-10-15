import type { PetPowerKind } from '../../../../course/powers';
import type { Enemy } from '../../../Enemy';
import { BomberEnemy } from '../../bombers/BomberEnemy';
import { BalloonEnemy, ESCAPE_HEIGHT } from '../../enemyTypes/BalloonEnemy';
import { BatEnemy } from '../../enemyTypes/BatEnemy';
import { GhostEnemy } from '../../enemyTypes/GhostEnemy';
import { SpecialEnemy } from '../../enemyTypes/SpecialEnemy';
import { GRAB_DISTANCE, ThiefEnemy } from '../../enemyTypes/ThiefEnemy';

export type PreyKind = Extract<
  PetPowerKind,
  'popBalloon' | 'catchThief' | 'catchGhost' | 'catchBat' | 'catchBomber'
>;

export const BALLOON_CATCH_MARGIN = 1;
export const THIEF_CATCH_LEAD = 1.6;

export const PREYS: Readonly<Record<PreyKind, (enemy: Enemy) => boolean>> = {
  popBalloon: (enemy) =>
    enemy instanceof BalloonEnemy &&
    !enemy.isLeaving &&
    enemy.altitude >= ESCAPE_HEIGHT - BALLOON_CATCH_MARGIN,
  catchThief: (enemy) =>
    enemy instanceof ThiefEnemy &&
    !enemy.hasLoot &&
    enemy.distanceToCenter <= GRAB_DISTANCE + THIEF_CATCH_LEAD,
  catchGhost: (enemy) => enemy instanceof GhostEnemy,
  catchBat: (enemy) => enemy instanceof BatEnemy && !enemy.hasDroppedBomb,
  catchBomber: (enemy) => enemy instanceof BomberEnemy,
};

export function celebrateCatch(enemy: Enemy): void {
  if (enemy instanceof SpecialEnemy) enemy.celebrate();
}
