import { describe, expect, it } from 'vitest';
import { createProfile, PROFILE_SCHEMA_VERSION, totalStars } from './Profile';

describe('createProfile', () => {
  it('stamps the current schema version', () => {
    expect(createProfile('A', 'a').schemaVersion).toBe(PROFILE_SCHEMA_VERSION);
  });
});

describe('totalStars', () => {
  it('sums stars across levels', () => {
    const profile = createProfile('A', 'a');
    profile.levelResults['polana-1'] = { stars: 2, score: 1, accuracy: 1, wpm: 1 };
    profile.levelResults['polana-2'] = { stars: 3, score: 1, accuracy: 1, wpm: 1 };
    expect(totalStars(profile)).toBe(5);
  });
});
