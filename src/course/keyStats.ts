export interface KeyStat {
  readonly hits: number;
  readonly misses: number;
  readonly recentMisses: number;
  readonly recentCount: number;
  readonly speedMs: number;
  readonly speedSamples: number;
  readonly days: readonly string[];
}

export type KeyStats = Readonly<Record<string, KeyStat>>;

export const RECENT_WINDOW = 30;
export const SPEED_WINDOW = 50;
export const MAX_SPEED_GAP_MS = 2000;
export const MAX_PRACTICE_DAYS = 10;

const RECENT_MASK = 2 ** RECENT_WINDOW - 1;
const SPEED_SMOOTHING = 2 / (SPEED_WINDOW + 1);
const MISS_BIT = 1;
const HIT_BIT = 0;
const DATE_PART_LENGTH = 2;
const MONTH_OFFSET = 1;
const PRACTICE_DAY_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

export const EMPTY_KEY_STAT: KeyStat = {
  hits: 0,
  misses: 0,
  recentMisses: 0,
  recentCount: 0,
  speedMs: 0,
  speedSamples: 0,
  days: [],
};

export function recordHit(stat: KeyStat, intervalMs?: number): KeyStat {
  const speed = intervalMs === undefined ? stat : withSpeed(stat, intervalMs);
  return { ...speed, hits: stat.hits + 1, ...pushRecent(stat, HIT_BIT) };
}

export function recordMiss(stat: KeyStat): KeyStat {
  return { ...stat, misses: stat.misses + 1, ...pushRecent(stat, MISS_BIT) };
}

export function withPracticeDay(stat: KeyStat, day: string): KeyStat {
  if (stat.days.includes(day)) return stat;
  return { ...stat, days: [...stat.days, day].sort().slice(-MAX_PRACTICE_DAYS) };
}

export function recentAccuracy(stat: KeyStat): number | undefined {
  if (stat.recentCount === 0) return undefined;
  return 1 - countBits(stat.recentMisses) / stat.recentCount;
}

export function speedInterval(previousHitAt: number | undefined, now: number): number | undefined {
  if (previousHitAt === undefined) return undefined;
  const interval = now - previousHitAt;
  return interval >= 0 && interval <= MAX_SPEED_GAP_MS ? interval : undefined;
}

export function practiceDay(date: Date): string {
  const month = pad(date.getMonth() + MONTH_OFFSET);
  return `${date.getFullYear()}-${month}-${pad(date.getDate())}`;
}

export function isPracticeDay(value: unknown): value is string {
  return typeof value === 'string' && PRACTICE_DAY_PATTERN.test(value);
}

export function recentMissesWithin(bits: number, count: number): number {
  return bits & (2 ** count - 1);
}

function withSpeed(stat: KeyStat, intervalMs: number): KeyStat {
  const speedSamples = Math.min(SPEED_WINDOW, stat.speedSamples + 1);
  const weight = Math.max(SPEED_SMOOTHING, 1 / speedSamples);
  const speedMs = stat.speedMs + (intervalMs - stat.speedMs) * weight;
  return { ...stat, speedMs, speedSamples };
}

function pushRecent(stat: KeyStat, bit: number): Pick<KeyStat, 'recentMisses' | 'recentCount'> {
  return {
    recentMisses: ((stat.recentMisses << 1) | bit) & RECENT_MASK,
    recentCount: Math.min(RECENT_WINDOW, stat.recentCount + 1),
  };
}

function countBits(bits: number): number {
  let count = 0;
  for (let rest = bits; rest > 0; rest >>>= 1) count += rest & 1;
  return count;
}

function pad(value: number): string {
  return String(value).padStart(DATE_PART_LENGTH, '0');
}
