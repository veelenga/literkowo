import { practiceDay } from '../course/keyStats';

export type Clock = () => Date;

export const systemClock: Clock = () => new Date();
export const DAYS_PER_WEEK = 7;

const MONDAY = 0;
const THURSDAY = 3;
const SUNDAY_FIRST_SHIFT = 6;
const MS_PER_DAY = 86_400_000;
const MS_PER_WEEK = MS_PER_DAY * DAYS_PER_WEEK;
const JANUARY = 0;
const ISO_ANCHOR_DATE = 4;
const FIRST_WEEK = 1;
const MONTH_OFFSET = 1;
const TWO_DIGITS = 2;
const DAY_SEPARATOR = '-';
const WEEK_MARK = 'W';

export function todayOf(clock: Clock = systemClock): string {
  return practiceDay(clock());
}

export function weekdayOf(day: string): number {
  return (new Date(utcOf(day)).getUTCDay() + SUNDAY_FIRST_SHIFT) % DAYS_PER_WEEK;
}

export function addDays(day: string, days: number): string {
  return dayOfUtc(utcOf(day) + days * MS_PER_DAY);
}

export function weekStart(day: string): string {
  return addDays(day, MONDAY - weekdayOf(day));
}

export function weekDays(day: string): string[] {
  const monday = weekStart(day);
  return Array.from({ length: DAYS_PER_WEEK }, (_, index) => addDays(monday, index));
}

export function previousWeekStart(day: string): string {
  return addDays(weekStart(day), -DAYS_PER_WEEK);
}

export function isSameWeek(first: string, second: string): boolean {
  return weekStart(first) === weekStart(second);
}

export function isoWeekKey(day: string): string {
  const thursday = addDays(day, THURSDAY - weekdayOf(day));
  const year = new Date(utcOf(thursday)).getUTCFullYear();
  const firstThursday = addDays(weekStart(isoAnchor(year)), THURSDAY);
  const weeks = Math.round((utcOf(thursday) - utcOf(firstThursday)) / MS_PER_WEEK);
  return `${year}${DAY_SEPARATOR}${WEEK_MARK}${twoDigits(weeks + FIRST_WEEK)}`;
}

function isoAnchor(year: number): string {
  return dayOfUtc(Date.UTC(year, JANUARY, ISO_ANCHOR_DATE));
}

function utcOf(day: string): number {
  const [year, month, date] = day.split(DAY_SEPARATOR).map(Number);
  return Date.UTC(year, month - MONTH_OFFSET, date);
}

function dayOfUtc(time: number): string {
  const date = new Date(time);
  const month = twoDigits(date.getUTCMonth() + MONTH_OFFSET);
  return [date.getUTCFullYear(), month, twoDigits(date.getUTCDate())].join(DAY_SEPARATOR);
}

function twoDigits(value: number): string {
  return String(value).padStart(TWO_DIGITS, '0');
}
