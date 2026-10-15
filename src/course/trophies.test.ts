import { describe, expect, it } from 'vitest';
import { GOLD, SILVER } from '../arena/medals';
import { emptyArenaRecord } from '../arena/record';
import { createProfile, type LevelResult, type Profile } from '../profiles/Profile';
import { REGIONS } from './catalog';
import { RECENT_WINDOW, type KeyStat } from './keyStats';
import { MASTERED_DAYS, regionKeys } from './mastery';
import { awardTrophies, earnedTrophies, freshTrophies } from './trophies';
import { xpForLevel } from './xp';

const ONE_STAR: LevelResult = { stars: 1, score: 100, accuracy: 0.9, wpm: 10 };
const NO_STARS: LevelResult = { ...ONE_STAR, stars: 0 };
const FAST_MS = 300;

function profileWith(changes: Partial<Profile> = {}): Profile {
  return { ...createProfile('Ola', 'a'), ...changes };
}

function starsOn(regionId: string, result = ONE_STAR): Record<string, LevelResult> {
  const region = REGIONS.find((candidate) => candidate.id === regionId);
  return Object.fromEntries((region?.levels ?? []).map((level) => [level.id, result]));
}

function masteredStat(): KeyStat {
  return {
    hits: RECENT_WINDOW,
    misses: 0,
    recentMisses: 0,
    recentCount: RECENT_WINDOW,
    speedMs: FAST_MS,
    speedSamples: RECENT_WINDOW,
    days: Array.from({ length: MASTERED_DAYS }, (_, day) => `2026-01-0${day + 1}`),
  };
}

describe('earnedTrophies', () => {
  it('gives nothing to a new profile', () => {
    expect(earnedTrophies(profileWith())).toEqual([]);
  });

  it('awards the first boss and the cleared region', () => {
    const profile = profileWith({ levelResults: starsOn('polana') });
    expect(earnedTrophies(profile)).toEqual(['first-boss', 'region-polana']);
  });

  it('needs a star on every level of a region', () => {
    const levelResults = { ...starsOn('polana'), 'polana-2': NO_STARS };
    expect(earnedTrophies(profileWith({ levelResults }))).toEqual(['first-boss']);
  });

  it('awards player level milestones', () => {
    expect(earnedTrophies(profileWith({ xp: xpForLevel(25) }))).toEqual(['level-10', 'level-25']);
  });

  it('awards arena waves and the first arena gold', () => {
    const best = { wave: 12, score: 1, accuracy: 0.96, medal: SILVER, date: '2026-10-15', runs: 1 };
    const arena = { ...emptyArenaRecord(), endless: { 'las/normal': best } };
    expect(earnedTrophies(profileWith({ arena }))).toEqual(['arena-wave-10']);
    const gold = { ...arena, endless: { 'las/normal': { ...best, wave: 20, medal: GOLD } } };
    expect(earnedTrophies(profileWith({ arena: gold }))).toEqual([
      'arena-wave-10',
      'arena-wave-20',
      'arena-gold',
    ]);
  });

  it('awards a region with every key mastered', () => {
    const keys = regionKeys(REGIONS[0]);
    const keyStats = Object.fromEntries([...keys].map((key) => [key, masteredStat()]));
    expect(earnedTrophies(profileWith({ keyStats }))).toEqual(['mastered-region']);
  });
});

describe('awardTrophies', () => {
  it('adds only new trophies and keeps the earlier ones', () => {
    const profile = profileWith({ xp: xpForLevel(10), levelResults: starsOn('polana') });
    const awarded = awardTrophies(profile);
    expect(awarded.inventory.trophies).toEqual(['first-boss', 'region-polana', 'level-10']);
    expect(awardTrophies(awarded)).toBe(awarded);
  });
});

describe('freshTrophies', () => {
  it('lists only the trophies the second profile adds, in catalogue order', () => {
    const before = profileWith({
      inventory: { ...profileWith().inventory, trophies: ['level-10'] },
    });
    const after = awardTrophies({ ...before, xp: xpForLevel(10), levelResults: starsOn('polana') });
    expect(freshTrophies(before, after).map((trophy) => trophy.id)).toEqual([
      'first-boss',
      'region-polana',
    ]);
    expect(freshTrophies(after, after)).toEqual([]);
  });
});
