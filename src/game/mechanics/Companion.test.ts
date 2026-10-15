// @vitest-environment jsdom
import * as THREE from 'three';
import { describe, expect, it, vi } from 'vitest';
import { fakeBoard } from '../../testing/enemyBoard';
import type { Phase } from '../LevelPlan';
import { Companion, ZAP_DELAY } from './Companion';
import { ZAP_MIN_COMBO } from './companion/zapRules';
import type { MechanicContext } from './Mechanic';
import { wordPoints } from './mergeEnemies/scoring';

const FRAME = 1 / 60;
const SETTLE_SECONDS = 3;
const NEAR = 2.5;
const FAR = 12;
const WARMUP: Phase = { kind: 'warmup', count: 8, speed: 0.5, spawnInterval: 1.5 };
const HERO_REACH = 2;

function setup(overrides: Partial<MechanicContext> = {}) {
  const announce = vi.fn<MechanicContext['announce']>();
  const burst = vi.fn<MechanicContext['particles']['burst']>();
  const board = fakeBoard({
    equipped: { pet: 'cube-cat' },
    announce,
    particles: { burst },
    ...overrides,
  });
  const companion = new Companion(board.context);
  let elapsed = 0;
  const run = (seconds: number) => {
    for (let time = 0; time < seconds; time += FRAME) {
      elapsed += FRAME;
      companion.update(FRAME, elapsed);
    }
  };
  const buildCombo = (combo = ZAP_MIN_COMBO) => {
    for (let hit = 0; hit < combo; hit += 1) board.context.stats.recordHit();
  };
  return { ...board, announce, burst, companion, run, buildCombo };
}

function petOf(scene: THREE.Scene): THREE.Object3D {
  return scene.children[0];
}

describe('Companion', () => {
  it('stays away when no pet is equipped', () => {
    const { context, enemyAt, buildCombo, run, enemies } = setup({ equipped: {} });
    enemyAt(NEAR);
    buildCombo();
    run(1);
    expect(context.scene.children).toHaveLength(0);
    expect(enemies).toHaveLength(1);
  });

  it('follows the hero with a lag', () => {
    const { context, run } = setup();
    const pet = petOf(context.scene);
    run(SETTLE_SECONDS);
    expect(pet.position.distanceTo(context.player.object.position)).toBeLessThan(HERO_REACH);

    context.player.object.rotation.y = Math.PI;
    const before = pet.position.clone();
    run(FRAME);
    const moved = pet.position.distanceTo(before);
    run(SETTLE_SECONDS);
    expect(moved).toBeLessThan(pet.position.distanceTo(before) / 2);
  });

  it('zaps an enemy once per level with its word points', () => {
    const { context, enemies, enemyAt, buildCombo, run, announce, burst } = setup();
    const first = enemyAt(NEAR, 'fjfj');
    buildCombo();
    const expected = wordPoints(first.word, context.stats);
    run(ZAP_DELAY * 2);
    expect(enemies).not.toContain(first);
    expect(context.stats.score).toBe(expected);
    expect(burst).toHaveBeenCalledTimes(1);
    expect(announce).toHaveBeenCalledWith('Pomocnik!', 'callout', '#5ce1ff');

    const second = enemyAt(NEAR);
    run(1);
    expect(enemies).toContain(second);
  });

  it('waits for a combo of five', () => {
    const { enemies, enemyAt, buildCombo, run } = setup();
    enemyAt(NEAR);
    buildCombo(ZAP_MIN_COMBO - 1);
    run(1);
    expect(enemies).toHaveLength(1);
  });

  it('zaps the nearest enemy as soon as the combo reaches five', () => {
    const { enemies, enemyAt, buildCombo, run } = setup();
    const far = enemyAt(FAR);
    enemyAt(NEAR);
    buildCombo();
    run(ZAP_DELAY * 2);
    expect(enemies).toEqual([far]);
  });

  it('leaves the word the player is typing and rests during the warm up', () => {
    const typing = setup();
    const started = typing.enemyAt(NEAR);
    started.advance();
    typing.buildCombo();
    typing.run(1);
    expect(typing.enemies).toEqual([started]);

    const warmup = setup({ phase: WARMUP });
    warmup.enemyAt(NEAR);
    warmup.buildCombo();
    warmup.run(1);
    expect(warmup.enemies).toHaveLength(1);
  });

  it('keeps its zap when the target is typed before the bolt lands', () => {
    const { enemies, enemyAt, buildCombo, run, companion, context } = setup();
    const first = enemyAt(NEAR);
    buildCombo();
    companion.update(FRAME, FRAME);
    context.removeEnemy(first);
    run(ZAP_DELAY * 2);
    const second = enemyAt(NEAR);
    run(ZAP_DELAY * 2);
    expect(enemies).not.toContain(second);
  });

  it('removes the pet from the scene on dispose', () => {
    const { context, companion } = setup();
    companion.dispose();
    expect(context.scene.children).toHaveLength(0);
  });
});
