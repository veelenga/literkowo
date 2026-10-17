import { hasNewItems } from '../course/inventory';
import { freshTrophies } from '../course/trophies';
import type { Profile } from '../profiles/Profile';
import type { LevelRewards } from '../ui/LevelResult';

export function earnedOf(before: Profile, after: Profile, xp: number, coins: number): LevelRewards {
  const treasures = {
    trophies: freshTrophies(before, after),
    newItems: hasNewItems(before, after),
  };
  return { xpBefore: before.xp, xp, coins, treasures };
}
