// @vitest-environment jsdom
import { describe, expect, it } from 'vitest';
import { fakeBoard } from '../testing/enemyBoard';

const DISTANCE = 6;

describe('Enemy', () => {
  it('shows the word as untyped again after resetTyped', () => {
    const enemy = fakeBoard().enemyAt(DISTANCE, 'jjkj');
    enemy.advance();
    enemy.advance();
    expect(enemy.label.querySelector('.done')?.textContent).toBe('jj');
    enemy.resetTyped();
    expect(enemy.expectedChar).toBe('j');
    expect(enemy.label.querySelector('.done')?.textContent).toBe('');
    expect(enemy.label.querySelector('.rest')?.textContent).toBe('jjkj');
  });
});
