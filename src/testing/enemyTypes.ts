import { vi } from 'vitest';
import { WordSource } from '../course/WordSource';
import { SPAWN_RADIUS } from '../game/arena';
import type { Enemy } from '../game/Enemy';
import { EnemyTypes } from '../game/mechanics/EnemyTypes';
import {
  KIND_WEIGHTS,
  SPECIAL_SHARE,
  unlockedKinds,
  type EnemyKind,
} from '../game/mechanics/enemyTypes/kinds';
import type { MechanicContext } from '../game/mechanics/Mechanic';
import { fakeBoard } from './enemyBoard';
import { requireLevel } from './levels';

export const FRAME = 1 / 30;
export const VIEWER = { x: 0, y: 15, z: 15.5 };

export function rollFor(kind: EnemyKind, levelId: string): number {
  const kinds = unlockedKinds(requireLevel(levelId));
  const index = kinds.indexOf(kind);
  const total = kinds.reduce((sum, each) => sum + KIND_WEIGHTS[each], 0);
  const before = kinds.slice(0, index).reduce((sum, each) => sum + KIND_WEIGHTS[each], 0);
  return (SPECIAL_SHARE * (before + KIND_WEIGHTS[kind] / 2)) / total;
}

export function sequence(...values: number[]): () => number {
  let index = 0;
  return () => values[index++ % values.length];
}

export function specialOf<T extends Enemy>(
  enemy: Enemy,
  type: abstract new (...args: never[]) => T,
): T {
  if (!(enemy instanceof type)) throw new Error(`Expected ${type.name}`);
  return enemy;
}

export function enemyTypesBoard(
  levelId: string,
  random: () => number,
  overrides: Partial<MechanicContext> = {},
) {
  const level = requireLevel(levelId);
  const loseLife = vi.fn<MechanicContext['loseLife']>();
  const shakeCamera = vi.fn<MechanicContext['shakeCamera']>();
  const announce = vi.fn<MechanicContext['announce']>();
  const board = fakeBoard({
    level,
    words: new WordSource(level, 'pl'),
    loseLife,
    shakeCamera,
    announce,
    ...overrides,
  });
  const mechanic = new EnemyTypes(board.context, random);
  const spawn = (enemy: Enemy = board.enemyAt(SPAWN_RADIUS)): Enemy => {
    mechanic.onSpawn(enemy);
    return board.enemies[board.enemies.length - 1];
  };
  const run = (enemy: Enemy, seconds: number) => {
    for (let time = 0; time < seconds && board.enemies.includes(enemy); time += FRAME) {
      mechanic.update(FRAME);
      enemy.update(FRAME, time, VIEWER);
    }
  };
  const type = (enemy: Enemy) => {
    while (!enemy.isComplete) enemy.advance();
    board.context.stats.recordWord(enemy.word);
    mechanic.onWordComplete(enemy);
    board.context.removeEnemy(enemy);
  };
  return { ...board, mechanic, loseLife, shakeCamera, announce, spawn, run, type };
}
