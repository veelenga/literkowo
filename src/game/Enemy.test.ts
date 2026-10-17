// @vitest-environment jsdom
import { describe, expect, it } from 'vitest';
import { fakeBoard } from '../testing/enemyBoard';

const DISTANCE = 6;
const MARKUP_WORD = '<i>a</i>';
const SURGE_SCALE = 1.8;
const FREEZE_SECONDS = 1;

describe('Enemy', () => {
  it('shows the word as untyped again after resetTyped', () => {
    const enemy = fakeBoard().enemyAt(DISTANCE, 'jjkj');
    enemy.advance();
    enemy.advance();
    expect(enemy.label.querySelector('.done')?.textContent).toBe('jj');
    expect(enemy.typedLength).toBe(2);
    enemy.resetTyped();
    expect(enemy.typedLength).toBe(0);
    expect(enemy.expectedChar).toBe('j');
    expect(enemy.label.querySelector('.done')?.textContent).toBe('');
    expect(enemy.label.querySelector('.rest')?.textContent).toBe('jjkj');
  });

  it('shows the word as text, never as markup', () => {
    const enemy = fakeBoard().enemyAt(DISTANCE, MARKUP_WORD);
    enemy.advance();
    expect(enemy.label.querySelector('i')).toBeNull();
    expect(enemy.label.textContent).toBe(MARKUP_WORD);
  });

  it('reports its speed with the speed scale, and none while frozen', () => {
    const enemy = fakeBoard().enemyAt(DISTANCE);
    const base = enemy.currentSpeed;
    expect(base).toBeGreaterThan(0);
    enemy.setSpeedScale(SURGE_SCALE);
    expect(enemy.currentSpeed).toBeCloseTo(base * SURGE_SCALE);
    enemy.freeze(FREEZE_SECONDS);
    expect(enemy.currentSpeed).toBe(0);
  });
});
