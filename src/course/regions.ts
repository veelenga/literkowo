import { DEFAULT_WORD_LANGUAGE, type WordLanguage } from '../profiles/Profile';
import type { Level } from './catalog';
import { courseFor } from './course';

export {
  LEVELS,
  REGIONS,
  levelById,
  regionOf,
  regionsFor,
  type Level,
  type Region,
  type ThemeId,
} from './catalog';

export function allowedKeysFor(
  level: Level,
  language: WordLanguage = DEFAULT_WORD_LANGUAGE,
): string {
  return courseFor(language).allowedKeys(level);
}

export function nextLevel(level: Level, language: WordLanguage): Level | undefined {
  return courseFor(language).next(level);
}

export function previousLevel(level: Level, language: WordLanguage): Level | undefined {
  return courseFor(language).previous(level);
}
