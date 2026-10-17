import { FIRST_PLAYER_LEVEL, xpToAdvance } from '../course/xp';

export function xpForLevel(level: number): number {
  let total = 0;
  for (let step = FIRST_PLAYER_LEVEL; step < level; step += 1) total += xpToAdvance(step);
  return total;
}
