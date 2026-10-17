import type { RunCoins } from '../course/coins';
import type { RunTotals } from '../course/progress';
import type { GameResult } from '../game/Game';

export function runTotalsOf(result: GameResult): RunTotals {
  return {
    score: result.score,
    lettersFreed: result.lettersFreed,
    xp: result.xp,
    keyStats: result.keys.practised,
    tally: result.tally,
  };
}

export function runCoinsOf(result: GameResult): RunCoins {
  return { runCoins: result.coins, coinBoost: result.coinBoost };
}
