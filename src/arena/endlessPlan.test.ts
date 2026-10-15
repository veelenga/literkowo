import { describe, expect, it } from 'vitest';
import { difficultyFor, levelTempo } from '../course/difficulty';
import { difficultyById, type ArenaDifficulty, type DifficultyId } from './difficulty';
import { arenaCoinsPerWord } from './economy';
import {
  CALM_SECONDS,
  FIRST_EVENT_WAVE,
  SPAWN_GAP,
  SPEED_GROWTH,
  endlessPlan,
  isBossWave,
  longestWord,
} from './endlessPlan';
import { keySetById, type KeySet } from './keySets';

const PRECISION = 6;
const FAR_WAVE_INDEX = 500;

function requireKeySet(id: string): KeySet {
  const keySet = keySetById(id, 'pl');
  if (!keySet) throw new Error(`Missing key set ${id}`);
  return keySet;
}

function requireDifficulty(id: DifficultyId): ArenaDifficulty {
  const difficulty = difficultyById(id);
  if (!difficulty) throw new Error(`Missing difficulty ${id}`);
  return difficulty;
}

const POLANA = requireKeySet('polana');
const NORMAL = requireDifficulty('normal');
const FAST = requireDifficulty('fast');

function waveOf(wave: number, keySet = POLANA, difficulty = NORMAL) {
  return endlessPlan({ keySet, difficulty }).phaseAt(wave - 1);
}

describe('endlessPlan', () => {
  it('takes lives, XP and coins from the preset and unlocks every mechanic', () => {
    const frenzy = requireDifficulty('frenzy');
    const plan = endlessPlan({ keySet: POLANA, difficulty: frenzy });
    expect(plan).toMatchObject({
      lives: 1,
      xpFactor: frenzy.xpFactor,
      coinsPerWord: arenaCoinsPerWord(frenzy),
      allMechanicsUnlocked: true,
    });
    expect(endlessPlan({ keySet: POLANA, difficulty: NORMAL }).xpFactor).toBe(0.4);
  });

  it('starts at the course pace of the boss level, scaled by the preset', () => {
    const { start } = levelTempo(POLANA.bossLevel);
    const first = waveOf(1, POLANA, FAST);
    expect(first.wave).toBe(1);
    expect(first.kind).toBe('words');
    expect(first.count).toBe(10);
    expect(first.speed).toBeCloseTo(start.speed * FAST.speedFactor, PRECISION);
    expect(first.spawnInterval).toBeCloseTo(start.spawnInterval * FAST.spawnGapFactor, PRECISION);
  });

  it('adds two words per wave up to thirty', () => {
    expect([1, 2, 5, 11, 12, 40].map((wave) => waveOf(wave).count)).toEqual([
      10, 12, 18, 30, 30, 30,
    ]);
  });

  it('speeds up five percent per wave up to the cap', () => {
    const first = waveOf(1);
    expect(waveOf(2).speed / first.speed).toBeCloseTo(SPEED_GROWTH.perWave, PRECISION);
    expect(waveOf(4).speed / first.speed).toBeCloseTo(SPEED_GROWTH.perWave ** 3, PRECISION);
    expect(waveOf(30).speed / first.speed).toBeCloseTo(SPEED_GROWTH.max, PRECISION);
  });

  it('shortens the spawn gap five percent per wave down to the floor', () => {
    const first = waveOf(1);
    expect(waveOf(2).spawnInterval / first.spawnInterval).toBeCloseTo(SPAWN_GAP.perWave, PRECISION);
    expect(waveOf(30).spawnInterval / first.spawnInterval).toBeCloseTo(
      SPAWN_GAP.floorShare,
      PRECISION,
    );
  });

  it('grows the longest word by one letter every three waves, from 3 to 8', () => {
    expect([1, 3, 4, 7, 16, 40].map(longestWord)).toEqual([3, 3, 4, 5, 8, 8]);
    expect(waveOf(7).words.lengths).toEqual({ min: 2, max: 5 });
    expect(waveOf(7).words.generatedLengths).toEqual({ min: 2, max: 5 });
  });

  it('types every key of the key set and keeps them all in focus', () => {
    const rules = waveOf(1, requireKeySet('las')).words;
    expect(rules.allowedKeys).toBe('fjdksla;gheiru');
    expect(rules.focusKeys).toBe(rules.allowedKeys);
  });

  it('brings the region boss every fifth wave only on presets with bosses', () => {
    expect(isBossWave(5, NORMAL)).toBe(false);
    expect(isBossWave(5, FAST)).toBe(true);
    expect(isBossWave(6, FAST)).toBe(false);
    const boss = waveOf(10, POLANA, FAST);
    const regionBoss = difficultyFor(POLANA.bossLevel).main;
    expect(boss.kind).toBe('boss');
    expect(boss.wave).toBe(10);
    expect(boss.count).toBe(regionBoss.count);
    expect(boss.speed).toBeCloseTo(regionBoss.speed * FAST.speedFactor, PRECISION);
  });

  it('runs events from the third wave and the preset special share', () => {
    expect(waveOf(FIRST_EVENT_WAVE - 1).events).toBe(0);
    expect(waveOf(FIRST_EVENT_WAVE).events).toBe(NORMAL.eventsPerWave);
    expect(waveOf(1).specialShare).toBe(NORMAL.specialShare);
  });

  it('opens each wave after the first with a calm gap', () => {
    expect(waveOf(1).calmSeconds).toBe(0);
    expect(waveOf(2).calmSeconds).toBe(CALM_SECONDS);
  });

  it('never runs out of waves', () => {
    expect(endlessPlan({ keySet: POLANA, difficulty: NORMAL }).phaseAt(FAR_WAVE_INDEX).wave).toBe(
      FAR_WAVE_INDEX + 1,
    );
  });
});
