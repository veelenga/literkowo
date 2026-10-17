import { describe, expect, it } from 'vitest';
import { REGIONS } from '../course/catalog';
import { EMPTY_TALLY } from '../course/counters';
import { courseFor } from '../course/course';
import { EMPTY_KEY_STAT } from '../course/keyStats';
import { createProfile, WORD_LANGUAGES, type Profile } from '../profiles/Profile';
import { openKeySets } from './keySets';
import { placementOutcome, placementStages, type PlacementOutcome } from './placement';
import {
  FINGERS_CARD_ID,
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
    score: 300,
    lettersFreed: 40,
    xp: 25,
    runCoins: 8,
    coinBoost: 1.5,
    tally: { ...EMPTY_TALLY, words: 10 },
    ...overrides,
  };
}

function placed(profile: Profile, passed: number, overrides?: Partial<PlacementAttempt>): Profile {
  return recordPlacement(profile, attempt(passed, overrides)).profile;
}

function placedIn(profile: Profile, regionId: string): Profile {
  return { ...profile, arena: { ...profile.arena, placement: { regionId, date: DAY } } };
}

describe('recordPlacement', () => {
  it('stores the last passed region and opens its key sets', () => {
    const profile = placed(createProfile('A', 'b'), 2);
    expect(profile.arena.placement).toEqual({ regionId: 'las', date: DAY });
    expect(openKeySets(profile).map((keySet) => keySet.id)).toEqual(['polana', 'las']);
  });

  it('pays XP, score, letters, boosted coins and counters like an arena run, but no stars', () => {
    const before = createProfile('A', 'b');
    const record = recordPlacement(before, attempt(1));
    expect(record.coins).toBe(10);
    expect(record.profile.keyStats.f.hits).toBe(12);
    expect(record.profile).toMatchObject({ xp: 25, coins: 10, totalScore: 300, lettersFreed: 40 });
    expect(record.profile.counters.wordsTyped).toBe(10);
    expect(record.profile.levelResults).toEqual({});
  });

  it('leaves a beginner without a placement and with the course untouched', () => {
    const profile = placed(createProfile('A', 'b'), 0);
    expect(profile.arena.placement).toBeUndefined();
    expect(openKeySets(profile).map((keySet) => keySet.id)).toEqual(['polana']);
  });

  it('only moves a child forward on a retake', () => {
    const first = placed(createProfile('A', 'b'), 3);
    const lower = placed(first, 1, { date: LATER });
    expect(lower.arena.placement).toEqual({ regionId: 'gory', date: DAY });
    const higher = placed(first, 5, { date: LATER });
    expect(higher.arena.placement).toEqual({ regionId: 'wyspa', date: LATER });
    expect(openKeySets(higher)).toHaveLength(5);
  });
});

describe('startRegion', () => {
  it('starts the child in the region after the placement, or the last one', () => {
    expect(startRegion(createProfile('A', 'b'))).toBeUndefined();
    expect(startRegion(placed(createProfile('A', 'b'), 1))?.id).toBe('las');
    expect(startRegion(placed(createProfile('A', 'b'), 5))?.id).toBe('wyspa');
    const english = { ...placed(createProfile('A', 'b'), 5), wordLanguage: 'en' as const };
    expect(startRegion(english)?.id).toBe('jaskinia');
  });

  it('starts in the region of the level the course opens after the placement', () => {
    for (const language of WORD_LANGUAGES) {
      for (const region of REGIONS) {
        const profile = placedIn(createProfile('A', 'b', language), region.id);
        expect(startRegion(profile)?.id).toBe(courseFor(language).current(profile)?.regionId);
      }
    }
  });
});

describe('fingers card', () => {
  it('shows every skipped key once', () => {
    const profile = placed(createProfile('A', 'b'), 1);
    expect(skippedKeys(profile)).toBe('fjdksla;');
    expect(showsFingersCard(profile)).toBe(true);
    expect(showsFingersCard({ ...profile, seenStories: [FINGERS_CARD_ID] })).toBe(false);
  });

  it('leaves out keys the child already learned with a star', () => {
    const profile = placed({ ...createProfile('A', 'b'), levelResults: { 'polana-4': WON } }, 2);
    expect(skippedKeys(profile)).toBe('fjksla;gheiru');
  });

  it('stays away without a placement', () => {
    expect(showsFingersCard(createProfile('A', 'b'))).toBe(false);
  });
});
