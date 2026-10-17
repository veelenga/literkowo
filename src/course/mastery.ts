import type { Region } from './catalog';
import { needsRightAlt } from './fingers';
import { RECENT_WINDOW, recentAccuracy, type KeyStat, type KeyStats } from './keyStats';
import { accuracyPercent, keystrokeAccuracy, PERFECT_ACCURACY } from './scoring';

export const MASTERY_LEVELS = ['none', 'learning', 'solid', 'mastered'] as const;

export type MasteryLevel = (typeof MASTERY_LEVELS)[number];

export const MASTERED_ACCURACY = 0.97;
export const SOLID_ACCURACY = 0.9;
export const MIN_SOLID_KEYSTROKES = 10;
export const MASTERED_DAYS = 3;
export const TARGET_INTERVAL_MS = 900;
export const RIGHT_ALT_TARGET_INTERVAL_MS = 1400;
export const MAX_KEY_WEIGHT = 3;

const EVEN_WEIGHT = 1;
const WEAK_ACCURACY = 0.8;

export interface KeyTally {
  hits: number;
  misses: number;
}

export interface KeyAccuracy {
  key: string;
  accuracy: number;
}

export function hasMasteredAccuracy(accuracy: number): boolean {
  return reachesAccuracy(accuracy, MASTERED_ACCURACY);
}

export function targetIntervalFor(key: string): number {
  return needsRightAlt(key) ? RIGHT_ALT_TARGET_INTERVAL_MS : TARGET_INTERVAL_MS;
}

export function masteryOf(key: string, stat: KeyStat | undefined): MasteryLevel {
  const accuracy = stat ? recentAccuracy(stat) : undefined;
  if (!stat || accuracy === undefined) return 'none';
  if (isMastered(key, stat, accuracy)) return 'mastered';
  return isSolid(stat, accuracy) ? 'solid' : 'learning';
}

export function masteredKeys(keys: string, stats: KeyStats): string[] {
  return [...keys].filter((key) => masteryOf(key, stats[key]) === 'mastered');
}

export function masteredShare(keys: string, stats: KeyStats): number {
  const total = [...keys].length;
  return total === 0 ? 0 : masteredKeys(keys, stats).length / total;
}

export function regionKeys(region: Region): string {
  return region.levels.map((level) => level.newKeys).join('');
}

export function keyWeight(key: string, stat: KeyStat | undefined): number {
  if (!stat || masteryOf(key, stat) === 'mastered') return EVEN_WEIGHT;
  const weakness = Math.max(accuracyWeakness(stat), speedWeakness(key, stat));
  return EVEN_WEIGHT + (MAX_KEY_WEIGHT - EVEN_WEIGHT) * weakness;
}

export function weakestKeys(
  tallies: Readonly<Record<string, KeyTally>>,
  count: number,
): KeyAccuracy[] {
  return Object.entries(tallies)
    .filter(([, tally]) => tally.misses > 0)
    .sort(([, first], [, second]) => compareWeakness(first, second))
    .slice(0, count)
    .map(([key, tally]) => ({ key, accuracy: tallyAccuracy(tally) }));
}

export function newlyMastered(before: KeyStats, after: KeyStats): string[] {
  return Object.keys(after).filter(
    (key) =>
      masteryOf(key, after[key]) === 'mastered' && masteryOf(key, before[key]) !== 'mastered',
  );
}

export function tallyAccuracy({ hits, misses }: KeyTally): number {
  return keystrokeAccuracy(hits, misses) ?? PERFECT_ACCURACY;
}

function isMastered(key: string, stat: KeyStat, accuracy: number): boolean {
  return (
    stat.recentCount >= RECENT_WINDOW &&
    hasMasteredAccuracy(accuracy) &&
    stat.speedSamples > 0 &&
    stat.speedMs <= targetIntervalFor(key) &&
    stat.days.length >= MASTERED_DAYS
  );
}

function isSolid(stat: KeyStat, accuracy: number): boolean {
  return stat.recentCount >= MIN_SOLID_KEYSTROKES && reachesAccuracy(accuracy, SOLID_ACCURACY);
}

function reachesAccuracy(accuracy: number, threshold: number): boolean {
  return accuracyPercent(accuracy) >= accuracyPercent(threshold);
}

function accuracyWeakness(stat: KeyStat): number {
  const accuracy = recentAccuracy(stat);
  if (accuracy === undefined) return 0;
  return clampUnit((MASTERED_ACCURACY - accuracy) / (MASTERED_ACCURACY - WEAK_ACCURACY));
}

function speedWeakness(key: string, stat: KeyStat): number {
  if (stat.speedSamples === 0) return 0;
  const target = targetIntervalFor(key);
  return clampUnit((stat.speedMs - target) / target);
}

function compareWeakness(first: KeyTally, second: KeyTally): number {
  return tallyAccuracy(first) - tallyAccuracy(second) || second.misses - first.misses;
}

function clampUnit(value: number): number {
  return Math.min(1, Math.max(0, value));
}
