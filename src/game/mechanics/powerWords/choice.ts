import type { WordLanguage } from '../../../profiles/Profile';
import { systemRandom, type RandomSource } from '../../../random';
import { POWER_SPECS, type Power } from './powers';

export interface PowerWord {
  readonly power: Power;
  readonly word: string;
  readonly isReal: boolean;
}

const GENERATED_LENGTH = { min: 4, max: 6 };
const LETTER = /[a-ząćęłńóśźż]/;

export function choosePower(
  powers: readonly Power[],
  previous: Power | undefined,
  random: RandomSource = systemRandom(),
): Power {
  const fresh = powers.filter((power) => power !== previous);
  return random.pick(fresh.length > 0 ? fresh : powers);
}

export function choosePowerWord(
  power: Power,
  allowedKeys: string,
  language: WordLanguage,
  random: RandomSource = systemRandom(),
): PowerWord {
  const fitting = POWER_SPECS[power].words[language].filter((word) =>
    isSpelledWith(word, allowedKeys),
  );
  if (fitting.length > 0) return { power, word: random.pick(fitting), isReal: true };
  return { power, word: generatedWord(allowedKeys, random), isReal: false };
}

export function isSpelledWith(word: string, keys: string): boolean {
  return [...word].every((char) => keys.includes(char));
}

function generatedWord(allowedKeys: string, random: RandomSource): string {
  const letters = [...allowedKeys].filter((char) => LETTER.test(char));
  const span = GENERATED_LENGTH.max - GENERATED_LENGTH.min + 1;
  const length = GENERATED_LENGTH.min + random.int(span);
  return Array.from({ length }, () => random.pick(letters)).join('');
}
