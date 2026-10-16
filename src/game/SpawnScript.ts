import { WordSource, type KeyWeights } from '../course/WordSource';
import type { WordRules } from '../course/wordRules';
import type { WordLanguage } from '../profiles/Profile';
import type { RandomSource } from '../random';
import type { Phase } from './RunPlan';

const WORDS_STREAM = 'scriptWords';
const ARC_STREAM = 'scriptArc';
const SPAWN_ARC_MARGIN = 0.35;
const SPAWN_ARC = { from: Math.PI - SPAWN_ARC_MARGIN, span: Math.PI + SPAWN_ARC_MARGIN * 2 };
const NO_STARTS: ReadonlySet<string> = new Set();
const FIRST_PHASE = 0;

export interface SpawnScriptSetup {
  readonly language: WordLanguage;
  readonly random: RandomSource;
  readonly weights: KeyWeights;
  readonly seeded: boolean;
}

interface PhaseScript {
  readonly words: WordSource;
  readonly arc: RandomSource;
}

export class SpawnScript {
  private current: PhaseScript;
  private spawns = 0;

  constructor(
    private readonly setup: SpawnScriptSetup,
    firstRules: WordRules,
  ) {
    this.current = this.phaseScript(FIRST_PHASE, firstRules);
  }

  startPhase(phaseIndex: number, rules: WordRules): void {
    this.current = this.phaseScript(phaseIndex, rules);
  }

  word(phase: Phase, spawned: number, liveStarts: ReadonlySet<string>): string {
    const { words } = this.current;
    const taken = this.setup.seeded ? NO_STARTS : liveStarts;
    if (phase.kind === 'warmup') return words.singleLetter(taken);
    return words.stagedWord(spawned / phase.count, taken);
  }

  angle(): number {
    return spawnAngle(this.current.arc);
  }

  nextIndex(): number {
    const index = this.spawns;
    this.spawns += 1;
    return index;
  }

  private phaseScript(phaseIndex: number, rules: WordRules): PhaseScript {
    const { language, random, weights } = this.setup;
    return {
      words: new WordSource(language, rules, weights, random.stream(WORDS_STREAM, phaseIndex)),
      arc: random.stream(ARC_STREAM, phaseIndex),
    };
  }
}

export function spawnAngle(random: RandomSource): number {
  return SPAWN_ARC.from + random.next() * SPAWN_ARC.span;
}
