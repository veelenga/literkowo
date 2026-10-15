// @vitest-environment jsdom
import { describe, expect, it, vi } from 'vitest';
import { POWER_COMBOS, type PetPower } from '../../../../course/powers';
import { petSpec } from '../../../../course/shop';
import { fakeBoard } from '../../../../testing/enemyBoard';
import { SPAWN_RADIUS } from '../../../board';
import type { Phase } from '../../../RunPlan';
import type { MechanicContext } from '../../Mechanic';
import { PowerEnemy } from '../../powerWords/PowerEnemy';
import { ChestEnemy } from '../../waveEvents/ChestEnemy';
import { CHEST_COINS } from '../../WaveEvents';
import { Pet } from '../Pet';
import { DANGER_DISTANCE } from '../targets';
import { CHEST_FACTOR, DoubleChest } from './DoubleChest';
import { FreezeBoard } from './FreezeBoard';
import { RestoreHeart } from './RestoreHeart';
import { NEAR_RADIUS, StopNear } from './StopNear';

const FRAME = 1 / 60;
const FREEZE_SECONDS = 2;
const WARMUP: Phase = { kind: 'warmup', count: 8, speed: 0.5, spawnInterval: 1.5 };
const NEXT_WAVE: Phase = { kind: 'words', count: 10, speed: 1, spawnInterval: 2, wave: 2 };
const CHEST_SIDE = 1;

function petBoard(overrides: Partial<MechanicContext> = {}) {
  const announce = vi.fn<MechanicContext['announce']>();
  const addCoins = vi.fn<MechanicContext['addCoins']>();
  const board = fakeBoard({ announce, addCoins, ...overrides });
  const spec = petSpec('cube-cat');
  if (!spec) throw new Error('Missing the cube cat');
  const pet = new Pet(spec, board.context);
  const combo = (hits: number) => {
    for (let hit = 0; hit < hits; hit += 1) board.context.stats.recordHit();
  };
  return { ...board, announce, addCoins, pet, combo };
}

function power(kind: PetPower['kind'], strength: number): PetPower {
  return { kind, strength };
}

describe('RestoreHeart', () => {
  it('gives back one heart once per level at combo fifteen', () => {
    const restoreLife = vi.fn<MechanicContext['restoreLife']>(() => true);
    const { context, pet, announce, combo } = petBoard({ restoreLife });
    const heal = new RestoreHeart(power('restoreHeart', 1), pet, context);
    combo(POWER_COMBOS.restoreHeart - 1);
    heal.onHit();
    expect(restoreLife).not.toHaveBeenCalled();
    combo(1);
    heal.onHit();
    combo(1);
    heal.onHit();
    expect(restoreLife).toHaveBeenCalledTimes(1);
    expect(announce).toHaveBeenCalledWith('Nowe serce!', 'callout', '#5ce1ff');
  });

  it('keeps its charge while every heart is still there', () => {
    const restoreLife = vi.fn<MechanicContext['restoreLife']>(() => false);
    const { context, pet, combo, announce } = petBoard({ restoreLife });
    const heal = new RestoreHeart(power('restoreHeart', 1), pet, context);
    combo(POWER_COMBOS.restoreHeart);
    heal.onHit();
    restoreLife.mockReturnValue(true);
    heal.onHit();
    expect(restoreLife).toHaveBeenCalledTimes(2);
    expect(announce).toHaveBeenCalledTimes(1);
  });
});

describe('FreezeBoard', () => {
  it('freezes the whole board once an enemy comes too close', () => {
    const { context, pet, enemyAt, announce } = petBoard();
    const freeze = new FreezeBoard(power('freezeBoard', FREEZE_SECONDS), pet, context);
    const far = enemyAt(SPAWN_RADIUS);
    freeze.update();
    expect(far.isFrozen).toBe(false);
    const near = enemyAt(DANGER_DISTANCE - 0.1);
    freeze.update();
    expect([far.isFrozen, near.isFrozen]).toEqual([true, true]);
    expect(announce).toHaveBeenCalledWith('Zamrożone!', 'callout', '#5ce1ff');
    for (let time = 0; time < FREEZE_SECONDS; time += FRAME)
      near.update(FRAME, time, near.object.position);
    expect(near.isFrozen).toBe(false);
    freeze.update();
    expect(near.isFrozen).toBe(false);
  });

  it('ignores harmless enemies and the warm up', () => {
    const warmup = petBoard({ phase: WARMUP });
    const resting = new FreezeBoard(power('freezeBoard', 2), warmup.pet, warmup.context);
    warmup.enemyAt(DANGER_DISTANCE - 0.1);
    resting.update();
    expect(warmup.enemies[0].isFrozen).toBe(false);

    const { context, pet, enemies } = petBoard();
    const freeze = new FreezeBoard(power('freezeBoard', FREEZE_SECONDS), pet, context);
    const word = new PowerEnemy('mróz', context.createLabel(), 1, 'crystal', 'freeze');
    word.object.position.set(0, 0, -1);
    enemies.push(word);
    freeze.update();
    expect(word.isFrozen).toBe(false);
  });

  it('starts again on a new arena wave', () => {
    const { context, pet, enemyAt, announce } = petBoard();
    const freeze = new FreezeBoard(power('freezeBoard', FREEZE_SECONDS), pet, context);
    enemyAt(DANGER_DISTANCE - 0.1);
    freeze.update();
    freeze.onPhaseChange(NEXT_WAVE);
    freeze.update();
    expect(announce).toHaveBeenCalledTimes(2);
  });
});

describe('StopNear', () => {
  it('stops the enemies near the hero each time the combo reaches ten', () => {
    const { context, pet, enemyAt, combo, announce } = petBoard();
    const stop = new StopNear(power('stopNear', 2), pet, context);
    const near = enemyAt(NEAR_RADIUS - 1);
    const far = enemyAt(NEAR_RADIUS + 2);
    combo(POWER_COMBOS.stopNear - 1);
    stop.onHit();
    expect(near.isFrozen).toBe(false);
    combo(1);
    stop.onHit();
    expect([near.isFrozen, far.isFrozen]).toEqual([true, false]);
    expect(announce).toHaveBeenCalledWith('Stop!', 'callout', '#5ce1ff');
  });

  it('stays quiet with nobody near the hero', () => {
    const { context, pet, enemyAt, combo, announce } = petBoard();
    const stop = new StopNear(power('stopNear', 2), pet, context);
    enemyAt(SPAWN_RADIUS);
    combo(POWER_COMBOS.stopNear);
    stop.onHit();
    expect(announce).not.toHaveBeenCalled();
  });
});

describe('DoubleChest', () => {
  it('doubles the coins of one treasure chest per level', () => {
    const { context, pet, addCoins, announce } = petBoard();
    const double = new DoubleChest(power('doubleChest', 1), pet, context);
    const host = { dismiss: vi.fn(), land: vi.fn() };
    const chest = () => new ChestEnemy('skarb', context.createLabel(), CHEST_SIDE, host);
    double.onWordComplete(chest());
    double.onWordComplete(chest());
    expect(addCoins).toHaveBeenCalledTimes(1);
    expect(addCoins).toHaveBeenCalledWith(CHEST_COINS * (CHEST_FACTOR - 1));
    expect(announce).toHaveBeenCalledWith('Podwójny skarb!', 'callout', '#5ce1ff');
    double.onPhaseChange(NEXT_WAVE);
    double.onWordComplete(chest());
    expect(addCoins).toHaveBeenCalledTimes(2);
  });
});
