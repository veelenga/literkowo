// @vitest-environment jsdom
import { describe, expect, it, vi } from 'vitest';
import { fakeBoard } from '../../testing/enemyBoard';
import type { Phase } from '../RunPlan';
import type { MechanicContext } from './Mechanic';
import { POWER_SPEED_SCALE, PowerWords } from './PowerWords';
import { isPowerEnemy } from './powerWords/PowerEnemy';
import { FREEZE_SECONDS } from './powerWords/spells/Freeze';

const ALWAYS_LOW = () => 0;
const ALWAYS_HIGH = () => 0.9999;
const WARMUP: Phase = { kind: 'warmup', count: 8, speed: 0.55, spawnInterval: 1.5 };
const BOSS: Phase = { kind: 'boss', count: 6, speed: 0.4, spawnInterval: 0 };
const VIEWER = { x: 0, y: 10, z: 10 };

function setup(overrides: Partial<MechanicContext> = {}, random = ALWAYS_LOW) {
  const announce = vi.fn<MechanicContext['announce']>();
  const board = fakeBoard({ announce, ...overrides });
  const powerWords = new PowerWords(board.context, random);
  board.enemyAt(8);
  const powerEnemies = () => board.enemies.filter((enemy) => enemy === powerWords.powerEnemy);
  return { ...board, announce, powerWords, powerEnemies };
}

describe('PowerWords', () => {
  it('summons a golden enemy after 18 seconds at the earliest', () => {
    const { powerWords, powerEnemies } = setup();
    powerWords.update(17.9);
    expect(powerEnemies()).toHaveLength(0);
    powerWords.update(0.2);
    expect(powerEnemies()).toHaveLength(1);
  });

  it('waits no longer than 28 seconds', () => {
    const { powerWords, powerEnemies } = setup({}, ALWAYS_HIGH);
    powerWords.update(27.9);
    expect(powerEnemies()).toHaveLength(0);
    powerWords.update(0.2);
    expect(powerEnemies()).toHaveLength(1);
  });

  it('keeps at most one power enemy on the board', () => {
    const { powerWords, enemies } = setup();
    for (let second = 0; second < 120; second += 1) powerWords.update(1);
    expect(enemies.filter(isPowerEnemy)).toHaveLength(1);
  });

  it('restarts the countdown once the power enemy is gone', () => {
    const { powerWords, context, powerEnemies } = setup();
    powerWords.update(18);
    const first = powerWords.powerEnemy;
    if (!first) throw new Error('expected a power enemy');
    context.removeEnemy(first);
    powerWords.update(17.9);
    expect(powerEnemies()).toHaveLength(0);
    powerWords.update(0.2);
    expect(powerWords.powerEnemy).toBeDefined();
    expect(powerWords.powerEnemy).not.toBe(first);
  });

  it('never appears in the warm-up, when idle or on an empty board', () => {
    const warmup = setup({ phase: WARMUP });
    warmup.powerWords.update(60);
    expect(warmup.powerWords.powerEnemy).toBeUndefined();

    const idle = setup({ playing: false });
    idle.powerWords.update(60);
    expect(idle.powerWords.powerEnemy).toBeUndefined();

    const empty = setup();
    empty.enemies.length = 0;
    empty.powerWords.update(60);
    expect(empty.powerWords.powerEnemy).toBeUndefined();
  });

  it('also appears in the boss fight', () => {
    const { powerWords } = setup({ phase: BOSS });
    powerWords.update(18);
    expect(powerWords.powerEnemy).toBeDefined();
  });

  it('walks slower than normal enemies and wears a power label', () => {
    const { powerWords, context } = setup();
    powerWords.update(18);
    const enemy = powerWords.powerEnemy;
    if (!enemy) throw new Error('expected a power enemy');
    const start = enemy.distanceToCenter;
    enemy.update(1, 0, VIEWER);
    expect(start - enemy.distanceToCenter).toBeCloseTo(context.phase.speed * POWER_SPEED_SCALE);
    expect(enemy.label.classList.contains('is-power-word')).toBe(true);
    expect(enemy.label.dataset.power).toBe('freeze');
    expect(enemy.label.dataset.powerIcon).toBe('❄️');
    expect(enemy.word).toMatch(/^[fj]{4,6}$/);
  });

  it('casts the spell with a coloured banner once the word is typed', () => {
    const { powerWords, enemies, announce } = setup();
    powerWords.update(18);
    const enemy = powerWords.powerEnemy;
    if (!enemy) throw new Error('expected a power enemy');
    powerWords.onWordComplete(enemy);
    expect(announce).toHaveBeenCalledWith(`❄️ ${enemy.word}`, 'banner', '#8fdcff');
    expect(enemies[0].isFrozen).toBe(true);
    expect(powerWords.powerEnemy).toBeUndefined();
    enemies[0].update(FREEZE_SECONDS + 0.1, 0, VIEWER);
    expect(enemies[0].isFrozen).toBe(false);
  });

  it('removes a power enemy that reaches the hero without a lost life', () => {
    const loseLife = vi.fn();
    const { powerWords, enemies } = setup({ loseLife });
    powerWords.update(18);
    const enemy = powerWords.powerEnemy;
    if (!enemy) throw new Error('expected a power enemy');
    powerWords.onEnemyReached(enemy);
    expect(enemies).not.toContain(enemy);
    expect(loseLife).not.toHaveBeenCalled();
    powerWords.onEnemyReached(enemies[0]);
    expect(enemies).toHaveLength(1);
  });

  it('removes its effects from the scene on dispose', () => {
    const { powerWords, context } = setup();
    const before = context.scene.children.length;
    expect(before).toBeGreaterThan(0);
    powerWords.dispose();
    expect(context.scene.children).toHaveLength(0);
  });
});
