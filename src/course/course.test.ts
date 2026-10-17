import { describe, expect, it } from 'vitest';
import { courseProgress } from '../testing/courseProgress';
import { requireLevel as level } from '../testing/levels';
import { allowedKeysFor, courseFor, OPEN_AHEAD, type LevelResults } from './course';

const WON = { stars: 1, score: 10, accuracy: 0.9, wpm: 10 };
const POLANA_WITHOUT_REVIEW = Array.from({ length: 17 }, (_, index) => `polana-${index + 1}`);

function won(...ids: string[]): LevelResults {
  return Object.fromEntries(ids.map((id) => [id, WON]));
}

function openIds(results: LevelResults, placedIn?: string): string[] {
  const polish = courseFor('pl');
  const progress = courseProgress(results, placedIn);
  return polish.levels.filter((level) => polish.isUnlocked(level, progress)).map(({ id }) => id);
}

function polanaUpTo(last: number): string[] {
  return Array.from({ length: last }, (_, index) => `polana-${index + 1}`);
}

describe('courseFor', () => {
  const polish = courseFor('pl');
  const english = courseFor('en');

  it('walks levels in order and across regions', () => {
    expect(polish.next(level('polana-19'))?.id).toBe('las-1');
    expect(polish.previous(level('las-1'))?.id).toBe('polana-19');
    expect(polish.previous(level('polana-1'))).toBeUndefined();
  });

  it('ends the English course before the Polish letters region', () => {
    expect(english.levels.some((candidate) => candidate.regionId === 'wyspa')).toBe(false);
    expect(english.next(level('jaskinia-24'))).toBeUndefined();
    expect(polish.next(level('jaskinia-24'))?.id).toBe('wyspa-1');
  });

  it('does not step from a level outside the course', () => {
    expect(english.next(level('wyspa-1'))).toBeUndefined();
    expect(english.previous(level('wyspa-2'))).toBeUndefined();
  });

  it('knows the first level', () => {
    expect(polish.isFirst(level('polana-1'))).toBe(true);
    expect(polish.isFirst(level('polana-2'))).toBe(false);
  });

  it('unlocks a level once the previous one earned a star', () => {
    const results = { 'polana-1': { stars: 1, score: 10, accuracy: 0.9, wpm: 10 } };
    expect(polish.isUnlocked(level('polana-1'), courseProgress())).toBe(true);
    expect(polish.isUnlocked(level('polana-2'), courseProgress())).toBe(false);
    expect(polish.isUnlocked(level('polana-2'), courseProgress(results))).toBe(true);
    expect(polish.isUnlocked(level('polana-3'), courseProgress(results))).toBe(false);
  });

  it('keeps levels from other languages locked', () => {
    expect(english.isUnlocked(level('wyspa-1'), courseProgress())).toBe(false);
  });

  it('collects allowed keys from the course levels only', () => {
    expect(polish.allowedKeys(level('polana-2'))).toBe('fj');
    expect(polish.allowedKeys(level('polana-4'))).toBe('fjd');
    expect(polish.allowedKeys(level('polana-8'))).toBe('fjdk');
    expect(english.allowedKeys(level('wyspa-1'))).not.toContain('ą');
    expect(polish.allowedKeys(level('wyspa-1'))).toContain('ą');
  });

  it('reads allowed keys from the course of the word language', () => {
    expect(allowedKeysFor(level('polana-4'), 'pl')).toBe('fjd');
    expect(allowedKeysFor(level('wyspa-1'), 'en')).not.toContain('ą');
    expect(allowedKeysFor(level('wyspa-1'), 'pl')).toContain('ą');
  });

  it('opens only the first level before any star', () => {
    expect(openIds({})).toEqual(['polana-1']);
    expect(polish.current(courseProgress())?.id).toBe('polana-1');
  });

  it('opens the next three levels past the furthest level with a star', () => {
    expect(openIds(won('polana-1', 'polana-2', 'polana-3'))).toEqual(polanaUpTo(3 + OPEN_AHEAD));
  });

  it('keeps a review locked until every practice level of its region is won', () => {
    expect(openIds(won('polana-1'))).toEqual(['polana-1', 'polana-2']);
    const skippedPractice = won('polana-1', 'polana-2', 'polana-3', 'polana-4', 'polana-6');
    expect(openIds(skippedPractice)).toEqual(polanaUpTo(7));
    expect(openIds({ ...skippedPractice, ...won('polana-7') })).toEqual(polanaUpTo(7));
    expect(openIds({ ...skippedPractice, ...won('polana-5', 'polana-7') })).toEqual(polanaUpTo(8));
  });

  it('never opens a level past a review or boss without a star', () => {
    expect(openIds(won('polana-1', 'polana-2'))).toEqual(polanaUpTo(3));
    expect(openIds(won(...POLANA_WITHOUT_REVIEW))).toEqual(polanaUpTo(18));
  });

  it('opens a boss only when the review before it is won, and the next region after the boss', () => {
    const beforeBoss = won(...POLANA_WITHOUT_REVIEW, 'polana-18');
    expect(openIds(beforeBoss)).toEqual(polanaUpTo(19));
    expect(openIds({ ...beforeBoss, ...won('polana-19') })).toEqual([
      ...polanaUpTo(19),
      'las-1',
      'las-2',
      'las-3',
    ]);
  });

  it('puts the current level on the first open level after the furthest win', () => {
    expect(polish.current(courseProgress(won('polana-1')))?.id).toBe('polana-2');
    expect(polish.current(courseProgress(won('polana-1', 'polana-2', 'polana-3')))?.id).toBe(
      'polana-4',
    );
    const skipped = won('polana-1', 'polana-2', 'polana-3', 'polana-4', 'polana-6');
    expect(polish.current(courseProgress(skipped))?.id).toBe('polana-7');
  });

  it('goes back to a skipped level when nothing ahead is open', () => {
    const skipped = won('polana-1', 'polana-2', 'polana-3', 'polana-4', 'polana-6', 'polana-7');
    expect(polish.current(courseProgress(skipped))?.id).toBe('polana-5');
  });

  it('names why a level is locked', () => {
    const results = won('polana-1');
    expect(polish.lockReason(level('polana-2'), courseProgress(results))).toBeUndefined();
    expect(polish.lockReason(level('polana-3'), courseProgress(results))).toBe('review');
    expect(polish.lockReason(level('polana-4'), courseProgress(results))).toBe('window');
    expect(
      polish.lockReason(level('polana-19'), courseProgress(won(...POLANA_WITHOUT_REVIEW))),
    ).toBe('boss');
  });

  it('opens every level of the placed regions and the first level after them', () => {
    expect(openIds({}, 'polana')).toEqual([...polanaUpTo(19), 'las-1']);
    expect(openIds({}, 'las').at(-1)).toBe('gory-1');
    expect(polish.lockReason(level('las-2'), courseProgress({}, 'polana'))).toBe('window');
  });

  it('puts the current level on the first level after the placement', () => {
    expect(polish.current(courseProgress({}, 'polana'))?.id).toBe('las-1');
    expect(polish.current(courseProgress(won('polana-1', 'polana-2'), 'las'))?.id).toBe('gory-1');
  });

  it('puts the current level on the first level of the last region after a full pass', () => {
    expect(polish.current(courseProgress({}, 'wyspa'))?.id).toBe('wyspa-1');
    expect(english.current(courseProgress({}, 'jaskinia'))?.id).toBe('jaskinia-1');
    expect(polish.current(courseProgress(won('wyspa-1'), 'wyspa'))?.id).toBe('wyspa-2');
    expect(polish.current(courseProgress({}, 'jaskinia'))?.id).toBe('wyspa-1');
  });

  it('marks the levels a placement covered without a star as skipped', () => {
    const progress = courseProgress(won('polana-4'), 'polana');
    expect(polish.isSkipped(level('polana-1'), progress)).toBe(true);
    expect(polish.isSkipped(level('polana-19'), progress)).toBe(true);
    expect(polish.isSkipped(level('polana-4'), progress)).toBe(false);
    expect(polish.isSkipped(level('las-1'), progress)).toBe(false);
    expect(polish.isSkipped(level('polana-1'), courseProgress())).toBe(false);
  });

  it('opens the window past the placement after a win there', () => {
    expect(openIds(won('las-1'), 'polana')).toEqual([
      ...polanaUpTo(19),
      'las-1',
      'las-2',
      'las-3',
      'las-4',
    ]);
  });

  it('keeps every level a win opened past the placement', () => {
    const ahead = won(...polish.levels.slice(0, 40).map(({ id }) => id));
    expect(openIds(ahead, 'polana')).toEqual(openIds(ahead));
  });

  it('reads a placement in a region the course does not have as the last region before it', () => {
    const progress = courseProgress({}, 'wyspa');
    expect(english.placedRegion(progress)?.id).toBe('jaskinia');
    expect(english.levels.every((candidate) => english.isUnlocked(candidate, progress))).toBe(true);
    expect(english.isSkipped(level('jaskinia-24'), progress)).toBe(true);
    expect(english.current(progress)?.id).toBe('jaskinia-1');
  });

  it('has no current level once the course is done', () => {
    const results = won(...english.levels.map(({ id }) => id));
    expect(english.current(courseProgress(results))).toBeUndefined();
  });
});
