// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { fakeBoard } from '../../testing/enemyBoard';
import { requireLevel } from '../../testing/levels';
import { Boss } from '../Boss';
import type { Phase } from '../LevelPlan';
import type { MechanicContext } from './Mechanic';
import {
  SURGE_CLASS,
  SURGE_DURATION,
  SURGE_FIRST_DELAY,
  SURGE_SPEED_SCALE,
  SURGE_TELEGRAPH,
  SpeedSurge,
  surgeIntervalFor,
} from './SpeedSurge';

const FRAME = 1 / 30;
const WARMUP: Phase = { kind: 'warmup', count: 8, speed: 0.55, spawnInterval: 1.5 };
const BOSS: Phase = { kind: 'boss', count: 6, speed: 0.4, spawnInterval: 0 };
const MEADOW_INTERVAL = 40;
const ISLAND_INTERVAL = 25;
const BOSS_WORDS = 4;

function setup(overrides: Partial<MechanicContext> = {}) {
  const announce = vi.fn<MechanicContext['announce']>();
  const board = fakeBoard({ announce, ...overrides });
  const surge = new SpeedSurge(board.context);
  const enemy = board.enemyAt(9);
  const scale = vi.spyOn(enemy, 'setSpeedScale');
  return { ...board, announce, surge, enemy, scale };
}

function play(surge: SpeedSurge, seconds: number): void {
  for (let time = 0; time < seconds - FRAME / 2; time += FRAME) surge.update(FRAME);
}

function reachSurge(surge: SpeedSurge): void {
  play(surge, SURGE_FIRST_DELAY + SURGE_TELEGRAPH + FRAME);
}

afterEach(() => document.body.classList.remove(SURGE_CLASS));

describe('SpeedSurge', () => {
  it('warns after the first 20 seconds and surges once the warning ends', () => {
    const { surge, announce, scale } = setup();
    play(surge, SURGE_FIRST_DELAY - FRAME);
    expect(announce).not.toHaveBeenCalled();
    play(surge, 2 * FRAME);
    expect(surge.isTelegraphing).toBe(true);
    expect(announce).toHaveBeenCalledWith('Przyspieszenie!', 'warning', expect.any(String));
    expect(scale).not.toHaveBeenCalled();
    play(surge, SURGE_TELEGRAPH);
    expect(surge.isSurging).toBe(true);
    expect(scale).toHaveBeenLastCalledWith(SURGE_SPEED_SCALE);
    expect(document.body.classList.contains(SURGE_CLASS)).toBe(true);
  });

  it('returns every speed scale to 1 after 7 seconds', () => {
    const { surge, scale, enemyAt } = setup();
    reachSurge(surge);
    const late = enemyAt(10);
    const lateScale = vi.spyOn(late, 'setSpeedScale');
    surge.onSpawn(late);
    expect(lateScale).toHaveBeenLastCalledWith(SURGE_SPEED_SCALE);
    play(surge, SURGE_DURATION);
    expect(surge.isSurging).toBe(false);
    expect(scale).toHaveBeenLastCalledWith(1);
    expect(lateScale).toHaveBeenLastCalledWith(1);
    expect(document.body.classList.contains(SURGE_CLASS)).toBe(false);
  });

  it('leaves a short trail of cubes behind each enemy while it lasts', () => {
    const { surge } = setup();
    reachSurge(surge);
    play(surge, 1);
    expect(surge.trailCubes).toBeGreaterThan(0);
  });

  it('waits the region interval before the next surge', () => {
    const { surge } = setup();
    reachSurge(surge);
    play(surge, SURGE_DURATION);
    play(surge, MEADOW_INTERVAL - FRAME);
    expect(surge.isTelegraphing).toBe(false);
    play(surge, 2 * FRAME);
    expect(surge.isTelegraphing).toBe(true);
  });

  it('comes more often in later regions', () => {
    expect(surgeIntervalFor(requireLevel('polana-1'))).toBe(MEADOW_INTERVAL);
    expect(surgeIntervalFor(requireLevel('wyspa-1'))).toBe(ISLAND_INTERVAL);
    expect(surgeIntervalFor(requireLevel('gory-2'))).toBeGreaterThan(ISLAND_INTERVAL);
    expect(surgeIntervalFor(requireLevel('gory-2'))).toBeLessThan(MEADOW_INTERVAL);
  });

  it('skips the surge while enemies are frozen', () => {
    const { surge, enemy, announce } = setup();
    enemy.freeze(SURGE_FIRST_DELAY * 2);
    play(surge, SURGE_FIRST_DELAY + SURGE_TELEGRAPH + FRAME);
    expect(announce).not.toHaveBeenCalled();
    expect(surge.isSurging).toBe(false);
  });

  it('ends early when a freeze lands during the surge', () => {
    const { surge, enemy, scale } = setup();
    reachSurge(surge);
    enemy.freeze(3);
    surge.update(FRAME);
    expect(surge.isSurging).toBe(false);
    expect(scale).toHaveBeenLastCalledWith(1);
  });

  it('never surges in the warm up or before the level starts', () => {
    const warmup = setup({ phase: WARMUP });
    play(warmup.surge, SURGE_FIRST_DELAY * 3);
    expect(warmup.announce).not.toHaveBeenCalled();

    const idle = setup({ playing: false });
    play(idle.surge, SURGE_FIRST_DELAY * 3);
    expect(idle.announce).not.toHaveBeenCalled();
  });

  it('spares the boss and comes twice as often in its rage', () => {
    const board = fakeBoard({ phase: BOSS });
    const boss = new Boss(
      board.context.createLabel(),
      1,
      { shape: 'crystal', colors: [1] },
      () => 'boss',
      BOSS_WORDS,
    );
    board.enemies.push(boss);
    const bossScale = vi.spyOn(boss, 'setSpeedScale');
    const surge = new SpeedSurge(board.context);
    for (let hit = 0; hit < BOSS_WORDS - 1; hit += 1) boss.takeHit();
    play(surge, SURGE_FIRST_DELAY / 2 + FRAME);
    expect(surge.isTelegraphing).toBe(true);
    play(surge, SURGE_TELEGRAPH);
    expect(surge.isSurging).toBe(true);
    expect(bossScale).not.toHaveBeenCalled();
  });

  it('calms down when the phase changes', () => {
    const { surge, scale } = setup();
    reachSurge(surge);
    surge.onPhaseChange();
    expect(surge.isSurging).toBe(false);
    expect(scale).toHaveBeenLastCalledWith(1);
    play(surge, SURGE_FIRST_DELAY - FRAME);
    expect(surge.isTelegraphing).toBe(false);
  });
});
