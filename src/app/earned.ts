import { hasNewItems } from '../course/inventory';
import { freshTrophies } from '../course/trophies';
import type { Profile } from '../profiles/Profile';
import type { ResultRewards } from '../ui/ResultOverlay';

export function earnedOf(
  before: Profile,
  after: Profile,
  xp: number,
  coins: number,
): ResultRewards {
  const treasures = {
    trophies: freshTrophies(before, after),
    newItems: hasNewItems(before, after),
  };
  return { xpBefore: before.xp, xp, coins, treasures };
}
