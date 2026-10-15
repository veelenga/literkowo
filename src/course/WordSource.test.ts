import { describe, expect, it } from 'vitest';
import { LEVELS, allowedKeysFor, levelById } from './regions';
import { WordSource } from './WordSource';

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
    const level = levelById('las-2')!;
    const source = new WordSource(level, 'pl');
    for (let i = 0; i < SAMPLES; i += 1) expect(level.newKeys).toContain(source.singleLetter());
  });

  it('boss words are long and contain only letters', () => {
    const boss = levelById('polana-5')!;
    const source = new WordSource(boss, 'pl');
    for (let i = 0; i < SAMPLES; i += 1) {
      const word = source.bossWord();
      expect(word.length).toBeGreaterThanOrEqual(3);
      expect(word).toMatch(/^[a-ząćęłńóśźż]+$/);
    }
  });

  it('uses real words once enough letters are unlocked', () => {
    const level = levelById('jaskinia-4')!;
    const source = new WordSource(level, 'en');
    const words = new Set(Array.from({ length: SAMPLES }, () => source.next()));
    expect([...words].some((word) => ['bread', 'rabbit', 'banana'].includes(word))).toBe(true);
  });
});
