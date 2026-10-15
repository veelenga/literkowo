import { levelById, type Level } from '../course/catalog';
import { levelWordRules } from '../course/wordRules';
import { WordSource, type KeyWeights } from '../course/WordSource';
import type { WordLanguage } from '../profiles/Profile';

export function requireLevel(id: string): Level {
  const level = levelById(id);
  if (!level) throw new Error(`Missing level ${id}`);
  return level;
}

export function levelWords(level: Level, language: WordLanguage, weights?: KeyWeights): WordSource {
  return new WordSource(language, levelWordRules(level, language), weights);
}
