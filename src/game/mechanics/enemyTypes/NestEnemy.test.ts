// @vitest-environment jsdom
import { describe, expect, it } from 'vitest';
import { SPAWN_RADIUS } from '../../arena';
import { FRAME, VIEWER, enemyTypesBoard, rollFor, specialOf } from '../../../testing/enemyTypes';
import { HATCHLING_TAG, HatchlingEnemy } from './HatchlingEnemy';
import { HATCH_SECONDS, MAX_BROOD, NEST_RADIUS, NestEnemy } from './NestEnemy';

const LEVEL = 'wyspa-2';

function nestBoard() {
  const board = enemyTypesBoard(LEVEL, () => rollFor('nest', LEVEL));
  const nest = specialOf(board.spawn(), NestEnemy);
  const wait = (seconds: number) => {
    for (let time = 0; time < seconds; time += FRAME) {
      board.mechanic.update(FRAME);
      nest.update(FRAME, time, VIEWER);
    }
  };
  const chicks = () => board.enemies.filter((enemy) => enemy instanceof HatchlingEnemy);
  return { ...board, nest, wait, chicks };
}

describe('Nest', () => {
  it('sits still near the spawn arc with a long word', () => {
    const { nest, wait } = nestBoard();
    expect(nest.distanceToCenter).toBeCloseTo(NEST_RADIUS);
    expect(nest.distanceToCenter).toBeLessThan(SPAWN_RADIUS);
    expect(nest.word.length).toBeGreaterThanOrEqual(7);
    expect(nest.word.length).toBeLessThanOrEqual(9);
    wait(10);
    expect(nest.distanceToCenter).toBeCloseTo(NEST_RADIUS);
  });

  it('hatches a two letter chick every four seconds', () => {
    const { nest, wait, chicks } = nestBoard();
    wait(HATCH_SECONDS - FRAME);
    expect(chicks()).toHaveLength(0);
    wait(FRAME * 2);
    const [chick] = chicks();
    expect(chick.word).toHaveLength(2);
    expect(chick.tags.has(HATCHLING_TAG)).toBe(true);
    expect(chick.object.position.distanceTo(nest.object.position)).toBeLessThan(1);
    expect(chick.distanceToCenter).toBeLessThan(nest.distanceToCenter);
  });

  it('keeps at most three chicks alive', () => {
    const { nest, wait, chicks, context } = nestBoard();
    wait(HATCH_SECONDS * (MAX_BROOD + 2) + FRAME);
    expect(chicks()).toHaveLength(MAX_BROOD);
    expect(nest.chicksAlive).toBe(MAX_BROOD);
    context.removeEnemy(chicks()[0]);
    wait(HATCH_SECONDS);
    expect(chicks()).toHaveLength(MAX_BROOD);
  });

  it('pops all its chicks when it is typed', () => {
    const { nest, wait, chicks, type, enemies, enemyAt } = nestBoard();
    wait(HATCH_SECONDS * 2 + FRAME);
    const walker = enemyAt(SPAWN_RADIUS);
    expect(chicks()).toHaveLength(2);
    type(nest);
    expect(enemies).toEqual([walker]);
  });

  it('never lets its chicks turn into other types', () => {
    const { spawn, wait, chicks } = nestBoard();
    wait(HATCH_SECONDS + FRAME);
    const [chick] = chicks();
    expect(spawn(chick)).toBe(chick);
  });

  it('builds one nest at a time', () => {
    const { spawn } = nestBoard();
    expect(spawn()).not.toBeInstanceOf(NestEnemy);
  });
});
