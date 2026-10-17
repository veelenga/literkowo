import { describe, expect, it } from 'vitest';
import { levelWords, requireLevel } from '../testing/levels';
import { difficultyFor, FOCUS_WORD_LENGTHS, PRACTICE_LENGTHS } from './difficulty';
import { LEVELS, REGIONS } from './catalog';
import { allowedKeysFor } from './course';
import { TRANSITION_SCORES, transitionScore } from './typability';
import { WORD_LISTS } from './wordLists';
import { levelWordRules, type WordRules } from './wordRules';
import type { WordLanguage } from '../profiles/Profile';
import { seededRandom } from '../random';
import { RECENT_WORDS } from './recentWords';
import {
  BOSS_MIN_LENGTH,
  EVEN_WEIGHTS,
  MIN_REAL_CHOICES,
  SHORT_LENGTH,
  WordSource,
  type KeyWeights,
} from './WordSource';

const SAMPLES = 200;
const RARE_SAMPLES = 10;
const WEIGHTED_SAMPLES = 3000;
const WEAK_WEIGHT = 3;
const CLEAR_PREFERENCE = 1.5;
const SHORT_COMBO = 2;
const EARLY_WORDS = 0.3;
const LAST_SPAWN = 0.99;
const COMBO_SAMPLES = 2000;
const RARE_SHARE = 0.02;
const CLEAR_AVOIDANCE = 0.8;
const SEED = 7;
const OTHER_SEED = 8;
const SEEDED_DRAWS = 40;
const ALL_LETTERS = 'abcdefghijklmnopqrstuvwxyząćęłńóśźż';
const FOCUS_WORD_RULES: WordRules = {
  allowedKeys: ALL_LETTERS,
  focusKeys: 'r',
  lengths: { min: 3, max: 6 },
  generatedLengths: { min: 3, max: 6 },
  stages: [{ kind: 'focusWords', share: 1, lengths: { min: 3, max: 6 } }],
};
const LISTED_RULES: WordRules = {
  allowedKeys: 'fjdksla;gheiru',
  focusKeys: 'gheiru',
  lengths: { min: 3, max: 5 },
  generatedLengths: { min: 3, max: 5 },
  realWordsOnly: true,
};
const PHASE_RULES: WordRules = {
  allowedKeys: 'kot',
  focusKeys: 'k',
  lengths: { min: 3, max: 3 },
  generatedLengths: { min: 3, max: 3 },
};
const LAS_KEYS = 'fjdksla;gheiru';
const POLANA_KEYS = 'fjdksla;';
const SHORT_WORDS = { min: 2, max: 3 };
const ALL_KEYS_RULES: WordRules = {
  allowedKeys: LAS_KEYS,
  focusKeys: LAS_KEYS,
  lengths: SHORT_WORDS,
  generatedLengths: SHORT_WORDS,
};
const FEW_WORDS_RULES: WordRules = {
  ...ALL_KEYS_RULES,
  allowedKeys: POLANA_KEYS,
  focusKeys: POLANA_KEYS,
};
const SMALL_POOL_RULES: WordRules = {
  allowedKeys: 'kot',
  focusKeys: 'k',
  lengths: { min: 2, max: 4 },
  generatedLengths: { min: 2, max: 2 },
};
const MIXED_SHARE = { min: 0.4, max: 0.9 };
const TAUGHT_SHARE = 0.6;
const FIRST_DRAWS = 50;

function weakKey(key: string): KeyWeights {
  return { weightOf: (char) => (char === key ? WEAK_WEIGHT : 1) };
}

function sameFingerAt(word: string, keys = word): boolean {
  const chars = [...word];
  return chars.slice(1).some((char, index) => {
    const previous = chars[index];
    const touchesKeys = keys.includes(char) || keys.includes(previous);
    return touchesKeys && transitionScore(previous, char) === TRANSITION_SCORES.sameFinger;
  });
}

function share(items: readonly string[], matches: (item: string) => boolean): number {
  return items.filter(matches).length / items.length;
}

function isListed(word: string, language: WordLanguage = 'pl'): boolean {
  return WORD_LISTS[language].includes(word);
}

function fittingWords(rules: WordRules): string[] {
  const { allowedKeys, lengths } = rules;
  return WORD_LISTS.pl.filter(
    (word) =>
      word.length >= lengths.min &&
      word.length <= lengths.max &&
      [...word].every((char) => allowedKeys.includes(char)),
  );
}

function recentRepeats(words: readonly string[]): string[] {
  return words.filter((word, index) =>
    words.slice(Math.max(0, index - RECENT_WORDS), index).includes(word),
  );
}

describe('WordSource', () => {
  it('gives only listed words when the rules ask for real words', () => {
    const words = new WordSource('pl', LISTED_RULES);
    const listed = new Set(WORD_LISTS.pl);
    const drawn = Array.from({ length: SAMPLES }, () => words.next());
    expect(drawn.every((word) => listed.has(word))).toBe(true);
    expect(drawn.every((word) => word.length >= 3 && word.length <= 5)).toBe(true);
    expect(drawn.every((word) => [...word].some((char) => 'gheiru'.includes(char)))).toBe(true);
  });

  it('falls back to any fitting listed word when no word has a focus key', () => {
    const words = new WordSource('en', {
      ...LISTED_RULES,
      allowedKeys: 'fjdksla;',
      focusKeys: 'g',
    });
    const listed = new Set(WORD_LISTS.en);
    const drawn = Array.from({ length: SAMPLES }, () => words.next());
    expect(drawn.every((word) => listed.has(word))).toBe(true);
  });

  it.each(REGIONS.map((region) => region.id))('only uses keys unlocked so far in %s', (id) => {
    const levels = LEVELS.filter((level) => level.regionId === id && !level.isBoss);
    for (const level of levels) {
      const allowed = allowedKeysFor(level, 'pl');
      const source = levelWords(level, 'pl');
      const drawn = Array.from(
        { length: SAMPLES },
        (_, i) => source.next() + source.stagedWord(i / SAMPLES),
      ).join('');
      expect([...new Set(drawn)].filter((char) => !allowed.includes(char))).toEqual([]);
    }
  });

  it('switches to the keys and lengths of the next phase', () => {
    const source = levelWords(requireLevel('polana-1'), 'pl');
    source.use(PHASE_RULES);
    for (let i = 0; i < SAMPLES; i += 1) {
      expect(source.next()).toMatch(/^[kot]{3}$/);
      expect(source.singleLetter()).toBe('k');
    }
  });

  it('keeps words within the length limits of the level', () => {
    for (const level of LEVELS.filter((candidate) => !candidate.isBoss)) {
      const { min, max } = difficultyFor(level).lengths;
      const source = levelWords(level, 'pl');
      for (let i = 0; i < SAMPLES; i += 1) {
        const word = source.next();
        expect(word.length).toBeGreaterThanOrEqual(min);
        expect(word.length).toBeLessThanOrEqual(max);
      }
    }
  });

  it('shows only f and j in the first level', () => {
    const source = levelWords(requireLevel('polana-1'), 'pl');
    for (let i = 0; i < SAMPLES; i += 1) {
      const word = source.singleLetter() + source.stagedWord(i / SAMPLES) + source.next();
      expect(word).toMatch(/^[fj]+$/);
    }
  });

  it('teaches the new key with short combos before short words', () => {
    const source = levelWords(requireLevel('polana-4'), 'pl');
    for (let i = 0; i < SAMPLES; i += 1) {
      const combo = source.stagedWord(0);
      const short = source.stagedWord(LAST_SPAWN);
      expect(combo).toContain('d');
      expect(combo.length).toBeLessThanOrEqual(SHORT_COMBO);
      expect(short).toContain('d');
      expect(short.length).toBeGreaterThanOrEqual(FOCUS_WORD_LENGTHS.min);
      expect(short.length).toBeLessThanOrEqual(FOCUS_WORD_LENGTHS.max);
    }
  });

  it('brings in short real words with the new key when the lists have them', () => {
    const source = levelWords(requireLevel('polana-14'), 'pl');
    const words = new Set(Array.from({ length: SAMPLES }, () => source.stagedWord(LAST_SPAWN)));
    const real = [...words].filter((word) => WORD_LISTS.pl.includes(word));
    expect(real.length).toBeGreaterThan(0);
    for (const word of real) expect(word).toContain('a');
  });

  it('opens a practice level with words of the new key and grows the length after', () => {
    const source = levelWords(requireLevel('las-12'), 'pl');
    const sample = (progress: number) =>
      Array.from({ length: SAMPLES }, () => source.stagedWord(progress));
    const opening = sample(0);
    const early = sample(EARLY_WORDS);
    const late = sample(LAST_SPAWN);
    for (const word of opening) {
      expect(word).toContain('r');
      expect(word.length).toBeLessThanOrEqual(FOCUS_WORD_LENGTHS.max);
    }
    for (const word of early) expect(word.length).toBeLessThan(PRACTICE_LENGTHS.max);
    expect(late.some((word) => word.length === PRACTICE_LENGTHS.max)).toBe(true);
  });

  it('warm-up letters come from the focus keys of the level', () => {
    const level = requireLevel('las-10');
    const source = levelWords(level, 'pl');
    for (let i = 0; i < SAMPLES; i += 1) expect(level.focusKeys).toContain(source.singleLetter());
  });

  it('boss words are long and contain only letters', () => {
    const boss = requireLevel('polana-19');
    const source = levelWords(boss, 'pl');
    for (let i = 0; i < SAMPLES; i += 1) {
      const word = source.bossWord();
      expect(word.length).toBeGreaterThanOrEqual(BOSS_MIN_LENGTH);
      expect(word).toMatch(/^[a-ząćęłńóśźż]+$/);
    }
  });

  it('uses real words once enough letters are unlocked', () => {
    const level = requireLevel('jaskinia-20');
    const source = levelWords(level, 'en');
    const words = new Set(Array.from({ length: SAMPLES }, () => source.next()));
    expect([...words].some((word) => ['bread', 'crab', 'bear'].includes(word))).toBe(true);
  });

  it('short words have three or four letters', () => {
    const [min, max] = SHORT_LENGTH;
    for (const id of ['polana-19', 'jaskinia-24']) {
      const source = levelWords(requireLevel(id), 'pl');
      for (let i = 0; i < SAMPLES; i += 1) {
        const word = source.shortWord();
        expect(word.length).toBeGreaterThanOrEqual(min);
        expect(word.length).toBeLessThanOrEqual(max);
        expect(word).toMatch(/^[a-ząćęłńóśźż]+$/);
      }
    }
  });

  it('prefers words that do not start with a letter already on the board', () => {
    const taken = new Set(['f', 'j', 'g']);
    const source = levelWords(requireLevel('las-7'), 'pl');
    for (let i = 0; i < SAMPLES; i += 1) expect(taken).not.toContain(source.next(taken)[0]);
  });

  it('rarely repeats a first letter on the board even with only two keys', () => {
    const source = levelWords(requireLevel('polana-2'), 'pl');
    const taken = new Set(['f']);
    const words = Array.from({ length: SAMPLES }, () => source.next(taken));
    expect(words.filter((word) => word.startsWith('f')).length).toBeLessThan(RARE_SAMPLES);
  });

  it('still gives a word when every letter is on the board', () => {
    const level = requireLevel('polana-1');
    const allowed = allowedKeysFor(level, 'pl');
    const source = levelWords(level, 'pl');
    for (let i = 0; i < SAMPLES; i += 1) {
      for (const char of source.next(new Set(allowed))) expect(allowed).toContain(char);
    }
  });

  it('warm-up letters avoid keys already on the board', () => {
    const level = requireLevel('las-10');
    const [taken, open] = level.focusKeys;
    const source = levelWords(level, 'pl');
    for (let i = 0; i < SAMPLES; i += 1) expect(source.singleLetter(new Set([taken]))).toBe(open);
  });

  it('warm-up letters fall back to any new key when all are on the board', () => {
    const level = requireLevel('las-10');
    const source = levelWords(level, 'pl');
    const taken = new Set(level.focusKeys);
    for (let i = 0; i < SAMPLES; i += 1)
      expect(level.focusKeys).toContain(source.singleLetter(taken));
  });

  it('gives queued boss words first, once each', () => {
    const source = levelWords(requireLevel('las-16'), 'pl');
    source.queueBossWord('ser');
    source.queueBossWord('kura');
    expect(source.bossWord()).toBe('ser');
    expect(source.bossWord()).toBe('kura');
    expect(source.bossWord().length).toBeGreaterThanOrEqual(BOSS_MIN_LENGTH);
  });

  it('generates more letters of a weak key', () => {
    const level = requireLevel('polana-8');
    const letters = (weights?: KeyWeights) => {
      const source = levelWords(level, 'pl', weights);
      return Array.from({ length: WEIGHTED_SAMPLES }, () => source.next()).flatMap((word) => [
        ...word,
      ]);
    };
    const even = share(letters(), (char) => char === 'f');
    const weighted = share(letters(weakKey('f')), (char) => char === 'f');
    expect(weighted).toBeGreaterThan(even * CLEAR_PREFERENCE);
  });

  it('picks more real words with a weak key', () => {
    const level = requireLevel('jaskinia-24');
    const words = (weights?: KeyWeights) => {
      const source = levelWords(level, 'en', weights);
      return Array.from({ length: WEIGHTED_SAMPLES }, () => source.bossWord());
    };
    const even = share(words(), (word) => word.includes('w'));
    const weighted = share(words(weakKey('w')), (word) => word.includes('w'));
    expect(even).toBeGreaterThan(0);
    expect(weighted).toBeGreaterThan(even * CLEAR_PREFERENCE);
  });

  it('picks generated words where no finger presses twice in a row', () => {
    for (const id of ['las-11', 'las-12', 'gory-1', 'gory-2']) {
      const source = levelWords(requireLevel(id), 'pl');
      for (const progress of [0, EARLY_WORDS, LAST_SPAWN]) {
        const words = Array.from({ length: COMBO_SAMPLES }, () => source.stagedWord(progress));
        const generated = words.filter((word) => !isListed(word));
        expect(share(generated, (word) => sameFingerAt(word))).toBeLessThan(RARE_SHARE);
      }
    }
  });

  it('gives only real words when enough of them fit the keys and lengths', () => {
    expect(fittingWords(ALL_KEYS_RULES).length).toBeGreaterThanOrEqual(
      RECENT_WORDS + MIN_REAL_CHOICES,
    );
    const source = new WordSource('pl', ALL_KEYS_RULES);
    const words = Array.from({ length: SAMPLES }, () => source.next());
    expect(words.every((word) => isListed(word))).toBe(true);
  });

  it('never shows a real word again within the last eight words', () => {
    const source = new WordSource('pl', ALL_KEYS_RULES);
    const words = Array.from({ length: SAMPLES }, () => source.next());
    expect(recentRepeats(words)).toEqual([]);
  });

  it('mixes in generated strings when too few real words fit to avoid repeats', () => {
    const fitting = fittingWords(FEW_WORDS_RULES).length;
    expect(fitting).toBeGreaterThanOrEqual(MIN_REAL_CHOICES);
    expect(fitting).toBeLessThan(RECENT_WORDS + MIN_REAL_CHOICES);
    const source = new WordSource('pl', FEW_WORDS_RULES, EVEN_WEIGHTS, seededRandom(SEED));
    const words = Array.from({ length: SAMPLES }, () => source.next());
    const real = share(words, (word) => isListed(word));
    expect(real).toBeGreaterThan(MIXED_SHARE.min);
    expect(real).toBeLessThan(MIXED_SHARE.max);
  });

  it('gives only generated strings when fewer real words fit than it picks from', () => {
    expect(fittingWords(SMALL_POOL_RULES).length).toBeLessThan(MIN_REAL_CHOICES);
    const source = new WordSource('pl', SMALL_POOL_RULES);
    const words = Array.from({ length: SAMPLES }, () => source.next());
    expect(words.every((word) => word.length === SMALL_POOL_RULES.generatedLengths.max)).toBe(true);
  });

  it('opens a practice stage with real words of the new key', () => {
    const level = requireLevel('las-2');
    for (let i = 0; i < FIRST_DRAWS; i += 1) {
      const word = levelWords(level, 'pl').stagedWord(LAST_SPAWN);
      expect(isListed(word)).toBe(true);
      expect(word).toContain('g');
    }
  });

  it('keeps teaching the new key with generated strings once its few real words have shown', () => {
    const rules = levelWordRules(requireLevel('las-2'), 'pl');
    const source = new WordSource('pl', rules, EVEN_WEIGHTS, seededRandom(SEED));
    const words = Array.from({ length: WEIGHTED_SAMPLES }, () => source.stagedWord(LAST_SPAWN));
    const generated = words.filter((word) => !isListed(word));
    expect(generated.length).toBeGreaterThan(0);
    expect(share(generated, (word) => word.includes('g'))).toBeGreaterThan(TAUGHT_SHARE);
  });

  it('picks more real words with a weak key when every key is in focus', () => {
    const rules = { ...ALL_KEYS_RULES, lengths: PRACTICE_LENGTHS };
    const words = (weights?: KeyWeights) => {
      const source = new WordSource('pl', rules, weights, seededRandom(SEED));
      return Array.from({ length: WEIGHTED_SAMPLES }, () => source.next());
    };
    const even = share(words(), (word) => word.includes('g'));
    const weighted = share(words(weakKey('g')), (word) => word.includes('g'));
    expect(even).toBeGreaterThan(0);
    expect(weighted).toBeGreaterThan(even * CLEAR_PREFERENCE);
  });

  it('prefers real words that are easy to type when every key is in focus', () => {
    const rules = { ...ALL_KEYS_RULES, lengths: PRACTICE_LENGTHS };
    const source = new WordSource('pl', rules, EVEN_WEIGHTS, seededRandom(SEED));
    const picks = Array.from({ length: WEIGHTED_SAMPLES }, () => source.next());
    const hard = (word: string) => sameFingerAt(word);
    const pool = fittingWords(rules);
    expect(share(pool, hard)).toBeGreaterThan(0);
    expect(share(picks, hard)).toBeLessThan(share(pool, hard));
  });

  it('prefers real words that are easy to type around the focus key', () => {
    const fitting = WORD_LISTS.pl.filter((word) => word.length >= 3 && word.length <= 6);
    const pool = fitting.filter((word) => word.includes('r'));
    const source = new WordSource('pl', FOCUS_WORD_RULES);
    const picks = Array.from({ length: WEIGHTED_SAMPLES }, () => source.stagedWord(0)).filter(
      (word) => pool.includes(word),
    );
    const hard = (word: string) => sameFingerAt(word, 'r');
    expect(share(pool, hard)).toBeGreaterThan(0);
    expect(share(picks, hard)).toBeLessThan(share(pool, hard) * CLEAR_AVOIDANCE);
  });

  it('draws the same words from the same seed', () => {
    expect(seededDraws(SEED)).toEqual(seededDraws(SEED));
  });

  it('draws other words from another seed', () => {
    expect(seededDraws(SEED)).not.toEqual(seededDraws(OTHER_SEED));
  });
});

function seededDraws(seed: number): string[] {
  const rules = levelWordRules(requireLevel('las-5'), 'pl');
  const words = new WordSource('pl', rules, EVEN_WEIGHTS, seededRandom(seed));
  return Array.from({ length: SEEDED_DRAWS }, (_, index) => [
    words.singleLetter(),
    words.stagedWord(index / SEEDED_DRAWS),
    words.next(),
    words.shortWord(),
    words.bossWord(),
  ]).flat();
}
