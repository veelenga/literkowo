import { describe, expect, it } from 'vitest';
import { requireLevel } from '../testing/levels';
import { LEVELS, allowedKeysFor } from './regions';
import { BOSS_MIN_LENGTH, SHORT_LENGTH, WordSource, type KeyWeights } from './WordSource';

const SAMPLES = 200;
const RARE_SAMPLES = 10;
const WEIGHTED_SAMPLES = 3000;
const WEAK_WEIGHT = 3;
const CLEAR_PREFERENCE = 1.5;

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
      const source = new WordSource(level, 'pl');
      for (let i = 0; i < SAMPLES; i += 1) {
        for (const char of source.next()) expect(allowed).toContain(char);
      }
    }
  });

  it('warm-up letters come from the new keys of the level', () => {
    const level = requireLevel('las-2');
    const source = new WordSource(level, 'pl');
    for (let i = 0; i < SAMPLES; i += 1) expect(level.newKeys).toContain(source.singleLetter());
  });

  it('boss words are long and contain only letters', () => {
    const boss = requireLevel('polana-5');
    const source = new WordSource(boss, 'pl');
    for (let i = 0; i < SAMPLES; i += 1) {
      const word = source.bossWord();
      expect(word.length).toBeGreaterThanOrEqual(BOSS_MIN_LENGTH);
      expect(word).toMatch(/^[a-ząćęłńóśźż]+$/);
    }
  });

  it('uses real words once enough letters are unlocked', () => {
    const level = requireLevel('jaskinia-4');
    const source = new WordSource(level, 'en');
    const words = new Set(Array.from({ length: SAMPLES }, () => source.next()));
    expect([...words].some((word) => ['bread', 'rabbit', 'banana'].includes(word))).toBe(true);
  });

  it('short words have three or four letters', () => {
    const [min, max] = SHORT_LENGTH;
    for (const id of ['polana-5', 'jaskinia-5']) {
      const source = new WordSource(requireLevel(id), 'pl');
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
    const source = new WordSource(requireLevel('las-2'), 'pl');
    for (let i = 0; i < SAMPLES; i += 1) expect(taken).not.toContain(source.next(taken)[0]);
  });

  it('rarely repeats a first letter on the board even with only two keys', () => {
    const source = new WordSource(requireLevel('polana-1'), 'pl');
    const taken = new Set(['f']);
    const words = Array.from({ length: SAMPLES }, () => source.next(taken));
    expect(words.filter((word) => word.startsWith('f')).length).toBeLessThan(RARE_SAMPLES);
  });

  it('still gives a word when every letter is on the board', () => {
    const level = requireLevel('polana-1');
    const allowed = allowedKeysFor(level);
    const source = new WordSource(level, 'pl');
    for (let i = 0; i < SAMPLES; i += 1) {
      for (const char of source.next(new Set(allowed))) expect(allowed).toContain(char);
    }
  });

  it('warm-up letters avoid keys already on the board', () => {
    const level = requireLevel('las-2');
    const [taken, open] = level.newKeys;
    const source = new WordSource(level, 'pl');
    for (let i = 0; i < SAMPLES; i += 1) expect(source.singleLetter(new Set([taken]))).toBe(open);
  });

  it('warm-up letters fall back to any new key when all are on the board', () => {
    const level = requireLevel('las-2');
    const source = new WordSource(level, 'pl');
    const taken = new Set(level.newKeys);
    for (let i = 0; i < SAMPLES; i += 1)
      expect(level.newKeys).toContain(source.singleLetter(taken));
  });

  it('gives queued boss words first, once each', () => {
    const source = new WordSource(requireLevel('las-4'), 'pl');
    source.queueBossWord('ser');
    source.queueBossWord('kura');
    expect(source.bossWord()).toBe('ser');
    expect(source.bossWord()).toBe('kura');
    expect(source.bossWord().length).toBeGreaterThanOrEqual(BOSS_MIN_LENGTH);
  });

  it('generates more letters of a weak key', () => {
    const level = requireLevel('polana-2');
    const letters = (weights?: KeyWeights) => {
      const source = new WordSource(level, 'pl', weights);
      return Array.from({ length: WEIGHTED_SAMPLES }, () => source.next()).flatMap((word) => [
        ...word,
      ]);
    };
    const even = share(letters(), (char) => char === 'f');
    const weighted = share(letters(weakKey('f')), (char) => char === 'f');
    expect(weighted).toBeGreaterThan(even * CLEAR_PREFERENCE);
  });

  it('picks more real words with a weak key', () => {
    const level = requireLevel('jaskinia-5');
    const words = (weights?: KeyWeights) => {
      const source = new WordSource(level, 'en', weights);
      return Array.from({ length: WEIGHTED_SAMPLES }, () => source.bossWord());
    };
    const even = share(words(), (word) => word.includes('w'));
    const weighted = share(words(weakKey('w')), (word) => word.includes('w'));
    expect(even).toBeGreaterThan(0);
    expect(weighted).toBeGreaterThan(even * CLEAR_PREFERENCE);
  });
});
