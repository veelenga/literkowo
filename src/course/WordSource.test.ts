import { describe, expect, it } from 'vitest';
import { levelWords, requireLevel } from '../testing/levels';
import { difficultyFor, LEARN_STAGES } from './difficulty';
import { LEVELS, allowedKeysFor } from './regions';
import { WORD_LISTS } from './wordLists';
import type { WordRules } from './wordRules';
import { BOSS_MIN_LENGTH, SHORT_LENGTH, type KeyWeights } from './WordSource';

const SAMPLES = 200;
const RARE_SAMPLES = 10;
const WEIGHTED_SAMPLES = 3000;
const WEAK_WEIGHT = 3;
const CLEAR_PREFERENCE = 1.5;
const PHASE_RULES: WordRules = {
  allowedKeys: 'kot',
  focusKeys: 'k',
  lengths: { min: 3, max: 3 },
  generatedLengths: { min: 3, max: 3 },
};

function weakKey(key: string): KeyWeights {
  return { weightOf: (char) => (char === key ? WEAK_WEIGHT : 1) };
}

function share(items: readonly string[], matches: (item: string) => boolean): number {
  return items.filter(matches).length / items.length;
}

describe('WordSource', () => {
  it('only uses keys unlocked so far', () => {
    for (const level of LEVELS.filter((candidate) => !candidate.isBoss)) {
      const allowed = allowedKeysFor(level);
      const source = levelWords(level, 'pl');
      for (let i = 0; i < SAMPLES; i += 1) {
        for (const char of source.next() + source.learnWord(i / SAMPLES)) {
          expect(allowed).toContain(char);
        }
      }
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
      const word = source.singleLetter() + source.learnWord(i / SAMPLES) + source.next();
      expect(word).toMatch(/^[fj]+$/);
    }
  });

  it('teaches the new key with combos before short words', () => {
    const level = requireLevel('polana-4');
    const source = levelWords(level, 'pl');
    for (let i = 0; i < SAMPLES; i += 1) {
      const combo = source.learnWord(0);
      const short = source.learnWord(1);
      expect(combo).toContain('d');
      expect(combo.length).toBeLessThanOrEqual(LEARN_STAGES.combos.max);
      expect(short).toContain('d');
      expect(short.length).toBeGreaterThanOrEqual(LEARN_STAGES.words.min);
      expect(short.length).toBeLessThanOrEqual(LEARN_STAGES.words.max);
    }
  });

  it('brings in short real words with the new key when the lists have them', () => {
    const source = levelWords(requireLevel('polana-14'), 'pl');
    const words = new Set(Array.from({ length: SAMPLES }, () => source.learnWord(1)));
    const real = [...words].filter((word) => WORD_LISTS.pl.includes(word));
    expect(real.length).toBeGreaterThan(0);
    for (const word of real) expect(word).toContain('a');
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
    const allowed = allowedKeysFor(level);
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
});
