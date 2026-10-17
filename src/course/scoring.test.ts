import { describe, expect, it } from 'vitest';
import {
  MAX_STARS,
  accuracyPercent,
  keystrokeAccuracy,
  starThresholdPercents,
  starsFor,
  wordsPerMinute,
} from './scoring';

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

  it('judges the accuracy rounded to a whole percent', () => {
    expect(starsFor(0.8449, true)).toBe(0);
    expect(starsFor(0.849, true)).toBe(1);
    expect(starsFor(0.9249, true)).toBe(1);
    expect(starsFor(0.925, true)).toBe(2);
    expect(starsFor(0.965, true)).toBe(MAX_STARS);
  });
});

describe('accuracyPercent', () => {
  it('rounds accuracy to a whole percent', () => {
    expect(accuracyPercent(0.926)).toBe(93);
    expect(accuracyPercent(0.9249)).toBe(92);
    expect(accuracyPercent(1)).toBe(100);
  });
});

describe('starThresholdPercents', () => {
  it('lists the accuracy needed for each star as whole percents', () => {
    expect(starThresholdPercents()).toEqual([85, 93, 97]);
  });
});

describe('keystrokeAccuracy', () => {
  it('gives the share of keystrokes that hit', () => {
    expect(keystrokeAccuracy(9, 1)).toBe(0.9);
    expect(keystrokeAccuracy(3, 0)).toBe(1);
    expect(keystrokeAccuracy(0, 4)).toBe(0);
  });

  it('has no accuracy before the first keystroke', () => {
    expect(keystrokeAccuracy(0, 0)).toBeUndefined();
  });
});

describe('wordsPerMinute', () => {
  it('counts five characters as one word', () => {
    expect(wordsPerMinute(100, 60)).toBe(20);
    expect(wordsPerMinute(50, 30)).toBe(20);
  });

  it('rounds to a whole word', () => {
    expect(wordsPerMinute(52, 60)).toBe(10);
    expect(wordsPerMinute(53, 60)).toBe(11);
  });

  it('has no speed without typing time', () => {
    expect(wordsPerMinute(40, 0)).toBe(0);
    expect(wordsPerMinute(0, 0)).toBe(0);
  });
});
