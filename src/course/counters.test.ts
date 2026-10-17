import { describe, expect, it } from 'vitest';
import { countRun, countersOf, emptyCounters, type CountedRun } from './counters';

const RUN: CountedRun = {
  tally: { words: 20, powerWords: 2, specialEnemies: 3, bossesBeaten: 1 },
  coins: 45,
  avatar: 'b',
  perfect: true,
  wpm: 18,
};

describe('countRun', () => {
  it('adds the run to every counter and remembers the skin', () => {
    const once = countRun(emptyCounters(), RUN);
    const twice = countRun(once, { ...RUN, perfect: false, wpm: 12 });
    expect(twice).toEqual({
      wordsTyped: 40,
      powerWords: 4,
      specialEnemies: 6,
      bossesBeaten: 2,
      coinsEarned: 90,
      perfectLevels: 1,
      bestWpm: 18,
      skinsPlayed: ['b'],
    });
  });
});

describe('countersOf', () => {
  it('starts empty from nothing and keeps only whole counts', () => {
    expect(countersOf(undefined)).toEqual(emptyCounters());
    const raw = { wordsTyped: 12, powerWords: 2.5, coinsEarned: -5, skinsPlayed: ['a', 'a', 1] };
    expect(countersOf(raw)).toEqual({ ...emptyCounters(), wordsTyped: 12, skinsPlayed: ['a'] });
  });
});
