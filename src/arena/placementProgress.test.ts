import { describe, expect, it } from 'vitest';
import { EMPTY_KEY_STAT } from '../course/keyStats';
import { createProfile, type Profile } from '../profiles/Profile';
import { isArenaOpen, openKeySets } from './keySets';
import { placementOutcome, placementStages, type PlacementOutcome } from './placement';
import {
  FINGERS_CARD_ID,
  offersPlacement,
  recordPlacement,
  showsFingersCard,
  skippedKeys,
  startRegion,
  type PlacementAttempt,
} from './placementProgress';

const DAY = '2026-10-16';
const LATER = '2026-10-20';
const STAGES = placementStages('pl');
const PASS = { hits: 30, mistakes: 0, reached: 0, typingSeconds: 6 };
const FAIL = { hits: 30, mistakes: 10, reached: 0, typingSeconds: 6 };
const WON = { stars: 2, score: 100, accuracy: 0.95, wpm: 12 };

function outcomeAfter(passed: number): PlacementOutcome {
  const records = Array.from({ length: passed }, () => PASS);
  return placementOutcome(STAGES, passed < STAGES.length ? [...records, FAIL] : records);
}

function attempt(passed: number, overrides: Partial<PlacementAttempt> = {}): PlacementAttempt {
  return {
    outcome: outcomeAfter(passed),
    keyStats: { f: { ...EMPTY_KEY_STAT, hits: 12 } },
    date: DAY,
    ...overrides,
  };
}

describe('recordPlacement', () => {
  it('stores the last passed region and opens the arena', () => {
    const profile = recordPlacement(createProfile('A', 'b'), attempt(2));
    expect(profile.arena.placement).toEqual({ regionId: 'las', date: DAY });
    expect(isArenaOpen(profile)).toBe(true);
    expect(openKeySets(profile).map((keySet) => keySet.id)).toEqual(['polana', 'las']);
  });

  it('adds the keystrokes like a level, but no XP, score, counters, coins or stars', () => {
    const before = createProfile('A', 'b');
    const profile = recordPlacement(before, attempt(1));
    expect(profile.keyStats.f.hits).toBe(12);
    expect(profile).toMatchObject({ xp: 0, coins: 0, totalScore: 0, lettersFreed: 0 });
    expect(profile.counters).toEqual(before.counters);
    expect(profile.levelResults).toEqual({});
  });

  it('leaves a beginner without a placement and with the course untouched', () => {
    const profile = recordPlacement(createProfile('A', 'b'), attempt(0));
    expect(profile.arena.placement).toBeUndefined();
    expect(isArenaOpen(profile)).toBe(false);
  });

  it('only moves a child forward on a retake', () => {
    const placed = recordPlacement(createProfile('A', 'b'), attempt(3));
    const lower = recordPlacement(placed, attempt(1, { date: LATER }));
    expect(lower.arena.placement).toEqual({ regionId: 'gory', date: DAY });
    const higher = recordPlacement(placed, attempt(5, { date: LATER }));
    expect(higher.arena.placement).toEqual({ regionId: 'wyspa', date: LATER });
    expect(openKeySets(higher)).toHaveLength(5);
  });
});

describe('startRegion', () => {
  it('starts the child in the region after the placement, or the last one', () => {
    expect(startRegion(createProfile('A', 'b'))).toBeUndefined();
    expect(startRegion(recordPlacement(createProfile('A', 'b'), attempt(1)))?.id).toBe('las');
    expect(startRegion(recordPlacement(createProfile('A', 'b'), attempt(5)))?.id).toBe('wyspa');
    const english = {
      ...recordPlacement(createProfile('A', 'b'), attempt(5)),
      wordLanguage: 'en' as const,
    };
    expect(startRegion(english)?.id).toBe('jaskinia');
  });
});

describe('offersPlacement', () => {
  it('offers the test until a star past the first region', () => {
    const fresh = createProfile('A', 'b');
    expect(offersPlacement(fresh)).toBe(true);
    expect(offersPlacement({ ...fresh, levelResults: { 'polana-19': WON } })).toBe(true);
    expect(offersPlacement({ ...fresh, levelResults: { 'las-1': WON } })).toBe(false);
  });

  it('offers the test until a placement in the last region', () => {
    const fresh = createProfile('A', 'b');
    const placed = (regionId: string): Profile => ({
      ...fresh,
      arena: { ...fresh.arena, placement: { regionId, date: DAY } },
    });
    expect(offersPlacement(placed('jaskinia'))).toBe(true);
    expect(offersPlacement(placed('wyspa'))).toBe(false);
    expect(offersPlacement({ ...placed('jaskinia'), wordLanguage: 'en' })).toBe(false);
  });
});

describe('fingers card', () => {
  it('shows every skipped key once', () => {
    const profile = recordPlacement(createProfile('A', 'b'), attempt(1));
    expect(skippedKeys(profile)).toBe('fjdksla;');
    expect(showsFingersCard(profile)).toBe(true);
    expect(showsFingersCard({ ...profile, seenStories: [FINGERS_CARD_ID] })).toBe(false);
  });

  it('leaves out keys the child already learned with a star', () => {
    const profile = recordPlacement(
      { ...createProfile('A', 'b'), levelResults: { 'polana-4': WON } },
      attempt(2),
    );
    expect(skippedKeys(profile)).toBe('fjksla;gheiru');
  });

  it('stays away without a placement', () => {
    expect(showsFingersCard(createProfile('A', 'b'))).toBe(false);
  });
});
