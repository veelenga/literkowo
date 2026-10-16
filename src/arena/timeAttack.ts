import type { Tempo } from '../course/difficulty';
import type { WordRules } from '../course/wordRules';
import type { HitCost, RunPhase, StageMark } from '../game/RunPlan';

export const TIME_ATTACK_LIVES = 0;
export const TIME_ATTACK_HIT_COST: HitCost = 'combo';

export interface TimeAttack {
  readonly seconds: number;
  readonly boardSize: number;
  readonly wordLimit: number;
  readonly tempo: Tempo;
  readonly words: WordRules;
  readonly stage?: StageMark;
}

export function timeAttackPhase(attack: TimeAttack): RunPhase {
  const { seconds, boardSize, wordLimit, tempo, words, stage } = attack;
  return { kind: 'test', count: wordLimit, ...tempo, seconds, boardSize, stage, words };
}
