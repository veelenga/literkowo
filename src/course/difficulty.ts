import { coursePosition, type Level, type LevelKind } from './catalog';
import { stagesSpan } from './wordStages';

export interface Span {
  readonly first: number;
  readonly last: number;
}

export interface LetterRange {
  readonly min: number;
  readonly max: number;
}

export interface Tempo {
  readonly speed: number;
  readonly spawnInterval: number;
}

export interface Pace extends Tempo {
  readonly count: number;
  readonly rampTo?: Tempo;
}

export type WordStageKind = 'combos' | 'focusWords' | 'words';

export interface WordStage {
  readonly kind: WordStageKind;
  readonly share: number;
  readonly lengths: LetterRange;
}

export interface Difficulty {
  readonly warmup: Pace | undefined;
  readonly main: Pace;
  readonly lengths: LetterRange;
  readonly generatedLengths: LetterRange;
  readonly stages: readonly WordStage[];
}

type TeachingKind = Exclude<LevelKind, 'boss'>;

interface KindRules {
  readonly warmup: Pace;
  readonly wordCount: Span;
  readonly speedFactor: number;
  readonly intervalFactor: number;
  readonly stages: readonly WordStage[];
}

export const WORD_SPEED: Span = { first: 0.52, last: 1.2 };
export const SPAWN_INTERVAL: Span = { first: 3.8, last: 1.9 };
export const GENERATED_MAX_LENGTH: Span = { first: 3, last: 5 };
export const BOSS_HITS: Span = { first: 4, last: 14 };
export const BOSS_SPEED: Span = { first: 0.3, last: 0.52 };
export const BOSS_LENGTHS: LetterRange = { min: 2, max: 5 };
export const COMBO_LENGTHS: LetterRange = { min: 1, max: 3 };
export const FOCUS_WORD_LENGTHS: LetterRange = { min: 2, max: 3 };
export const PRACTICE_LENGTHS: LetterRange = { min: 2, max: 4 };
export const REVIEW_LENGTHS: LetterRange = { min: 2, max: 5 };

export const KIND_RULES: Readonly<Record<TeachingKind, KindRules>> = {
  learn: {
    warmup: { count: 8, speed: 0.42, spawnInterval: 1.6 },
    wordCount: { first: 8, last: 12 },
    speedFactor: 0.8,
    intervalFactor: 1.15,
    stages: [
      { kind: 'combos', share: 0.6, lengths: COMBO_LENGTHS },
      { kind: 'focusWords', share: 0.4, lengths: FOCUS_WORD_LENGTHS },
    ],
  },
  practice: {
    warmup: { count: 5, speed: 0.5, spawnInterval: 1.5 },
    wordCount: { first: 10, last: 16 },
    speedFactor: 1,
    intervalFactor: 1,
    stages: [
      { kind: 'focusWords', share: 0.2, lengths: FOCUS_WORD_LENGTHS },
      { kind: 'words', share: 0.8, lengths: PRACTICE_LENGTHS },
    ],
  },
  review: {
    warmup: { count: 5, speed: 0.5, spawnInterval: 1.5 },
    wordCount: { first: 12, last: 20 },
    speedFactor: 1,
    intervalFactor: 1,
    stages: [{ kind: 'words', share: 1, lengths: REVIEW_LENGTHS }],
  },
};

const NO_SPAWN_INTERVAL = 0;
const NO_STAGES: readonly WordStage[] = [];

export function difficultyFor(level: Level): Difficulty {
  const position = coursePosition(level);
  if (level.kind === 'boss') return bossDifficulty(position);
  const rules = KIND_RULES[level.kind];
  const lengths = stagesSpan(rules.stages);
  return {
    warmup: rules.warmup,
    main: {
      count: Math.round(valueAt(rules.wordCount, position)),
      speed: valueAt(WORD_SPEED, position) * rules.speedFactor,
      spawnInterval: valueAt(SPAWN_INTERVAL, position) * rules.intervalFactor,
    },
    lengths,
    generatedLengths: generatedWithin(lengths, position),
    stages: rules.stages,
  };
}

function bossDifficulty(position: number): Difficulty {
  return {
    warmup: undefined,
    main: {
      count: Math.round(valueAt(BOSS_HITS, position)),
      speed: valueAt(BOSS_SPEED, position),
      spawnInterval: NO_SPAWN_INTERVAL,
    },
    lengths: BOSS_LENGTHS,
    generatedLengths: generatedWithin(BOSS_LENGTHS, position),
    stages: NO_STAGES,
  };
}

function generatedWithin(lengths: LetterRange, position: number): LetterRange {
  const cap = Math.round(valueAt(GENERATED_MAX_LENGTH, position));
  return { min: lengths.min, max: Math.max(lengths.min, Math.min(lengths.max, cap)) };
}

export function valueAt(span: Span, position: number): number {
  return span.first + (span.last - span.first) * position;
}
