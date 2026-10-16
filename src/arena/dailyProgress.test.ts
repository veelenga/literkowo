import { describe, expect, it } from 'vitest';
import { EMPTY_TALLY } from '../course/counters';
import { createProfile, type Profile } from '../profiles/Profile';
import { DAILY_TRIES, FAMILY_CHEST, WEEK_CHESTS } from './daily';
import type { DailyChoice } from './dailyPlan';
import { deviceBoard, payFamilyChest, recordDailyRun, type DailyAttempt } from './dailyProgress';
import { DAILY_MEDAL_COINS, DAILY_STAMP_COINS } from './economy';
import { DAILY_SECONDS, formatOnWeekday } from './formats';
import { keySetById, type KeySet } from './keySets';
import { GOLD, NO_MEDAL, SILVER } from './medals';
import { addDays } from './week';

const MONDAY = '2026-10-12';
const SUNDAY = 6;

function required<T>(value: T | undefined): T {
  if (value === undefined) throw new Error('Missing test data');
  return value;
}

const LAS: KeySet = required(keySetById('las', 'pl'));

function choice(day = MONDAY): DailyChoice {
  return { keySet: LAS, format: formatOnWeekday(SUNDAY), day };
}

function attempt(overrides: Partial<DailyAttempt> = {}): DailyAttempt {
  return {
    choice: choice(),
    completed: true,
    seconds: DAILY_SECONDS,
    score: 3000,
    accuracy: 0.98,
    wpm: 14,
    lettersFreed: 200,
    xp: 90,
    runCoins: 25,
    coinBoost: 1,
    keyStats: {},
    tally: { ...EMPTY_TALLY, words: 50 },
    ...overrides,
  };
}

function stampedDays(profile: Profile, days: readonly string[]): Profile {
  return days.reduce(
    (current, day) =>
      recordDailyRun(current, attempt({ choice: choice(day), accuracy: 0.5 }), [current]).profile,
    profile,
  );
}

describe('recordDailyRun', () => {
  it('pays the run, the stamp and the medal and adds the run to the profile', () => {
    const profile = createProfile('Ola', 'girl');
    const outcome = recordDailyRun(profile, attempt(), [profile]);
    expect(outcome.medal).toBe(GOLD);
    expect(outcome.payout).toEqual({
      run: 25,
      stamp: DAILY_STAMP_COINS,
      medal: DAILY_MEDAL_COINS[GOLD],
      chests: 0,
      family: 0,
      total: 25 + DAILY_STAMP_COINS + DAILY_MEDAL_COINS[GOLD],
    });
    expect(outcome.profile).toMatchObject({
      coins: outcome.payout.total,
      xp: 90,
      totalScore: 3000,
      lettersFreed: 200,
    });
    expect(outcome.profile.counters).toMatchObject({
      wordsTyped: 50,
      coinsEarned: outcome.payout.total,
    });
    expect(outcome).toMatchObject({ stamped: true, improved: true, triesLeft: DAILY_TRIES - 1 });
    expect(outcome.profile.arena.daily).toMatchObject({ date: MONDAY, keySet: 'las', tries: 1 });
  });

  it('boosts only the run coins with a coin hat', () => {
    const profile = createProfile('Ola', 'girl');
    const outcome = recordDailyRun(profile, attempt({ coinBoost: 1.2 }), [profile]);
    expect(outcome.payout.run).toBe(30);
    expect(outcome.payout.total).toBe(30 + DAILY_STAMP_COINS + DAILY_MEDAL_COINS[GOLD]);
  });

  it('grades a run cut short by the hearts on the minutes survived', () => {
    const profile = createProfile('Ola', 'girl');
    const outcome = recordDailyRun(profile, attempt({ completed: false, seconds: 130 }), [profile]);
    expect(outcome.medal).toBe(SILVER);
    expect(outcome.best).toMatchObject({ medal: SILVER, seconds: 130 });
  });

  it('opens the week chest with the third stamp', () => {
    const profile = stampedDays(createProfile('Ola', 'girl'), [MONDAY, addDays(MONDAY, 1)]);
    const third = recordDailyRun(profile, attempt({ choice: choice(addDays(MONDAY, 2)) }), [
      profile,
    ]);
    expect(third.payout.chests).toBe(WEEK_CHESTS[0].coins);
  });

  it('pays the family chest to the profile that brings the family to ten stamps', () => {
    const week = Array.from({ length: 5 }, (_, index) => addDays(MONDAY, index));
    const stas = stampedDays(createProfile('Staś', 'boy'), week);
    const ola = stampedDays(createProfile('Ola', 'girl'), week.slice(0, 4));
    const friday = recordDailyRun(ola, attempt({ choice: choice(week[4]) }), [ola, stas]);
    expect(friday.payout.family).toBe(FAMILY_CHEST.coins);
    expect(friday.profile.arena.daily?.chests).toContain('2026-W42/family');
  });
});

describe('payFamilyChest', () => {
  const week = Array.from({ length: 5 }, (_, index) => addDays(MONDAY, index));
  const friday = week[4];

  it('pays every profile that stamped this week once the family has ten stamps', () => {
    const ola = stampedDays(createProfile('Ola', 'girl'), week);
    const stas = stampedDays(createProfile('Staś', 'boy'), week);
    const paid = payFamilyChest(stas, [ola, stas], friday);
    expect(paid.coins).toBe(FAMILY_CHEST.coins);
    expect(paid.profile.coins).toBe(stas.coins + FAMILY_CHEST.coins);
    expect(paid.profile.counters.coinsEarned).toBe(stas.counters.coinsEarned + FAMILY_CHEST.coins);
    expect(payFamilyChest(paid.profile, [ola, paid.profile], friday).coins).toBe(0);
  });

  it('pays nothing to a profile without a stamp this week', () => {
    const ola = stampedDays(createProfile('Ola', 'girl'), week);
    const stas = stampedDays(createProfile('Staś', 'boy'), week);
    const ania = createProfile('Ania', 'girl');
    expect(payFamilyChest(ania, [ola, stas, ania], friday)).toEqual({ profile: ania, coins: 0 });
  });
});

describe('deviceBoard', () => {
  it('lists every profile that finished today with its best medal', () => {
    const ola = recordDailyRun(createProfile('Ola', 'girl'), attempt(), []).profile;
    const stas = recordDailyRun(
      createProfile('Staś', 'boy'),
      attempt({ accuracy: 0.5 }),
      [],
    ).profile;
    const yesterday = recordDailyRun(
      createProfile('Ania', 'girl'),
      attempt({ choice: choice(addDays(MONDAY, -1)) }),
      [],
    ).profile;
    expect(deviceBoard([ola, stas, yesterday, createProfile('Jaś', 'boy')], MONDAY)).toEqual([
      { profileId: ola.id, name: 'Ola', medal: GOLD },
      { profileId: stas.id, name: 'Staś', medal: NO_MEDAL },
    ]);
  });
});
