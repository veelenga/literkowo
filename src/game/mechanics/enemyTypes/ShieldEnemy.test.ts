// @vitest-environment jsdom
import { describe, expect, it, vi } from 'vitest';
import { enemyTypesBoard, rollFor, specialOf } from '../../../testing/enemyTypes';
import { BROKEN_CLASS, KEY_LENGTH, SHIELDED_CLASS, ShieldEnemy } from './ShieldEnemy';

const LEVEL = 'jaskinia-1';

function shieldBearer() {
  const board = enemyTypesBoard(LEVEL, () => rollFor('shield', LEVEL));
  const bearer = specialOf(board.spawn(), ShieldEnemy);
  const impact = vi.spyOn(board.context.sfx, 'impact');
  return { ...board, bearer, impact };
}

describe('Shield bearer', () => {
  it('hides a four to six letter word behind a two letter key', () => {
    const { bearer } = shieldBearer();
    const key = bearer.word.slice(0, KEY_LENGTH);
    const hidden = bearer.word.slice(KEY_LENGTH);
    expect(hidden.length).toBeGreaterThanOrEqual(4);
    expect(hidden.length).toBeLessThanOrEqual(6);
    expect(bearer.label.querySelector('.shield-key')?.textContent).toBe(key);
    expect(bearer.label.querySelector('.shield-mask')?.textContent).toBe('•'.repeat(hidden.length));
    expect(bearer.label.classList.contains(SHIELDED_CLASS)).toBe(true);
  });

  it('breaks the shield with a clang once the key is typed', () => {
    const { bearer, impact } = shieldBearer();
    const hidden = bearer.word.slice(KEY_LENGTH);
    bearer.advance();
    expect(bearer.isShielded).toBe(true);
    expect(impact).not.toHaveBeenCalled();
    bearer.advance();
    expect(bearer.isShielded).toBe(false);
    expect(impact).toHaveBeenCalled();
    expect(bearer.word).toBe(hidden);
    expect(bearer.expectedChar).toBe(hidden[0]);
    expect(bearer.isComplete).toBe(false);
    expect(bearer.label.textContent).toBe(hidden);
    expect(bearer.label.classList.contains(BROKEN_CLASS)).toBe(true);
  });

  it('puts the key back when typing moves to another enemy', () => {
    const { bearer } = shieldBearer();
    const word = bearer.word;
    bearer.advance();
    bearer.resetTyped();
    expect(bearer.isShielded).toBe(true);
    expect(bearer.word).toBe(word);
    expect(bearer.label.querySelector('.shield-key .done')?.textContent).toBe('');
  });

  it('keeps the shield broken after the key', () => {
    const { bearer } = shieldBearer();
    const hidden = bearer.word.slice(KEY_LENGTH);
    bearer.advance();
    bearer.advance();
    bearer.advance();
    bearer.resetTyped();
    expect(bearer.isShielded).toBe(false);
    expect(bearer.word).toBe(hidden);
  });

  it('scores the hidden word once it is typed', () => {
    const { bearer, type, context, enemies } = shieldBearer();
    const hidden = bearer.word.slice(KEY_LENGTH);
    type(bearer);
    expect(context.stats.score).toBe(hidden.length * 10);
    expect(enemies).toEqual([]);
  });
});
