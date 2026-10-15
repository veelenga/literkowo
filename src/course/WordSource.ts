import type { WordLanguage } from '../profiles/Profile';
import { allowedKeysFor, previousLevel, type Level } from './regions';
import { WORD_LISTS } from './wordLists';

const MIN_REAL_WORDS = 12;
const GENERATED_MIN_LENGTH = 2;
const GENERATED_MAX_LENGTH = 5;
const BOSS_MIN_LENGTH = 4;
const BOSS_GENERATED_LENGTH: [number, number] = [5, 7];
const NEW_KEY_BIAS = 0.5;
const LETTERS_ONLY = /[a-ząćęłńóśźż]/;

export class WordSource {
  private readonly allowed: string;
  private readonly fresh: string;
  private readonly realWords: string[];

  constructor(level: Level, language: WordLanguage) {
    this.allowed = allowedKeysFor(level);
    this.fresh = level.isBoss
      ? (previousLevel(level, language)?.newKeys ?? this.allowed)
      : level.newKeys;
    this.realWords = WORD_LISTS[language].filter((word) => this.fitsAllowed(word));
  }

  singleLetter(): string {
    return randomChar(this.fresh);
  }

  next(): string {
    if (this.realWords.length >= MIN_REAL_WORDS && Math.random() > NEW_KEY_BIAS) {
      return pick(this.realWords.filter((word) => this.usesFresh(word))) ?? pick(this.realWords)!;
    }
    return this.generate(GENERATED_MIN_LENGTH, GENERATED_MAX_LENGTH);
  }

  bossWord(): string {
    const long = this.realWords.filter((word) => word.length >= BOSS_MIN_LENGTH);
    if (long.length >= MIN_REAL_WORDS) return pick(long)!;
    const letters = [...this.allowed].filter((char) => LETTERS_ONLY.test(char)).join('');
    return this.generate(...BOSS_GENERATED_LENGTH, letters);
  }

  private fitsAllowed(word: string): boolean {
    return [...word].every((char) => this.allowed.includes(char));
  }

  private usesFresh(word: string): boolean {
    return [...word].some((char) => this.fresh.includes(char));
  }

  private generate(min: number, max: number, pool = this.allowed): string {
    const length = randomInt(min, max);
    const fresh = [...this.fresh].filter((char) => pool.includes(char)).join('') || pool;
    return Array.from({ length }, () =>
      Math.random() < NEW_KEY_BIAS ? randomChar(fresh) : randomChar(pool),
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
