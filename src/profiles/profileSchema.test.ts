import { describe, expect, it } from 'vitest';
import { emptyArenaRecord } from '../arena/record';
import { AVATARS, createProfile, PROFILE_SCHEMA_VERSION, STARTER_SKINS } from './Profile';
import { normalizeProfile, parseProfiles } from './profileSchema';

describe('normalizeProfile', () => {
  it('fills missing fields from an older stored shape', () => {
    const profile = normalizeProfile({ id: 'x', name: 'Zosia', avatar: '🦊' });
    expect(profile).toMatchObject({
      schemaVersion: PROFILE_SCHEMA_VERSION,
      avatar: AVATARS[0],
      wordLanguage: 'pl',
      levelResults: {},
      seenStories: [],
      totalScore: 0,
      lettersFreed: 0,
      xp: 0,
      coins: 0,
      keyStats: {},
      inventory: { pets: [], hats: [], skins: [...STARTER_SKINS], trophies: [] },
      equipped: {},
      arena: emptyArenaRecord(),
    });
  });

  it('keeps a valid profile as it is', () => {
    const profile = createProfile('A', 'k');
    profile.wordLanguage = 'en';
    expect(normalizeProfile(JSON.parse(JSON.stringify(profile)))).toEqual(profile);
  });

  it('drops fields that are no longer part of a profile', () => {
    const profile = normalizeProfile({ id: 'x', name: 'A', lessonResults: {}, bestScore: 3 });
    expect(profile).not.toHaveProperty('lessonResults');
    expect(profile).not.toHaveProperty('bestScore');
  });

  it('migrates the legacy best score into the total score', () => {
    expect(normalizeProfile({ id: 'x', name: 'A', bestScore: 120 })?.totalScore).toBe(120);
  });

  it('seeds XP from the total score of a version 2 profile', () => {
    const profile = normalizeProfile({ schemaVersion: 2, id: 'x', name: 'A', totalScore: 1234 });
    expect(profile).toMatchObject({ xp: 123, coins: 0 });
  });

  it('seeds XP through every migration from the legacy shape', () => {
    expect(normalizeProfile({ id: 'x', name: 'A', bestScore: 125 })?.xp).toBe(13);
  });

  it('keeps XP and coins of a current profile', () => {
    const profile = normalizeProfile({
      schemaVersion: 3,
      id: 'x',
      name: 'A',
      totalScore: 5000,
      xp: 42,
      coins: 7,
    });
    expect(profile).toMatchObject({ xp: 42, coins: 7 });
  });

  it('starts a version 3 profile with empty key statistics', () => {
    const profile = normalizeProfile({
      schemaVersion: 3,
      id: 'x',
      name: 'A',
      keyStats: { f: { hits: 3, misses: 1 } },
    });
    expect(profile?.keyStats).toEqual({});
  });

  it('keeps well formed key statistics of a current profile', () => {
    const stat = {
      hits: 40,
      misses: 2,
      recentMisses: 0b101,
      recentCount: 30,
      speedMs: 512.5,
      speedSamples: 50,
      days: ['2026-01-02', '2026-01-01'],
    };
    const profile = normalizeProfile({
      schemaVersion: PROFILE_SCHEMA_VERSION,
      id: 'x',
      name: 'A',
      keyStats: { ą: stat, ab: stat, j: { hits: 'many' }, k: null },
    });
    expect(profile?.keyStats).toEqual({ ą: { ...stat, days: ['2026-01-01', '2026-01-02'] } });
  });

  it('repairs key statistics that are out of range', () => {
    const profile = normalizeProfile({
      schemaVersion: PROFILE_SCHEMA_VERSION,
      id: 'x',
      name: 'A',
      keyStats: {
        f: {
          hits: 1,
          misses: 0,
          recentMisses: 0b1110,
          recentCount: 2,
          speedMs: 300,
          days: ['2026-01-01', 'yesterday', '2026-01-01'],
        },
      },
    });
    expect(profile?.keyStats.f).toEqual({
      hits: 1,
      misses: 0,
      recentMisses: 0b10,
      recentCount: 2,
      speedMs: 0,
      speedSamples: 0,
      days: ['2026-01-01'],
    });
  });

  it('grants the starter skins and the current avatar to a version 4 profile', () => {
    const profile = normalizeProfile({ schemaVersion: 4, id: 'x', name: 'A', avatar: 'k' });
    expect(profile?.inventory).toEqual({
      pets: [],
      hats: [],
      skins: [...STARTER_SKINS, 'k'],
      trophies: ['first-item'],
    });
    expect(profile?.equipped).toEqual({});
  });

  it('awards the trophies a version 4 profile already earned', () => {
    const profile = normalizeProfile({
      schemaVersion: 4,
      id: 'x',
      name: 'A',
      levelResults: { 'polana-5': { stars: 1, score: 10, accuracy: 0.9, wpm: 10 } },
    });
    expect(profile?.inventory.trophies).toEqual(['first-boss']);
  });

  it('keeps known items and drops unknown ones', () => {
    const profile = normalizeProfile({
      schemaVersion: PROFILE_SCHEMA_VERSION,
      id: 'x',
      name: 'A',
      avatar: 'q',
      inventory: {
        pets: ['bee', 'unicorn', 'bee', 3],
        hats: ['crown'],
        skins: ['m', 'zz'],
        trophies: ['level-10', 'moon'],
      },
    });
    expect(profile?.inventory).toEqual({
      pets: ['bee'],
      hats: ['crown'],
      skins: ['m', ...STARTER_SKINS, 'q'],
      trophies: ['level-10'],
    });
  });

  it('equips only items the profile owns', () => {
    const profile = normalizeProfile({
      schemaVersion: PROFILE_SCHEMA_VERSION,
      id: 'x',
      name: 'A',
      inventory: { pets: ['bee'], hats: [] },
      equipped: { pet: 'bee', hat: 'crown' },
    });
    expect(profile?.equipped).toEqual({ pet: 'bee' });
  });

  it('falls back to Polish for an unknown word language', () => {
    expect(normalizeProfile({ id: 'x', name: 'A', wordLanguage: 'de' })?.wordLanguage).toBe('pl');
  });

  it('keeps only well formed level results and story ids', () => {
    const profile = normalizeProfile({
      schemaVersion: PROFILE_SCHEMA_VERSION,
      id: 'x',
      name: 'A',
      seenStories: ['intro', 7, null],
      levelResults: {
        'polana-1': { stars: 2, score: 10, accuracy: 0.9, wpm: 12 },
        'polana-2': { stars: 'three' },
        'polana-3': null,
      },
    });
    expect(profile?.seenStories).toEqual(['intro']);
    expect(Object.keys(profile?.levelResults ?? {})).toEqual(['polana-1']);
  });

  it('moves version 5 level results onto the gradual course and keeps the rest', () => {
    const inventory = { pets: ['bee'], hats: [], skins: [...STARTER_SKINS], trophies: [] };
    const profile = normalizeProfile({
      schemaVersion: 5,
      id: 'x',
      name: 'A',
      xp: 120,
      coins: 9,
      keyStats: { f: { hits: 3, misses: 1 } },
      inventory,
      equipped: { pet: 'bee' },
      levelResults: { 'polana-1': { stars: 3, score: 10, accuracy: 0.98, wpm: 12 } },
    });
    expect(Object.keys(profile?.levelResults ?? {})).toEqual(['polana-1', 'polana-2']);
    expect(profile?.levelResults['polana-2']?.stars).toBe(3);
    expect(profile).toMatchObject({
      xp: 120,
      coins: 9,
      keyStats: { f: { hits: 3, misses: 1 } },
      inventory: { ...inventory, trophies: ['first-item'] },
      equipped: { pet: 'bee' },
    });
  });

  it('gives a version 6 profile an empty arena record', () => {
    const profile = normalizeProfile({ schemaVersion: 6, id: 'x', name: 'A', coins: 12 });
    expect(profile).toMatchObject({
      schemaVersion: PROFILE_SCHEMA_VERSION,
      coins: 12,
      arena: emptyArenaRecord(),
    });
  });

  it('seeds the counters of a version 7 profile from what it already has', () => {
    const profile = normalizeProfile({
      schemaVersion: 7,
      id: 'x',
      name: 'A',
      avatar: 'c',
      coins: 40,
      inventory: { pets: ['cube-cat'], hats: ['cap', 'wizard'], skins: ['g'] },
      levelResults: {
        'polana-1': { stars: 3, score: 10, accuracy: 1, wpm: 14 },
        'polana-2': { stars: 0, score: 10, accuracy: 1, wpm: 40 },
        'polana-19': { stars: 2, score: 90, accuracy: 0.95, wpm: 18 },
      },
    });
    expect(profile?.counters).toEqual({
      wordsTyped: 0,
      powerWords: 0,
      specialEnemies: 0,
      bossesBeaten: 1,
      coinsEarned: 40 + 160 + 75 + 200,
      perfectLevels: 1,
      bestWpm: 18,
      skinsPlayed: ['c'],
    });
    expect(profile?.inventory.trophies).toEqual(
      expect.arrayContaining(['first-boss', 'perfect-level', 'first-item']),
    );
  });

  it('keeps the counters of a current profile and drops broken values', () => {
    const profile = normalizeProfile({
      schemaVersion: PROFILE_SCHEMA_VERSION,
      id: 'x',
      name: 'A',
      counters: { wordsTyped: 812, bossesBeaten: -3, bestWpm: 'fast', skinsPlayed: ['a', 'a', 4] },
    });
    expect(profile?.counters).toMatchObject({
      wordsTyped: 812,
      bossesBeaten: 0,
      bestWpm: 0,
      skinsPlayed: ['a'],
    });
    expect(profile?.inventory.trophies).toEqual([]);
  });

  it('keeps the arena record of a current profile', () => {
    const best = { wave: 6, score: 1800, accuracy: 0.95, medal: 2, date: '2026-10-15', runs: 4 };
    const profile = normalizeProfile({
      schemaVersion: 7,
      id: 'x',
      name: 'A',
      arena: { endless: { 'polana/normal': best }, medalsPaid: { 'polana/normal': 2 } },
    });
    expect(profile?.arena.endless).toEqual({ 'polana/normal': best });
    expect(profile?.arena.medalsPaid).toEqual({ 'polana/normal': 2 });
  });

  it('rejects entries without an id or a name', () => {
    expect(normalizeProfile({ name: 'A' })).toBeUndefined();
    expect(normalizeProfile({ id: 'x' })).toBeUndefined();
    expect(normalizeProfile('profile')).toBeUndefined();
    expect(normalizeProfile(null)).toBeUndefined();
  });
});

describe('parseProfiles', () => {
  it('reports corrupt JSON as not intact', () => {
    expect(parseProfiles('{not json')).toEqual({ profiles: [], intact: false });
  });

  it('reports a non array value as not intact', () => {
    expect(parseProfiles('{"id":"x"}')).toEqual({ profiles: [], intact: false });
  });

  it('keeps good entries and drops bad ones from partial data', () => {
    const good = createProfile('A', 'a');
    const { profiles, intact } = parseProfiles(JSON.stringify([good, 42, { name: 'B' }]));
    expect(profiles).toEqual([good]);
    expect(intact).toBe(false);
  });

  it('reports clean data as intact', () => {
    const good = createProfile('A', 'a');
    expect(parseProfiles(JSON.stringify([good]))).toEqual({ profiles: [good], intact: true });
  });
});
