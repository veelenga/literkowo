import { describe, expect, it } from 'vitest';
import type { WordStage } from './difficulty';
import { lengthsAt, stageAt, stagesSpan } from './wordStages';

const PRECISION = 6;
const COMBOS: WordStage = { kind: 'combos', share: 0.6, lengths: { min: 1, max: 3 } };
const WORDS: WordStage = { kind: 'words', share: 0.4, lengths: { min: 2, max: 4 } };
const STAGES = [COMBOS, WORDS];

describe('stageAt', () => {
  it('walks the stages by their share of the phase', () => {
    expect(stageAt(STAGES, 0)?.stage).toBe(COMBOS);
    expect(stageAt(STAGES, 0.59)?.stage).toBe(COMBOS);
    expect(stageAt(STAGES, 0.6)?.stage).toBe(WORDS);
    expect(stageAt(STAGES, 0.99)?.stage).toBe(WORDS);
  });

  it('measures progress inside the stage', () => {
    expect(stageAt(STAGES, 0.3)?.progress).toBeCloseTo(0.5, PRECISION);
    expect(stageAt(STAGES, 0.8)?.progress).toBeCloseTo(0.5, PRECISION);
  });

  it('stays in the last stage past the end', () => {
    expect(stageAt(STAGES, 1)).toEqual({ stage: WORDS, progress: 1 });
  });

  it('has no stage without stages', () => {
    expect(stageAt([], 0)).toBeUndefined();
  });
});

describe('lengthsAt', () => {
  it('allows one letter less in the first half of a stage', () => {
    expect(lengthsAt({ min: 2, max: 4 }, 0)).toEqual({ min: 2, max: 3 });
    expect(lengthsAt({ min: 2, max: 5 }, 0.49)).toEqual({ min: 2, max: 4 });
    expect(lengthsAt({ min: 1, max: 3 }, 0.2)).toEqual({ min: 1, max: 2 });
  });

  it('allows the full length in the second half', () => {
    expect(lengthsAt({ min: 2, max: 4 }, 0.5)).toEqual({ min: 2, max: 4 });
    expect(lengthsAt({ min: 2, max: 4 }, 1)).toEqual({ min: 2, max: 4 });
  });

  it('keeps at least two lengths to choose from', () => {
    expect(lengthsAt({ min: 2, max: 3 }, 0)).toEqual({ min: 2, max: 3 });
    expect(lengthsAt({ min: 3, max: 3 }, 0)).toEqual({ min: 3, max: 3 });
  });
});

describe('stagesSpan', () => {
  it('covers the lengths of every stage', () => {
    expect(stagesSpan(STAGES)).toEqual({ min: 1, max: 4 });
  });
});
