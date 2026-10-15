import { describe, expect, it } from 'vitest';
import { requireLevel as level } from '../testing/levels';
import { courseFor } from './course';

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
    expect(polish.isUnlocked(level('polana-1'), {})).toBe(true);
    expect(polish.isUnlocked(level('polana-2'), {})).toBe(false);
    expect(polish.isUnlocked(level('polana-2'), results)).toBe(true);
    expect(polish.isUnlocked(level('polana-3'), results)).toBe(false);
  });

  it('keeps levels from other languages locked', () => {
    expect(english.isUnlocked(level('wyspa-1'), {})).toBe(false);
  });

  it('collects allowed keys from the course levels only', () => {
    expect(polish.allowedKeys(level('polana-2'))).toBe('fj');
    expect(polish.allowedKeys(level('polana-4'))).toBe('fjd');
    expect(polish.allowedKeys(level('polana-8'))).toBe('fjdk');
    expect(english.allowedKeys(level('wyspa-1'))).not.toContain('ą');
    expect(polish.allowedKeys(level('wyspa-1'))).toContain('ą');
  });
});
