import { describe, expect, it } from 'vitest';
import {
  BRONZE,
  GOLD,
  NO_MEDAL,
  SILVER,
  gradeOf,
  gradedMedal,
  isMedal,
  medalFor,
  nextMedalGoal,
} from './medals';

describe('medalFor', () => {
  it('gives no medal before three waves or below 85%', () => {
    expect(medalFor({ wavesCleared: 2, accuracy: 1 })).toBe(NO_MEDAL);
    expect(medalFor({ wavesCleared: 12, accuracy: 0.84 })).toBe(NO_MEDAL);
  });

  it('grades waves at 3, 6 and 10', () => {
    expect(medalFor({ wavesCleared: 3, accuracy: 1 })).toBe(BRONZE);
    expect(medalFor({ wavesCleared: 6, accuracy: 1 })).toBe(SILVER);
    expect(medalFor({ wavesCleared: 10, accuracy: 1 })).toBe(GOLD);
  });

  it('takes the lower of the wave and the accuracy grade', () => {
    expect(medalFor({ wavesCleared: 20, accuracy: 0.9 })).toBe(BRONZE);
    expect(medalFor({ wavesCleared: 4, accuracy: 0.99 })).toBe(BRONZE);
    expect(medalFor({ wavesCleared: 10, accuracy: 0.95 })).toBe(SILVER);
  });

  it('grades accuracy on the rounded percent the kid sees', () => {
    expect(medalFor({ wavesCleared: 10, accuracy: 0.965 })).toBe(GOLD);
    expect(medalFor({ wavesCleared: 10, accuracy: 0.964 })).toBe(SILVER);
  });
});

describe('nextMedalGoal', () => {
  it('names the waves and accuracy of the next medal', () => {
    expect(nextMedalGoal(NO_MEDAL)).toEqual({ medal: BRONZE, waves: 3, accuracyPercent: 85 });
    expect(nextMedalGoal(SILVER)).toEqual({ medal: GOLD, waves: 10, accuracyPercent: 97 });
  });

  it('has nothing after gold', () => {
    expect(nextMedalGoal(GOLD)).toBeUndefined();
  });
});

describe('isMedal', () => {
  it('accepts only medal values', () => {
    expect(isMedal(2)).toBe(true);
    expect(isMedal(4)).toBe(false);
    expect(isMedal('1')).toBe(false);
  });
});

describe('gradedMedal', () => {
  it('takes the lower of a grade and the accuracy grade', () => {
    expect(gradedMedal(3, 0.95)).toBe(SILVER);
    expect(gradedMedal(1, 1)).toBe(BRONZE);
    expect(gradedMedal(0, 1)).toBe(NO_MEDAL);
  });
});

describe('gradeOf', () => {
  it('counts the thresholds a value reaches', () => {
    expect(gradeOf(14, [10, 15, 20])).toBe(1);
    expect(gradeOf(20, [10, 15, 20])).toBe(3);
    expect(gradeOf(9, [10, 15, 20])).toBe(0);
  });
});
