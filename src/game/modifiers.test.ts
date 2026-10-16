import { describe, expect, it } from 'vitest';
import type { RunPhase, RunPlan } from './RunPlan';
import { hasModifier, LONG_WORD_GAP, LONG_WORDS, ONE_HEART, withModifiers } from './modifiers';

const WORDS = {
  allowedKeys: 'fjdksla',
  focusKeys: 'fj',
  lengths: { min: 2, max: 3 },
  generatedLengths: { min: 2, max: 3 },
  stages: [{ kind: 'words', share: 1, lengths: { min: 2, max: 3 } }],
} as const;
const PHASE: RunPhase = { kind: 'words', count: 10, speed: 1, spawnInterval: 2, words: WORDS };

function plan(lives = 3): RunPlan {
  return {
    lives,
    hitCost: 'life',
    xpFactor: 1,
    coinsPerWord: 1,
    allMechanicsUnlocked: true,
    phaseAt: (index) => (index < 2 ? PHASE : undefined),
  };
}

describe('withModifiers', () => {
  it('keeps the plan as it is without modifiers', () => {
    const original = plan();
    expect(withModifiers(original, [])).toBe(original);
  });

  it('marks every phase with the modifiers and keeps the end of the plan', () => {
    const modified = withModifiers(plan(), ['fog', 'darkness']);
    expect(modified.phaseAt(1)?.modifiers).toEqual(['fog', 'darkness']);
    expect(modified.phaseAt(2)).toBeUndefined();
    expect(modified.lives).toBe(3);
  });

  it('leaves one heart', () => {
    expect(withModifiers(plan(), ['oneHeart']).lives).toBe(ONE_HEART);
    expect(withModifiers(plan(0), ['oneHeart']).lives).toBe(0);
  });

  it('turns every word long and drops the staged lengths', () => {
    const words = withModifiers(plan(), ['longWords']).phaseAt(0)?.words;
    expect(words?.lengths).toEqual(LONG_WORDS);
    expect(words?.generatedLengths).toEqual(LONG_WORDS);
    expect(words?.stages).toBeUndefined();
    expect(words?.allowedKeys).toBe(WORDS.allowedKeys);
  });

  it('spaces long words further apart, also along a ramp', () => {
    const ramped: RunPhase = { ...PHASE, rampTo: { speed: 2, spawnInterval: 1 } };
    const modified = withModifiers({ ...plan(), phaseAt: () => ramped }, ['longWords']);
    expect(modified.phaseAt(0)).toMatchObject({
      speed: PHASE.speed,
      spawnInterval: PHASE.spawnInterval * LONG_WORD_GAP,
      rampTo: { speed: 2, spawnInterval: LONG_WORD_GAP },
    });
  });

  it('answers whether a phase has a modifier', () => {
    const phase = withModifiers(plan(), ['fog']).phaseAt(0);
    expect(phase && hasModifier(phase, 'fog')).toBe(true);
    expect(phase && hasModifier(phase, 'darkness')).toBe(false);
    expect(hasModifier(PHASE, 'fog')).toBe(false);
  });
});
