import { regionOrder, type Region } from '../course/catalog';
import { boostedCoins, type RunCoins } from '../course/coins';
import { courseFor } from '../course/course';
import type { RunTotals } from '../course/progress';
import type { Profile } from '../profiles/Profile';
import type { PlacementOutcome } from './placement';
import { withArenaRun } from './progress';
import type { ArenaRecord } from './record';

export const FINGERS_CARD_ID = 'placement-fingers';

const NOT_PLACED = -1;

export interface PlacementAttempt extends RunTotals, RunCoins {
  readonly outcome: PlacementOutcome;
  readonly date: string;
}

export interface PlacementRecord {
  readonly profile: Profile;
  readonly coins: number;
}

export function recordPlacement(profile: Profile, attempt: PlacementAttempt): PlacementRecord {
  const coins = boostedCoins(attempt.runCoins, attempt.coinBoost);
  const updated = withArenaRun(profile, {
    ...attempt,
    coins,
    arena: placedFurther(profile.arena, attempt.outcome.placed, attempt.date),
  });
  return { profile: updated, coins };
}

export function placedFurther(
  record: ArenaRecord,
  region: Region | undefined,
  date: string,
): ArenaRecord {
  if (!region || regionOrder(region.id) <= placedOrder(record)) return record;
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
  const course = courseFor(profile.wordLanguage);
  const placed = course.placedRegion(profile);
  if (!placed) return undefined;
  return course.regions.at(course.regions.indexOf(placed) + 1) ?? placed;
}

export function showsFingersCard(profile: Profile): boolean {
  return !profile.seenStories.includes(FINGERS_CARD_ID) && skippedKeys(profile).length > 0;
}

function placedOrder(record: ArenaRecord): number {
  const placedId = record.placement?.regionId;
  return placedId === undefined ? NOT_PLACED : regionOrder(placedId);
}
