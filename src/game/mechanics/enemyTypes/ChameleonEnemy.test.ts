// @vitest-environment jsdom
import { describe, expect, it } from 'vitest';
import { FRAME, VIEWER, enemyTypesBoard, rollFor, specialOf } from '../../../testing/enemyTypes';
import { levelWords, requireLevel } from '../../../testing/levels';
import { CHANGE_SECONDS, ChameleonEnemy, LOCKED_CLASS } from './ChameleonEnemy';

const LEVEL = 'wyspa-7';

function spawnChameleon(): ChameleonEnemy {
  const board = enemyTypesBoard(LEVEL, () => rollFor('chameleon', LEVEL));
  return specialOf(board.spawn(), ChameleonEnemy);
}

function wait(chameleon: ChameleonEnemy, seconds: number): void {
  for (let time = 0; time < seconds; time += FRAME) chameleon.update(FRAME, time, VIEWER);
}

describe('Chameleon', () => {
  it('lives on the island, and in the cave for English words', () => {
    const english = requireLevel('jaskinia-15');
    const board = enemyTypesBoard('jaskinia-15', () => rollFor('chameleon', 'jaskinia-15', 'en'), {
      language: 'en',
      words: levelWords(english, 'en'),
    });
    expect(board.spawn()).toBeInstanceOf(ChameleonEnemy);
    expect(spawnChameleon()).toBeInstanceOf(ChameleonEnemy);
  });

  it('swaps its word for one of the same length and shifts colour', () => {
    const chameleon = spawnChameleon();
    const words = [chameleon.word];
    const colors = [chameleon.color.getHex()];
    for (let change = 0; change < 3; change += 1) {
      wait(chameleon, CHANGE_SECONDS);
      words.push(chameleon.word);
      colors.push(chameleon.color.getHex());
    }
    expect(new Set(words.map((word) => word.length)).size).toBe(1);
    expect(new Set(words).size).toBeGreaterThan(1);
    expect(new Set(colors).size).toBe(colors.length);
    expect(chameleon.label.textContent).toBe(chameleon.word);
  });

  it('keeps its word once the first letter is typed', () => {
    const chameleon = spawnChameleon();
    const word = chameleon.word;
    const color = chameleon.color.getHex();
    chameleon.advance();
    wait(chameleon, CHANGE_SECONDS * 3);
    expect(chameleon.isLocked).toBe(true);
    expect(chameleon.word).toBe(word);
    expect(chameleon.expectedChar).toBe(word[1]);
    expect(chameleon.color.getHex()).toBe(color);
    expect(chameleon.label.classList.contains(LOCKED_CLASS)).toBe(true);
  });

  it('stays locked when typing moves to another enemy', () => {
    const chameleon = spawnChameleon();
    const word = chameleon.word;
    chameleon.advance();
    chameleon.resetTyped();
    wait(chameleon, CHANGE_SECONDS * 2);
    expect(chameleon.word).toBe(word);
  });
});
