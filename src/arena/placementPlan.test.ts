import { describe, expect, it } from 'vitest';
import type { PhaseRecord } from '../game/PhaseMeter';
import { presetOf } from './difficulty';
import { arenaCoinsPerWord } from './economy';
import { placementStages, STAGE_BOARD_SIZE, STAGE_SECONDS, STAGE_WORD_LIMIT } from './placement';
import {
  PLACEMENT_COINS_PER_WORD,
  PLACEMENT_HIT_COST,
  PLACEMENT_LIVES,
  PLACEMENT_XP_FACTOR,
  placementLevel,
  placementPlan,
} from './placementPlan';

const STAGES = placementStages('pl');
const PASSED: PhaseRecord = { hits: 30, mistakes: 0, reached: 0, typingSeconds: 6 };
const FAILED: PhaseRecord = { hits: 30, mistakes: 10, reached: 0, typingSeconds: 6 };

describe('placementPlan', () => {
  const plan = placementPlan(STAGES);

  it('costs no hearts and pays XP and coins at the Normalnie rate', () => {
    expect(plan).toMatchObject({
      lives: PLACEMENT_LIVES,
      xpFactor: PLACEMENT_XP_FACTOR,
      hitCost: PLACEMENT_HIT_COST,
      coinsPerWord: PLACEMENT_COINS_PER_WORD,
      allMechanicsUnlocked: false,
    });
    expect(PLACEMENT_HIT_COST).toBe('combo');
    expect(PLACEMENT_XP_FACTOR).toBe(presetOf('normal').xpFactor);
    expect(PLACEMENT_COINS_PER_WORD).toBe(arenaCoinsPerWord(presetOf('normal')));
  });

  it('runs one timed test phase per stage that keeps a few words on the board', () => {
    STAGES.forEach((stage, index) => {
      const phase = plan.phaseAt(index);
      expect(phase).toMatchObject({
        kind: 'test',
        seconds: STAGE_SECONDS,
        boardSize: STAGE_BOARD_SIZE,
        count: STAGE_WORD_LIMIT,
        speed: stage.tempo.speed,
        spawnInterval: stage.tempo.spawnInterval,
        stage: { number: index + 1, count: STAGES.length, regionId: stage.keySet.region.id },
        words: stage.words,
      });
      expect(phase?.rampTo).toBeUndefined();
    });
    expect(plan.phaseAt(STAGES.length)).toBeUndefined();
  });

  it('goes on while every finished stage passed', () => {
    expect(plan.continuesAfter?.([PASSED])).toBe(true);
    expect(plan.continuesAfter?.([PASSED, FAILED])).toBe(false);
    expect(plan.continuesAfter?.([FAILED])).toBe(false);
  });

  it('runs on the boss level of the last stage so every key is tracked', () => {
    expect(placementLevel(STAGES).id).toBe('wyspa-24');
    expect(placementLevel(placementStages('en')).id).toBe('jaskinia-24');
  });
});
