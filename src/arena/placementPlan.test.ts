import { describe, expect, it } from 'vitest';
import type { PhaseRecord } from '../game/PhaseMeter';
import { placementStages, STAGE_SECONDS } from './placement';
import {
  PLACEMENT_COINS_PER_WORD,
  PLACEMENT_HIT_COST,
  PLACEMENT_LIVES,
  placementLevel,
  placementPlan,
} from './placementPlan';

const STAGES = placementStages('pl');
const PASSED: PhaseRecord = { hits: 30, mistakes: 0, reached: 0, typingSeconds: 6 };
const FAILED: PhaseRecord = { hits: 30, mistakes: 10, reached: 0, typingSeconds: 6 };

describe('placementPlan', () => {
  const plan = placementPlan(STAGES);

  it('costs no hearts and pays no coins', () => {
    expect(plan).toMatchObject({
      lives: PLACEMENT_LIVES,
      hitCost: PLACEMENT_HIT_COST,
      coinsPerWord: PLACEMENT_COINS_PER_WORD,
      allMechanicsUnlocked: false,
    });
    expect(PLACEMENT_HIT_COST).toBe('combo');
  });

  it('runs one timed test phase per stage at a steady pace', () => {
    STAGES.forEach((stage, index) => {
      const phase = plan.phaseAt(index);
      expect(phase).toMatchObject({
        kind: 'test',
        seconds: STAGE_SECONDS,
        speed: stage.tempo.speed,
        spawnInterval: stage.tempo.spawnInterval,
        stage: { number: index + 1, count: STAGES.length, regionId: stage.keySet.region.id },
        words: stage.words,
      });
      expect(phase?.rampTo).toBeUndefined();
      expect(phase?.count).toBe(Math.ceil(STAGE_SECONDS / stage.tempo.spawnInterval));
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
