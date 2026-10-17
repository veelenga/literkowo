import type { Level } from '../course/catalog';
import type { HitCost, RunPhase, RunPlan } from '../game/RunPlan';
import {
  passedStages,
  STAGE_BOARD_SIZE,
  STAGE_SECONDS,
  STAGE_WORD_LIMIT,
  type PlacementStage,
} from './placement';
import { presetOf } from './difficulty';
import { arenaCoinsPerWord } from './economy';
import { TIME_ATTACK_HIT_COST, TIME_ATTACK_LIVES, timeAttackPhase } from './timeAttack';

export const PLACEMENT_PRESET = presetOf('normal');
export const PLACEMENT_LIVES = TIME_ATTACK_LIVES;
export const PLACEMENT_HIT_COST: HitCost = TIME_ATTACK_HIT_COST;
export const PLACEMENT_COINS_PER_WORD = arenaCoinsPerWord(PLACEMENT_PRESET);
export const PLACEMENT_XP_FACTOR = PLACEMENT_PRESET.xpFactor;

export function placementPlan(stages: readonly PlacementStage[]): RunPlan {
  const phases = stages.map((stage) => stagePhase(stage, stages.length));
  return {
    lives: PLACEMENT_LIVES,
    hitCost: PLACEMENT_HIT_COST,
    xpFactor: PLACEMENT_XP_FACTOR,
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
  return timeAttackPhase({
    seconds: STAGE_SECONDS,
    boardSize: STAGE_BOARD_SIZE,
    wordLimit: STAGE_WORD_LIMIT,
    tempo: stage.tempo,
    words: stage.words,
    stage: { number: stage.number, count, regionId: stage.keySet.region.id },
  });
}
