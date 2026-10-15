import type { Level, Region } from '../course/catalog';
import { courseFor, type Course } from '../course/course';
import type { Profile, WordLanguage } from '../profiles/Profile';

export interface KeySet {
  readonly id: string;
  readonly region: Region;
  readonly bossLevel: Level;
  readonly keys: string;
}

export type ArenaProfile = Pick<Profile, 'wordLanguage' | 'levelResults' | 'arena'>;

const FIRST_REGION = 0;
const NOT_PLACED = -1;

export function keySetsFor(language: WordLanguage): KeySet[] {
  const course = courseFor(language);
  return course.regions.map((region) => keySetOf(course, region));
}

export function keySetById(id: string, language: WordLanguage): KeySet | undefined {
  return keySetsFor(language).find((keySet) => keySet.id === id);
}

export function openKeySets(profile: ArenaProfile): KeySet[] {
  const course = courseFor(profile.wordLanguage);
  const placed = placedRegionIndex(profile);
  return keySetsFor(profile.wordLanguage).filter(
    (keySet, index) => index <= placed || course.isUnlocked(keySet.bossLevel, profile.levelResults),
  );
}

export function defaultKeySet(profile: ArenaProfile): KeySet | undefined {
  return openKeySets(profile).at(-1);
}

export function arenaGateLevel(language: WordLanguage): Level {
  return keySetsFor(language)[FIRST_REGION].bossLevel;
}

export function isArenaOpen(profile: ArenaProfile): boolean {
  const gate = arenaGateLevel(profile.wordLanguage);
  const beaten = (profile.levelResults[gate.id]?.stars ?? 0) > 0;
  return beaten || profile.arena.placement !== undefined;
}

function keySetOf(course: Course, region: Region): KeySet {
  const bossLevel = region.levels.at(-1);
  if (!bossLevel?.isBoss) throw new Error(`Region ${region.id} has no boss`);
  return { id: region.id, region, bossLevel, keys: course.allowedKeys(bossLevel) };
}

function placedRegionIndex(profile: ArenaProfile): number {
  const regionId = profile.arena.placement?.regionId;
  if (!regionId) return NOT_PLACED;
  return courseFor(profile.wordLanguage).regions.findIndex((region) => region.id === regionId);
}
