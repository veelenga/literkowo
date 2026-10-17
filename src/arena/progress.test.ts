import { describe, expect, it } from 'vitest';
import { EMPTY_TALLY } from '../course/counters';
import { EMPTY_KEY_STAT, recordHit } from '../course/keyStats';
import { recordResult } from '../course/progress';
import { createProfile, type Profile } from '../profiles/Profile';
import { requireLevel } from '../testing/levels';
import { difficultyById, type ArenaDifficulty } from './difficulty';
import { NEW_BEST_WAVE_COINS } from './economy';
import { keySetById, type KeySet } from './keySets';
import { BRONZE, NO_MEDAL, SILVER } from './medals';
import { recordEndlessRun, withArenaRun, type EndlessAttempt } from './progress';
import { arenaKey } from './record';

const DAY = '2026-10-15';

function required<T>(value: T | undefined): T {
  if (value === undefined) throw new Error('Missing test data');
  return value;
}

const LAS: KeySet = required(keySetById('las', 'pl'));
const NORMAL: ArenaDifficulty = required(difficultyById('normal'));

function attempt(overrides: Partial<EndlessAttempt> = {}): EndlessAttempt {
  return {
    keySet: LAS,
    difficulty: NORMAL,
    wavesCleared: 6,
    score: 2400,
    accuracy: 0.95,
    lettersFreed: 300,
    xp: 80,
    runCoins: 30,
    coinBoost: 1,
    keyStats: {},
    tally: EMPTY_TALLY,
    date: DAY,
    ...overrides,
  };
}

describe('recordEndlessRun', () => {
  it('counts the words, bosses and every coin of the run', () => {
    const tally = { words: 40, powerWords: 3, specialEnemies: 5, bossesBeaten: 1 };
    const outcome = recordEndlessRun(createProfile('A', 'b'), attempt({ tally }));
    expect(outcome.profile.counters).toMatchObject({
      wordsTyped: 40,
      powerWords: 3,
      specialEnemies: 5,
      bossesBeaten: 1,
      coinsEarned: outcome.payout.total,
      bestWpm: 0,
      skinsPlayed: ['b'],
    });
  });

  it('pays the coin hat on the whole payout of the run', () => {
    const outcome = recordEndlessRun(createProfile('A', 'a'), attempt({ coinBoost: 1.2 }));
    expect(outcome.payout.total).toBe(Math.floor((30 + 60 + NEW_BEST_WAVE_COINS) * 1.2));
    expect(outcome.profile.coins).toBe(outcome.payout.total);
  });

  it('adds XP, score, letters and every coin of the run to the profile', () => {
    const profile = { ...createProfile('A', 'a'), xp: 10, coins: 5, totalScore: 100 };
    const outcome = recordEndlessRun(profile, attempt());
    expect(outcome.medal).toBe(SILVER);
    expect(outcome.newBestWave).toBe(true);
    expect(outcome.payout).toEqual({
      run: 30,
      medals: 60,
      newBest: NEW_BEST_WAVE_COINS,
      total: 105,
    });
    expect(outcome.profile).toMatchObject({
      xp: 90,
      coins: 110,
      totalScore: 2500,
      lettersFreed: 300,
    });
    expect(outcome.best).toMatchObject({ wave: 6, medal: SILVER, runs: 1 });
    expect(outcome.profile.arena.medalsPaid[arenaKey('las', 'normal')]).toBe(SILVER);
  });

  it('pays medals and the best wave only once', () => {
    const first = recordEndlessRun(createProfile('A', 'a'), attempt()).profile;
    const again = recordEndlessRun(first, attempt({ wavesCleared: 4 }));
    expect(again.medal).toBe(BRONZE);
    expect(again.newBestWave).toBe(false);
    expect(again.payout.total).toBe(30);
    expect(again.best).toMatchObject({ wave: 6, medal: SILVER, runs: 2 });
  });

  it('gives no medal and no best for a run that clears no wave', () => {
    const outcome = recordEndlessRun(createProfile('A', 'a'), attempt({ wavesCleared: 0 }));
    expect(outcome.medal).toBe(NO_MEDAL);
    expect(outcome.newBestWave).toBe(false);
    expect(outcome.payout.total).toBe(30);
  });
});

describe('withArenaRun', () => {
  it('credits the same totals and counters as a course level without stars', () => {
    const profile = { ...createProfile('A', 'b'), xp: 10, coins: 5, totalScore: 100 };
    const totals = {
      score: 900,
      lettersFreed: 120,
      xp: 45,
      coins: 18,
      keyStats: { j: recordHit(EMPTY_KEY_STAT) },
      tally: { words: 30, powerWords: 2, specialEnemies: 4, bossesBeaten: 1 },
    };
    const arena = withArenaRun(profile, { ...totals, arena: profile.arena });
    const level = { ...totals, stars: 0, accuracy: 1, wpm: 40 };
    const course = recordResult(profile, requireLevel('polana-2'), level);
    expect(creditedOf(arena)).toEqual(creditedOf(course));
    expect(creditedOf(arena)).toMatchObject({ xp: 55, coins: 23, totalScore: 1000 });
  });
});

function creditedOf(profile: Profile) {
  const { totalScore, lettersFreed, xp, coins, keyStats, counters } = profile;
  return { totalScore, lettersFreed, xp, coins, keyStats, counters };
}
