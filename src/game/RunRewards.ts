import * as THREE from 'three';
import { wordXp, type CompletedWord } from '../course/xp';
import type { RunPlan } from './RunPlan';

export interface Rewards {
  readonly xp: number;
  readonly coins: number;
}

export interface RewardBoost {
  readonly coins: number;
  readonly xp: number;
}

export type RewardRates = Pick<RunPlan, 'xpFactor' | 'coinsPerWord'>;

export const NO_BOOST: RewardBoost = { coins: 1, xp: 1 };
export const MAX_BOOST: RewardBoost = { coins: 1.25, xp: 1.1 };

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
    return Math.floor((this.wordCoins + this.extraCoins) * this.boosts.coins);
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

  boost({ coins, xp }: RewardBoost): void {
    this.boosts = {
      coins: THREE.MathUtils.clamp(coins, NO_BOOST.coins, MAX_BOOST.coins),
      xp: THREE.MathUtils.clamp(xp, NO_BOOST.xp, MAX_BOOST.xp),
    };
  }
}
