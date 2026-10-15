// @vitest-environment jsdom
import { describe, expect, it } from 'vitest';
import { FRAME, VIEWER, enemyTypesBoard, rollFor, specialOf } from '../../../testing/enemyTypes';
import { BullEnemy, CHARGING_CLASS, KNOCKBACK, STAMP_SECONDS, STUN_SECONDS } from './BullEnemy';

const LEVEL = 'jaskinia-10';
const CHARGE_SHARE = 3;
const bullRoll = () => rollFor('bull', LEVEL);

function bullBoard() {
  const board = enemyTypesBoard(LEVEL, bullRoll);
  const bull = specialOf(board.spawn(), BullEnemy);
  const charge = (seconds: number) => {
    for (let time = 0; time < seconds; time += FRAME) bull.update(FRAME, time, VIEWER);
  };
  return { ...board, bull, charge };
}

describe('Charger bull', () => {
  it('carries four or five letters', () => {
    const { bull } = bullBoard();
    expect(bull.word.length).toBeGreaterThanOrEqual(4);
    expect(bull.word.length).toBeLessThanOrEqual(5);
  });

  it('stamps at the spawn arc before it charges at three times the speed', () => {
    const { bull, charge, context } = bullBoard();
    const start = bull.distanceToCenter;
    charge(STAMP_SECONDS - FRAME);
    expect(bull.distanceToCenter).toBeCloseTo(start);
    expect(bull.isCharging).toBe(false);
    charge(FRAME * 2);
    expect(bull.isCharging).toBe(true);
    expect(bull.label.classList.contains(CHARGING_CLASS)).toBe(true);
    const before = bull.distanceToCenter;
    charge(1);
    expect(before - bull.distanceToCenter).toBeCloseTo(context.phase.speed * CHARGE_SHARE, 0);
  });

  it('is knocked back and stopped by each correct letter', () => {
    const { bull, charge } = bullBoard();
    charge(STAMP_SECONDS + 1);
    const before = bull.distanceToCenter;
    bull.advance();
    charge(STUN_SECONDS - FRAME * 2);
    expect(bull.isStunned).toBe(true);
    expect(bull.distanceToCenter).toBeCloseTo(before + KNOCKBACK);
    charge(FRAME * 3);
    expect(bull.isCharging).toBe(true);
    charge(0.5);
    expect(bull.distanceToCenter).toBeLessThan(before + KNOCKBACK);
  });

  it('charges one at a time', () => {
    const { spawn } = bullBoard();
    expect(spawn()).not.toBeInstanceOf(BullEnemy);
  });
});
