import type { WordRules } from '../course/wordRules';

export type PhaseKind = 'warmup' | 'learn' | 'words' | 'boss';

export interface Phase {
  readonly kind: PhaseKind;
  readonly count: number;
  readonly speed: number;
  readonly spawnInterval: number;
  readonly specialShare?: number;
  readonly events?: number;
}

export interface RunPhase extends Phase {
  readonly words: WordRules;
}

export interface RunPlan {
  readonly lives: number;
  readonly xpFactor: number;
  readonly allMechanicsUnlocked: boolean;
  phaseAt(index: number): RunPhase | undefined;
}
