import { REGIONS, type Region } from '../course/catalog';
import { boostedCoins } from '../course/coins';
import type { Tally } from '../course/counters';
import { courseFor } from '../course/course';
import type { KeyStats } from '../course/keyStats';
import type { Profile } from '../profiles/Profile';
import type { PlacementOutcome } from './placement';
import { withArenaRun } from './progress';
import type { ArenaRecord } from './record';

export const FINGERS_CARD_ID = 'placement-fingers';

const NOT_PLACED = -1;

export interface PlacementAttempt {
  readonly outcome: PlacementOutcome;
  readonly keyStats: KeyStats;
  readonly date: string;
  readonly score: number;
  readonly lettersFreed: number;
  readonly xp: number;
  readonly runCoins: number;
  readonly coinBoost: number;
  readonly tally: Tally;
}

export interface PlacementRecord {
  readonly profile: Profile;
  readonly coins: number;
}

export function recordPlacement(profile: Profile, attempt: PlacementAttempt): PlacementRecord {
  const coins = boostedCoins(attempt.runCoins, attempt.coinBoost);
  const updated = withArenaRun(profile, {
    score: attempt.score,
    lettersFreed: attempt.lettersFreed,
    xp: attempt.xp,
    coins,
    keyStats: attempt.keyStats,
    tally: attempt.tally,
    arena: placedFurther(profile.arena, attempt.outcome.placed, attempt.date),
  });
  return { profile: updated, coins };
}

export function placedFurther(
  record: ArenaRecord,
  region: Region | undefined,
  date: string,
): ArenaRecord {
  if (!region || regionOrder(region.id) <= regionOrder(record.placement?.regionId)) return record;
  return { ...record, placement: { regionId: region.id, date } };
}

export function skippedKeys(profile: Profile): string {
  const course = courseFor(profile.wordLanguage);
  return course.levels
    .filter((level) => level.kind === 'learn' && course.isSkipped(level, profile))
    .map((level) => level.newKeys)
    .join('');
}

export function startRegion(profile: Profile): Region | undefined {
  const placed = regionOrder(profile.arena.placement?.regionId);
  if (placed === NOT_PLACED) return undefined;
  const { regions } = courseFor(profile.wordLanguage);
  const last = regions.findLastIndex((region) => regionOrder(region.id) <= placed);
  return regions[Math.min(last + 1, regions.length - 1)];
}

export function showsFingersCard(profile: Profile): boolean {
  return !profile.seenStories.includes(FINGERS_CARD_ID) && skippedKeys(profile).length > 0;
}

function regionOrder(regionId: string | undefined): number {
  return regionId ? REGIONS.findIndex((region) => region.id === regionId) : NOT_PLACED;
}
