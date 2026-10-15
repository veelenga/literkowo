import type { WordSource } from '../../../course/WordSource';

export interface LetterRange {
  readonly min: number;
  readonly max: number;
}

const WORD_ATTEMPTS = 8;

export function wordWithin(words: WordSource, range: LetterRange): string {
  for (let attempt = 0; attempt < WORD_ATTEMPTS; attempt += 1) {
    const word = words.next();
    if (word.length >= range.min && word.length <= range.max) return word;
  }
  return words.shortWord();
}

export function letters(words: WordSource, count: number): string {
  let pool = '';
  while (pool.length < count) pool += words.next();
  return pool.slice(0, count);
}
