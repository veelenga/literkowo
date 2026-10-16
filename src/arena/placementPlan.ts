import type { Level } from '../course/catalog';
import { LEVEL_XP_FACTOR } from '../game/LevelPlan';
import type { HitCost, RunPhase, RunPlan } from '../game/RunPlan';
import {
  passedStages,
  STAGE_BOARD_SIZE,
  STAGE_SECONDS,
  STAGE_WORD_LIMIT,
  type PlacementStage,
} from './placement';

export const PLACEMENT_LIVES = 0;
export const PLACEMENT_HIT_COST: HitCost = 'combo';
export const PLACEMENT_COINS_PER_WORD = 0;

export function placementPlan(stages: readonly PlacementStage[]): RunPlan {
  const phases = stages.map((stage) => stagePhase(stage, stages.length));
  return {
    lives: PLACEMENT_LIVES,
    hitCost: PLACEMENT_HIT_COST,
    xpFactor: LEVEL_XP_FACTOR,
    coinsPerWord: PLACEMENT_COINS_PER_WORD,
    allMechanicsUnlocked: false,
    phaseAt: (index) => phases[index],
    continuesAfter: (finished) => passedStages(stages, finished) === finished.length,
  };
}

export function placementLevel(stages: readonly PlacementStage[]): Level {
  const last = stages.at(-1);
  if (!last) throw new Error('A placement test needs at least one stage');
  return last.keySet.bossLevel;
}

function stagePhase(stage: PlacementStage, count: number): RunPhase {
  return {
    kind: 'test',
    count: STAGE_WORD_LIMIT,
    ...stage.tempo,
    seconds: STAGE_SECONDS,
    boardSize: STAGE_BOARD_SIZE,
    stage: { number: stage.number, count, regionId: stage.keySet.region.id },
    words: stage.words,
  };
}
