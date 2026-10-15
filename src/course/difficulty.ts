import { coursePosition, LEVELS, type Level, type LevelKind } from './catalog';
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

export interface LevelTempo {
  readonly start: Tempo;
  readonly end: Tempo;
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
  readonly miniBoss: Pace | undefined;
  readonly lengths: LetterRange;
  readonly generatedLengths: LetterRange;
  readonly stages: readonly WordStage[];
}

type TeachingKind = Exclude<LevelKind, 'boss'>;

interface Warmup {
  readonly count: number;
  readonly spawnInterval: number;
}

interface KindRules {
  readonly warmup: Warmup;
  readonly wordCount: Span;
  readonly stages: readonly WordStage[];
}

interface PaceSpan {
  readonly start: number;
  readonly end: number;
}

export const WORD_SPEED: Span = { first: 0.42, last: 1.2 };
export const SPAWN_INTERVAL: Span = { first: 4.4, last: 1.9 };
export const PACE_EASING = 1.5;
export const PACE_STEPS: Readonly<Record<LevelKind, number>> = {
  learn: 1,
  practice: 1,
  review: 1,
  boss: 0,
};
export const GENERATED_MAX_LENGTH: Span = { first: 3, last: 5 };
export const BOSS_HITS: Span = { first: 4, last: 14 };
export const BOSS_SPEED: Span = { first: 0.3, last: 0.52 };
export const BOSS_LENGTHS: LetterRange = { min: 2, max: 5 };
export const MINI_BOSS_HITS: Span = { first: 3, last: 5 };
export const MINI_BOSS_SPEED_SHARE = 0.8;
export const COMBO_LENGTHS: LetterRange = { min: 1, max: 3 };
export const FOCUS_WORD_LENGTHS: LetterRange = { min: 2, max: 3 };
export const PRACTICE_LENGTHS: LetterRange = { min: 2, max: 4 };
export const REVIEW_LENGTHS: LetterRange = { min: 2, max: 5 };

export const KIND_RULES: Readonly<Record<TeachingKind, KindRules>> = {
  learn: {
    warmup: { count: 5, spawnInterval: 1.6 },
    wordCount: { first: 12, last: 18 },
    stages: [
      { kind: 'combos', share: 0.6, lengths: COMBO_LENGTHS },
      { kind: 'focusWords', share: 0.4, lengths: FOCUS_WORD_LENGTHS },
    ],
  },
  practice: {
    warmup: { count: 5, spawnInterval: 1.5 },
    wordCount: { first: 12, last: 18 },
    stages: [
      { kind: 'focusWords', share: 0.2, lengths: FOCUS_WORD_LENGTHS },
      { kind: 'words', share: 0.8, lengths: PRACTICE_LENGTHS },
    ],
  },
  review: {
    warmup: { count: 5, spawnInterval: 1.5 },
    wordCount: { first: 12, last: 20 },
    stages: [{ kind: 'words', share: 1, lengths: REVIEW_LENGTHS }],
  },
};

const NO_SPAWN_INTERVAL = 0;
const NO_STAGES: readonly WordStage[] = [];
const PACE_SPANS = paceSpans(LEVELS);

export function difficultyFor(level: Level): Difficulty {
  const position = coursePosition(level);
  if (level.kind === 'boss') return bossDifficulty(position);
  const rules = KIND_RULES[level.kind];
  const { start, end } = levelTempo(level);
  const lengths = stagesSpan(rules.stages);
  return {
    warmup: { ...rules.warmup, speed: start.speed },
    main: { count: Math.round(valueAt(rules.wordCount, position)), ...start, rampTo: end },
    miniBoss: level.kind === 'review' ? miniBossPace(end, position) : undefined,
    lengths,
    generatedLengths: generatedWithin(lengths, position),
    stages: rules.stages,
  };
}

export function levelTempo(level: Level): LevelTempo {
  const span = PACE_SPANS.get(level.id);
  if (!span) throw new Error(`Unknown level: ${level.id}`);
  return { start: courseTempo(span.start), end: courseTempo(span.end) };
}

export function courseTempo(progress: number): Tempo {
  const eased = progress ** PACE_EASING;
  return { speed: valueAt(WORD_SPEED, eased), spawnInterval: valueAt(SPAWN_INTERVAL, eased) };
}

function miniBossPace(end: Tempo, position: number): Pace {
  return {
    count: Math.round(valueAt(MINI_BOSS_HITS, position)),
    speed: end.speed * MINI_BOSS_SPEED_SHARE,
    spawnInterval: NO_SPAWN_INTERVAL,
  };
}

function paceSpans(levels: readonly Level[]): Map<string, PaceSpan> {
  const total = levels.reduce((sum, level) => sum + PACE_STEPS[level.kind], 0);
  const spans = new Map<string, PaceSpan>();
  let walked = 0;
  for (const level of levels) {
    const start = walked;
    walked += PACE_STEPS[level.kind];
    spans.set(level.id, { start: start / total, end: walked / total });
  }
  return spans;
}

function bossDifficulty(position: number): Difficulty {
  return {
    warmup: undefined,
    main: {
      count: Math.round(valueAt(BOSS_HITS, position)),
      speed: valueAt(BOSS_SPEED, position),
      spawnInterval: NO_SPAWN_INTERVAL,
    },
    miniBoss: undefined,
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
