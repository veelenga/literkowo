// @vitest-environment jsdom
import { describe, expect, it, vi } from 'vitest';
import { SPAWN_RADIUS } from '../../arena';
import { FRAME, VIEWER, enemyTypesBoard, rollFor, specialOf } from '../../../testing/enemyTypes';
import type { MechanicContext } from '../Mechanic';
import { wordPoints } from '../mergeEnemies/scoring';
import {
  ESCAPE_RADIUS,
  FLEEING_CLASS,
  GRAB_DISTANCE,
  LOOT_POINTS,
  RETURN_BONUS_COINS,
  ThiefEnemy,
} from './ThiefEnemy';

const LEVEL = 'las-3';
const STARTING_SCORE = 250;

function thiefBoard() {
  const addCoins = vi.fn<MechanicContext['addCoins']>();
  const board = enemyTypesBoard(LEVEL, () => rollFor('thief', LEVEL), { addCoins });
  board.context.stats.score = STARTING_SCORE;
  const thief = specialOf(board.spawn(), ThiefEnemy);
  const race = (seconds: number) => {
    for (let time = 0; time < seconds; time += FRAME) {
      for (const enemy of [...board.enemies]) enemy.update(FRAME, time, VIEWER);
    }
  };
  const robbed = () => {
    while (board.enemies.includes(thief)) race(FRAME);
    return specialOf(board.enemies[0], ThiefEnemy);
  };
  return { ...board, thief, race, robbed, addCoins };
}

describe('Thief', () => {
  it('runs in fast with a three letter word', () => {
    const { thief, race, enemyAt } = thiefBoard();
    const walker = enemyAt(SPAWN_RADIUS);
    expect(thief.word).toHaveLength(3);
    race(2);
    expect(thief.distanceToCenter).toBeLessThan(walker.distanceToCenter - 2);
  });

  it('steals points at the hero and runs back out with a six letter word', () => {
    const { thief, robbed, loseLife, announce, context } = thiefBoard();
    const runner = robbed();
    expect(runner).not.toBe(thief);
    expect(runner.hasLoot).toBe(true);
    expect(runner.word).toHaveLength(6);
    expect(runner.distanceToCenter).toBeGreaterThanOrEqual(GRAB_DISTANCE - 0.2);
    expect(runner.label.classList.contains(FLEEING_CLASS)).toBe(true);
    expect(context.stats.score).toBe(STARTING_SCORE - LOOT_POINTS);
    expect(loseLife).not.toHaveBeenCalled();
    expect(announce).toHaveBeenCalledWith('Złodziej zabrał punkty!', 'warning', expect.any(String));
  });

  it('takes only what there is', () => {
    const { robbed, context } = thiefBoard();
    context.stats.score = 40;
    robbed();
    expect(context.stats.score).toBe(0);
  });

  it('gives the points back with bonus coins when the loot word is typed', () => {
    const { robbed, type, race, context, addCoins } = thiefBoard();
    const runner = robbed();
    race(1);
    const wordScore = wordPoints(runner.word, context.stats);
    type(runner);
    expect(context.stats.score).toBe(STARTING_SCORE + wordScore);
    expect(addCoins).toHaveBeenCalledWith(RETURN_BONUS_COINS);
  });

  it('escapes with the loot when nobody types it, without costing a life', () => {
    const { robbed, race, enemies, context, loseLife, addCoins } = thiefBoard();
    const runner = robbed();
    race(30);
    expect(runner.distanceToCenter).toBeGreaterThanOrEqual(ESCAPE_RADIUS);
    expect(enemies).toEqual([]);
    expect(context.stats.score).toBe(STARTING_SCORE - LOOT_POINTS);
    expect(loseLife).not.toHaveBeenCalled();
    expect(addCoins).not.toHaveBeenCalled();
  });

  it('never costs a life even when it reaches the hero', () => {
    const { thief, mechanic, enemies } = thiefBoard();
    mechanic.onEnemyReached(thief);
    expect(enemies).toEqual([]);
  });

  it('pays normal points when caught on the way in', () => {
    const { thief, type, context, addCoins } = thiefBoard();
    type(thief);
    expect(context.stats.score).toBe(STARTING_SCORE + wordPoints(thief.word, context.stats));
    expect(addCoins).not.toHaveBeenCalled();
  });
});
