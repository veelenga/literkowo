import type { WordSource } from '../../../course/WordSource';
import { systemRandom, type RandomSource } from '../../../random';

export const BOMBER_WORD_LENGTH = { min: 6, max: 9 };

const BOSS_WORD_DRAWS = 12;
const LETTER = /[a-ząćęłńóśźż]/;

export function bomberWord(
  words: Pick<WordSource, 'bossWord'>,
  allowedKeys: string,
  random: RandomSource = systemRandom(),
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

function generatedWord(allowedKeys: string, random: RandomSource): string {
  const letters = [...allowedKeys].filter((char) => LETTER.test(char));
  const { min, max } = BOMBER_WORD_LENGTH;
  const length = min + random.int(max - min + 1);
  return Array.from({ length }, () => random.pick(letters)).join('');
}
