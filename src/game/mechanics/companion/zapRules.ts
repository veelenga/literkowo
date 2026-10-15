import { Boss } from '../../Boss';
import type { Enemy } from '../../Enemy';
import type { Phase } from '../../LevelPlan';

export const ZAP_RANGE = 3;
export const ZAP_MIN_COMBO = 5;

const RESTING_PHASE: Phase['kind'] = 'warmup';

export interface ZapState {
  readonly enemies: readonly Enemy[];
  readonly combo: number;
  readonly phase: Phase;
}

export function zapTarget({ enemies, combo, phase }: ZapState): Enemy | undefined {
  if (combo < ZAP_MIN_COMBO || phase.kind === RESTING_PHASE) return undefined;
  return enemies
    .filter((enemy) => !(enemy instanceof Boss) && enemy.distanceToCenter <= ZAP_RANGE)
    .sort((first, second) => first.distanceToCenter - second.distanceToCenter)
    .at(0);
}
