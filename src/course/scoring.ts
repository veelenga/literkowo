const STAR_THRESHOLDS = [0.85, 0.93, 0.97];

export function starsFor(accuracy: number, won: boolean): number {
  if (!won) return 0;
  return STAR_THRESHOLDS.filter((threshold) => accuracy >= threshold).length;
}

export const MAX_STARS = STAR_THRESHOLDS.length;
