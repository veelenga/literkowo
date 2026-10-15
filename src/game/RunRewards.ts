import { wordXp, type CompletedWord } from '../course/xp';
import type { RunPlan } from './RunPlan';

export interface Rewards {
  readonly xp: number;
  readonly coins: number;
}

export type RewardRates = Pick<RunPlan, 'xpFactor' | 'coinsPerWord'>;

export class RunRewards implements Rewards {
  private earnedXp = 0;
  private wordCoins = 0;
  private extraCoins = 0;

  constructor(private readonly rates: RewardRates) {}

  get xp(): number {
    return this.earnedXp;
  }

  get coins(): number {
    return Math.floor(this.wordCoins) + this.extraCoins;
  }

  recordWord(word: CompletedWord): number {
    const gained = Math.round(wordXp(word) * this.rates.xpFactor);
    this.earnedXp += gained;
    this.wordCoins += this.rates.coinsPerWord;
    return gained;
  }

  addCoins(amount: number): void {
    this.extraCoins += Math.max(0, Math.round(amount));
  }
}
