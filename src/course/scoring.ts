const PERCENT = 100;

export const STAR_THRESHOLDS = [0.85, 0.93, 0.97] as const;

export const MAX_STARS = STAR_THRESHOLDS.length;

export function starsFor(accuracy: number, won: boolean): number {
  if (!won) return 0;
  return STAR_THRESHOLDS.filter((threshold) => accuracy >= threshold).length;
}

export function starThresholdPercents(): number[] {
  return STAR_THRESHOLDS.map((threshold) => Math.round(threshold * PERCENT));
}
