import { describe, expect, it } from 'vitest';
import { AVATARS, createProfile, PROFILE_SCHEMA_VERSION } from './Profile';
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

  it('falls back to Polish for an unknown word language', () => {
    expect(normalizeProfile({ id: 'x', name: 'A', wordLanguage: 'de' })?.wordLanguage).toBe('pl');
  });

  it('keeps only well formed level results and story ids', () => {
    const profile = normalizeProfile({
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
