import type { WordLanguage } from '../../../profiles/Profile';
import { POWER_SPECS, type Power } from './powers';

export type Random = () => number;

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
  random: Random = Math.random,
): Power {
  const fresh = powers.filter((power) => power !== previous);
  return pickFrom(fresh.length > 0 ? fresh : powers, random);
}

export function choosePowerWord(
  power: Power,
  allowedKeys: string,
  language: WordLanguage,
  random: Random = Math.random,
): PowerWord {
  const fitting = POWER_SPECS[power].words[language].filter((word) =>
    isSpelledWith(word, allowedKeys),
  );
  if (fitting.length > 0) return { power, word: pickFrom(fitting, random), isReal: true };
  return { power, word: generatedWord(allowedKeys, random), isReal: false };
}

export function isSpelledWith(word: string, keys: string): boolean {
  return [...word].every((char) => keys.includes(char));
}

function generatedWord(allowedKeys: string, random: Random): string {
  const letters = [...allowedKeys].filter((char) => LETTER.test(char));
  const span = GENERATED_LENGTH.max - GENERATED_LENGTH.min + 1;
  const length = GENERATED_LENGTH.min + Math.floor(random() * span);
  return Array.from({ length }, () => pickFrom(letters, random)).join('');
}

function pickFrom<T>(items: readonly T[], random: Random): T {
  return items[Math.floor(random() * items.length)];
}
