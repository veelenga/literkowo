// @vitest-environment jsdom
import * as THREE from 'three';
import { describe, expect, it, vi } from 'vitest';
import { fakeBoard } from '../../testing/enemyBoard';
import type { Phase } from '../RunPlan';
import { ZAP_DELAY } from './itemPowers/Pet';
import { CROWDED_BOARD } from './itemPowers/trouble';
import { ItemPowers } from './ItemPowers';
import type { MechanicContext } from './Mechanic';
import { wordPoints } from './mergeEnemies/scoring';

const FRAME = 1 / 60;
const SETTLE_SECONDS = 3;
const NEAR = 2.5;
const FAR = 12;
const WARMUP: Phase = { kind: 'warmup', count: 8, speed: 0.5, spawnInterval: 1.5 };
const HERO_REACH = 2;
const COMBO = 20;
const OTHER_WORD = 'jjj';

function setup(overrides: Partial<MechanicContext> = {}) {
  const announce = vi.fn<MechanicContext['announce']>();
  const burst = vi.fn<MechanicContext['particles']['burst']>();
  const boostRewards = vi.fn<MechanicContext['boostRewards']>();
  const board = fakeBoard({
    equipped: { pet: 'cube-cat' },
    announce,
    boostRewards,
    particles: { burst },
    ...overrides,
  });
  const powers = new ItemPowers(board.context);
  let elapsed = 0;
  const run = (seconds: number) => {
    for (let time = 0; time < seconds; time += FRAME) {
      elapsed += FRAME;
      powers.update(FRAME, elapsed);
    }
  };
  return { ...board, announce, burst, boostRewards, powers, run };
}

function petOf(scene: THREE.Scene): THREE.Object3D {
  return scene.children[0];
}

describe('ItemPowers with a pet', () => {
  it('stays away when nothing is equipped', () => {
    const { context, enemyAt, run, enemies, boostRewards } = setup({ equipped: {} });
    enemyAt(NEAR);
    run(1);
    expect(context.scene.children).toHaveLength(0);
    expect(enemies).toHaveLength(1);
    expect(boostRewards).not.toHaveBeenCalled();
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

  it('zaps an enemy that comes too close once per level with its word points', () => {
    const { context, enemies, enemyAt, run, announce, burst } = setup();
    const first = enemyAt(NEAR, 'fjfj');
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

  it('leaves enemies alone while the hero is safe, whatever the combo', () => {
    const { enemies, enemyAt, context, run } = setup();
    enemyAt(FAR);
    for (let hit = 0; hit < COMBO; hit += 1) context.stats.recordHit();
    run(1);
    expect(enemies).toHaveLength(1);
  });

  it('zaps the nearest enemy once the board is crowded', () => {
    const { enemies, enemiesAt, enemyAt, run } = setup();
    const far = enemiesAt(FAR, CROWDED_BOARD - 1);
    enemyAt(FAR - 1, OTHER_WORD);
    run(ZAP_DELAY * 2);
    expect(enemies).toEqual(far);
  });

  it('leaves the word the player is typing and rests during the warm up', () => {
    const typing = setup();
    const started = typing.enemyAt(NEAR);
    started.advance();
    typing.run(1);
    expect(typing.enemies).toEqual([started]);

    const warmup = setup({ phase: WARMUP });
    warmup.enemyAt(NEAR);
    warmup.run(1);
    expect(warmup.enemies).toHaveLength(1);
  });

  it('keeps its zap when the target is typed before the bolt lands', () => {
    const { enemies, enemyAt, run, powers, context } = setup();
    const first = enemyAt(NEAR);
    powers.update(FRAME, FRAME);
    context.removeEnemy(first);
    run(ZAP_DELAY * 2);
    const second = enemyAt(NEAR);
    run(ZAP_DELAY * 2);
    expect(enemies).not.toContain(second);
  });

  it('removes the pet from the scene on dispose', () => {
    const { context, powers } = setup();
    powers.dispose();
    expect(context.scene.children).toHaveLength(0);
  });
});

describe('ItemPowers with a hat', () => {
  it('runs the power of the equipped hat', () => {
    const { boostRewards, context } = setup({ equipped: { hat: 'cap' } });
    expect(boostRewards).toHaveBeenCalledWith({ coins: 1.1, xp: 1 });
    expect(context.scene.children).toHaveLength(0);
  });

  it('runs the powers of a pet and a hat together', () => {
    const { boostRewards, context } = setup({ equipped: { pet: 'cube-cat', hat: 'wizard' } });
    expect(boostRewards).toHaveBeenCalledWith({ coins: 1, xp: 1.1 });
    expect(context.scene.children.length).toBeGreaterThan(0);
  });
});
