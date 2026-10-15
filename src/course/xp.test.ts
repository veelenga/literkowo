import { describe, expect, it } from 'vitest';
import {
  levelProgress,
  rankFor,
  RANKS,
  tagFactor,
  wordXp,
  xpForLevel,
  xpToAdvance,
  type CompletedWord,
} from './xp';

const HOURS_TO_LEGEND_TARGET = 40;
const TYPICAL_XP_PER_HOUR = 5_000;
const LEGEND_LEVEL = 50;

function word(overrides: Partial<CompletedWord> = {}): CompletedWord {
  return { letters: 4, tags: [], bossHit: false, fever: false, multiplier: 1, ...overrides };
}

describe('wordXp', () => {
  it('gives one point per letter at the base multiplier', () => {
    expect(wordXp(word())).toBe(4);
  });

  it('follows the combo multiplier', () => {
    expect(wordXp(word({ multiplier: 3 }))).toBe(12);
  });

  it('doubles during fever', () => {
    expect(wordXp(word({ multiplier: 5, fever: true }))).toBe(40);
  });

  it('rewards special enemies', () => {
    expect(wordXp(word({ bossHit: true }))).toBe(12);
    expect(wordXp(word({ tags: ['merged'] }))).toBe(12);
    expect(wordXp(word({ tags: ['power-word'] }))).toBe(8);
    expect(wordXp(word({ tags: ['minion'] }))).toBe(4);
  });
});

describe('tagFactor', () => {
  it('treats unknown tags as plain words', () => {
    expect(tagFactor(['jumper', 'balloon'])).toBe(1);
    expect(tagFactor([])).toBe(1);
  });

  it('uses the strongest tag', () => {
    expect(tagFactor(['minion', 'power-word', 'merged'])).toBe(3);
  });
});

describe('player levels', () => {
  it('starts at level 1 and needs 100 XP for level 2', () => {
    expect(levelProgress(0)).toEqual({ level: 1, xpInLevel: 0, xpToNext: 100, fraction: 0 });
    expect(levelProgress(99).level).toBe(1);
    expect(levelProgress(100).level).toBe(2);
  });

  it('grows each step by about 12 percent', () => {
    expect(xpToAdvance(2) / xpToAdvance(1)).toBeCloseTo(1.12, 2);
    expect(xpToAdvance(11) / xpToAdvance(10)).toBeCloseTo(1.12, 2);
  });

  it('caps a single step', () => {
    expect(xpToAdvance(60)).toBe(xpToAdvance(80));
  });

  it('tracks progress inside a level', () => {
    expect(levelProgress(xpForLevel(4) + 70)).toEqual({
      level: 4,
      xpInLevel: 70,
      xpToNext: 140,
      fraction: 0.5,
    });
  });

  it('lists the first thresholds and the total for level 50', () => {
    const thresholds = Array.from({ length: 10 }, (_, index) => xpForLevel(index + 2));
    expect(thresholds).toMatchInlineSnapshot(`
      [
        100,
        212,
        337,
        477,
        634,
        810,
        1007,
        1228,
        1476,
        1753,
      ]
    `);
    expect(xpForLevel(LEGEND_LEVEL)).toMatchInlineSnapshot(`195821`);
  });

  it('reaches level 50 in about 40 hours of typical play', () => {
    const hours = xpForLevel(LEGEND_LEVEL) / TYPICAL_XP_PER_HOUR;
    expect(Math.abs(hours - HOURS_TO_LEGEND_TARGET)).toBeLessThan(HOURS_TO_LEGEND_TARGET * 0.1);
  });
});

describe('rankFor', () => {
  it('names a rank for every level band', () => {
    expect(RANKS.map((rank) => rankFor(rank.fromLevel))).toEqual(RANKS.map((rank) => rank.id));
    expect(rankFor(4)).toBe('chick');
    expect(rankFor(49)).toBe('keyboardMaster');
    expect(rankFor(120)).toBe('legend');
  });
});
