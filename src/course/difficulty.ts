import { coursePosition, type Level, type LevelKind } from './catalog';

export interface Span {
  readonly first: number;
  readonly last: number;
}

export interface LetterRange {
  readonly min: number;
  readonly max: number;
}

export interface Pace {
  readonly count: number;
  readonly speed: number;
  readonly spawnInterval: number;
}

export interface Difficulty {
  readonly warmup: Pace | undefined;
  readonly main: Pace;
  readonly lengths: LetterRange;
  readonly generatedLengths: LetterRange;
}

type TeachingKind = Exclude<LevelKind, 'boss'>;

interface KindRules {
  readonly warmup: Pace;
  readonly wordCount: Span;
  readonly speedFactor: number;
  readonly intervalFactor: number;
  readonly lengths: LetterRange;
}

export const WORD_SPEED: Span = { first: 0.52, last: 1.2 };
export const SPAWN_INTERVAL: Span = { first: 3.8, last: 1.9 };
export const GENERATED_MAX_LENGTH: Span = { first: 3, last: 5 };
export const BOSS_HITS: Span = { first: 4, last: 14 };
export const BOSS_SPEED: Span = { first: 0.3, last: 0.52 };
export const BOSS_LENGTHS: LetterRange = { min: 2, max: 5 };
export const LEARN_STAGES = {
  comboShare: 0.5,
  combos: { min: 1, max: 2 },
  words: { min: 2, max: 3 },
} as const;

export const KIND_RULES: Readonly<Record<TeachingKind, KindRules>> = {
  learn: {
    warmup: { count: 8, speed: 0.42, spawnInterval: 1.6 },
    wordCount: { first: 8, last: 12 },
    speedFactor: 0.8,
    intervalFactor: 1.15,
    lengths: { min: LEARN_STAGES.combos.min, max: LEARN_STAGES.words.max },
  },
  practice: {
    warmup: { count: 5, speed: 0.5, spawnInterval: 1.5 },
    wordCount: { first: 10, last: 16 },
    speedFactor: 1,
    intervalFactor: 1,
    lengths: { min: 2, max: 4 },
  },
  review: {
    warmup: { count: 5, speed: 0.5, spawnInterval: 1.5 },
    wordCount: { first: 12, last: 20 },
    speedFactor: 1,
    intervalFactor: 1,
    lengths: { min: 2, max: 5 },
  },
};

const NO_SPAWN_INTERVAL = 0;

export function difficultyFor(level: Level): Difficulty {
  const position = coursePosition(level);
  if (level.kind === 'boss') return bossDifficulty(position);
  const rules = KIND_RULES[level.kind];
  return {
    warmup: rules.warmup,
    main: {
      count: Math.round(valueAt(rules.wordCount, position)),
      speed: valueAt(WORD_SPEED, position) * rules.speedFactor,
      spawnInterval: valueAt(SPAWN_INTERVAL, position) * rules.intervalFactor,
    },
    lengths: rules.lengths,
    generatedLengths: generatedWithin(rules.lengths, position),
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
  };
}

function generatedWithin(lengths: LetterRange, position: number): LetterRange {
  const cap = Math.round(valueAt(GENERATED_MAX_LENGTH, position));
  return { min: lengths.min, max: Math.max(lengths.min, Math.min(lengths.max, cap)) };
}

export function valueAt(span: Span, position: number): number {
  return span.first + (span.last - span.first) * position;
}
