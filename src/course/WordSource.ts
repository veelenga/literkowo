import type { WordLanguage } from '../profiles/Profile';
import { allowedKeysUpTo, lessonById } from './lessons';
import { WORD_LISTS } from './wordLists';

const MIN_REAL_WORDS = 12;
const GENERATED_MIN_LENGTH = 2;
const GENERATED_MAX_LENGTH = 5;
const NEW_KEY_BIAS = 0.5;

export class WordSource {
  private readonly allowed: string;
  private readonly fresh: string;
  private readonly realWords: string[];

  constructor(lessonId: number, language: WordLanguage) {
    this.allowed = allowedKeysUpTo(lessonId);
    this.fresh = lessonById(lessonId).newKeys;
    this.realWords = WORD_LISTS[language].filter((word) => this.fitsAllowed(word));
  }

  next(): string {
    if (this.realWords.length >= MIN_REAL_WORDS && Math.random() > NEW_KEY_BIAS) {
      return pick(this.realWords.filter((word) => this.usesFresh(word))) ?? pick(this.realWords)!;
    }
    return this.generate();
  }

  private fitsAllowed(word: string): boolean {
    return [...word].every((char) => this.allowed.includes(char));
  }

  private usesFresh(word: string): boolean {
    return [...word].some((char) => this.fresh.includes(char));
  }

  private generate(): string {
    const length = randomInt(GENERATED_MIN_LENGTH, GENERATED_MAX_LENGTH);
    return Array.from({ length }, () =>
      Math.random() < NEW_KEY_BIAS ? randomChar(this.fresh) : randomChar(this.allowed),
    ).join('');
  }
}

function pick<T>(items: T[]): T | undefined {
  return items.length ? items[Math.floor(Math.random() * items.length)] : undefined;
}

function randomChar(pool: string): string {
  return pool[Math.floor(Math.random() * pool.length)];
}

function randomInt(min: number, max: number): number {
  return min + Math.floor(Math.random() * (max - min + 1));
}
