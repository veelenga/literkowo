import { COINS_PER_WORD } from '../course/coins';
import { wordXp, type CompletedWord } from '../course/xp';

export interface Rewards {
  readonly xp: number;
  readonly coins: number;
}

export class RunRewards implements Rewards {
  private earnedXp = 0;
  private earnedCoins = 0;

  get xp(): number {
    return this.earnedXp;
  }

  get coins(): number {
    return this.earnedCoins;
  }

  recordWord(word: CompletedWord): number {
    const gained = wordXp(word);
    this.earnedXp += gained;
    this.earnedCoins += COINS_PER_WORD;
    return gained;
  }

  addCoins(amount: number): void {
    this.earnedCoins += Math.max(0, Math.round(amount));
  }
}
