import type { WordLanguage } from '../profiles/Profile';
import type { Level } from './catalog';
import { courseFor } from './course';
import { difficultyFor, LEARN_STAGES, type LetterRange } from './difficulty';
import { WORD_LISTS } from './wordLists';

const MIN_REAL_WORDS = 12;
const MIN_LEARN_REAL_WORDS = 3;
export const BOSS_MIN_LENGTH = 4;
const BOSS_GENERATED_LENGTH: LetterRange = { min: 5, max: 7 };
export const SHORT_LENGTH: [number, number] = [3, 4];
const NEW_KEY_BIAS = 0.5;
const LETTERS_ONLY = /[a-ząćęłńóśźż]/;
const MAX_DRAWS = 10;
const NO_STARTS: ReadonlySet<string> = new Set();
const EVEN_WEIGHT = 1;

export interface KeyWeights {
  weightOf(key: string): number;
}

const EVEN_WEIGHTS: KeyWeights = { weightOf: () => EVEN_WEIGHT };

export class WordSource {
  private readonly allowed: string;
  private readonly fresh: string;
  private readonly generatedLengths: LetterRange;
  private readonly realWords: string[];
  private readonly levelWords: string[];
  private readonly learnWords: string[];
  private readonly queuedBossWords: string[] = [];

  constructor(
    level: Level,
    language: WordLanguage,
    private readonly weights: KeyWeights = EVEN_WEIGHTS,
  ) {
    const { lengths, generatedLengths } = difficultyFor(level);
    this.allowed = courseFor(language).allowedKeys(level);
    this.fresh = level.focusKeys || this.allowed;
    this.generatedLengths = generatedLengths;
    this.realWords = WORD_LISTS[language].filter((word) => this.fitsAllowed(word));
    this.levelWords = this.realWords.filter((word) => isWithin(word, lengths));
    this.learnWords = this.realWords.filter(
      (word) => isWithin(word, LEARN_STAGES.words) && this.usesFresh(word),
    );
  }

  singleLetter(takenStarts = NO_STARTS): string {
    const open = [...this.fresh].filter((char) => !takenStarts.has(char)).join('');
    return randomChar(open || this.fresh);
  }

  next(takenStarts = NO_STARTS): string {
    return drawAvoiding(takenStarts, () => this.anyWord());
  }

  learnWord(progress: number, takenStarts = NO_STARTS): string {
    const isComboStage = progress < LEARN_STAGES.comboShare;
    return drawAvoiding(takenStarts, () => (isComboStage ? this.combo() : this.shortLearnWord()));
  }

  bossWord(): string {
    const queued = this.queuedBossWords.shift();
    if (queued) return queued;
    const long = this.realWords.filter((word) => word.length >= BOSS_MIN_LENGTH);
    const word = long.length >= MIN_REAL_WORDS ? this.pickWord(long) : undefined;
    return word ?? this.generate(BOSS_GENERATED_LENGTH, this.letters());
  }

  shortWord(): string {
    const [min, max] = SHORT_LENGTH;
    const short = this.realWords.filter((word) => word.length >= min && word.length <= max);
    const word = short.length >= MIN_REAL_WORDS ? this.pickWord(short) : undefined;
    return word ?? this.generate({ min, max }, this.letters());
  }

  queueBossWord(word: string): void {
    this.queuedBossWords.push(word);
  }

  private anyWord(): string {
    return this.realWord() ?? this.generate(this.generatedLengths);
  }

  private realWord(): string | undefined {
    if (this.levelWords.length < MIN_REAL_WORDS || isGeneratedTurn()) return undefined;
    const fresh = this.levelWords.filter((word) => this.usesFresh(word));
    return this.pickWord(fresh) ?? this.pickWord(this.levelWords);
  }

  private combo(): string {
    return this.focused(LEARN_STAGES.combos);
  }

  private shortLearnWord(): string {
    const hasWords = this.learnWords.length >= MIN_LEARN_REAL_WORDS;
    const word = hasWords && !isGeneratedTurn() ? this.pickWord(this.learnWords) : undefined;
    return word ?? this.focused(LEARN_STAGES.words);
  }

  private pickWord(words: readonly string[]): string | undefined {
    const weights = new Map([...this.allowed].map((char) => [char, this.weightOf(char)]));
    const wordWeight = (word: string) =>
      Math.max(...[...word].map((char) => weights.get(char) ?? EVEN_WEIGHT));
    return weightedPick(words, wordWeight);
  }

  private pickChar(pool: string): string {
    return weightedPick([...pool], (char) => this.weightOf(char)) ?? randomChar(pool);
  }

  private weightOf(char: string): number {
    return Math.max(0, this.weights.weightOf(char));
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

  private generate(range: LetterRange, pool = this.allowed): string {
    const fresh = [...this.fresh].filter((char) => pool.includes(char)).join('') || pool;
    return Array.from({ length: randomInt(range.min, range.max) }, () =>
      this.biasedChar(pool, fresh),
    ).join('');
  }

  private focused(range: LetterRange): string {
    const length = randomInt(range.min, range.max);
    const anchor = randomInt(0, length - 1);
    return Array.from({ length }, (_, index) =>
      index === anchor ? this.pickChar(this.fresh) : this.biasedChar(this.allowed, this.fresh),
    ).join('');
  }

  private biasedChar(pool: string, fresh: string): string {
    return Math.random() < NEW_KEY_BIAS ? this.pickChar(fresh) : this.pickChar(pool);
  }
}

function drawAvoiding(takenStarts: ReadonlySet<string>, draw: () => string): string {
  let word = draw();
  for (let attempt = 1; attempt < MAX_DRAWS && takenStarts.has(word[0]); attempt += 1) {
    word = draw();
  }
  return word;
}

function weightedPick<T>(items: readonly T[], weightOf: (item: T) => number): T | undefined {
  const weights = items.map(weightOf);
  const total = weights.reduce((sum, weight) => sum + weight, 0);
  if (total <= 0) return pick(items);
  let remaining = Math.random() * total;
  const index = weights.findIndex((weight) => (remaining -= weight) < 0);
  return items[index < 0 ? items.length - 1 : index];
}

function pick<T>(items: readonly T[]): T | undefined {
  return items.length ? items[Math.floor(Math.random() * items.length)] : undefined;
}

function randomChar(pool: string): string {
  return pool[Math.floor(Math.random() * pool.length)];
}

function isGeneratedTurn(): boolean {
  return Math.random() <= NEW_KEY_BIAS;
}

function isWithin(word: string, range: LetterRange): boolean {
  return word.length >= range.min && word.length <= range.max;
}

function randomInt(min: number, max: number): number {
  return min + Math.floor(Math.random() * (max - min + 1));
}
