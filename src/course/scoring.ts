const PERCENT = 100;
const NO_SPEED = 0;

export const SECONDS_PER_MINUTE = 60;
export const CHARS_PER_WORD = 5;
export const PERFECT_ACCURACY = 1;

export const STAR_THRESHOLDS = [0.85, 0.93, 0.97] as const;

export const MAX_STARS = STAR_THRESHOLDS.length;

export function accuracyPercent(accuracy: number): number {
  return Math.round(accuracy * PERCENT);
}

export function keystrokeAccuracy(hits: number, misses: number): number | undefined {
  const keystrokes = hits + misses;
  if (keystrokes === 0) return undefined;
  return hits / keystrokes;
}

export function wordsPerMinute(chars: number, seconds: number): number {
  if (seconds <= 0) return NO_SPEED;
  return Math.round(chars / CHARS_PER_WORD / (seconds / SECONDS_PER_MINUTE));
}

export function starThresholdPercents(): number[] {
  return STAR_THRESHOLDS.map((threshold) => accuracyPercent(threshold));
}

export function starsFor(accuracy: number, won: boolean): number {
  if (!won) return 0;
  const shown = accuracyPercent(accuracy);
  return starThresholdPercents().filter((threshold) => shown >= threshold).length;
}
