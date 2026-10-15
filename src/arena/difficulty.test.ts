import { describe, expect, it } from 'vitest';
import { createProfile, type Profile } from '../profiles/Profile';
import {
  DIFFICULTIES,
  difficultyAtLevel,
  difficultyById,
  isDifficultyOpen,
  openDifficulties,
  unlockingDifficulty,
  type DifficultyId,
} from './difficulty';
import { BRONZE, SILVER, type Medal } from './medals';
import { arenaKey, withEndlessRun } from './record';

function withMedal(profile: Profile, keySet: string, id: DifficultyId, medal: Medal): Profile {
  const run = {
    key: arenaKey(keySet, id),
    wavesCleared: 6,
    score: 100,
    accuracy: 0.95,
    medal,
    date: '2026-10-15',
  };
  return { ...profile, arena: withEndlessRun(profile.arena, run) };
}

function openIds(profile: Profile): DifficultyId[] {
  return openDifficulties(profile).map((difficulty) => difficulty.id);
}

describe('DIFFICULTIES', () => {
  it('lists the four presets in order', () => {
    expect(DIFFICULTIES.map((difficulty) => [difficulty.id, difficulty.level])).toEqual([
      ['calm', 1],
      ['normal', 2],
      ['fast', 3],
      ['frenzy', 4],
    ]);
  });

  it('sets lives, bosses and coins per preset', () => {
    expect(DIFFICULTIES.map((difficulty) => difficulty.lives)).toEqual([3, 3, 3, 1]);
    expect(DIFFICULTIES.map((difficulty) => difficulty.bossEvery)).toEqual([
      undefined,
      undefined,
      5,
      5,
    ]);
    expect(DIFFICULTIES.map((difficulty) => difficulty.coinFactor)).toEqual([1, 1.25, 1.5, 2]);
  });

  it('gets harder from preset to preset', () => {
    DIFFICULTIES.slice(1).forEach((harder, index) => {
      const easier = DIFFICULTIES[index];
      expect(harder.speedFactor).toBeGreaterThan(easier.speedFactor);
      expect(harder.spawnGapFactor).toBeLessThan(easier.spawnGapFactor);
      expect(harder.specialShare).toBeGreaterThan(easier.specialShare);
      expect(harder.eventsPerWave).toBeGreaterThanOrEqual(easier.eventsPerWave);
    });
  });

  it('finds a preset by id and by level', () => {
    expect(difficultyById('fast')?.level).toBe(3);
    expect(difficultyById('hard')).toBeUndefined();
    expect(difficultyAtLevel(4)?.id).toBe('frenzy');
    expect(difficultyAtLevel(5)).toBeUndefined();
  });
});

describe('isDifficultyOpen', () => {
  it('opens the first two presets with the arena', () => {
    expect(openIds(createProfile('A', 'a'))).toEqual(['calm', 'normal']);
  });

  it('opens the next preset with a silver on the one before, on any key set', () => {
    const bronze = withMedal(createProfile('A', 'a'), 'las', 'normal', BRONZE);
    expect(openIds(bronze)).toEqual(['calm', 'normal']);
    const silver = withMedal(bronze, 'polana', 'normal', SILVER);
    expect(openIds(silver)).toEqual(['calm', 'normal', 'fast']);
    expect(openIds(withMedal(silver, 'gory', 'fast', SILVER))).toEqual([
      'calm',
      'normal',
      'fast',
      'frenzy',
    ]);
  });

  it('names the preset that opens a locked one', () => {
    const [calm, normal, fast, frenzy] = DIFFICULTIES;
    expect(unlockingDifficulty(calm)).toBeUndefined();
    expect(unlockingDifficulty(normal)).toBeUndefined();
    expect(unlockingDifficulty(fast)?.id).toBe('normal');
    expect(unlockingDifficulty(frenzy)?.id).toBe('fast');
    expect(isDifficultyOpen(frenzy, createProfile('A', 'a'))).toBe(false);
  });
});
