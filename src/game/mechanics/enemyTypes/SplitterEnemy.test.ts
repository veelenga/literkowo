// @vitest-environment jsdom
import { describe, expect, it } from 'vitest';
import { FRAME, VIEWER, enemyTypesBoard, rollFor, specialOf } from '../../../testing/enemyTypes';
import { SPLIT_HALF_TAG, SplitterEnemy } from './SplitterEnemy';

const LEVEL = 'gory-2';
const splitterRoll = () => rollFor('splitter', LEVEL);

function travelled(enemy: SplitterEnemy, seconds: number): number {
  const start = enemy.distanceToCenter;
  for (let time = 0; time < seconds; time += FRAME) enemy.update(FRAME, time, VIEWER);
  return start - enemy.distanceToCenter;
}

describe('Splitter', () => {
  it('comes from the mountains with two short words joined', () => {
    expect(enemyTypesBoard('gory-1', () => rollFor('swarm', 'gory-1')).spawn()).not.toBeInstanceOf(
      SplitterEnemy,
    );
    const splitter = specialOf(enemyTypesBoard(LEVEL, splitterRoll).spawn(), SplitterEnemy);
    expect(splitter.isHalf).toBe(false);
    expect(splitter.word.length).toBeGreaterThanOrEqual(6);
    expect(splitter.word.length).toBeLessThanOrEqual(8);
  });

  it('splits into two halves of its word at its place', () => {
    const { spawn, type, enemies } = enemyTypesBoard(LEVEL, splitterRoll);
    const splitter = specialOf(spawn(), SplitterEnemy);
    const word = splitter.word;
    const place = splitter.object.position.clone();
    type(splitter);
    const halves = enemies.map((enemy) => specialOf(enemy, SplitterEnemy));
    expect(halves).toHaveLength(2);
    expect(halves.map((half) => half.word).join('')).toBe(word);
    for (const half of halves) {
      expect(half.isHalf).toBe(true);
      expect(half.tags.has(SPLIT_HALF_TAG)).toBe(true);
      expect(half.word.length).toBeGreaterThanOrEqual(3);
      expect(half.word.length).toBeLessThanOrEqual(4);
      expect(half.object.position.distanceTo(place)).toBeLessThan(1);
      expect(half.label.classList.contains('is-half')).toBe(true);
    }
  });

  it('makes the halves faster than the whole', () => {
    const { spawn, type, enemies } = enemyTypesBoard(LEVEL, splitterRoll);
    const splitter = specialOf(spawn(), SplitterEnemy);
    const wholeStep = travelled(splitter, 1);
    type(splitter);
    const half = specialOf(enemies[0], SplitterEnemy);
    expect(travelled(half, 1)).toBeGreaterThan(wholeStep);
  });

  it('never splits a half again', () => {
    const { spawn, type, enemies } = enemyTypesBoard(LEVEL, splitterRoll);
    type(spawn());
    const [first, second] = [...enemies];
    type(first);
    expect(enemies).toEqual([second]);
    type(second);
    expect(enemies).toEqual([]);
  });
});
