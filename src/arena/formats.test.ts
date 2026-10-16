import { describe, expect, it } from 'vitest';
import {
  DAILY_FORMAT_IDS,
  DAILY_SECONDS,
  TIME_ATTACK_SECONDS,
  dailyMedal,
  formatOn,
  formatOnWeekday,
  nextDailyGoal,
  type DailyRunGrade,
} from './formats';
import { BRONZE, GOLD, NO_MEDAL, SILVER } from './medals';

function run(overrides: Partial<DailyRunGrade> = {}): DailyRunGrade {
  return { seconds: DAILY_SECONDS, completed: true, accuracy: 1, wpm: 0, ...overrides };
}

describe('formatOn', () => {
  it('gives every weekday its own format from Monday', () => {
    const week = [
      '2026-10-12',
      '2026-10-13',
      '2026-10-14',
      '2026-10-15',
      '2026-10-16',
      '2026-10-17',
      '2026-10-18',
    ];
    expect(week.map((day) => formatOn(day).id)).toEqual([...DAILY_FORMAT_IDS]);
  });

  it('plays two minutes on Tuesday and three on the other days', () => {
    expect(formatOnWeekday(1)).toMatchObject({
      run: 'timeAttack',
      seconds: TIME_ATTACK_SECONDS,
      grade: 'pace',
    });
    const others = [0, 2, 3, 4, 5, 6].map(formatOnWeekday);
    expect(others.every((format) => format.seconds === DAILY_SECONDS)).toBe(true);
  });

  it('turns the play rules of each day into modifiers', () => {
    expect(formatOnWeekday(0).modifiers).toEqual(['fog']);
    expect(formatOnWeekday(2).modifiers).toEqual(['darkness']);
    expect(formatOnWeekday(3)).toMatchObject({ modifiers: ['longWords'], slower: true });
    expect(formatOnWeekday(4)).toMatchObject({ modifiers: ['oneHeart'], slower: true });
    expect(formatOnWeekday(5)).toMatchObject({ run: 'bosses', modifiers: [] });
    expect(formatOnWeekday(6)).toMatchObject({ run: 'waves', modifiers: [], slower: false });
  });

  it('refuses a weekday out of the week', () => {
    expect(() => formatOnWeekday(7)).toThrow();
  });
});

describe('dailyMedal', () => {
  const sunday = formatOnWeekday(6);
  const tuesday = formatOnWeekday(1);

  it('grades the minutes survived when the hearts run out', () => {
    expect(dailyMedal(sunday, run({ completed: false, seconds: 59 }))).toBe(NO_MEDAL);
    expect(dailyMedal(sunday, run({ completed: false, seconds: 60 }))).toBe(BRONZE);
    expect(dailyMedal(sunday, run({ completed: false, seconds: 150 }))).toBe(SILVER);
  });

  it('gives the full time grade to a finished run, also when the bosses fall early', () => {
    expect(dailyMedal(sunday, run())).toBe(GOLD);
    expect(dailyMedal(formatOnWeekday(5), run({ seconds: 95 }))).toBe(GOLD);
  });

  it('takes the lower of the time and the rounded accuracy grade', () => {
    expect(dailyMedal(sunday, run({ accuracy: 0.92 }))).toBe(BRONZE);
    expect(dailyMedal(sunday, run({ accuracy: 0.965 }))).toBe(GOLD);
    expect(dailyMedal(sunday, run({ accuracy: 0.84 }))).toBe(NO_MEDAL);
  });

  it('grades the pace of the time attack at 10, 15 and 20 words per minute', () => {
    expect(dailyMedal(tuesday, run({ wpm: 9 }))).toBe(NO_MEDAL);
    expect(dailyMedal(tuesday, run({ wpm: 10 }))).toBe(BRONZE);
    expect(dailyMedal(tuesday, run({ wpm: 15 }))).toBe(SILVER);
    expect(dailyMedal(tuesday, run({ wpm: 24 }))).toBe(GOLD);
    expect(dailyMedal(tuesday, run({ wpm: 30, accuracy: 0.9 }))).toBe(BRONZE);
  });
});

describe('nextDailyGoal', () => {
  it('names the minutes or the pace and the accuracy of the next medal', () => {
    expect(nextDailyGoal(formatOnWeekday(6), NO_MEDAL)).toEqual({
      medal: BRONZE,
      grade: 'time',
      target: 60,
      accuracyPercent: 85,
    });
    expect(nextDailyGoal(formatOnWeekday(1), SILVER)).toEqual({
      medal: GOLD,
      grade: 'pace',
      target: 20,
      accuracyPercent: 97,
    });
    expect(nextDailyGoal(formatOnWeekday(1), GOLD)).toBeUndefined();
  });
});
