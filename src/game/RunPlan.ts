import type { Pace, Tempo } from '../course/difficulty';
import type { WordRules } from '../course/wordRules';
import type { PhaseRecord } from './PhaseMeter';

export type PhaseKind = 'warmup' | 'learn' | 'words' | 'boss' | 'test';

export type HitCost = 'life' | 'combo';

export interface StageMark {
  readonly number: number;
  readonly count: number;
  readonly regionId: string;
}

export interface Phase extends Pace {
  readonly kind: PhaseKind;
  readonly miniBoss?: boolean;
  readonly wave?: number;
  readonly stage?: StageMark;
  readonly seconds?: number;
  readonly specialShare?: number;
  readonly events?: number;
}

export interface RunPhase extends Phase {
  readonly words: WordRules;
  readonly calmSeconds?: number;
}

export interface RunPlan {
  readonly lives: number;
  readonly hitCost: HitCost;
  readonly xpFactor: number;
  readonly coinsPerWord: number;
  readonly allMechanicsUnlocked: boolean;
  phaseAt(index: number): RunPhase | undefined;
  continuesAfter?(finished: readonly PhaseRecord[]): boolean;
}

const NO_RAMP = 0;
const FULL_RAMP = 1;

export function tempoAt(phase: Phase, spawned: number): Tempo {
  const { rampTo } = phase;
  if (!rampTo) return { speed: phase.speed, spawnInterval: phase.spawnInterval };
  const progress = rampProgress(spawned, phase.count);
  return {
    speed: between(phase.speed, rampTo.speed, progress),
    spawnInterval: between(phase.spawnInterval, rampTo.spawnInterval, progress),
  };
}

function rampProgress(spawned: number, count: number): number {
  const lastSpawn = count - 1;
  if (lastSpawn <= 0) return NO_RAMP;
  return Math.min(FULL_RAMP, Math.max(NO_RAMP, spawned / lastSpawn));
}

function between(start: number, end: number, progress: number): number {
  return start + (end - start) * progress;
}
