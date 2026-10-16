import { DAILY_STAMP_COINS, dailyMedalCoins } from './economy';
import { NO_MEDAL, type Medal } from './medals';
import type { DailyBest, DailyRecord } from './record';
import { isoWeekKey, isSameWeek, previousWeekStart, weekDays } from './week';

export interface WeekChest {
  readonly stamps: number;
  readonly coins: number;
}

export interface DailyTry {
  readonly keySet: string;
  readonly score: number;
  readonly accuracy: number;
  readonly seconds: number;
  readonly medal: Medal;
}

export interface DailyDay {
  readonly keySet: string | undefined;
  readonly tries: number;
  readonly best: DailyBest | undefined;
}

export interface DailyRewards {
  readonly stamp: number;
  readonly medal: number;
  readonly chests: number;
}

export interface StampDay {
  readonly day: string;
  readonly stamped: boolean;
  readonly isToday: boolean;
  readonly isAhead: boolean;
}

export interface DailyStep {
  readonly record: DailyRecord;
  readonly rewards: DailyRewards;
  readonly stamped: boolean;
  readonly improved: boolean;
}

export const DAILY_TRIES = 3;
export const STREAK_STAMPS = 3;
export const WEEK_CHESTS: readonly WeekChest[] = [
  { stamps: 3, coins: 40 },
  { stamps: 5, coins: 100 },
];
export const FAMILY_CHEST: WeekChest = { stamps: 10, coins: 30 };

const CHEST_SEPARATOR = '/';
const FAMILY_CHEST_ID = 'family';
const NO_DAY: DailyDay = { keySet: undefined, tries: 0, best: undefined };
const NO_REWARDS: DailyRewards = { stamp: 0, medal: 0, chests: 0 };

export function dailyDay(record: DailyRecord | undefined, today: string): DailyDay {
  if (!record || record.date !== today) return NO_DAY;
  return { keySet: record.keySet, tries: record.tries, best: record.best };
}

export function triesLeft(record: DailyRecord | undefined, today: string): number {
  return Math.max(0, DAILY_TRIES - dailyDay(record, today).tries);
}

export function hasFinishedToday(record: DailyRecord | undefined, today: string): boolean {
  return dailyDay(record, today).tries > 0;
}

export function weekStamps(record: DailyRecord | undefined, day: string): string[] {
  return (record?.stamps ?? []).filter((stamp) => isSameWeek(stamp, day));
}

export function weekCard(record: DailyRecord | undefined, today: string): StampDay[] {
  const stamps = new Set(weekStamps(record, today));
  return weekDays(today).map((day) => ({
    day,
    stamped: stamps.has(day),
    isToday: day === today,
    isAhead: day > today,
  }));
}

export function hasFamilyChest(record: DailyRecord | undefined, today: string): boolean {
  return record?.chests.includes(familyChestKey(today)) ?? false;
}

export function shownWeekStreak(record: DailyRecord | undefined, today: string): number {
  if (!record) return 0;
  const alive = isFullWeek(record, today) || isFullWeek(record, previousWeekStart(today));
  return alive ? record.weekStreak : 0;
}

export function withDailyTry(
  record: DailyRecord | undefined,
  run: DailyTry,
  today: string,
): DailyStep {
  const day = dailyDay(record, today);
  if (record && day.tries >= DAILY_TRIES) {
    return { record, rewards: NO_REWARDS, stamped: false, improved: false };
  }
  const stamped = !(record?.stamps ?? []).includes(today);
  const fresh = freshRecord(record, today, day.keySet ?? run.keySet);
  const improved = isBetterTry(run, day.best);
  const tried: DailyRecord = {
    ...(stamped ? withStamp(fresh, today) : fresh),
    tries: day.tries + 1,
    best: improved ? bestOf(run) : day.best,
  };
  const opened = withWeekChests(tried, today);
  const rewards = {
    stamp: stamped ? DAILY_STAMP_COINS : 0,
    medal: dailyMedalCoins(day.best?.medal ?? NO_MEDAL, run.medal),
    chests: opened.coins,
  };
  return { record: opened.record, rewards, stamped, improved };
}

export function familyStamps(records: readonly (DailyRecord | undefined)[], today: string): number {
  return records.reduce((sum, record) => sum + weekStamps(record, today).length, 0);
}

export function isFamilyChestDue(
  record: DailyRecord | undefined,
  family: readonly (DailyRecord | undefined)[],
  today: string,
): record is DailyRecord {
  if (!record || weekStamps(record, today).length === 0) return false;
  if (record.chests.includes(familyChestKey(today))) return false;
  return familyStamps(family, today) >= FAMILY_CHEST.stamps;
}

export function withFamilyChest(record: DailyRecord, today: string): DailyRecord {
  return { ...record, chests: [...recentChests(record.chests, today), familyChestKey(today)] };
}

function freshRecord(record: DailyRecord | undefined, today: string, keySet: string): DailyRecord {
  const sameDay = record?.date === today;
  return {
    date: today,
    keySet,
    tries: sameDay ? record.tries : 0,
    best: sameDay ? record.best : undefined,
    stamps: recentStamps(record?.stamps ?? [], today),
    chests: recentChests(record?.chests ?? [], today),
    weekStreak: record?.weekStreak ?? 0,
    bestWeekStreak: record?.bestWeekStreak ?? 0,
    totalStamps: record?.totalStamps ?? 0,
  };
}

function withStamp(record: DailyRecord, today: string): DailyRecord {
  const stamped = { ...record, stamps: [...record.stamps, today] };
  const totalStamps = record.totalStamps + 1;
  if (weekStamps(stamped, today).length !== STREAK_STAMPS) return { ...stamped, totalStamps };
  const weekStreak = isFullWeek(record, previousWeekStart(today)) ? record.weekStreak + 1 : 1;
  const bestWeekStreak = Math.max(record.bestWeekStreak, weekStreak);
  return { ...stamped, totalStamps, weekStreak, bestWeekStreak };
}

function withWeekChests(
  record: DailyRecord,
  today: string,
): { record: DailyRecord; coins: number } {
  const count = weekStamps(record, today).length;
  const due = WEEK_CHESTS.filter(
    (chest) => count >= chest.stamps && !record.chests.includes(weekChestKey(today, chest)),
  );
  const chests = [...record.chests, ...due.map((chest) => weekChestKey(today, chest))];
  const coins = due.reduce((sum, chest) => sum + chest.coins, 0);
  return { record: { ...record, chests }, coins };
}

function isFullWeek(record: DailyRecord, day: string): boolean {
  return weekStamps(record, day).length >= STREAK_STAMPS;
}

function isBetterTry(run: DailyTry, best: DailyBest | undefined): boolean {
  if (!best) return true;
  if (run.medal !== best.medal) return run.medal > best.medal;
  return run.score > best.score;
}

function bestOf({ score, accuracy, seconds, medal }: DailyTry): DailyBest {
  return { score, accuracy, seconds, medal };
}

function recentStamps(stamps: readonly string[], today: string): string[] {
  const oldest = previousWeekStart(today);
  return stamps.filter((stamp) => stamp >= oldest);
}

function recentChests(chests: readonly string[], today: string): string[] {
  const weeks = [isoWeekKey(today), isoWeekKey(previousWeekStart(today))];
  return chests.filter((chest) => weeks.includes(weekOfChest(chest)));
}

function weekChestKey(today: string, chest: WeekChest): string {
  return [isoWeekKey(today), chest.stamps].join(CHEST_SEPARATOR);
}

function familyChestKey(today: string): string {
  return [isoWeekKey(today), FAMILY_CHEST_ID].join(CHEST_SEPARATOR);
}

function weekOfChest(chest: string): string {
  return chest.split(CHEST_SEPARATOR)[0];
}
