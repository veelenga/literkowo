import { describe, expect, it } from 'vitest';
import { requireLevel } from '../testing/levels';
import { LEVELS } from './catalog';
import { difficultyFor, KIND_RULES } from './difficulty';

const OLD_FIRST_LEVEL = { wordSpeed: 0.7, warmupSpeed: 0.55, spawns: 18 };

describe('difficultyFor', () => {
  it('makes the first levels slower and shorter than the old first level', () => {
    for (const id of ['polana-1', 'polana-2', 'polana-3']) {
      const { warmup, main } = difficultyFor(requireLevel(id));
      expect(main.speed).toBeLessThan(OLD_FIRST_LEVEL.wordSpeed);
      expect(warmup?.speed).toBeLessThan(OLD_FIRST_LEVEL.warmupSpeed);
      expect((warmup?.count ?? 0) + main.count).toBeLessThan(OLD_FIRST_LEVEL.spawns);
    }
  });

  it('allows single letters only in learn levels', () => {
    for (const level of LEVELS) {
      const { lengths } = difficultyFor(level);
      expect(lengths.min === 1).toBe(level.kind === 'learn');
    }
  });

  it('caps words by the kind of level', () => {
    expect(difficultyFor(requireLevel('polana-4')).lengths.max).toBe(KIND_RULES.learn.lengths.max);
    expect(difficultyFor(requireLevel('polana-5')).lengths.max).toBe(
      KIND_RULES.practice.lengths.max,
    );
    expect(difficultyFor(requireLevel('polana-8')).lengths.max).toBe(KIND_RULES.review.lengths.max);
  });

  it('lets generated words grow longer along the course', () => {
    const early = difficultyFor(requireLevel('polana-3')).generatedLengths;
    const late = difficultyFor(requireLevel('wyspa-23')).generatedLengths;
    expect(late.max).toBeGreaterThan(early.max);
    for (const level of LEVELS) {
      const { lengths, generatedLengths } = difficultyFor(level);
      expect(generatedLengths.max).toBeLessThanOrEqual(lengths.max);
      expect(generatedLengths.max).toBeGreaterThanOrEqual(generatedLengths.min);
    }
  });

  it('skips the warmup for bosses', () => {
    expect(difficultyFor(requireLevel('polana-19')).warmup).toBeUndefined();
  });
});
