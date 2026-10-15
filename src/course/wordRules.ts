import type { WordLanguage } from '../profiles/Profile';
import type { Level } from './catalog';
import { courseFor } from './course';
import { difficultyFor, type LetterRange } from './difficulty';

export interface WordRules {
  readonly allowedKeys: string;
  readonly focusKeys: string;
  readonly lengths: LetterRange;
  readonly generatedLengths: LetterRange;
}

export function levelWordRules(level: Level, language: WordLanguage): WordRules {
  const { lengths, generatedLengths } = difficultyFor(level);
  return {
    allowedKeys: courseFor(language).allowedKeys(level),
    focusKeys: level.focusKeys,
    lengths,
    generatedLengths,
  };
}
