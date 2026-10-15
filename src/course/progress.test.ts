import { describe, expect, it } from 'vitest';
import { createProfile, type Profile } from '../profiles/Profile';
import { requireLevel as level } from '../testing/levels';
import { REGIONS } from './catalog';
import { EMPTY_TALLY } from './counters';
import { EMPTY_KEY_STAT, recordHit, recordMiss } from './keyStats';
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
    keyStats: {},
    tally: EMPTY_TALLY,
    ...overrides,
  };
}

function profileWith(overrides: Partial<Profile> = {}): Profile {
  return { ...createProfile('Ola', 'a'), ...overrides };
}

const TALLY = { words: 14, powerWords: 1, specialEnemies: 2, bossesBeaten: 0 };

describe('recordResult', () => {
  it('counts the words, coins and skin of every attempt', () => {
    const first = recordResult(profileWith(), level('polana-2'), attempt({ tally: TALLY }));
    const second = recordResult(first, level('polana-2'), attempt({ tally: TALLY, coins: 8 }));
    expect(second.counters).toMatchObject({
      wordsTyped: 28,
      powerWords: 2,
      specialEnemies: 4,
      coinsEarned: 20,
      skinsPlayed: ['a'],
    });
  });

  it('keeps the best speed and perfect levels only from attempts with stars', () => {
    const lost = recordResult(
      profileWith(),
      level('polana-2'),
      attempt({ stars: 0, accuracy: 1, wpm: 40 }),
    );
    expect(lost.counters).toMatchObject({ bestWpm: 0, perfectLevels: 0 });
    const perfect = recordResult(lost, level('polana-2'), attempt({ stars: 3, accuracy: 1 }));
    expect(perfect.counters).toMatchObject({ bestWpm: 12, perfectLevels: 1 });
    expect(perfect.inventory.trophies).toContain('perfect-level');
  });

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

  it('merges the key statistics of the attempt', () => {
    const f = recordHit(EMPTY_KEY_STAT);
    const j = recordMiss(EMPTY_KEY_STAT);
    const profile = profileWith({ keyStats: { f, j } });
    const updated = recordResult(profile, level('polana-1'), attempt({ keyStats: { j: f } }));
    expect(updated.keyStats).toEqual({ f, j: f });
  });

  it('awards trophies earned by the attempt', () => {
    const results = { stars: 1, score: 10, accuracy: 0.9, wpm: 10 };
    const [boss, ...rest] = REGIONS[0].levels.toReversed();
    const profile = profileWith({
      levelResults: Object.fromEntries(rest.map((meadow) => [meadow.id, results])),
    });
    const beaten = recordResult(profile, boss, attempt());
    expect(beaten.inventory.trophies).toEqual(['first-boss', 'region-polana']);
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
    expect(storyBefore(profileWith(), level('las-16'))?.id).toBe('boss-las');
    expect(
      storyBefore(profileWith({ seenStories: ['boss-las'] }), level('las-16')),
    ).toBeUndefined();
  });

  it('stays quiet before regular levels', () => {
    expect(storyBefore(profileWith(), level('las-2'))).toBeUndefined();
  });
});

describe('storyAfter', () => {
  it('needs a won boss level', () => {
    expect(storyAfter(profileWith(), level('las-2'), 3)).toBeUndefined();
    expect(storyAfter(profileWith(), level('las-16'), 0)).toBeUndefined();
    expect(storyAfter(profileWith(), level('las-16'), 1)?.id).toBe('after-las');
  });

  it('ends each course with the finale', () => {
    expect(storyAfter(profileWith(), level('wyspa-24'), 1)?.id).toBe('finale');
    expect(storyAfter(profileWith({ wordLanguage: 'en' }), level('jaskinia-24'), 1)?.id).toBe(
      'finale',
    );
    expect(storyAfter(profileWith(), level('jaskinia-24'), 1)?.id).toBe('after-jaskinia');
  });
});
