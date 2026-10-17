import { describe, expect, it } from 'vitest';
import { GOLD, SILVER } from '../arena/medals';
import { emptyArenaRecord } from '../arena/record';
import { createProfile, STARTER_SKINS, type LevelResult, type Profile } from '../profiles/Profile';
import { REGIONS } from './catalog';
import { emptyCounters, type Counters } from './counters';
import { courseFor } from './course';
import { RECENT_WINDOW, type KeyStat } from './keyStats';
import { MASTERED_DAYS, regionKeys } from './mastery';
import { awardTrophies, earnedTrophies, freshTrophies, trophyProgress } from './trophies';
import { TROPHIES, type TrophyRule } from './shop';
import { xpForLevel } from '../testing/xp';

const ONE_STAR: LevelResult = { stars: 1, score: 100, accuracy: 0.9, wpm: 10 };
const THREE_STARS: LevelResult = { stars: 3, score: 300, accuracy: 0.98, wpm: 15 };
const STREAK = 5;
const NO_STARS: LevelResult = { ...ONE_STAR, stars: 0 };
const FAST_MS = 300;

function profileWith(changes: Partial<Profile> = {}): Profile {
  return { ...createProfile('Ola', 'a'), ...changes };
}

function countedProfile(counters: Partial<Counters>): Profile {
  return profileWith({ counters: { ...emptyCounters(), ...counters } });
}

function rule(id: string): TrophyRule {
  const found = TROPHIES.find((trophy) => trophy.id === id);
  if (!found) throw new Error(`Missing trophy ${id}`);
  return found.rule;
}

function threeStarsOnFirst(levels: number): Record<string, LevelResult> {
  return Object.fromEntries(
    courseFor('pl')
      .levels.slice(0, levels)
      .map((level) => [level.id, THREE_STARS]),
  );
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

  it('awards daily stamps and weeks in a row', () => {
    const daily = {
      date: '2026-10-16',
      keySet: 'las',
      tries: 1,
      stamps: ['2026-10-16'],
      chests: [],
      weekStreak: 1,
      bestWeekStreak: 4,
      totalStamps: 30,
    };
    const arena = { ...emptyArenaRecord(), daily };
    expect(earnedTrophies(profileWith({ arena }))).toEqual([
      'stamps-7',
      'stamps-30',
      'week-streak-4',
    ]);
    const fewer = { ...arena, daily: { ...daily, totalStamps: 8, bestWeekStreak: 3 } };
    expect(earnedTrophies(profileWith({ arena: fewer }))).toEqual(['stamps-7']);
    expect(trophyProgress(profileWith({ arena: fewer }), rule('week-streak-4'))).toEqual({
      current: 3,
      goal: 4,
    });
    expect(trophyProgress(profileWith(), rule('stamps-30'))).toEqual({ current: 0, goal: 30 });
  });

  it('awards a region with every key mastered', () => {
    const keys = regionKeys(REGIONS[0]);
    const keyStats = Object.fromEntries([...keys].map((key) => [key, masteredStat()]));
    expect(earnedTrophies(profileWith({ keyStats }))).toEqual(['mastered-region']);
  });
});

describe('new trophy rules', () => {
  it('awards counters once they reach their goal', () => {
    const profile = countedProfile({
      wordsTyped: 2000,
      bestWpm: 30,
      perfectLevels: 1,
      bossesBeaten: 10,
      powerWords: 50,
      specialEnemies: 99,
      coinsEarned: 1000,
    });
    expect(earnedTrophies(profile)).toEqual([
      'perfect-level',
      'wpm-20',
      'wpm-30',
      'words-500',
      'words-2000',
      'bosses-10',
      'power-words-50',
      'coins-1000',
    ]);
  });

  it('awards three stars on five levels in a row', () => {
    const almost = profileWith({ levelResults: threeStarsOnFirst(STREAK - 1) });
    expect(earnedTrophies(almost)).not.toContain('star-streak-5');
    const streak = profileWith({ levelResults: threeStarsOnFirst(STREAK) });
    expect(earnedTrophies(streak)).toContain('star-streak-5');
  });

  it('awards three stars on every level of the course', () => {
    const everything = threeStarsOnFirst(courseFor('pl').levels.length);
    expect(earnedTrophies(profileWith({ levelResults: everything }))).toContain(
      'every-region-three-stars',
    );
    const english = profileWith({ wordLanguage: 'en', levelResults: everything });
    expect(earnedTrophies(english)).toContain('every-region-three-stars');
  });

  it('awards playing every starter skin', () => {
    const five = countedProfile({ skinsPlayed: STARTER_SKINS.slice(1) });
    expect(earnedTrophies(five)).not.toContain('starter-skins');
    const all = countedProfile({ skinsPlayed: [...STARTER_SKINS] });
    expect(earnedTrophies(all)).toContain('starter-skins');
  });

  it('awards the first item and a collection of five', () => {
    const inventory = { ...profileWith().inventory, pets: ['bee'], hats: ['cap'] };
    expect(earnedTrophies(profileWith({ inventory }))).toEqual(['first-item']);
    const collection = { ...inventory, hats: ['cap', 'horns'], skins: ['g', 'h', 'a'] };
    expect(earnedTrophies(profileWith({ inventory: collection }))).toEqual([
      'first-item',
      'five-items',
    ]);
  });
});

describe('trophyProgress', () => {
  it('measures how far each rule is', () => {
    const profile = countedProfile({ wordsTyped: 312 });
    expect(trophyProgress(profile, rule('words-500'))).toEqual({ current: 312, goal: 500 });
    expect(trophyProgress(profile, rule('level-10'))).toEqual({ current: 1, goal: 10 });
    expect(trophyProgress(profile, rule('starter-skins'))).toEqual({ current: 0, goal: 6 });
    const streak = profileWith({ levelResults: threeStarsOnFirst(3) });
    expect(trophyProgress(streak, rule('star-streak-5'))).toEqual({ current: 3, goal: STREAK });
  });

  it('has no measure for one step milestones', () => {
    expect(trophyProgress(profileWith(), rule('first-boss'))).toBeUndefined();
    expect(trophyProgress(profileWith(), rule('arena-gold'))).toBeUndefined();
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
