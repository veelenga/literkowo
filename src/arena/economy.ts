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
