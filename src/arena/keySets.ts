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

export function keySetsFor(language: WordLanguage): KeySet[] {
  const course = courseFor(language);
  return course.regions.map((region) => keySetOf(course, region));
}

export function keySetById(id: string, language: WordLanguage): KeySet | undefined {
  return keySetsFor(language).find((keySet) => keySet.id === id);
}

export function openKeySets(profile: ArenaProfile): KeySet[] {
  const course = courseFor(profile.wordLanguage);
  return keySetsFor(profile.wordLanguage).filter(
    (keySet, index) => index === FIRST_REGION || course.isUnlocked(keySet.bossLevel, profile),
  );
}

export function defaultKeySet(profile: ArenaProfile): KeySet {
  const open = openKeySets(profile);
  return open[open.length - 1];
}

function keySetOf(course: Course, region: Region): KeySet {
  const bossLevel = region.levels.at(-1);
  if (!bossLevel?.isBoss) throw new Error(`Region ${region.id} has no boss`);
  return { id: region.id, region, bossLevel, keys: course.allowedKeys(bossLevel) };
}
