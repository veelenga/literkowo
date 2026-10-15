import { describe, expect, it } from 'vitest';
import { MAX_STARS, starThresholdPercents, starsFor } from './scoring';

describe('starsFor', () => {
  it('gives no stars for a lost level', () => {
    expect(starsFor(1, false)).toBe(0);
  });

  it('scales stars with accuracy', () => {
    expect(starsFor(0.8, true)).toBe(0);
    expect(starsFor(0.85, true)).toBe(1);
    expect(starsFor(0.93, true)).toBe(2);
    expect(starsFor(0.97, true)).toBe(MAX_STARS);
  });
});

describe('starThresholdPercents', () => {
  it('lists the accuracy needed for each star as whole percents', () => {
    expect(starThresholdPercents()).toEqual([85, 93, 97]);
  });
});
