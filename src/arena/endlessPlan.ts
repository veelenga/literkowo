import type { Level } from '../course/catalog';
import { difficultyFor, levelTempo, type Pace } from '../course/difficulty';
import type { WordRules } from '../course/wordRules';
import { LEVEL_HIT_COST } from '../game/LevelPlan';
import type { RunPhase, RunPlan } from '../game/RunPlan';
import type { ArenaDifficulty } from './difficulty';
import { arenaCoinsPerWord } from './economy';
import type { KeySet } from './keySets';

export const FIRST_WAVE = 1;
export const WAVE_WORDS = { first: 8, perWave: 2, max: 30 } as const;
export const SPEED_GROWTH = { perWave: 1.05, max: 1.8 } as const;
export const SPAWN_GAP = { perWave: 0.95, floorShare: 0.85 } as const;
export const WORD_LENGTHS = { min: 2, firstLongest: 3, maxLongest: 8, wavesPerLetter: 3 } as const;
export const CALM_SECONDS = 4;
export const FIRST_EVENT_WAVE = 3;

const NO_CALM = 0;
const NO_EVENTS = 0;

export interface EndlessPlan extends RunPlan {
  phaseAt(index: number): RunPhase;
}

export interface ArenaChoice {
  readonly keySet: KeySet;
  readonly difficulty: ArenaDifficulty;
}

interface WaveContext extends ArenaChoice {
  readonly start: Pace;
  readonly boss: Pace;
  readonly rules: (wave: number) => WordRules;
}

export function endlessPlan(setup: ArenaChoice): EndlessPlan {
  const { keySet, difficulty } = setup;
  const context: WaveContext = {
    ...setup,
    start: startingPace(keySet.bossLevel, difficulty),
    boss: bossPace(keySet.bossLevel, difficulty),
    rules: waveRules(keySet.keys),
  };
  return {
    lives: difficulty.lives,
    hitCost: LEVEL_HIT_COST,
    xpFactor: difficulty.xpFactor,
    coinsPerWord: arenaCoinsPerWord(difficulty),
    allMechanicsUnlocked: true,
    phaseAt: (index) => wavePhase(index + FIRST_WAVE, context),
  };
}

export function isBossWave(wave: number, difficulty: ArenaDifficulty): boolean {
  return difficulty.bossEvery !== undefined && wave % difficulty.bossEvery === 0;
}

export function longestWord(wave: number): number {
  const { firstLongest, maxLongest, wavesPerLetter } = WORD_LENGTHS;
  const grown = firstLongest + Math.floor((wave - FIRST_WAVE) / wavesPerLetter);
  return Math.min(maxLongest, grown);
}

function wavePhase(wave: number, context: WaveContext): RunPhase {
  const { difficulty } = context;
  const shared = {
    wave,
    words: context.rules(wave),
    specialShare: difficulty.specialShare,
    events: wave >= FIRST_EVENT_WAVE ? difficulty.eventsPerWave : NO_EVENTS,
    calmSeconds: wave === FIRST_WAVE ? NO_CALM : CALM_SECONDS,
  };
  if (isBossWave(wave, difficulty)) return { kind: 'boss', ...context.boss, ...shared };
  return { kind: 'words', ...wavePace(wave, context.start), ...shared };
}

function wavePace(wave: number, start: Pace): Pace {
  const steps = wave - FIRST_WAVE;
  const growth = Math.min(SPEED_GROWTH.max, SPEED_GROWTH.perWave ** steps);
  const gap = start.spawnInterval * SPAWN_GAP.perWave ** steps;
  return {
    count: Math.min(WAVE_WORDS.max, WAVE_WORDS.first + WAVE_WORDS.perWave * wave),
    speed: start.speed * growth,
    spawnInterval: Math.max(start.spawnInterval * SPAWN_GAP.floorShare, gap),
  };
}

function startingPace(bossLevel: Level, difficulty: ArenaDifficulty): Pace {
  const { start } = levelTempo(bossLevel);
  return {
    count: WAVE_WORDS.first,
    speed: start.speed * difficulty.speedFactor,
    spawnInterval: start.spawnInterval * difficulty.spawnGapFactor,
  };
}

function bossPace(bossLevel: Level, difficulty: ArenaDifficulty): Pace {
  const { main } = difficultyFor(bossLevel);
  return { ...main, speed: main.speed * difficulty.speedFactor };
}

function waveRules(keys: string): (wave: number) => WordRules {
  const byLongest = new Map<number, WordRules>();
  return (wave) => {
    const longest = longestWord(wave);
    const cached = byLongest.get(longest);
    if (cached) return cached;
    const lengths = { min: WORD_LENGTHS.min, max: longest };
    const rules = { allowedKeys: keys, focusKeys: keys, lengths, generatedLengths: lengths };
    byLongest.set(longest, rules);
    return rules;
  };
}
