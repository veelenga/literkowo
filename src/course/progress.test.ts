import { describe, expect, it } from 'vitest';
import { createProfile, type Profile } from '../profiles/Profile';
import { requireLevel as level } from '../testing/levels';
import { markStorySeen, recordResult, storyAfter, storyBefore, type Attempt } from './progress';

function attempt(overrides: Partial<Attempt> = {}): Attempt {
  return {
    stars: 2,
    score: 100,
    accuracy: 0.94,
    wpm: 12,
    lettersFreed: 20,
    xp: 30,
    coins: 12,
    ...overrides,
  };
}

function profileWith(overrides: Partial<Profile> = {}): Profile {
  return { ...createProfile('Ola', 'a'), ...overrides };
}

describe('recordResult', () => {
  it('stores the first result and adds up totals', () => {
    const updated = recordResult(profileWith(), level('polana-1'), attempt());
    expect(updated.levelResults['polana-1']).toEqual({
      stars: 2,
      score: 100,
      accuracy: 0.94,
      wpm: 12,
    });
    expect(updated.totalScore).toBe(100);
    expect(updated.lettersFreed).toBe(20);
  });

  it('adds XP and coins on every attempt, even a worse one', () => {
    const first = recordResult(profileWith(), level('polana-1'), attempt());
    const lost = recordResult(first, level('polana-1'), attempt({ stars: 0, xp: 8, coins: 3 }));
    expect(lost).toMatchObject({ xp: 38, coins: 15 });
  });

  it('keeps the better result', () => {
    const first = recordResult(profileWith(), level('polana-1'), attempt());
    const worse = recordResult(first, level('polana-1'), attempt({ stars: 1, score: 500 }));
    expect(worse.levelResults['polana-1'].stars).toBe(2);
    expect(worse.totalScore).toBe(600);

    const sameStarsHigherScore = recordResult(first, level('polana-1'), attempt({ score: 150 }));
    expect(sameStarsHigherScore.levelResults['polana-1'].score).toBe(150);

    const moreStars = recordResult(first, level('polana-1'), attempt({ stars: 3, score: 10 }));
    expect(moreStars.levelResults['polana-1'].stars).toBe(3);
  });

  it('does not change the original profile', () => {
    const profile = profileWith();
    recordResult(profile, level('polana-1'), attempt());
    expect(profile.levelResults).toEqual({});
    expect(profile.totalScore).toBe(0);
    expect(profile.xp).toBe(0);
  });
});

describe('markStorySeen', () => {
  it('adds a story only once', () => {
    const seen = markStorySeen(markStorySeen(profileWith(), 'intro'), 'intro');
    expect(seen.seenStories).toEqual(['intro']);
  });
});

describe('storyBefore', () => {
  it('opens the course with the intro', () => {
    expect(storyBefore(profileWith(), level('polana-1'))?.id).toBe('intro');
  });

  it('introduces a boss once', () => {
    expect(storyBefore(profileWith(), level('las-4'))?.id).toBe('boss-las');
    expect(storyBefore(profileWith({ seenStories: ['boss-las'] }), level('las-4'))).toBeUndefined();
  });

  it('stays quiet before regular levels', () => {
    expect(storyBefore(profileWith(), level('las-2'))).toBeUndefined();
  });
});

describe('storyAfter', () => {
  it('needs a won boss level', () => {
    expect(storyAfter(profileWith(), level('las-2'), 3)).toBeUndefined();
    expect(storyAfter(profileWith(), level('las-4'), 0)).toBeUndefined();
    expect(storyAfter(profileWith(), level('las-4'), 1)?.id).toBe('after-las');
  });

  it('ends each course with the finale', () => {
    expect(storyAfter(profileWith(), level('wyspa-4'), 1)?.id).toBe('finale');
    expect(storyAfter(profileWith({ wordLanguage: 'en' }), level('jaskinia-5'), 1)?.id).toBe(
      'finale',
    );
    expect(storyAfter(profileWith(), level('jaskinia-5'), 1)?.id).toBe('after-jaskinia');
  });
});
