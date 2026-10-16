import { MINI_BOSS_SPEED_SHARE, type Pace } from '../course/difficulty';
import { LEVEL_HIT_COST } from '../game/LevelPlan';
import { withModifiers } from '../game/modifiers';
import type { RunPhase, RunPlan } from '../game/RunPlan';
import { hashSeed } from '../random';
import { presetOf, type ArenaDifficulty } from './difficulty';
import { arenaCoinsPerWord } from './economy';
import { bossPace, endlessPlan, startingPace, waveRules } from './endlessPlan';
import type { DailyFormat } from './formats';
import type { KeySet } from './keySets';
import { stagePracticeTempo, STAGE_LENGTHS } from './placement';
import { TIME_ATTACK_HIT_COST, TIME_ATTACK_LIVES, timeAttackPhase } from './timeAttack';

export interface DailyChoice {
  readonly keySet: KeySet;
  readonly format: DailyFormat;
  readonly day: string;
}

export interface BossFightPlan {
  readonly miniBoss: boolean;
  readonly hits: number;
}

export const DAILY_PRESET = presetOf('normal');
export const SLOWER_PRESET = presetOf('calm');
export const TIME_ATTACK_BOARD = 4;
export const TIME_ATTACK_WORD_LIMIT = 300;
export const TIME_ATTACK_SPEED_SHARE = 0.8;
export const TIME_ATTACK_FILL_SECONDS = 1;
export const BOSS_FIGHTS: readonly BossFightPlan[] = [
  { miniBoss: true, hits: 4 },
  { miniBoss: true, hits: 5 },
  { miniBoss: false, hits: 8 },
];
export const BOSS_BREAK_WORDS = 6;
export const BOSS_BREAK_CALM_SECONDS = 3;

const FIRST_WAVE = 1;
const NO_CALM = 0;
const NO_EVENTS = 0;
const NO_SPAWN_GAP = 0;
const PHASES_PER_FIGHT = 2;

export function dailySeed(day: string, keySetId: string): number {
  return hashSeed([day, keySetId]);
}

export function dailyDifficulty(format: DailyFormat): ArenaDifficulty {
  if (!format.slower) return DAILY_PRESET;
  return { ...DAILY_PRESET, speedFactor: SLOWER_PRESET.speedFactor };
}

export function dailyPlan({ keySet, format, day }: DailyChoice): RunPlan {
  const difficulty = dailyDifficulty(format);
  const plan = basePlan(keySet, format, difficulty);
  const seed = dailySeed(day, keySet.id);
  return withModifiers({ ...plan, seconds: format.seconds, seed }, format.modifiers);
}

function basePlan(keySet: KeySet, format: DailyFormat, difficulty: ArenaDifficulty): RunPlan {
  if (format.run === 'timeAttack') return timeAttackPlan(keySet, format, difficulty);
  if (format.run === 'bosses') return bossesPlan(keySet, difficulty);
  return endlessPlan({ keySet, difficulty });
}

function timeAttackPlan(keySet: KeySet, format: DailyFormat, difficulty: ArenaDifficulty): RunPlan {
  const practice = stagePracticeTempo(keySet.region);
  const phase = timeAttackPhase({
    seconds: format.seconds,
    boardSize: TIME_ATTACK_BOARD,
    wordLimit: TIME_ATTACK_WORD_LIMIT,
    tempo: {
      speed: practice.speed * TIME_ATTACK_SPEED_SHARE,
      spawnInterval: TIME_ATTACK_FILL_SECONDS,
    },
    words: {
      allowedKeys: keySet.keys,
      focusKeys: keySet.keys,
      lengths: STAGE_LENGTHS,
      generatedLengths: STAGE_LENGTHS,
      realWordsOnly: true,
    },
  });
  return {
    ...sharedRules(difficulty),
    lives: TIME_ATTACK_LIVES,
    hitCost: TIME_ATTACK_HIT_COST,
    allMechanicsUnlocked: false,
    phaseAt: (index) => (index === 0 ? phase : undefined),
  };
}

function bossesPlan(keySet: KeySet, difficulty: ArenaDifficulty): RunPlan {
  const start = startingPace(keySet.bossLevel, difficulty);
  const boss = bossPace(keySet.bossLevel, difficulty);
  const rules = waveRules(keySet.keys);
  const phases = BOSS_FIGHTS.flatMap((fight, index) => {
    const wave = FIRST_WAVE + index * PHASES_PER_FIGHT;
    const shared = { specialShare: difficulty.specialShare, events: NO_EVENTS };
    const calmSeconds = index === 0 ? NO_CALM : BOSS_BREAK_CALM_SECONDS;
    const words = rules(wave);
    const pause: RunPhase = {
      kind: 'words',
      ...start,
      count: BOSS_BREAK_WORDS,
      wave,
      words,
      calmSeconds,
      ...shared,
    };
    const duel: RunPhase = {
      kind: 'boss',
      ...fightPace(fight, start, boss),
      miniBoss: fight.miniBoss,
      wave: wave + 1,
      words,
      calmSeconds: BOSS_BREAK_CALM_SECONDS,
      ...shared,
    };
    return [pause, duel];
  });
  return {
    ...sharedRules(difficulty),
    lives: difficulty.lives,
    hitCost: LEVEL_HIT_COST,
    allMechanicsUnlocked: true,
    phaseAt: (index) => phases.at(index),
  };
}

function fightPace(fight: BossFightPlan, start: Pace, boss: Pace): Pace {
  const hits = Math.min(fight.hits, boss.count);
  if (!fight.miniBoss) return { ...boss, count: hits };
  const speed = Math.min(start.speed * MINI_BOSS_SPEED_SHARE, boss.speed);
  return { count: fight.hits, speed, spawnInterval: NO_SPAWN_GAP };
}

function sharedRules(difficulty: ArenaDifficulty): Pick<RunPlan, 'xpFactor' | 'coinsPerWord'> {
  return { xpFactor: difficulty.xpFactor, coinsPerWord: arenaCoinsPerWord(difficulty) };
}
