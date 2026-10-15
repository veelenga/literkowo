// @vitest-environment jsdom
import * as THREE from 'three';
import { beforeAll, describe, expect, it, vi } from 'vitest';
import { fakeMechanicContext } from '../../testing/mechanicContext';
import { FEVER_COMBO } from '../combo';
import { Enemy, type EnemyLook } from '../Enemy';
import type { Phase } from '../RunPlan';
import type { MechanicContext } from './Mechanic';
import { MergeEnemies } from './MergeEnemies';
import { MergedEnemy } from './mergeEnemies/MergedEnemy';
import { PowerEnemy } from './powerWords/PowerEnemy';
import { wordPoints } from './mergeEnemies/scoring';

const FRAME = 1 / 60;
const FUSE_SECONDS = 0.5;
const DEPTH = -6;
const NEAR_HERO = -2.5;
const LOOK: EnemyLook = { shape: 'crystal', colors: [0x88ccff] };
const WARMUP: Phase = { kind: 'warmup', count: 8, speed: 0.5, spawnInterval: 1.5 };
const VIEWER = new THREE.Vector3(0, 15, 15);

function enemyAt(word: string, x: number, z = DEPTH): Enemy {
  const enemy = new Enemy(word, document.createElement('div'), 1, LOOK);
  enemy.object.position.set(x, 0, z);
  return enemy;
}

function mergedAt(word: string, x: number): MergedEnemy {
  const enemy = new MergedEnemy(word, document.createElement('div'), 1, LOOK);
  enemy.object.position.set(x, 0, DEPTH);
  return enemy;
}

function takeOff(board: Enemy[], enemy: Enemy): void {
  const index = board.indexOf(enemy);
  if (index >= 0) board.splice(index, 1);
}

function target(enemy: Enemy): void {
  enemy.setTargeted(true);
  enemy.advance();
}

function setup(enemies: Enemy[], overrides: Partial<MechanicContext> = {}) {
  const board = [...enemies];
  const announce = vi.fn<MechanicContext['announce']>();
  const burst = vi.fn<MechanicContext['particles']['burst']>();
  const context = fakeMechanicContext({
    enemies: board,
    announce,
    particles: { burst },
    createLabel: () => document.createElement('div'),
    addEnemy: (enemy) => board.push(enemy),
    removeEnemy: (enemy) => takeOff(board, enemy),
    ...overrides,
  });
  const impact = vi.spyOn(context.sfx, 'impact').mockImplementation(() => undefined);
  const mechanic = new MergeEnemies(context);
  const run = (seconds = FUSE_SECONDS) => {
    for (let time = 0; time < seconds; time += FRAME) mechanic.update(FRAME);
  };
  return { board, context, mechanic, announce, burst, impact, run };
}

describe('MergeEnemies', () => {
  beforeAll(() => {
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(null);
  });

  it('fuses two close enemies into one with the joined word', () => {
    const { board, announce, burst, impact, run } = setup([enemyAt('kot', 0), enemyAt('las', 1)]);
    run();
    expect(board).toHaveLength(1);
    const [merged] = board;
    expect(merged).toBeInstanceOf(MergedEnemy);
    expect(merged.word).toBe('kotlas');
    expect(merged.tags.has('merged')).toBe(true);
    expect(merged.label.classList.contains('is-merged')).toBe(true);
    expect(merged.object.position.x).toBeCloseTo(0.5);
    expect(announce).toHaveBeenCalledWith('Fuzja!', 'warning');
    expect(impact).toHaveBeenCalledOnce();
    expect(burst).toHaveBeenCalledTimes(2);
  });

  it('pulls the pair together with a pulse before the swap', () => {
    const first = enemyAt('kot', 0);
    const second = enemyAt('las', 1);
    const { board, run } = setup([first, second]);
    run(0.25);
    expect(board).toEqual([first, second]);
    expect(first.object.position.distanceTo(second.object.position)).toBeLessThan(0.5);
    expect(first.object.scale.x).toBeGreaterThan(1);
    expect(first.label.classList.contains('is-fusing')).toBe(true);
  });

  it('never fuses the enemy the player is typing', () => {
    const typed = enemyAt('kot', 0);
    target(typed);
    const { board, run } = setup([typed, enemyAt('las', 1)]);
    run(1);
    expect(board.map((enemy) => enemy.word)).toEqual(['kot', 'las']);
  });

  it('calls the fusion off when the player starts typing one of the pair', () => {
    const first = enemyAt('kot', 0);
    const { board, run } = setup([first, enemyAt('las', 1)]);
    run(0.1);
    target(first);
    run();
    expect(board).toHaveLength(2);
    expect(first.object.scale.x).toBe(1);
    expect(first.label.classList.contains('is-fusing')).toBe(false);
  });

  it('skips a merge that would need more than ten letters', () => {
    const long = setup([enemyAt('abcdef', 0), enemyAt('ghijk', 1)]);
    long.run(1);
    expect(long.board).toHaveLength(2);
    const fitting = setup([enemyAt('abcde', 0), enemyAt('fghij', 1)]);
    fitting.run(1);
    expect(fitting.board.map((enemy) => enemy.word)).toEqual(['abcdefghij']);
  });

  it('does not merge merged enemies again', () => {
    const { board, run } = setup([mergedAt('kotlas', 0), mergedAt('domek', 1)]);
    run(1);
    expect(board).toHaveLength(2);
  });

  it('leaves frozen enemies alone', () => {
    const frozen = enemyAt('kot', 0);
    frozen.freeze(10);
    const { board, run } = setup([frozen, enemyAt('dom', -1), enemyAt('las', 1)]);
    run(1);
    expect(board).toHaveLength(3);
  });

  it('fuses only plain enemies, never ones made by other features', () => {
    const powered = new PowerEnemy('las', document.createElement('div'), 1, 'crystal');
    powered.object.position.set(1, 0, DEPTH);
    const { board, run } = setup([enemyAt('kot', 0), powered]);
    run();
    expect(board).toHaveLength(2);
  });

  it('merges only while playing the words phase', () => {
    const warmup = setup([enemyAt('k', 0), enemyAt('l', 1)], { phase: WARMUP });
    warmup.run(1);
    expect(warmup.board).toHaveLength(2);
    const finished = setup([enemyAt('kot', 0), enemyAt('las', 1)], { playing: false });
    finished.run(1);
    expect(finished.board).toHaveLength(2);
  });

  it('keeps the space around the hero free of merges', () => {
    const { board, run } = setup([enemyAt('kot', 0, NEAR_HERO), enemyAt('las', 1, NEAR_HERO)]);
    run(1);
    expect(board).toHaveLength(2);
  });

  it('draws nearby enemies together until they fuse', () => {
    const first = enemyAt('kot', 0);
    const second = enemyAt('las', 3);
    const { board, run } = setup([first, second]);
    run(1);
    expect(first.object.position.distanceTo(second.object.position)).toBeLessThan(3);
    run(3);
    expect(board.map((enemy) => enemy.word)).toEqual(['kotlas']);
  });

  it('sends the merged enemy at a slower pace', () => {
    const { board, context, run } = setup([enemyAt('kot', 0), enemyAt('las', 1)]);
    run();
    const [merged] = board;
    const before = merged.distanceToCenter;
    merged.update(1, 0, VIEWER);
    expect(before - merged.distanceToCenter).toBeCloseTo(context.phase.speed * 0.6);
  });

  it('pays triple points for a merged word', () => {
    const { context, mechanic } = setup([]);
    for (let hit = 0; hit < FEVER_COMBO; hit += 1) context.stats.recordHit();
    const merged = mergedAt('kotlas', 0);
    context.stats.recordWord(merged.word);
    mechanic.onWordComplete(merged);
    expect(context.stats.score).toBe(3 * wordPoints(merged.word, context.stats));
  });

  it('keeps normal points for ordinary words', () => {
    const { context, mechanic } = setup([]);
    const ordinary = enemyAt('kot', 0);
    context.stats.recordWord(ordinary.word);
    mechanic.onWordComplete(ordinary);
    expect(context.stats.score).toBe(wordPoints(ordinary.word, context.stats));
  });
});
