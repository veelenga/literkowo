import { describe, expect, it } from 'vitest';
import {
  DAILY_TRIES,
  FAMILY_CHEST,
  WEEK_CHESTS,
  dailyDay,
  familyStamps,
  hasFamilyChest,
  hasFinishedToday,
  isFamilyChestDue,
  shownWeekStreak,
  triesLeft,
  weekCard,
  weekStamps,
  withDailyTry,
  withFamilyChest,
  type DailyTry,
} from './daily';
import { DAILY_MEDAL_COINS, DAILY_STAMP_COINS } from './economy';
import { BRONZE, GOLD, NO_MEDAL, SILVER, type Medal } from './medals';
import type { DailyRecord } from './record';
import { addDays } from './week';

const MONDAY = '2026-10-12';
const FRIDAY = '2026-10-16';

function attempt(medal: Medal = BRONZE, score = 1000, keySet = 'las'): DailyTry {
  return { keySet, score, accuracy: 0.95, seconds: 180, medal };
}

function playDays(days: readonly string[], record?: DailyRecord): DailyRecord | undefined {
  return days.reduce<DailyRecord | undefined>(
    (current, day) => withDailyTry(current, attempt(), day).record,
    record,
  );
}

function weekFrom(monday: string, count: number): string[] {
  return Array.from({ length: count }, (_, index) => addDays(monday, index));
}

describe('a day of the daily challenge', () => {
  it('starts every local day with three tries and no key set', () => {
    const record = withDailyTry(undefined, attempt(), MONDAY).record;
    expect(dailyDay(record, MONDAY)).toMatchObject({ keySet: 'las', tries: 1 });
    expect(triesLeft(record, MONDAY)).toBe(DAILY_TRIES - 1);
    expect(hasFinishedToday(record, MONDAY)).toBe(true);
    const tomorrow = addDays(MONDAY, 1);
    expect(dailyDay(record, tomorrow)).toEqual({ keySet: undefined, tries: 0, best: undefined });
    expect(triesLeft(record, tomorrow)).toBe(DAILY_TRIES);
    expect(hasFinishedToday(record, tomorrow)).toBe(false);
  });

  it('keeps the key set of the first try for the whole day', () => {
    const first = withDailyTry(undefined, attempt(BRONZE, 500, 'las'), MONDAY).record;
    const second = withDailyTry(first, attempt(BRONZE, 500, 'gory'), MONDAY).record;
    expect(second.keySet).toBe('las');
    expect(
      withDailyTry(second, attempt(BRONZE, 500, 'gory'), addDays(MONDAY, 1)).record.keySet,
    ).toBe('gory');
  });

  it('allows three tries and keeps the best one', () => {
    let record = withDailyTry(undefined, attempt(SILVER, 900), MONDAY).record;
    record = withDailyTry(record, attempt(BRONZE, 2000), MONDAY).record;
    const third = withDailyTry(record, attempt(SILVER, 1200), MONDAY);
    expect(third.improved).toBe(true);
    expect(third.record.best).toMatchObject({ medal: SILVER, score: 1200 });
    expect(triesLeft(third.record, MONDAY)).toBe(0);
    const fourth = withDailyTry(third.record, attempt(GOLD, 5000), MONDAY);
    expect(fourth.record).toBe(third.record);
    expect(fourth.rewards).toEqual({ stamp: 0, medal: 0, chests: 0 });
  });

  it('stamps only the first finished try of a day', () => {
    const first = withDailyTry(undefined, attempt(NO_MEDAL), MONDAY);
    const second = withDailyTry(first.record, attempt(NO_MEDAL), MONDAY);
    expect(first.stamped).toBe(true);
    expect(first.rewards.stamp).toBe(DAILY_STAMP_COINS);
    expect(second.stamped).toBe(false);
    expect(second.rewards.stamp).toBe(0);
    expect(second.record.stamps).toEqual([MONDAY]);
    expect(second.record.totalStamps).toBe(1);
  });

  it('pays a medal once and a better medal only the difference', () => {
    const bronze = withDailyTry(undefined, attempt(BRONZE), MONDAY);
    const again = withDailyTry(bronze.record, attempt(BRONZE, 5000), MONDAY);
    const gold = withDailyTry(again.record, attempt(GOLD), MONDAY);
    expect(bronze.rewards.medal).toBe(DAILY_MEDAL_COINS[BRONZE]);
    expect(again.rewards.medal).toBe(0);
    expect(gold.rewards.medal).toBe(DAILY_MEDAL_COINS[GOLD] - DAILY_MEDAL_COINS[BRONZE]);
  });

  it('pays the medal again on a new day', () => {
    const monday = withDailyTry(undefined, attempt(SILVER), MONDAY);
    const tuesday = withDailyTry(monday.record, attempt(SILVER), addDays(MONDAY, 1));
    expect(tuesday.rewards.medal).toBe(DAILY_MEDAL_COINS[SILVER]);
    expect(tuesday.record.best?.medal).toBe(SILVER);
  });
});

describe('the week card', () => {
  it('opens a chest at three stamps and another at five', () => {
    let record: DailyRecord | undefined;
    const chests = weekFrom(MONDAY, 6).map((day) => {
      const step = withDailyTry(record, attempt(NO_MEDAL), day);
      record = step.record;
      return step.rewards.chests;
    });
    expect(chests).toEqual([0, 0, WEEK_CHESTS[0].coins, 0, WEEK_CHESTS[1].coins, 0]);
    expect(record?.chests).toEqual(['2026-W42/3', '2026-W42/5']);
  });

  it('never opens a chest twice', () => {
    const week = playDays(weekFrom(MONDAY, 3));
    const again = withDailyTry(week, attempt(), addDays(MONDAY, 2));
    expect(again.rewards.chests).toBe(0);
  });

  it('keeps only the stamps and chests of this and last week', () => {
    const twoWeeks = playDays([...weekFrom('2026-09-28', 3), ...weekFrom('2026-10-05', 3)]);
    const record = playDays([MONDAY], twoWeeks);
    expect(record?.stamps).toEqual([...weekFrom('2026-10-05', 3), MONDAY]);
    expect(record?.chests).toEqual(['2026-W41/3']);
    expect(record?.totalStamps).toBe(7);
    expect(weekStamps(record, FRIDAY)).toEqual([MONDAY]);
  });

  it('counts weeks in a row with three stamps', () => {
    const first = playDays(weekFrom('2026-09-28', 3));
    expect(first?.weekStreak).toBe(1);
    const second = playDays(weekFrom('2026-10-05', 3), first);
    expect(second?.weekStreak).toBe(2);
    expect(shownWeekStreak(second, MONDAY)).toBe(2);
    expect(shownWeekStreak(second, '2026-10-19')).toBe(0);
    const third = playDays(weekFrom('2026-10-19', 4), second);
    expect(third).toMatchObject({ weekStreak: 1, bestWeekStreak: 2 });
  });

  it('shows the streak while this or last week is full and never takes away a stamp', () => {
    const full = playDays(weekFrom('2026-10-05', 3));
    expect(shownWeekStreak(full, '2026-10-07')).toBe(1);
    expect(shownWeekStreak(full, FRIDAY)).toBe(1);
    const thin = playDays(['2026-10-05', '2026-10-07']);
    expect(shownWeekStreak(thin, FRIDAY)).toBe(0);
    expect(thin?.totalStamps).toBe(2);
  });

  it('counts the streak across the turn of the year', () => {
    const december = playDays(weekFrom('2026-12-28', 3));
    const january = playDays(weekFrom('2027-01-04', 3), december);
    expect(january?.weekStreak).toBe(2);
    expect(january?.chests).toEqual(['2026-W53/3', '2027-W01/3']);
  });
});

describe('weekCard', () => {
  it('marks the stamped days, today and the days ahead from Monday to Sunday', () => {
    const record = playDays([MONDAY, addDays(MONDAY, 2), FRIDAY]);
    const card = weekCard(record, FRIDAY);
    expect(card.map((day) => day.stamped)).toEqual([true, false, true, false, true, false, false]);
    expect(card.map((day) => day.isToday)).toEqual([
      false,
      false,
      false,
      false,
      true,
      false,
      false,
    ]);
    expect(card.map((day) => day.isAhead)).toEqual([false, false, false, false, false, true, true]);
    expect(weekCard(undefined, MONDAY).every((day) => !day.stamped)).toBe(true);
  });
});

describe('the family chest', () => {
  const ola = playDays(weekFrom(MONDAY, 5));
  const stas = playDays(weekFrom(MONDAY, 4));
  const ania = playDays(weekFrom(MONDAY, 1));

  it('adds up the stamps of every profile this week', () => {
    expect(familyStamps([ola, stas, undefined], FRIDAY)).toBe(9);
  });

  it('opens at ten stamps for each profile that stamped this week, once', () => {
    const family = [ola, stas, ania];
    expect(familyStamps(family, FRIDAY)).toBe(FAMILY_CHEST.stamps);
    expect(isFamilyChestDue(ola, family, FRIDAY)).toBe(true);
    expect(isFamilyChestDue(undefined, family, FRIDAY)).toBe(false);
    const paid = ola && withFamilyChest(ola, FRIDAY);
    expect(paid?.chests).toContain('2026-W42/family');
    expect(hasFamilyChest(paid, FRIDAY)).toBe(true);
    expect(hasFamilyChest(paid, '2026-10-19')).toBe(false);
    expect(isFamilyChestDue(paid, [paid, stas, ania], FRIDAY)).toBe(false);
  });

  it('skips a profile without a stamp this week', () => {
    const lastWeek = playDays(['2026-10-05']);
    expect(isFamilyChestDue(lastWeek, [ola, stas, ania, lastWeek], FRIDAY)).toBe(false);
  });

  it('waits for ten stamps', () => {
    expect(isFamilyChestDue(ola, [ola, stas], FRIDAY)).toBe(false);
  });
});
