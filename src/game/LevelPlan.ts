import type { LevelKind } from '../course/catalog';
import { COINS_PER_WORD } from '../course/coins';
import { difficultyFor } from '../course/difficulty';
import type { Level } from '../course/regions';
import { levelWordRules } from '../course/wordRules';
import type { WordLanguage } from '../profiles/Profile';
import type { HitCost, PhaseKind, RunPhase, RunPlan } from './RunPlan';

export const LEVEL_LIVES = 3;
export const LEVEL_HIT_COST: HitCost = 'life';
export const LEVEL_XP_FACTOR = 1;

const MAIN_PHASE: Readonly<Record<LevelKind, PhaseKind>> = {
  learn: 'learn',
  practice: 'words',
  review: 'words',
  boss: 'boss',
};

export function levelPhases(level: Level, language: WordLanguage): RunPhase[] {
  const { warmup, main, miniBoss } = difficultyFor(level);
  const words = levelWordRules(level, language);
  const opening: RunPhase[] = warmup ? [{ kind: 'warmup', ...warmup, words }] : [];
  const closing: RunPhase[] = miniBoss
    ? [{ kind: 'boss', ...miniBoss, miniBoss: true, words }]
    : [];
  return [...opening, { kind: MAIN_PHASE[level.kind], ...main, words }, ...closing];
}

export function levelPlan(level: Level, language: WordLanguage): RunPlan {
  const phases = levelPhases(level, language);
  return {
    lives: LEVEL_LIVES,
    hitCost: LEVEL_HIT_COST,
    xpFactor: LEVEL_XP_FACTOR,
    coinsPerWord: COINS_PER_WORD,
    allMechanicsUnlocked: false,
    phaseAt: (index) => phases[index],
  };
}
