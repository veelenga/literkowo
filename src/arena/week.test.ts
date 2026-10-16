import { describe, expect, it } from 'vitest';
import {
  addDays,
  isoWeekKey,
  isSameWeek,
  previousWeekStart,
  todayOf,
  weekdayOf,
  weekDays,
  weekStart,
} from './week';

describe('todayOf', () => {
  it('reads the local day of the clock and rolls over at local midnight', () => {
    expect(todayOf(() => new Date(2026, 9, 16, 23, 59, 59))).toBe('2026-10-16');
    expect(todayOf(() => new Date(2026, 9, 17, 0, 0, 0))).toBe('2026-10-17');
  });
});

describe('weekdays', () => {
  it('counts from Monday', () => {
    expect(weekdayOf('2026-10-12')).toBe(0);
    expect(weekdayOf('2026-10-16')).toBe(4);
    expect(weekdayOf('2026-10-18')).toBe(6);
  });

  it('starts the week on Monday', () => {
    expect(weekStart('2026-10-18')).toBe('2026-10-12');
    expect(weekStart('2026-10-19')).toBe('2026-10-19');
    expect(previousWeekStart('2026-10-14')).toBe('2026-10-05');
  });

  it('lists the seven days of the week across a month and a year', () => {
    expect(weekDays('2026-10-01')).toEqual([
      '2026-09-28',
      '2026-09-29',
      '2026-09-30',
      '2026-10-01',
      '2026-10-02',
      '2026-10-03',
      '2026-10-04',
    ]);
    expect(weekDays('2027-01-01').at(0)).toBe('2026-12-28');
  });

  it('adds days over the clock change and leap days', () => {
    expect(addDays('2026-10-24', 2)).toBe('2026-10-26');
    expect(addDays('2028-02-28', 1)).toBe('2028-02-29');
  });

  it('tells whether two days share a week', () => {
    expect(isSameWeek('2026-10-12', '2026-10-18')).toBe(true);
    expect(isSameWeek('2026-10-18', '2026-10-19')).toBe(false);
  });
});

describe('isoWeekKey', () => {
  it('names the ISO week', () => {
    expect(isoWeekKey('2026-10-16')).toBe('2026-W42');
    expect(isoWeekKey('2026-10-12')).toBe('2026-W42');
    expect(isoWeekKey('2026-10-19')).toBe('2026-W43');
  });

  it('gives the edge days of a year to the week of their Thursday', () => {
    expect(isoWeekKey('2027-01-01')).toBe('2026-W53');
    expect(isoWeekKey('2026-01-01')).toBe('2026-W01');
    expect(isoWeekKey('2025-12-29')).toBe('2026-W01');
    expect(isoWeekKey('2024-12-30')).toBe('2025-W01');
  });
});
