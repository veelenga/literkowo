import type { WordLanguage } from '../profiles/Profile';
import { LEARN_STAGES, type LetterRange } from './difficulty';
import type { WordRules } from './wordRules';
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

interface WordPools {
  readonly rules: WordRules;
  readonly fresh: string;
  readonly realWords: readonly string[];
  readonly fittingWords: readonly string[];
  readonly learnWords: readonly string[];
}

const EVEN_WEIGHTS: KeyWeights = { weightOf: () => EVEN_WEIGHT };

export class WordSource {
  private pools: WordPools;
  private readonly queuedBossWords: string[] = [];

  constructor(
    private readonly language: WordLanguage,
    rules: WordRules,
    private readonly weights: KeyWeights = EVEN_WEIGHTS,
  ) {
    this.pools = poolsFor(language, rules);
  }

  use(rules: WordRules): void {
    if (rules !== this.pools.rules) this.pools = poolsFor(this.language, rules);
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
    const long = this.pools.realWords.filter((word) => word.length >= BOSS_MIN_LENGTH);
    const word = long.length >= MIN_REAL_WORDS ? this.pickWord(long) : undefined;
    return word ?? this.generate(BOSS_GENERATED_LENGTH, this.letters());
  }

  shortWord(): string {
    const [min, max] = SHORT_LENGTH;
    const short = this.pools.realWords.filter((word) => word.length >= min && word.length <= max);
    const word = short.length >= MIN_REAL_WORDS ? this.pickWord(short) : undefined;
    return word ?? this.generate({ min, max }, this.letters());
  }

  queueBossWord(word: string): void {
    this.queuedBossWords.push(word);
  }

  private get allowed(): string {
    return this.pools.rules.allowedKeys;
  }

  private get fresh(): string {
    return this.pools.fresh;
  }

  private anyWord(): string {
    return this.realWord() ?? this.generate(this.pools.rules.generatedLengths);
  }

  private realWord(): string | undefined {
    const { fittingWords } = this.pools;
    if (fittingWords.length < MIN_REAL_WORDS || isGeneratedTurn()) return undefined;
    const fresh = fittingWords.filter((word) => usesFresh(word, this.fresh));
    return this.pickWord(fresh) ?? this.pickWord(fittingWords);
  }

  private combo(): string {
    return this.focused(LEARN_STAGES.combos);
  }

  private shortLearnWord(): string {
    const { learnWords } = this.pools;
    const hasWords = learnWords.length >= MIN_LEARN_REAL_WORDS;
    const word = hasWords && !isGeneratedTurn() ? this.pickWord(learnWords) : undefined;
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

function poolsFor(language: WordLanguage, rules: WordRules): WordPools {
  const fresh = rules.focusKeys || rules.allowedKeys;
  const realWords = WORD_LISTS[language].filter((word) => usesOnly(word, rules.allowedKeys));
  return {
    rules,
    fresh,
    realWords,
    fittingWords: realWords.filter((word) => isWithin(word, rules.lengths)),
    learnWords: realWords.filter(
      (word) => isWithin(word, LEARN_STAGES.words) && usesFresh(word, fresh),
    ),
  };
}

function usesOnly(word: string, keys: string): boolean {
  return [...word].every((char) => keys.includes(char));
}

function usesFresh(word: string, fresh: string): boolean {
  return [...word].some((char) => fresh.includes(char));
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
