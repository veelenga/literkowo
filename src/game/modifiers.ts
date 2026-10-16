import type { LetterRange, Pace } from '../course/difficulty';
import type { WordRules } from '../course/wordRules';
import type { Modifier, Phase, RunPhase, RunPlan } from './RunPlan';

export const ONE_HEART = 1;
export const LONG_WORDS: LetterRange = { min: 5, max: 8 };
export const LONG_WORD_GAP = 2;

export function withModifiers(plan: RunPlan, modifiers: readonly Modifier[]): RunPlan {
  if (modifiers.length === 0) return plan;
  const active = new Set(modifiers);
  return {
    ...plan,
    lives: active.has('oneHeart') ? Math.min(plan.lives, ONE_HEART) : plan.lives,
    phaseAt: (index) => modifiedPhase(plan.phaseAt(index), active),
  };
}

export function hasModifier(phase: Pick<Phase, 'modifiers'>, modifier: Modifier): boolean {
  return phase.modifiers?.includes(modifier) ?? false;
}

function modifiedPhase(
  phase: RunPhase | undefined,
  active: ReadonlySet<Modifier>,
): RunPhase | undefined {
  if (!phase) return undefined;
  const modifiers = [...active];
  if (!active.has('longWords')) return { ...phase, modifiers };
  return { ...phase, ...longWordPace(phase), words: longWordRules(phase.words), modifiers };
}

function longWordPace({ spawnInterval, rampTo }: Pace): Pick<Pace, 'spawnInterval' | 'rampTo'> {
  const stretched = spawnInterval * LONG_WORD_GAP;
  if (!rampTo) return { spawnInterval: stretched };
  return {
    spawnInterval: stretched,
    rampTo: { ...rampTo, spawnInterval: rampTo.spawnInterval * LONG_WORD_GAP },
  };
}

function longWordRules(rules: WordRules): WordRules {
  const { allowedKeys, focusKeys, realWordsOnly } = rules;
  return {
    allowedKeys,
    focusKeys,
    lengths: LONG_WORDS,
    generatedLengths: LONG_WORDS,
    realWordsOnly,
  };
}
