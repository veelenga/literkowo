import { describe, expect, it } from 'vitest';
import { DIFFICULTIES } from './difficulty';
import {
  MEDAL_COINS,
  NEW_BEST_WAVE_COINS,
  arenaCoinsPerWord,
  arenaPayout,
  medalCoins,
} from './economy';
import { NO_BOOST } from '../course/powers';
import { BRONZE, GOLD, NO_MEDAL, SILVER } from './medals';

const NO_HAT = NO_BOOST.coins;

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
      arenaPayout({
        runCoins: 12,
        paidMedal: BRONZE,
        medal: SILVER,
        newBestWave: true,
        coinBoost: NO_HAT,
      }),
    ).toEqual({ run: 12, medals: 40, newBest: NEW_BEST_WAVE_COINS, total: 67 });
  });

  it('pays only the run coins for a run that brings nothing new', () => {
    const payout = arenaPayout({
      runCoins: 9,
      paidMedal: GOLD,
      medal: GOLD,
      newBestWave: false,
      coinBoost: NO_HAT,
    });
    expect(payout).toEqual({
      run: 9,
      medals: 0,
      newBest: 0,
      total: 9,
    });
  });

  it('scales the whole payout with the coin hat, medals and best wave included', () => {
    const payout = arenaPayout({
      runCoins: 12,
      paidMedal: BRONZE,
      medal: SILVER,
      newBestWave: true,
      coinBoost: 1.25,
    });
    expect(payout).toEqual({ run: 12, medals: 40, newBest: NEW_BEST_WAVE_COINS, total: 83 });
  });
});
