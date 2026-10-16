import { REGIONS, type Region } from '../course/catalog';
import { courseFor } from '../course/course';
import type { KeyStats } from '../course/keyStats';
import { awardTrophies } from '../course/trophies';
import type { Profile } from '../profiles/Profile';
import type { PlacementOutcome } from './placement';
import type { ArenaRecord } from './record';

export const FINGERS_CARD_ID = 'placement-fingers';

const NOT_PLACED = -1;

export interface PlacementAttempt {
  readonly outcome: PlacementOutcome;
  readonly keyStats: KeyStats;
  readonly date: string;
}

export function recordPlacement(profile: Profile, attempt: PlacementAttempt): Profile {
  return awardTrophies({
    ...profile,
    keyStats: { ...profile.keyStats, ...attempt.keyStats },
    arena: placedFurther(profile.arena, attempt.outcome.placed, attempt.date),
  });
}

export function placedFurther(
  record: ArenaRecord,
  region: Region | undefined,
  date: string,
): ArenaRecord {
  if (!region || regionOrder(region.id) <= regionOrder(record.placement?.regionId)) return record;
  return { ...record, placement: { regionId: region.id, date } };
}

export function offersPlacement(profile: Profile): boolean {
  const course = courseFor(profile.wordLanguage);
  const [first] = course.regions;
  const last = course.regions.at(-1);
  const starPastFirst = course.levels.some(
    (level) => level.regionId !== first.id && (profile.levelResults[level.id]?.stars ?? 0) > 0,
  );
  const placedAtLast = regionOrder(profile.arena.placement?.regionId) >= regionOrder(last?.id);
  return !starPastFirst && !placedAtLast;
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
