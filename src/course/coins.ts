export const COINS_PER_WORD = 1;
const COINS_FOR_FINISHING = 10;
const COINS_PER_STAR = 5;

export interface LevelCoins {
  runCoins: number;
  won: boolean;
  stars: number;
}

export function levelCoins({ runCoins, won, stars }: LevelCoins): number {
  const finishing = won ? COINS_FOR_FINISHING : 0;
  return runCoins + finishing + stars * COINS_PER_STAR;
}
