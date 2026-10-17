import type { WordLanguage } from '../profiles/Profile';
import { systemRandom, type RandomSource } from '../random';
import type { LetterRange, WordStageKind } from './difficulty';
import { RecentWords } from './recentWords';
import { typability } from './typability';
import type { WordRules } from './wordRules';
import { WORD_LISTS } from './wordLists';
import { lengthsAt, stageAt } from './wordStages';

export const MIN_REAL_CHOICES = 3;
export const BOSS_MIN_LENGTH = 4;
const BOSS_GENERATED_LENGTH: LetterRange = { min: 5, max: 7 };
const BOSS_LENGTHS: LetterRange = { min: BOSS_MIN_LENGTH, max: Number.POSITIVE_INFINITY };
export const SHORT_LENGTH: [number, number] = [3, 4];
const NEW_KEY_BIAS = 0.5;
const LETTERS_ONLY = /[a-ząćęłńóśźż]/;
const MAX_DRAWS = 10;
const NO_STARTS: ReadonlySet<string> = new Set();
const EVEN_WEIGHT = 1;
const NO_STAGES = [] as const;
const TYPABILITY_DRAWS = 4;
const TYPABILITY_FLOOR = 0.25;

export interface KeyWeights {
  weightOf(key: string): number;
}

interface FittingWords {
  readonly all: readonly string[];
  readonly withFocusKey: readonly string[];
}

interface WordPools {
  readonly rules: WordRules;
  readonly fresh: string;
  readonly realWords: readonly string[];
  readonly ease: ReadonlyMap<string, number>;
  readonly byLengths: Map<string, FittingWords>;
}

export const EVEN_WEIGHTS: KeyWeights = { weightOf: () => EVEN_WEIGHT };

export class WordSource {
  private pools: WordPools;
  private readonly queuedBossWords: string[] = [];

  constructor(
    private readonly language: WordLanguage,
    rules: WordRules,
    private readonly weights: KeyWeights = EVEN_WEIGHTS,
    private readonly random: RandomSource = systemRandom(),
    private readonly recent: RecentWords = new RecentWords(),
  ) {
    this.pools = poolsFor(language, rules);
  }

  use(rules: WordRules): void {
    if (rules !== this.pools.rules) this.pools = poolsFor(this.language, rules);
  }

  singleLetter(takenStarts = NO_STARTS): string {
    const open = [...this.fresh].filter((char) => !takenStarts.has(char)).join('');
    return this.randomChar(open || this.fresh);
  }

  next(takenStarts = NO_STARTS): string {
    return this.shown(drawAvoiding(takenStarts, () => this.anyWord(this.pools.rules.lengths)));
  }

  stagedWord(progress: number, takenStarts = NO_STARTS): string {
    const point = stageAt(this.pools.rules.stages ?? NO_STAGES, progress);
    if (!point) return this.next(takenStarts);
    const lengths = lengthsAt(point.stage.lengths, point.progress);
    return this.shown(drawAvoiding(takenStarts, () => this.stageWord(point.stage.kind, lengths)));
  }

  bossWord(): string {
    const queued = this.queuedBossWords.shift();
    if (queued) return queued;
    const long = this.fitting(BOSS_LENGTHS).all;
    return this.shown(this.openWord(long) ?? this.generate(BOSS_GENERATED_LENGTH, this.letters()));
  }

  shortWord(): string {
    const [min, max] = SHORT_LENGTH;
    const short = this.fitting({ min, max }).all;
    return this.shown(this.openWord(short) ?? this.generate({ min, max }, this.letters()));
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

  private stageWord(kind: WordStageKind, lengths: LetterRange): string {
    if (kind === 'combos') return this.focused(lengths);
    if (kind === 'focusWords') return this.focusWord(lengths);
    return this.anyWord(lengths);
  }

  private anyWord(lengths: LetterRange): string {
    if (this.pools.rules.realWordsOnly) return this.listedWord(lengths);
    return this.realWord(lengths) ?? this.generate(this.generatedWithin(lengths));
  }

  private listedWord(lengths: LetterRange): string {
    const { all, withFocusKey } = this.fitting(lengths);
    const word =
      this.openWord(withFocusKey) ??
      this.openWord(all) ??
      this.pickWord(all) ??
      this.pickWord(this.pools.realWords);
    return word ?? this.generate(this.generatedWithin(lengths));
  }

  private realWord(lengths: LetterRange): string | undefined {
    const { all, withFocusKey } = this.fitting(lengths);
    const word = this.openWord(withFocusKey);
    if (word || this.isGeneratedTurn()) return word;
    return this.openWord(all);
  }

  private focusWord(lengths: LetterRange): string {
    return this.openWord(this.fitting(lengths).withFocusKey) ?? this.focused(lengths);
  }

  private openWord(words: readonly string[]): string | undefined {
    const open = words.filter((word) => !this.recent.has(word));
    return open.length >= MIN_REAL_CHOICES ? this.pickWord(open) : undefined;
  }

  private shown(word: string): string {
    this.recent.add(word);
    return word;
  }

  private fitting(lengths: LetterRange): FittingWords {
    const key = `${lengths.min}:${lengths.max}`;
    const cached = this.pools.byLengths.get(key);
    if (cached) return cached;
    const all = this.pools.realWords.filter((word) => isWithin(word, lengths));
    const words = { all, withFocusKey: all.filter((word) => usesFresh(word, this.fresh)) };
    this.pools.byLengths.set(key, words);
    return words;
  }

  private generatedWithin(lengths: LetterRange): LetterRange {
    const cap = this.pools.rules.generatedLengths.max;
    return { min: lengths.min, max: Math.max(lengths.min, Math.min(lengths.max, cap)) };
  }

  private pickWord(words: readonly string[]): string | undefined {
    const weights = new Map([...this.allowed].map((char) => [char, this.weightOf(char)]));
    const weakness = (word: string) =>
      Math.max(...[...word].map((char) => weights.get(char) ?? EVEN_WEIGHT));
    const ease = (word: string) => this.pools.ease.get(word) ?? easeOf(word, this.fresh);
    return this.weightedPick(words, (word) => weakness(word) * ease(word));
  }

  private pickChar(pool: string): string {
    return this.weightedPick([...pool], (char) => this.weightOf(char)) ?? this.randomChar(pool);
  }

  private weightOf(char: string): number {
    return Math.max(0, this.weights.weightOf(char));
  }

  private letters(): string {
    return [...this.allowed].filter((char) => LETTERS_ONLY.test(char)).join('');
  }

  private generate(range: LetterRange, pool = this.allowed): string {
    const fresh = [...this.fresh].filter((char) => pool.includes(char)).join('') || pool;
    const length = this.randomInt(range.min, range.max);
    return easiestOf(() => Array.from({ length }, () => this.biasedChar(pool, fresh)).join(''));
  }

  private focused(range: LetterRange): string {
    const length = this.randomInt(range.min, range.max);
    return easiestOf(() => {
      const anchor = this.randomInt(0, length - 1);
      return Array.from({ length }, (_, index) =>
        index === anchor ? this.pickChar(this.fresh) : this.biasedChar(this.allowed, this.fresh),
      ).join('');
    });
  }

  private biasedChar(pool: string, fresh: string): string {
    return this.random.next() < NEW_KEY_BIAS ? this.pickChar(fresh) : this.pickChar(pool);
  }

  private weightedPick<T>(items: readonly T[], weightOf: (item: T) => number): T | undefined {
    const weights = items.map(weightOf);
    const total = weights.reduce((sum, weight) => sum + weight, 0);
    if (total <= 0) return items.length ? this.random.pick(items) : undefined;
    let remaining = this.random.next() * total;
    const index = weights.findIndex((weight) => (remaining -= weight) < 0);
    return items[index < 0 ? items.length - 1 : index];
  }

  private randomChar(pool: string): string {
    return pool[this.random.int(pool.length)];
  }

  private isGeneratedTurn(): boolean {
    return this.random.next() <= NEW_KEY_BIAS;
  }

  private randomInt(min: number, max: number): number {
    return min + this.random.int(max - min + 1);
  }
}

function poolsFor(language: WordLanguage, rules: WordRules): WordPools {
  const fresh = rules.focusKeys || rules.allowedKeys;
  const realWords = WORD_LISTS[language].filter((word) => usesOnly(word, rules.allowedKeys));
  const ease = new Map(realWords.map((word) => [word, easeOf(word, fresh)]));
  return { rules, fresh, realWords, ease, byLengths: new Map() };
}

function easeOf(word: string, fresh: string): number {
  return TYPABILITY_FLOOR + typability(word, fresh);
}

function usesOnly(word: string, keys: string): boolean {
  return [...word].every((char) => keys.includes(char));
}

function usesFresh(word: string, fresh: string): boolean {
  return [...word].some((char) => fresh.includes(char));
}

function easiestOf(draw: () => string): string {
  const candidates = Array.from({ length: TYPABILITY_DRAWS }, draw);
  return candidates.reduce((best, word) => (typability(word) > typability(best) ? word : best));
}

function drawAvoiding(takenStarts: ReadonlySet<string>, draw: () => string): string {
  let word = draw();
  for (let attempt = 1; attempt < MAX_DRAWS && takenStarts.has(word[0]); attempt += 1) {
    word = draw();
  }
  return word;
}

function isWithin(word: string, range: LetterRange): boolean {
  return word.length >= range.min && word.length <= range.max;
}
