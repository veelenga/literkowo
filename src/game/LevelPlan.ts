import type { LevelKind } from '../course/catalog';
import { difficultyFor } from '../course/difficulty';
import type { Level } from '../course/regions';

export type PhaseKind = 'warmup' | 'learn' | 'words' | 'boss';

export interface Phase {
  kind: PhaseKind;
  count: number;
  speed: number;
  spawnInterval: number;
}

const MAIN_PHASE: Readonly<Record<LevelKind, PhaseKind>> = {
  learn: 'learn',
  practice: 'words',
  review: 'words',
  boss: 'boss',
};

export function planFor(level: Level): Phase[] {
  const { warmup, main } = difficultyFor(level);
  const mainPhase: Phase = { kind: MAIN_PHASE[level.kind], ...main };
  return warmup ? [{ kind: 'warmup', ...warmup }, mainPhase] : [mainPhase];
}
