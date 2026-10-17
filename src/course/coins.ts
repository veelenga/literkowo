import { cappedCoinBoost } from './powers';

export const COINS_PER_WORD = 1;
const COINS_FOR_FINISHING = 10;
const COINS_PER_STAR = 5;

export interface RunCoins {
  readonly runCoins: number;
  readonly coinBoost: number;
}

export interface LevelCoins extends RunCoins {
  readonly won: boolean;
  readonly stars: number;
}

export function levelCoins({ runCoins, won, stars, coinBoost }: LevelCoins): number {
  const finishing = won ? COINS_FOR_FINISHING : 0;
  return boostedCoins(runCoins + finishing + stars * COINS_PER_STAR, coinBoost);
}

export function boostedCoins(coins: number, coinBoost: number): number {
  return Math.floor(coins * cappedCoinBoost(coinBoost));
}
