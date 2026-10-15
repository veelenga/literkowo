import { LEVELS } from '../course/catalog';
import { emptyCounters, type Counters } from '../course/counters';
import { ownedIds } from '../course/inventory';
import { ITEM_KINDS, findItem, priceOf } from '../course/shop';
import type { LevelResult, Profile } from './Profile';

const PERFECT_ACCURACY = 1;

export function seededCounters(profile: Profile): Counters {
  const won = Object.entries(profile.levelResults).filter(([, result]) => result.stars > 0);
  return {
    ...emptyCounters(),
    bossesBeaten: won.filter(([levelId]) => isBossLevel(levelId)).length,
    coinsEarned: profile.coins + coinsSpent(profile),
    perfectLevels: won.filter(([, result]) => isPerfect(result)).length,
    bestWpm: Math.max(0, ...won.map(([, result]) => result.wpm)),
    skinsPlayed: [profile.avatar],
  };
}

function isBossLevel(levelId: string): boolean {
  return LEVELS.some((level) => level.id === levelId && level.isBoss);
}

function isPerfect(result: LevelResult): boolean {
  return result.accuracy >= PERFECT_ACCURACY;
}

function coinsSpent(profile: Profile): number {
  return ITEM_KINDS.flatMap((kind) =>
    ownedIds(profile.inventory, kind).map((id) => findItem(kind, id)),
  ).reduce((sum, item) => sum + (item ? priceOf(item) : 0), 0);
}
