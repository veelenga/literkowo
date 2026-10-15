import type { WordSource } from '../../../course/WordSource';

export const BOMBER_WORD_LENGTH = { min: 6, max: 9 };

export type Random = () => number;

const BOSS_WORD_DRAWS = 12;
const LETTER = /[a-ząćęłńóśźż]/;

export function bomberWord(
  words: Pick<WordSource, 'bossWord'>,
  allowedKeys: string,
  random: Random = Math.random,
): string {
  for (let draw = 0; draw < BOSS_WORD_DRAWS; draw += 1) {
    const word = words.bossWord();
    if (fitsBomber(word)) return word;
  }
  return generatedWord(allowedKeys, random);
}

export function fitsBomber(word: string): boolean {
  return word.length >= BOMBER_WORD_LENGTH.min && word.length <= BOMBER_WORD_LENGTH.max;
}

function generatedWord(allowedKeys: string, random: Random): string {
  const letters = [...allowedKeys].filter((char) => LETTER.test(char));
  const { min, max } = BOMBER_WORD_LENGTH;
  const length = min + Math.floor(random() * (max - min + 1));
  return Array.from({ length }, () => letters[Math.floor(random() * letters.length)]).join('');
}
