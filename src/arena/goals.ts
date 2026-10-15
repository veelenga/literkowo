import { GOLD } from './medals';
import { bestEndlessMedal, bestEndlessWave, type ArenaRecord } from './record';

export type ArenaGoal =
  { readonly kind: 'gold' } | { readonly kind: 'wave'; readonly wave: number };

export function hasReachedArenaGoal(record: ArenaRecord, goal: ArenaGoal): boolean {
  if (goal.kind === 'gold') return bestEndlessMedal(record) === GOLD;
  return bestEndlessWave(record) >= goal.wave;
}
