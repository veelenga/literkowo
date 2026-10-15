import type { LetterRange, WordStage } from './difficulty';

export interface StagePoint {
  readonly stage: WordStage;
  readonly progress: number;
}

export const SHORTER_SHARE = 0.5;
const SHORTER_BY = 1;
const MIN_SPREAD = 1;
const STAGE_END = 1;

export function stageAt(stages: readonly WordStage[], progress: number): StagePoint | undefined {
  let start = 0;
  for (const stage of stages) {
    const end = start + stage.share;
    if (progress < end) return { stage, progress: (progress - start) / stage.share };
    start = end;
  }
  const last = stages.at(-1);
  return last && { stage: last, progress: STAGE_END };
}

export function lengthsAt(lengths: LetterRange, progress: number): LetterRange {
  if (progress >= SHORTER_SHARE) return lengths;
  const shorter = Math.max(lengths.min + MIN_SPREAD, lengths.max - SHORTER_BY);
  return { min: lengths.min, max: Math.min(lengths.max, shorter) };
}

export function stagesSpan(stages: readonly WordStage[]): LetterRange {
  return {
    min: Math.min(...stages.map((stage) => stage.lengths.min)),
    max: Math.max(...stages.map((stage) => stage.lengths.max)),
  };
}
