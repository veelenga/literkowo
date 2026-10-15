import { FEVER_MULTIPLIER } from '../../combo';
import type { SessionStats } from '../../SessionStats';

const POINTS_PER_CHAR = 10;

export type ScoringState = Pick<SessionStats, 'multiplier' | 'fever'>;

export function wordPoints(word: string, stats: ScoringState): number {
  const feverBonus = stats.fever ? FEVER_MULTIPLIER : 1;
  return word.length * POINTS_PER_CHAR * stats.multiplier * feverBonus;
}
