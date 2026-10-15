import { describe, expect, it } from 'vitest';
import { AVATARS, createProfile, normalizeProfile, totalStars } from './Profile';

describe('normalizeProfile', () => {
  it('fills missing fields from an older stored shape', () => {
    const profile = normalizeProfile({ id: 'x', name: 'Zosia', avatar: '🦊' });
    expect(profile.avatar).toBe(AVATARS[0]);
    expect(profile.levelResults).toEqual({});
    expect(profile.seenStories).toEqual([]);
    expect(profile.totalScore).toBe(0);
  });

  it('keeps a valid character id', () => {
    expect(normalizeProfile({ ...createProfile('A', 'k') }).avatar).toBe('k');
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
