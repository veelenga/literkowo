import { describe, expect, it } from 'vitest';
import { DIFFICULTIES } from './difficulty';
import {
  MEDAL_COINS,
  NEW_BEST_WAVE_COINS,
  arenaCoinsPerWord,
  arenaPayout,
  medalCoins,
} from './economy';
import { BRONZE, GOLD, NO_MEDAL, SILVER } from './medals';

describe('arenaCoinsPerWord', () => {
  it('pays a coin for every two words times the coin factor of the preset', () => {
    expect(DIFFICULTIES.map(arenaCoinsPerWord)).toEqual([0.5, 0.625, 0.75, 1]);
  });
});

describe('medalCoins', () => {
  it('pays each medal once, also when a run jumps over one', () => {
    expect(MEDAL_COINS).toEqual({ 0: 0, 1: 20, 2: 40, 3: 80 });
    expect(medalCoins(NO_MEDAL, BRONZE)).toBe(20);
    expect(medalCoins(NO_MEDAL, GOLD)).toBe(140);
    expect(medalCoins(BRONZE, GOLD)).toBe(120);
    expect(medalCoins(SILVER, SILVER)).toBe(0);
    expect(medalCoins(GOLD, BRONZE)).toBe(0);
  });
});

describe('arenaPayout', () => {
  it('adds the run coins, the new medals and the new best wave', () => {
    expect(
      arenaPayout({ runCoins: 12, paidMedal: BRONZE, medal: SILVER, newBestWave: true }),
    ).toEqual({ run: 12, medals: 40, newBest: NEW_BEST_WAVE_COINS, total: 67 });
  });

  it('pays only the run coins for a run that brings nothing new', () => {
    expect(arenaPayout({ runCoins: 9, paidMedal: GOLD, medal: GOLD, newBestWave: false })).toEqual({
      run: 9,
      medals: 0,
      newBest: 0,
      total: 9,
    });
  });
});
