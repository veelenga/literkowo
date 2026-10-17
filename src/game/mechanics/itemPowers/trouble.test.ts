// @vitest-environment jsdom
import { describe, expect, it } from 'vitest';
import { fakeBoard } from '../../../testing/enemyBoard';
import { SPAWN_RADIUS } from '../../board';
import { LEVEL_LIVES } from '../../LevelPlan';
import { PowerEnemy } from '../powerWords/PowerEnemy';
import {
  CROWDED_BOARD,
  DANGER_DISTANCE,
  FAST_PACE,
  LAST_HEART,
  MISSES_IN_TROUBLE,
  isInTrouble,
  type TroubleState,
} from './trouble';

const ENEMY_PACE = 1;
const CLOSE = DANGER_DISTANCE - 0.1;
const SLOWER_SCALE = FAST_PACE - 0.1;
const FREEZE_SECONDS = 2;

function calm(overrides: Partial<TroubleState> = {}): TroubleState {
  return {
    enemies: [],
    startingPace: ENEMY_PACE,
    recentMisses: 0,
    lives: LEVEL_LIVES,
    maxLives: LEVEL_LIVES,
    ...overrides,
  };
}

const TWIN_WORD = 'fjf';

function farEnemies(count: number) {
  const board = fakeBoard();
  board.enemiesAt(SPAWN_RADIUS, count);
  return board;
}

describe('isInTrouble', () => {
  it('stays calm with a few far enemies, every heart and no misses', () => {
    const { enemies } = farEnemies(CROWDED_BOARD - 1);
    expect(isInTrouble(calm({ enemies, recentMisses: MISSES_IN_TROUBLE - 1 }))).toBe(false);
  });

  it('sees trouble when an enemy comes close before its word is started', () => {
    const { enemies, enemyAt } = fakeBoard();
    const close = enemyAt(CLOSE);
    expect(isInTrouble(calm({ enemies }))).toBe(true);
    close.advance();
    expect(isInTrouble(calm({ enemies }))).toBe(false);
  });

  it('ignores a close enemy that is frozen or harmless', () => {
    const { enemies, enemyAt, context } = fakeBoard();
    enemyAt(CLOSE).freeze(FREEZE_SECONDS);
    const word = new PowerEnemy('mróz', context.createLabel(), 1, 'crystal', 'freeze');
    word.object.position.set(0, 0, -CLOSE);
    enemies.push(word);
    expect(isInTrouble(calm({ enemies }))).toBe(false);
  });

  it('sees trouble on a crowded board, even far from the hero', () => {
    const { enemies } = farEnemies(CROWDED_BOARD);
    expect(isInTrouble(calm({ enemies }))).toBe(true);
    enemies[0].freeze(FREEZE_SECONDS);
    expect(isInTrouble(calm({ enemies }))).toBe(false);
  });

  it('counts twins that share one word as one word to type', () => {
    const { enemies, enemyAt } = fakeBoard();
    for (let twin = 0; twin < CROWDED_BOARD; twin += 1) enemyAt(SPAWN_RADIUS, TWIN_WORD);
    expect(isInTrouble(calm({ enemies }))).toBe(false);
  });

  it('sees trouble when a speed surge makes the enemies fast', () => {
    const { enemies } = farEnemies(1);
    enemies[0].setSpeedScale(SLOWER_SCALE);
    expect(isInTrouble(calm({ enemies }))).toBe(false);
    enemies[0].setSpeedScale(FAST_PACE);
    expect(isInTrouble(calm({ enemies }))).toBe(true);
  });

  it('sees trouble once later waves run much faster than the run started', () => {
    const { enemies } = farEnemies(1);
    expect(isInTrouble(calm({ enemies, startingPace: ENEMY_PACE / SLOWER_SCALE }))).toBe(false);
    expect(isInTrouble(calm({ enemies, startingPace: ENEMY_PACE / FAST_PACE }))).toBe(true);
  });

  it('sees trouble after a few quick mistakes', () => {
    expect(isInTrouble(calm({ recentMisses: MISSES_IN_TROUBLE - 1 }))).toBe(false);
    expect(isInTrouble(calm({ recentMisses: MISSES_IN_TROUBLE }))).toBe(true);
  });

  it('sees trouble on the last heart, but not in a run with one heart', () => {
    expect(isInTrouble(calm({ lives: LAST_HEART + 1 }))).toBe(false);
    expect(isInTrouble(calm({ lives: LAST_HEART }))).toBe(true);
    expect(isInTrouble(calm({ lives: LAST_HEART, maxLives: LAST_HEART }))).toBe(false);
  });
});
