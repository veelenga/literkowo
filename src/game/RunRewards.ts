import { cappedBoost, NO_BOOST, type RewardBoost } from '../course/powers';
import { wordXp, type CompletedWord } from '../course/xp';
import type { RunPlan } from './RunPlan';

export interface Rewards {
  readonly xp: number;
  readonly coins: number;
}

export type RewardRates = Pick<RunPlan, 'xpFactor' | 'coinsPerWord'>;

export class RunRewards implements Rewards {
  private wordXp = 0;
  private wordCoins = 0;
  private extraCoins = 0;
  private boosts: RewardBoost = NO_BOOST;

  constructor(private readonly rates: RewardRates) {}

  get xp(): number {
    return Math.round(this.wordXp * this.boosts.xp);
  }

  get coins(): number {
    return Math.floor(this.wordCoins) + this.extraCoins;
  }

  get coinBoost(): number {
    return this.boosts.coins;
  }

  recordWord(word: CompletedWord): number {
    const gained = Math.round(wordXp(word) * this.rates.xpFactor);
    this.wordXp += gained;
    this.wordCoins += this.rates.coinsPerWord;
    return gained;
  }

  addCoins(amount: number): void {
    this.extraCoins += Math.max(0, Math.round(amount));
  }

  boost(boost: RewardBoost): void {
    this.boosts = cappedBoost(boost);
  }
}
