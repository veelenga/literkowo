// @vitest-environment jsdom
import { describe, expect, it, vi } from 'vitest';
import { fakeBoard } from '../../testing/enemyBoard';
import { requireLevel } from '../../testing/levels';
import { Boss } from '../Boss';
import type { Enemy } from '../Enemy';
import type { Phase } from '../RunPlan';
import { SessionStats } from '../SessionStats';
import { BLOWBACK_DISTANCE, BOMBER_INTERVAL, BOMBER_SPEED_SHARE, Bombers } from './Bombers';
import { BOMBER_SCALE, BOMBER_TAG, BomberEnemy } from './bombers/BomberEnemy';
import { BOMBER_WORD_LENGTH, bomberWord, fitsBomber } from './bombers/bomberWord';
import { BLAST_SHAKE, CHAIN_DELAY, SLOW_MOTION } from './bombers/Detonations';
import { FuseTicker, TICK_START_DISTANCE, tickIntervalAt } from './bombers/FuseTicker';
import type { MechanicContext } from './Mechanic';

const FRAME = 1 / 30;
const FOREST = requireLevel('las-2');
const MEADOW = requireLevel('polana-2');
const ALWAYS_LOW = () => 0;
const BOSS_PHASE: Phase = { kind: 'boss', count: 6, speed: 0.4, spawnInterval: 0 };
const WARMUP: Phase = { kind: 'warmup', count: 8, speed: 0.55, spawnInterval: 1.5 };
const BOMBER_WORD = 'kasztan';

function setup(overrides: Partial<MechanicContext> = {}) {
  const announce = vi.fn<MechanicContext['announce']>();
  const setTimeScale = vi.fn<MechanicContext['setTimeScale']>();
  const shakeCamera = vi.fn<MechanicContext['shakeCamera']>();
  const board = fakeBoard({ announce, setTimeScale, shakeCamera, level: FOREST, ...overrides });
  const bombers = new Bombers(board.context, ALWAYS_LOW);
  const bomberAt = (distance: number): BomberEnemy => {
    const bomber = new BomberEnemy(BOMBER_WORD, board.context.createLabel(), 1, 'crystal');
    bomber.object.position.set(0, 0, -distance);
    board.enemies.push(bomber);
    return bomber;
  };
  const complete = (bomber: BomberEnemy): void => {
    while (!bomber.isComplete) bomber.advance();
    bombers.onWordComplete(bomber);
    board.context.removeEnemy(bomber);
  };
  return { ...board, announce, setTimeScale, shakeCamera, bombers, bomberAt, complete };
}

function play(mechanic: { update(delta: number): void }, seconds: number): void {
  for (let time = 0; time < seconds - FRAME / 2; time += FRAME) mechanic.update(FRAME);
}

function pointsFor(...words: string[]): number {
  const stats = new SessionStats();
  words.forEach((word) => stats.recordWord(word));
  return stats.score;
}

describe('Bombers', () => {
  it('lights a big slow bomber with a long word from the forest on', () => {
    const { bombers, enemyAt, enemies } = setup();
    enemyAt(8);
    play(bombers, BOMBER_INTERVAL.min - FRAME);
    expect(bombers.bombers).toHaveLength(0);
    play(bombers, 2 * FRAME);
    const [bomber] = bombers.bombers;
    expect(bomber.tags.has(BOMBER_TAG)).toBe(true);
    expect(fitsBomber(bomber.word)).toBe(true);
    expect(enemies).toContain(bomber);
    expect(BOMBER_SCALE).toBeGreaterThan(1);
    expect(BOMBER_SPEED_SHARE).toBeLessThan(1);
  });

  it('keeps at most one bomber on the board', () => {
    const { bombers, enemyAt } = setup();
    enemyAt(8);
    play(bombers, BOMBER_INTERVAL.max * 4);
    expect(bombers.bombers).toHaveLength(1);
  });

  it('comes to the meadow when the run unlocks every mechanic', () => {
    const meadow = setup({ level: MEADOW, allMechanicsUnlocked: true });
    meadow.enemyAt(8);
    play(meadow.bombers, BOMBER_INTERVAL.max * 2);
    expect(meadow.bombers.bombers).toHaveLength(1);
  });

  it('never comes in the meadow or in the warm up, but comes to boss fights', () => {
    const meadow = setup({ level: MEADOW });
    meadow.enemyAt(8);
    play(meadow.bombers, BOMBER_INTERVAL.max * 2);
    expect(meadow.bombers.bombers).toHaveLength(0);

    const warmup = setup({ phase: WARMUP });
    warmup.enemyAt(8);
    play(warmup.bombers, BOMBER_INTERVAL.max * 2);
    expect(warmup.bombers.bombers).toHaveLength(0);

    const boss = setup({ phase: BOSS_PHASE });
    boss.enemyAt(8);
    play(boss.bombers, BOMBER_INTERVAL.max);
    expect(boss.bombers.bombers).toHaveLength(1);
  });

  it('shatters every enemy within reach of the blast for normal points, never the boss', () => {
    const { bombers, bomberAt, enemyAt, enemies, context, setTimeScale, shakeCamera, complete } =
      setup();
    const bomber = bomberAt(8);
    const near = enemyAt(4, 'dom');
    const far = enemyAt(3, 'las');
    const boss = new Boss(
      context.createLabel(),
      1,
      { shape: 'crystal', colors: [1] },
      () => 'boss',
      3,
    );
    boss.object.position.set(0, 0, -7);
    enemies.push(boss);
    complete(bomber);
    expect(enemies).not.toContain(near);
    expect(enemies).toContain(far);
    expect(enemies).toContain(boss);
    expect(context.stats.score).toBe(pointsFor('dom'));
    expect(setTimeScale).toHaveBeenLastCalledWith(SLOW_MOTION.scale);
    expect(shakeCamera).toHaveBeenCalledWith(BLAST_SHAKE.strength, BLAST_SHAKE.seconds);
    play(bombers, SLOW_MOTION.seconds + FRAME);
    expect(setTimeScale).toHaveBeenLastCalledWith(1);
  });

  it('spares enemies that finish their word on the same key', () => {
    const { bomberAt, enemyAt, enemies, complete } = setup();
    const bomber = bomberAt(8);
    const finishing = enemyAt(6, 'a');
    finishing.advance();
    complete(bomber);
    expect(enemies).toContain(finishing);
  });

  it('sets off other bombers in range a moment later and cheers a big chain', () => {
    const { bombers, bomberAt, enemyAt, enemies, announce, context, complete } = setup();
    const first = bomberAt(8);
    const nearFirst = enemyAt(6, 'kot');
    const second = bomberAt(4);
    const nearSecond = enemyAt(2, 'mak');
    complete(first);
    expect(enemies).not.toContain(nearFirst);
    expect(enemies).toContain(second);
    expect(enemies).toContain(nearSecond);
    expect(announce).not.toHaveBeenCalled();
    play(bombers, CHAIN_DELAY + FRAME);
    expect(enemies).not.toContain(second);
    expect(enemies).not.toContain(nearSecond);
    expect(context.stats.score).toBe(pointsFor('kot', BOMBER_WORD, 'mak'));
    expect(announce).toHaveBeenCalledWith('Bum! x3', 'banner', expect.any(String));
  });

  it('keeps quiet when fewer than three enemies go down', () => {
    const { bombers, bomberAt, enemyAt, announce, complete } = setup();
    const bomber = bomberAt(8);
    enemyAt(6);
    complete(bomber);
    play(bombers, CHAIN_DELAY + FRAME);
    expect(announce).not.toHaveBeenCalled();
  });

  it('knocks every other enemy back when it reaches the hero, leaving the life to the game', () => {
    const { bombers, bomberAt, enemyAt, enemies } = setup();
    const bomber = bomberAt(1.5);
    const near = enemyAt(3);
    const far = enemyAt(5);
    bombers.onEnemyReached(bomber);
    play(bombers, 1);
    expect(near.distanceToCenter).toBeCloseTo(3 + BLOWBACK_DISTANCE);
    expect(far.distanceToCenter).toBeCloseTo(5 + BLOWBACK_DISTANCE);
    expect(enemies).toContain(bomber);
  });

  it('ignores enemies that are not bombers', () => {
    const { bombers, enemyAt, enemies } = setup();
    const plain: Enemy = enemyAt(3);
    const other = enemyAt(4);
    bombers.onWordComplete(plain);
    bombers.onEnemyReached(plain);
    play(bombers, 1);
    expect(enemies).toContain(other);
    expect(other.distanceToCenter).toBeCloseTo(4);
  });
});

describe('bomberWord', () => {
  it('takes a long boss word when one fits', () => {
    const words = { bossWord: () => 'parasolka' };
    expect(bomberWord(words, 'abc')).toBe('parasolka');
  });

  it('builds a word from the allowed letters when boss words are too short', () => {
    const words = { bossWord: () => 'dom' };
    const word = bomberWord(words, 'fjdk;', ALWAYS_LOW);
    expect(word).toHaveLength(BOMBER_WORD_LENGTH.min);
    expect(word).toMatch(/^[fjdk]+$/);
  });
});

describe('FuseTicker', () => {
  it('starts ticking near the hero and ticks faster as it gets closer', () => {
    const ticker = new FuseTicker();
    expect(ticker.update(FRAME, TICK_START_DISTANCE + 1)).toBe(false);
    expect(ticker.update(FRAME, TICK_START_DISTANCE)).toBe(true);
    expect(ticker.update(FRAME, TICK_START_DISTANCE)).toBe(false);
    expect(tickIntervalAt(2)).toBeLessThan(tickIntervalAt(TICK_START_DISTANCE));
  });
});
