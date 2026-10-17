import type { Region } from '../course/catalog';
import { levelTempo, type LetterRange, type Tempo } from '../course/difficulty';
import { needsRightAlt } from '../course/fingers';
import { RIGHT_ALT_TARGET_INTERVAL_MS, regionKeys, TARGET_INTERVAL_MS } from '../course/mastery';
import { accuracyPercent, keystrokeAccuracy, wordsPerMinute } from '../course/scoring';
import { WORD_LISTS } from '../course/wordLists';
import type { WordRules } from '../course/wordRules';
import type { PhaseRecord } from '../game/PhaseMeter';
import type { WordLanguage } from '../profiles/Profile';
import { keySetsFor, type KeySet } from './keySets';

export const STAGE_SECONDS = 12;
export const STAGE_BOARD_SIZE = 3;
export const STAGE_WORD_LIMIT = 20;
export const PASS_ACCURACY_PERCENT = 95;
export const MAX_REACHED = 1;
export const MIN_STAGE_WORDS = 12;
export const STAGE_LENGTHS: LetterRange = { min: 3, max: 5 };
export const WIDE_STAGE_LENGTHS: LetterRange = { min: 2, max: 6 };

const MS_PER_SECOND = 1000;
const NO_ACCURACY = 0;

export interface PlacementStage {
  readonly number: number;
  readonly keySet: KeySet;
  readonly newKeys: string;
  readonly words: WordRules;
  readonly tempo: Tempo;
  readonly targetIntervalMs: number;
}

export interface PlacementOutcome {
  readonly stages: number;
  readonly passed: number;
  readonly placed: Region | undefined;
  readonly accuracy: number;
  readonly wpm: number;
}

export function placementStages(language: WordLanguage): PlacementStage[] {
  return keySetsFor(language).map((keySet, index) => stageOf(keySet, index, language));
}

export function listedWords(language: WordLanguage, keys: string, lengths: LetterRange): string[] {
  return WORD_LISTS[language].filter(
    (word) => word.length >= lengths.min && word.length <= lengths.max && usesOnly(word, keys),
  );
}

export function stageLengths(language: WordLanguage, keys: string): LetterRange {
  const fitting = listedWords(language, keys, STAGE_LENGTHS).length;
  return fitting >= MIN_STAGE_WORDS ? STAGE_LENGTHS : WIDE_STAGE_LENGTHS;
}

export function stagePracticeTempo(region: Region): Tempo {
  const practice = region.levels.findLast((level) => level.kind === 'practice');
  if (!practice) throw new Error(`Region ${region.id} has no practice level`);
  return levelTempo(practice).end;
}

export function meanIntervalMs(record: PhaseRecord): number | undefined {
  if (record.hits === 0) return undefined;
  return (record.typingSeconds * MS_PER_SECOND) / record.hits;
}

export function stagePassed(stage: PlacementStage, record: PhaseRecord): boolean {
  const interval = meanIntervalMs(record);
  if (interval === undefined) return false;
  return (
    accuracyPercent(accuracyOf([record])) >= PASS_ACCURACY_PERCENT &&
    interval <= stage.targetIntervalMs &&
    record.reached <= MAX_REACHED
  );
}

export function passedStages(
  stages: readonly PlacementStage[],
  records: readonly PhaseRecord[],
): number {
  const failed = records.findIndex((record, index) => !isPassed(stages[index], record));
  return failed < 0 ? Math.min(records.length, stages.length) : failed;
}

export function placementOutcome(
  stages: readonly PlacementStage[],
  records: readonly PhaseRecord[],
): PlacementOutcome {
  const passed = passedStages(stages, records);
  const placed = passed > 0 ? stages[passed - 1].keySet.region : undefined;
  return {
    stages: stages.length,
    passed,
    placed,
    accuracy: accuracyOf(records),
    wpm: wpmOf(records),
  };
}

function stageOf(keySet: KeySet, index: number, language: WordLanguage): PlacementStage {
  const newKeys = regionKeys(keySet.region);
  const lengths = stageLengths(language, keySet.keys);
  return {
    number: index + 1,
    keySet,
    newKeys,
    words: {
      allowedKeys: keySet.keys,
      focusKeys: newKeys,
      lengths,
      generatedLengths: lengths,
      realWordsOnly: true,
    },
    tempo: stagePracticeTempo(keySet.region),
    targetIntervalMs: [...newKeys].some(needsRightAlt)
      ? RIGHT_ALT_TARGET_INTERVAL_MS
      : TARGET_INTERVAL_MS,
  };
}

function isPassed(stage: PlacementStage | undefined, record: PhaseRecord): boolean {
  return stage !== undefined && stagePassed(stage, record);
}

function accuracyOf(records: readonly PhaseRecord[]): number {
  const hits = sumOf(records, (record) => record.hits);
  const mistakes = sumOf(records, (record) => record.mistakes);
  return keystrokeAccuracy(hits, mistakes) ?? NO_ACCURACY;
}

function wpmOf(records: readonly PhaseRecord[]): number {
  const hits = sumOf(records, (record) => record.hits);
  const seconds = sumOf(records, (record) => record.typingSeconds);
  return wordsPerMinute(hits, seconds);
}

function sumOf(records: readonly PhaseRecord[], value: (record: PhaseRecord) => number): number {
  return records.reduce((sum, record) => sum + value(record), 0);
}

function usesOnly(word: string, keys: string): boolean {
  return [...word].every((char) => keys.includes(char));
}
