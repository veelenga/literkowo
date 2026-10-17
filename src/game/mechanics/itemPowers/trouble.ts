import { REACH_DISTANCE } from '../../board';
import type { Enemy } from '../../Enemy';
import { isActiveThreat } from './targets';

export const DANGER_DISTANCE = REACH_DISTANCE + 2.4;
export const CROWDED_BOARD = 4;
export const FAST_PACE = 1.5;
export const MISSES_IN_TROUBLE = 2;
export const MISS_WINDOW_SECONDS = 5;
export const LAST_HEART = 1;

export interface TroubleState {
  readonly enemies: readonly Enemy[];
  readonly startingPace: number;
  readonly recentMisses: number;
  readonly lives: number;
  readonly maxLives: number;
}

type TroubleSign = (state: TroubleState) => boolean;

const TROUBLE_SIGNS: readonly TroubleSign[] = [
  hasEnemyClose,
  isBoardCrowded,
  hasFastEnemy,
  hasMissedLately,
  isOnLastHeart,
];

export function isInTrouble(state: TroubleState): boolean {
  return TROUBLE_SIGNS.some((sign) => sign(state));
}

function hasEnemyClose({ enemies }: TroubleState): boolean {
  return enemies.some(
    (enemy) =>
      isActiveThreat(enemy) && enemy.typedLength === 0 && enemy.distanceToCenter <= DANGER_DISTANCE,
  );
}

function isBoardCrowded({ enemies }: TroubleState): boolean {
  const words = new Set(enemies.filter(isActiveThreat).map((enemy) => enemy.word));
  return words.size >= CROWDED_BOARD;
}

function hasFastEnemy({ enemies, startingPace }: TroubleState): boolean {
  return enemies.some(
    (enemy) => isActiveThreat(enemy) && enemy.currentSpeed >= startingPace * FAST_PACE,
  );
}

function hasMissedLately({ recentMisses }: TroubleState): boolean {
  return recentMisses >= MISSES_IN_TROUBLE;
}

function isOnLastHeart({ lives, maxLives }: TroubleState): boolean {
  return lives <= LAST_HEART && lives < maxLives;
}
