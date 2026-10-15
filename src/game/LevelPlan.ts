import type { LevelKind } from '../course/catalog';
import { difficultyFor } from '../course/difficulty';
import type { Level } from '../course/regions';
import { levelWordRules } from '../course/wordRules';
import type { WordLanguage } from '../profiles/Profile';
import type { PhaseKind, RunPhase, RunPlan } from './RunPlan';

export const LEVEL_LIVES = 3;
export const LEVEL_XP_FACTOR = 1;

const MAIN_PHASE: Readonly<Record<LevelKind, PhaseKind>> = {
  learn: 'learn',
  practice: 'words',
  review: 'words',
  boss: 'boss',
};

export function levelPhases(level: Level, language: WordLanguage): RunPhase[] {
  const { warmup, main } = difficultyFor(level);
  const words = levelWordRules(level, language);
  const mainPhase: RunPhase = { kind: MAIN_PHASE[level.kind], ...main, words };
  return warmup ? [{ kind: 'warmup', ...warmup, words }, mainPhase] : [mainPhase];
}

export function levelPlan(level: Level, language: WordLanguage): RunPlan {
  const phases = levelPhases(level, language);
  return { lives: LEVEL_LIVES, xpFactor: LEVEL_XP_FACTOR, phaseAt: (index) => phases[index] };
}
