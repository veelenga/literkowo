import { EVEN_WEIGHTS } from '../course/WordSource';
import { WORD_LISTS } from '../course/wordLists';
import type { RunPhase, RunPlan } from '../game/RunPlan';
import { SpawnScript } from '../game/SpawnScript';
import type { WordLanguage } from '../profiles/Profile';
import { seededRandom } from '../random';

const NO_STARTS: ReadonlySet<string> = new Set();
const UNSEEDED_PLAN_SEED = 1;
const FIRST_PHASE = 0;

export function scriptedWords(plan: RunPlan, language: WordLanguage, phases: number): string[][] {
  const first = plan.phaseAt(FIRST_PHASE);
  if (!first) return [];
  const random = seededRandom(plan.seed ?? UNSEEDED_PLAN_SEED);
  const script = new SpawnScript(
    { language, random, weights: EVEN_WEIGHTS, seeded: true },
    first.words,
  );
  return Array.from({ length: phases }, (_, index) => {
    const phase = plan.phaseAt(index);
    if (!phase) return [];
    if (index > FIRST_PHASE) script.startPhase(index, phase.words);
    return phaseWords(script, phase);
  });
}

export function realShare(words: readonly string[], language: WordLanguage): number {
  const listed = new Set(WORD_LISTS[language]);
  return words.filter((word) => listed.has(word)).length / words.length;
}

function phaseWords(script: SpawnScript, phase: RunPhase): string[] {
  if (phase.kind === 'boss') return [];
  return Array.from({ length: phase.count }, (_, spawned) =>
    script.word(phase, spawned, NO_STARTS),
  );
}
