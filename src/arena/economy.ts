import { boostedCoins, COINS_PER_WORD } from '../course/coins';
import type { ArenaDifficulty } from './difficulty';
import { MEDALS, type Medal } from './medals';

export const XP_RATE_CAP = 1.25;
export const WORDS_PER_COIN = 2;
export const NEW_BEST_WAVE_COINS = 15;
export const MEDAL_COINS: Readonly<Record<Medal, number>> = { 0: 0, 1: 20, 2: 40, 3: 80 };

export interface ArenaPayoutInput {
  readonly runCoins: number;
  readonly paidMedal: Medal;
  readonly medal: Medal;
  readonly newBestWave: boolean;
  readonly coinBoost: number;
}

export interface ArenaPayout {
  readonly run: number;
  readonly medals: number;
  readonly newBest: number;
  readonly total: number;
}

export function arenaCoinsPerWord(difficulty: ArenaDifficulty): number {
  return (COINS_PER_WORD / WORDS_PER_COIN) * difficulty.coinFactor;
}

export function medalCoins(paid: Medal, earned: Medal): number {
  return MEDALS.filter((medal) => medal > paid && medal <= earned).reduce<number>(
    (sum, medal) => sum + MEDAL_COINS[medal],
    0,
  );
}

export function arenaPayout({
  runCoins,
  paidMedal,
  medal,
  newBestWave,
  coinBoost,
}: ArenaPayoutInput): ArenaPayout {
  const medals = medalCoins(paidMedal, medal);
  const newBest = newBestWave ? NEW_BEST_WAVE_COINS : 0;
  const total = boostedCoins(runCoins + medals + newBest, coinBoost);
  return { run: runCoins, medals, newBest, total };
}

export const DAILY_STAMP_COINS = 20;
export const DAILY_MEDAL_COINS: Readonly<Record<Medal, number>> = { 0: 0, 1: 10, 2: 20, 3: 40 };

export interface DailyPayoutInput {
  readonly runCoins: number;
  readonly coinBoost: number;
  readonly stamp: number;
  readonly medal: number;
  readonly chests: number;
  readonly family: number;
}

export interface DailyPayout {
  readonly run: number;
  readonly stamp: number;
  readonly medal: number;
  readonly chests: number;
  readonly family: number;
  readonly total: number;
}

export function dailyMedalCoins(paid: Medal, earned: Medal): number {
  return Math.max(0, DAILY_MEDAL_COINS[earned] - DAILY_MEDAL_COINS[paid]);
}

export function dailyPayout(input: DailyPayoutInput): DailyPayout {
  const { runCoins, coinBoost, stamp, medal, chests, family } = input;
  const run = boostedCoins(runCoins, coinBoost);
  return { run, stamp, medal, chests, family, total: run + stamp + medal + chests + family };
}
