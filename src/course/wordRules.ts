import type { WordLanguage } from '../profiles/Profile';
import type { Level } from './catalog';
import { courseFor } from './course';
import { difficultyFor, type LetterRange, type WordStage } from './difficulty';

export interface WordRules {
  readonly allowedKeys: string;
  readonly focusKeys: string;
  readonly lengths: LetterRange;
  readonly generatedLengths: LetterRange;
  readonly stages?: readonly WordStage[];
  readonly realWordsOnly?: boolean;
}

export function levelWordRules(level: Level, language: WordLanguage): WordRules {
  const { lengths, generatedLengths, stages } = difficultyFor(level);
  return {
    allowedKeys: courseFor(language).allowedKeys(level),
    focusKeys: level.focusKeys,
    lengths,
    generatedLengths,
    stages,
  };
}
