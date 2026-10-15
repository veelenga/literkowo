import { describe, expect, it } from 'vitest';
import { requireLevel } from '../testing/levels';
import { LEVELS, allowedKeysFor } from './regions';
import { BOSS_MIN_LENGTH, SHORT_LENGTH, WordSource } from './WordSource';

const SAMPLES = 200;

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

  it('gives queued boss words first, once each', () => {
    const source = new WordSource(requireLevel('las-4'), 'pl');
    source.queueBossWord('ser');
    source.queueBossWord('kura');
    expect(source.bossWord()).toBe('ser');
    expect(source.bossWord()).toBe('kura');
    expect(source.bossWord().length).toBeGreaterThanOrEqual(BOSS_MIN_LENGTH);
  });
});
