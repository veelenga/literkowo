import { describe, expect, it } from 'vitest';
import { courseFor } from '../course/course';
import { levelById } from '../course/catalog';
import { gradualCourseResults } from './courseMigration';

const BOSS = '';
const OLD_COURSE: Readonly<Record<string, string>> = {
  'polana-1': 'fj',
  'polana-2': 'dk',
  'polana-3': 'sl',
  'polana-4': 'a;',
  'polana-5': BOSS,
  'las-1': 'gh',
  'las-2': 'ei',
  'las-3': 'ru',
  'las-4': BOSS,
  'gory-1': 'ty',
  'gory-2': 'wo',
  'gory-3': 'qp',
  'gory-4': BOSS,
  'jaskinia-1': 'vm',
  'jaskinia-2': 'cn',
  'jaskinia-3': 'xz',
  'jaskinia-4': 'b,.',
  'jaskinia-5': BOSS,
  'wyspa-1': 'ąęó',
  'wyspa-2': 'łść',
  'wyspa-3': 'żźń',
  'wyspa-4': BOSS,
};

function result(stars: number) {
  return { stars, score: stars * 100, accuracy: 0.9, wpm: 10 };
}

function oldResults(ids: readonly string[], stars = 2): Record<string, unknown> {
  return Object.fromEntries(ids.map((id) => [id, result(stars)]));
}

function migratedIds(ids: readonly string[]): string[] {
  return Object.keys(gradualCourseResults(oldResults(ids)));
}

function lastTarget(oldId: string): string | undefined {
  const ids = migratedIds([oldId]);
  return ids.sort((a, b) => (levelById(a)?.order ?? 0) - (levelById(b)?.order ?? 0)).at(-1);
}

describe('gradualCourseResults', () => {
  it.each(Object.entries(OLD_COURSE))(
    'moves %s to the level that completes the same keys',
    (oldId, keys) => {
      const target = levelById(lastTarget(oldId) ?? '');
      expect(target?.regionId).toBe(oldId.split('-')[0]);
      if (keys === BOSS) return expect(target?.kind).toBe('boss');
      expect(target?.kind).toBe('practice');
      expect(target?.focusKeys).toContain([...keys].at(-1));
    },
  );

  it('marks the new levels before the target as done with the same stars', () => {
    const migrated = gradualCourseResults({ 'polana-1': result(3), 'polana-2': result(1) });
    expect(Object.keys(migrated)).toEqual([
      'polana-1',
      'polana-2',
      'polana-3',
      'polana-4',
      'polana-5',
      'polana-6',
      'polana-7',
    ]);
    expect(migrated['polana-2']).toEqual(result(3));
    expect(migrated['polana-3']).toEqual(result(1));
    expect(migrated['polana-7']).toEqual(result(1));
  });

  it('keeps a finished region finished and opens the next one', () => {
    const regionIds = Object.keys(OLD_COURSE).filter((id) => id.startsWith('polana-'));
    const migrated = gradualCourseResults(oldResults(regionIds));
    const course = courseFor('pl');
    const meadow = course.regions[0].levels;
    expect(Object.keys(migrated)).toEqual(meadow.map((level) => level.id));
    const results = Object.fromEntries(meadow.map((level) => [level.id, result(2)]));
    expect(course.isUnlocked(course.regions[1].levels[0], results)).toBe(true);
  });

  it('leaves the next new level open after a half finished region', () => {
    const migrated = Object.keys(gradualCourseResults(oldResults(['las-1', 'las-2'])));
    expect(migrated.at(-1)).toBe('las-9');
    expect(migrated).not.toContain('las-10');
  });

  it('moves a result without stars only to its target', () => {
    const migrated = gradualCourseResults({ 'polana-1': result(3), 'polana-2': result(0) });
    expect(Object.keys(migrated)).toEqual(['polana-1', 'polana-2', 'polana-7']);
  });

  it('maps every old level of both courses', () => {
    const migrated = migratedIds(Object.keys(OLD_COURSE));
    expect(migrated).toEqual(courseFor('pl').levels.map((level) => level.id));
  });

  it('ignores ids that were never part of the old course', () => {
    expect(gradualCourseResults({ 'polana-6': result(3), unknown: result(1) })).toEqual({});
    expect(gradualCourseResults(null)).toEqual({});
  });
});
