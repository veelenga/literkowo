import type { WordSource } from '../../../course/WordSource';
import { randomInt, type Random } from './kinds';

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

export function repeatedKey(words: WordSource, range: LetterRange, random: Random): string {
  return words.singleLetter().repeat(randomInt(range.min, range.max, random));
}

export function lettersWithin(words: WordSource, range: LetterRange, random: Random): string {
  return letters(words, randomInt(range.min, range.max, random));
}

export function letters(words: WordSource, count: number): string {
  let pool = '';
  while (pool.length < count) pool += words.next();
  return pool.slice(0, count);
}

export function wordPair(words: WordSource): readonly [string, string] {
  const first = words.shortWord();
  let second = words.shortWord();
  for (let attempt = 1; attempt < WORD_ATTEMPTS && second === first; attempt += 1) {
    second = words.shortWord();
  }
  return [first, second];
}
