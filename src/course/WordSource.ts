import type { WordLanguage } from '../profiles/Profile';
import type { Level } from './catalog';
import { courseFor } from './course';
import { WORD_LISTS } from './wordLists';

const MIN_REAL_WORDS = 12;
const GENERATED_MIN_LENGTH = 2;
const GENERATED_MAX_LENGTH = 5;
export const BOSS_MIN_LENGTH = 4;
const BOSS_GENERATED_LENGTH: [number, number] = [5, 7];
export const SHORT_LENGTH: [number, number] = [3, 4];
const NEW_KEY_BIAS = 0.5;
const LETTERS_ONLY = /[a-ząćęłńóśźż]/;

export class WordSource {
  private readonly allowed: string;
  private readonly fresh: string;
  private readonly realWords: string[];
  private readonly queuedBossWords: string[] = [];

  constructor(level: Level, language: WordLanguage) {
    const course = courseFor(language);
    this.allowed = course.allowedKeys(level);
    this.fresh = level.isBoss ? (course.previous(level)?.newKeys ?? this.allowed) : level.newKeys;
    this.realWords = WORD_LISTS[language].filter((word) => this.fitsAllowed(word));
  }

  singleLetter(): string {
    return randomChar(this.fresh);
  }

  next(): string {
    return this.realWord() ?? this.generate(GENERATED_MIN_LENGTH, GENERATED_MAX_LENGTH);
  }

  bossWord(): string {
    const queued = this.queuedBossWords.shift();
    if (queued) return queued;
    const long = this.realWords.filter((word) => word.length >= BOSS_MIN_LENGTH);
    const word = long.length >= MIN_REAL_WORDS ? pick(long) : undefined;
    return word ?? this.generate(...BOSS_GENERATED_LENGTH, this.letters());
  }

  shortWord(): string {
    const [min, max] = SHORT_LENGTH;
    const short = this.realWords.filter((word) => word.length >= min && word.length <= max);
    const word = short.length >= MIN_REAL_WORDS ? pick(short) : undefined;
    return word ?? this.generate(min, max, this.letters());
  }

  queueBossWord(word: string): void {
    this.queuedBossWords.push(word);
  }

  private realWord(): string | undefined {
    if (this.realWords.length < MIN_REAL_WORDS || Math.random() <= NEW_KEY_BIAS) return undefined;
    return pick(this.realWords.filter((word) => this.usesFresh(word))) ?? pick(this.realWords);
  }

  private letters(): string {
    return [...this.allowed].filter((char) => LETTERS_ONLY.test(char)).join('');
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
