import { countOf, isRecord, stringsOf } from '../profiles/raw';

export interface Tally {
  readonly words: number;
  readonly powerWords: number;
  readonly specialEnemies: number;
  readonly bossesBeaten: number;
}

export interface Counters {
  wordsTyped: number;
  powerWords: number;
  specialEnemies: number;
  bossesBeaten: number;
  coinsEarned: number;
  perfectLevels: number;
  bestWpm: number;
  skinsPlayed: string[];
}

export type CounterId = Exclude<keyof Counters, 'skinsPlayed'>;

export interface CountedRun {
  readonly tally: Tally;
  readonly coins: number;
  readonly avatar: string;
  readonly perfect: boolean;
  readonly wpm: number;
}

export const EMPTY_TALLY: Tally = { words: 0, powerWords: 0, specialEnemies: 0, bossesBeaten: 0 };

export function emptyCounters(): Counters {
  return {
    wordsTyped: 0,
    powerWords: 0,
    specialEnemies: 0,
    bossesBeaten: 0,
    coinsEarned: 0,
    perfectLevels: 0,
    bestWpm: 0,
    skinsPlayed: [],
  };
}

export function countRun(counters: Counters, run: CountedRun): Counters {
  const { tally } = run;
  return {
    wordsTyped: counters.wordsTyped + tally.words,
    powerWords: counters.powerWords + tally.powerWords,
    specialEnemies: counters.specialEnemies + tally.specialEnemies,
    bossesBeaten: counters.bossesBeaten + tally.bossesBeaten,
    coinsEarned: counters.coinsEarned + run.coins,
    perfectLevels: counters.perfectLevels + (run.perfect ? 1 : 0),
    bestWpm: Math.max(counters.bestWpm, run.wpm),
    skinsPlayed: withSkin(counters.skinsPlayed, run.avatar),
  };
}

export function countersOf(value: unknown): Counters {
  const raw = isRecord(value) ? value : {};
  return {
    wordsTyped: wholeOf(raw.wordsTyped),
    powerWords: wholeOf(raw.powerWords),
    specialEnemies: wholeOf(raw.specialEnemies),
    bossesBeaten: wholeOf(raw.bossesBeaten),
    coinsEarned: wholeOf(raw.coinsEarned),
    perfectLevels: wholeOf(raw.perfectLevels),
    bestWpm: countOf(raw.bestWpm),
    skinsPlayed: [...new Set(stringsOf(raw.skinsPlayed))],
  };
}

function withSkin(skins: readonly string[], avatar: string): string[] {
  return skins.includes(avatar) ? [...skins] : [...skins, avatar];
}

function wholeOf(value: unknown): number {
  return Math.floor(countOf(value));
}
