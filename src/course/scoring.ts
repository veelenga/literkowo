const PERCENT = 100;

export const STAR_THRESHOLDS = [0.85, 0.93, 0.97] as const;

export const MAX_STARS = STAR_THRESHOLDS.length;

export function accuracyPercent(accuracy: number): number {
  return Math.round(accuracy * PERCENT);
}

export function starThresholdPercents(): number[] {
  return STAR_THRESHOLDS.map((threshold) => accuracyPercent(threshold));
}

export function starsFor(accuracy: number, won: boolean): number {
  if (!won) return 0;
  const shown = accuracyPercent(accuracy);
  return starThresholdPercents().filter((threshold) => shown >= threshold).length;
}
