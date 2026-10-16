// @vitest-environment jsdom
import * as THREE from 'three';
import { describe, expect, it, vi } from 'vitest';
import { fakeBoard } from '../../testing/enemyBoard';
import { randomFrom } from '../../random';
import { requireLevel } from '../../testing/levels';
import { Enemy, type EnemyLook } from '../Enemy';
import type { Phase } from '../RunPlan';
import { SessionStats } from '../SessionStats';
import type { MechanicContext } from './Mechanic';
import { isFusible } from './mergeEnemies/rules';
import { TWIN_CHANCE, Twins } from './Twins';
import { AIM_SHARE, formationSlots, slotAim, slotPosition } from './twins/formation';
import { TWIN_TAG, TwinEnemy } from './twins/TwinEnemy';

const FOREST = requireLevel('las-2');
const MEADOW = requireLevel('polana-2');
const WARMUP: Phase = { kind: 'warmup', count: 8, speed: 0.55, spawnInterval: 1.5 };
const LOOK: EnemyLook = { shape: 'crystal', colors: [0x00bbf9] };
const ROLL_TWINS = 0;
const ROLL_PLAIN = TWIN_CHANCE;
const VIEWER = { x: 0, y: 10, z: 10 };

function scripted(...values: number[]): () => number {
  let index = 0;
  return () => values[Math.min(index++, values.length - 1)];
}

function countAndShape(count: number, shape: 'line' | 'vee'): number[] {
  const countRoll = (count - 2) / 3 + 0.01;
  const shapeRoll = shape === 'line' ? 0 : 0.9;
  return [ROLL_TWINS, 0, countRoll, shapeRoll];
}

function setup(rolls: number[], overrides: Partial<MechanicContext> = {}) {
  const announce = vi.fn<MechanicContext['announce']>();
  const board = fakeBoard({
    announce,
    level: FOREST,
    random: randomFrom(scripted(...rolls)),
    ...overrides,
  });
  const twins = new Twins(board.context);
  const spawn = (word = 'dom'): Enemy => {
    const enemy = board.enemyAt(11, word);
    twins.onSpawn(enemy);
    return enemy;
  };
  const twinsOnBoard = () => board.enemies.filter((enemy) => enemy instanceof TwinEnemy);
  return { ...board, announce, twins, spawn, twinsOnBoard };
}

function finish(enemy: Enemy): void {
  while (!enemy.isComplete) enemy.advance();
}

describe('formation', () => {
  it('lines twins up side by side across their path', () => {
    const anchor = new THREE.Vector3(0, 0, -11);
    const positions = formationSlots(3, 'line').map((slot) => slotPosition(anchor, slot));
    expect(positions.map((position) => position.z)).toEqual([-11, -11, -11]);
    const [first, middle, last] = positions.map((position) => position.x);
    expect(middle).toBeCloseTo(0);
    expect(first).toBeCloseTo(-last);
    expect(Math.abs(first)).toBeGreaterThan(0);
  });

  it('flies a vee with the leader in front and wings trailing on both sides', () => {
    const anchor = new THREE.Vector3(0, 0, -11);
    const [leader, left, right] = formationSlots(3, 'vee').map((slot) =>
      slotPosition(anchor, slot),
    );
    expect(leader.distanceTo(anchor)).toBe(0);
    expect(left.z).toBeLessThan(leader.z);
    expect(right.z).toBeCloseTo(left.z);
    expect(Math.sign(left.x)).toBe(-Math.sign(right.x));
  });

  it('aims every twin close enough to the hero to reach it', () => {
    const anchor = new THREE.Vector3(-11, 0, 0);
    for (const slot of formationSlots(4, 'vee')) {
      expect(slotAim(anchor, slot).length()).toBeCloseTo(Math.abs(slot.lateral) * AIM_SHARE);
    }
  });
});

describe('Twins', () => {
  it('replaces a spawn with two to four tagged clones carrying the same word', () => {
    const { spawn, twinsOnBoard, enemies } = setup(countAndShape(4, 'line'));
    const original = spawn('kot');
    expect(enemies).not.toContain(original);
    const clones = twinsOnBoard();
    expect(clones).toHaveLength(4);
    expect(clones.every((twin) => twin.word === 'kot' && twin.tags.has(TWIN_TAG))).toBe(true);
    expect(clones.some(isFusible)).toBe(false);
  });

  it('builds a vee formation of two', () => {
    const { spawn, twinsOnBoard } = setup(countAndShape(2, 'vee'));
    spawn();
    expect(twinsOnBoard()).toHaveLength(2);
  });

  it('bobs every twin of a group in step', () => {
    const { spawn, twinsOnBoard } = setup(countAndShape(3, 'line'));
    spawn();
    const heights = twinsOnBoard().map((twin) => {
      twin.update(0, 1.3, VIEWER);
      return twin.object.children[0].position.y;
    });
    expect(new Set(heights.map((height) => height.toFixed(5))).size).toBe(1);
  });

  it('leaves most spawns alone', () => {
    const { spawn, twinsOnBoard, enemies } = setup([ROLL_PLAIN]);
    const original = spawn();
    expect(twinsOnBoard()).toHaveLength(0);
    expect(enemies).toContain(original);
  });

  it('replaces in the meadow when the run unlocks every mechanic', () => {
    const meadow = setup(countAndShape(2, 'line'), { level: MEADOW, allMechanicsUnlocked: true });
    meadow.spawn();
    expect(meadow.twinsOnBoard()).toHaveLength(2);
  });

  it('never replaces in the meadow, in the warm up, or a tagged enemy', () => {
    const meadow = setup([ROLL_TWINS], { level: MEADOW });
    meadow.spawn();
    expect(meadow.twinsOnBoard()).toHaveLength(0);

    const warmup = setup([ROLL_TWINS], { phase: WARMUP });
    warmup.spawn();
    expect(warmup.twinsOnBoard()).toHaveLength(0);

    const tagged = setup([ROLL_TWINS]);
    const enemy = tagged.enemyAt(11);
    enemy.tags.add('power-word');
    tagged.twins.onSpawn(enemy);
    expect(tagged.twinsOnBoard()).toHaveLength(0);
  });

  it('skips an enemy another feature already took off the board', () => {
    const { twins, twinsOnBoard, context, enemies } = setup([ROLL_TWINS]);
    const enemy = new Enemy('dom', context.createLabel(), 1, LOOK);
    twins.onSpawn(enemy);
    expect(twinsOnBoard()).toHaveLength(0);
    expect(enemies).toHaveLength(0);
  });

  it('pays a chain bonus once when twins finish together', () => {
    const { spawn, twins, twinsOnBoard, context, announce } = setup(countAndShape(3, 'vee'));
    const chimes = vi.spyOn(context.sfx, 'chimes');
    spawn('kot');
    const clones = twinsOnBoard();
    clones.forEach(finish);
    for (const twin of clones) {
      twins.onWordComplete(twin);
      context.removeEnemy(twin);
    }
    const reference = new SessionStats();
    reference.recordWord('kot');
    expect(context.stats.score).toBe(2 * reference.score);
    expect(announce).toHaveBeenCalledTimes(1);
    expect(announce).toHaveBeenCalledWith('Bliźniaki x3!', 'callout', expect.any(String));
    expect(chimes).toHaveBeenCalledTimes(1);
    expect(chimes.mock.calls[0][0]).toHaveLength(5);
  });

  it('costs at most one life per group when twins reach the hero', () => {
    const { spawn, twins, twinsOnBoard, enemies } = setup(countAndShape(3, 'line'));
    spawn();
    const [first, second, third] = twinsOnBoard();
    twins.onEnemyReached(first);
    expect(enemies).toContain(first);
    twins.onEnemyReached(second);
    twins.onEnemyReached(third);
    expect(enemies).not.toContain(second);
    expect(enemies).not.toContain(third);
  });

  it('pays nothing for a lone twin', () => {
    const { spawn, twins, twinsOnBoard, context, announce } = setup(countAndShape(2, 'line'));
    spawn('kot');
    const [first, second] = twinsOnBoard();
    context.removeEnemy(second);
    finish(first);
    twins.onWordComplete(first);
    expect(context.stats.score).toBe(0);
    expect(announce).not.toHaveBeenCalled();
  });
});
