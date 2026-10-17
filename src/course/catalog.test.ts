import { describe, expect, it } from 'vitest';
import {
  KEYS_PER_REVIEW,
  LEVELS,
  REGIONS,
  regionById,
  regionName,
  regionOrder,
  regionsFor,
  type Level,
} from './catalog';
import { courseFor } from './course';

const POLISH_LEVELS = 99;
const ENGLISH_LEVELS = 75;
const FIRST_KEYS = 'fj';
const UNKNOWN_REGION = 'nowhere';

function keyLevels(levels: readonly Level[]): Level[] {
  return levels.filter((level) => level.kind === 'learn' || level.kind === 'practice');
}

describe('catalog', () => {
  it('starts with the two index fingers together', () => {
    const [first, second] = LEVELS;
    expect(first).toMatchObject({ id: 'polana-1', kind: 'learn', newKeys: FIRST_KEYS });
    expect(second).toMatchObject({ id: 'polana-2', kind: 'practice', focusKeys: FIRST_KEYS });
  });

  it('introduces one key per learn level after the first', () => {
    const learn = LEVELS.filter((level) => level.kind === 'learn').slice(1);
    for (const level of learn) expect([...level.newKeys]).toHaveLength(1);
  });

  it('follows every learn level with the practice level of its key', () => {
    LEVELS.forEach((level, index) => {
      if (level.kind !== 'learn') return;
      expect(LEVELS[index + 1]).toMatchObject({ kind: 'practice', focusKeys: level.newKeys });
    });
  });

  it('reviews every two new keys and ends each region with a review and a boss', () => {
    for (const region of REGIONS) {
      const [review, boss] = region.levels.slice(-2);
      expect(review.kind).toBe('review');
      expect(boss.kind).toBe('boss');
      const reviews = region.levels.filter((level) => level.kind === 'review');
      for (const level of reviews.slice(0, -1)) {
        expect([...level.focusKeys]).toHaveLength(KEYS_PER_REVIEW);
      }
    }
  });

  it('only adds keys in learn levels', () => {
    for (const level of LEVELS.filter((candidate) => candidate.kind !== 'learn')) {
      expect(level.newKeys).toBe('');
    }
  });

  it('teaches every key once', () => {
    const keys = LEVELS.flatMap((level) => [...level.newKeys]);
    expect(new Set(keys).size).toBe(keys.length);
    expect(keyLevels(LEVELS)).toHaveLength((keys.length - 1) * 2);
  });

  it('numbers levels per region and orders them across the course', () => {
    for (const region of REGIONS) {
      region.levels.forEach((level, index) => expect(level.id).toBe(`${region.id}-${index + 1}`));
    }
    LEVELS.forEach((level, index) => expect(level.order).toBe(index));
  });

  it('looks up a region by its id', () => {
    REGIONS.forEach((region, index) => {
      expect(regionById(region.id)).toBe(region);
      expect(regionOrder(region.id)).toBe(index);
      expect(regionName(region.id, 'uk')).toBe(region.name.uk);
    });
    expect(regionById(UNKNOWN_REGION)).toBeUndefined();
    expect(regionOrder(UNKNOWN_REGION)).toBe(-1);
    expect(regionName(UNKNOWN_REGION, 'pl')).toBe(UNKNOWN_REGION);
  });

  it('hides the Polish letters region for English profiles', () => {
    expect(regionsFor('en').map((region) => region.id)).not.toContain('wyspa');
    expect(regionsFor('pl').map((region) => region.id)).toContain('wyspa');
  });

  it('gives each word language its own course length', () => {
    expect(courseFor('pl').levels).toHaveLength(POLISH_LEVELS);
    expect(courseFor('en').levels).toHaveLength(ENGLISH_LEVELS);
  });
});
