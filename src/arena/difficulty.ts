import { SPECIAL_SHARE } from '../game/mechanics/enemyTypes/kinds';
import { keySetsFor, type ArenaProfile } from './keySets';
import { SILVER, type Medal } from './medals';
import { arenaKey, endlessBest } from './record';

export const DIFFICULTY_IDS = ['calm', 'normal', 'fast', 'frenzy'] as const;

export type DifficultyId = (typeof DIFFICULTY_IDS)[number];

export interface ArenaDifficulty {
  readonly id: DifficultyId;
  readonly level: number;
  readonly speedFactor: number;
  readonly spawnGapFactor: number;
  readonly lives: number;
  readonly specialShare: number;
  readonly eventsPerWave: number;
  readonly bossEvery: number | undefined;
  readonly coinFactor: number;
  readonly xpFactor: number;
}

export const UNLOCK_MEDAL: Medal = SILVER;
const FIRST_LOCKED_LEVEL = 3;
const LEVEL_STEP = 1;
const NO_BOSS = undefined;

export const DIFFICULTIES: readonly ArenaDifficulty[] = [
  {
    id: 'calm',
    level: 1,
    speedFactor: 0.8,
    spawnGapFactor: 1.2,
    lives: 3,
    specialShare: 0.1,
    eventsPerWave: 1,
    bossEvery: NO_BOSS,
    coinFactor: 1,
    xpFactor: 0.4,
  },
  {
    id: 'normal',
    level: 2,
    speedFactor: 1,
    spawnGapFactor: 1,
    lives: 3,
    specialShare: SPECIAL_SHARE,
    eventsPerWave: 1,
    bossEvery: NO_BOSS,
    coinFactor: 1.25,
    xpFactor: 0.4,
  },
  {
    id: 'fast',
    level: 3,
    speedFactor: 1.2,
    spawnGapFactor: 0.85,
    lives: 3,
    specialShare: 0.35,
    eventsPerWave: 1,
    bossEvery: 5,
    coinFactor: 1.5,
    xpFactor: 0.3,
  },
  {
    id: 'frenzy',
    level: 4,
    speedFactor: 1.35,
    spawnGapFactor: 0.75,
    lives: 1,
    specialShare: 0.5,
    eventsPerWave: 2,
    bossEvery: 5,
    coinFactor: 2,
    xpFactor: 0.25,
  },
];

export function difficultyById(id: string): ArenaDifficulty | undefined {
  return DIFFICULTIES.find((difficulty) => difficulty.id === id);
}

export function presetOf(id: DifficultyId): ArenaDifficulty {
  const preset = difficultyById(id);
  if (!preset) throw new Error(`Unknown arena difficulty: ${id}`);
  return preset;
}

export function difficultyAtLevel(level: number): ArenaDifficulty | undefined {
  return DIFFICULTIES.find((difficulty) => difficulty.level === level);
}

export function unlockingDifficulty(difficulty: ArenaDifficulty): ArenaDifficulty | undefined {
  if (difficulty.level < FIRST_LOCKED_LEVEL) return undefined;
  return difficultyAtLevel(difficulty.level - LEVEL_STEP);
}

export function isDifficultyOpen(difficulty: ArenaDifficulty, profile: ArenaProfile): boolean {
  const previous = unlockingDifficulty(difficulty);
  if (!previous) return true;
  return keySetsFor(profile.wordLanguage).some((keySet) => {
    const best = endlessBest(profile.arena, arenaKey(keySet.id, previous.id));
    return (best?.medal ?? 0) >= UNLOCK_MEDAL;
  });
}
