import { describe, expect, it } from 'vitest';
import { allowedKeysFor } from '../../../course/regions';
import { requireLevel } from '../../../testing/levels';
import { choosePower, choosePowerWord, isSpelledWith } from './choice';
import { POWER_SPECS, POWERS, powersFor } from './powers';

const SAMPLES = 100;
const LETTERS_ONLY = /^[a-ząćęłńóśźż]+$/;

function keysOf(levelId: string, language: 'pl' | 'en'): string {
  return allowedKeysFor(requireLevel(levelId), language);
}

describe('choosePowerWord', () => {
  it('picks a real candidate spelled with the allowed keys', () => {
    const keys = keysOf('las-2', 'en');
    for (let index = 0; index < SAMPLES; index += 1) {
      const choice = choosePowerWord('shield', keys, 'en');
      expect(choice).toEqual({ power: 'shield', word: 'shield', isReal: true });
    }
    expect(choosePowerWord('quake', keys, 'en').word).toBe('shake');
  });

  it('picks only words of the profile language', () => {
    const keys = keysOf('wyspa-4', 'pl');
    for (const power of POWERS) {
      const choice = choosePowerWord(power, keys, 'pl');
      expect(choice.isReal).toBe(true);
      expect(POWER_SPECS[power].words.pl).toContain(choice.word);
    }
  });

  it('falls back to a generated word of four to six allowed letters', () => {
    const keys = keysOf('las-2', 'pl');
    for (let index = 0; index < SAMPLES; index += 1) {
      const { word, isReal } = choosePowerWord('freeze', keys, 'pl');
      expect(isReal).toBe(false);
      expect(word.length).toBeGreaterThanOrEqual(4);
      expect(word.length).toBeLessThanOrEqual(6);
      expect(word).toMatch(LETTERS_ONLY);
      expect(isSpelledWith(word, keys)).toBe(true);
    }
  });
});

describe('choosePower', () => {
  it('never repeats the previous power', () => {
    for (let index = 0; index < SAMPLES; index += 1) {
      expect(choosePower(POWERS, 'quake')).not.toBe('quake');
    }
  });

  it('leaves the storm out of boss fights', () => {
    expect(powersFor('boss')).not.toContain('storm');
    expect(powersFor('words')).toEqual(POWERS);
  });
});
