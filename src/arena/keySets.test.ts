import { describe, expect, it } from 'vitest';
import { LEVELS } from '../course/catalog';
import { createProfile, type LevelResult, type Profile } from '../profiles/Profile';
import { defaultKeySet, keySetById, keySetsFor, openKeySets } from './keySets';

const STAR: LevelResult = { stars: 1, score: 10, accuracy: 0.9, wpm: 10 };

function profileUpTo(levelId: string, language: Profile['wordLanguage'] = 'pl'): Profile {
  const profile = createProfile('A', 'a');
  profile.wordLanguage = language;
  const last = LEVELS.findIndex((level) => level.id === levelId);
  for (const level of LEVELS.slice(0, last + 1)) profile.levelResults[level.id] = STAR;
  return profile;
}

function ids(profile: Profile): string[] {
  return openKeySets(profile).map((keySet) => keySet.id);
}

describe('keySetsFor', () => {
  it('has one key set per region with the keys of its boss level', () => {
    const [polana, las] = keySetsFor('pl');
    expect(polana).toMatchObject({ id: 'polana', keys: 'fjdksla;' });
    expect(polana.bossLevel.id).toBe('polana-19');
    expect(las.keys).toBe('fjdksla;gheiru');
  });

  it('never offers Wyspa Ogonków to English words', () => {
    expect(keySetsFor('pl').map((keySet) => keySet.id)).toContain('wyspa');
    expect(keySetsFor('en').map((keySet) => keySet.id)).not.toContain('wyspa');
    expect(keySetById('wyspa', 'en')).toBeUndefined();
  });
});

describe('openKeySets', () => {
  it('always opens the first region, and the others once every key of them was taught', () => {
    expect(ids(createProfile('A', 'a'))).toEqual(['polana']);
    expect(ids(profileUpTo('polana-17'))).toEqual(['polana']);
    expect(ids(profileUpTo('polana-18'))).toEqual(['polana']);
    expect(ids(profileUpTo('polana-19'))).toEqual(['polana']);
    expect(ids(profileUpTo('las-15'))).toEqual(['polana', 'las']);
  });

  it('opens every region after the last boss', () => {
    expect(ids(profileUpTo('wyspa-24'))).toEqual(['polana', 'las', 'gory', 'jaskinia', 'wyspa']);
    expect(ids(profileUpTo('jaskinia-24', 'en'))).toEqual(['polana', 'las', 'gory', 'jaskinia']);
  });

  it('opens the regions up to the placement', () => {
    const profile = createProfile('A', 'a');
    profile.arena.placement = { regionId: 'gory', date: '2026-10-15' };
    expect(ids(profile)).toEqual(['polana', 'las', 'gory']);
  });
});

describe('defaultKeySet', () => {
  it('picks the highest open key set', () => {
    expect(defaultKeySet(profileUpTo('las-15')).id).toBe('las');
    expect(defaultKeySet(createProfile('A', 'a')).id).toBe('polana');
  });
});
