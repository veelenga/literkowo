// @vitest-environment jsdom
import { describe, expect, it, vi } from 'vitest';
import { POWER_COMBOS, type PetPower } from '../../../../course/powers';
import { petSpec } from '../../../../course/shop';
import { fakeBoard } from '../../../../testing/enemyBoard';
import { SPAWN_RADIUS } from '../../../board';
import { LEVEL_LIVES } from '../../../LevelPlan';
import type { Phase } from '../../../RunPlan';
import type { MechanicContext } from '../../Mechanic';
import { PowerEnemy } from '../../powerWords/PowerEnemy';
import { ChestEnemy } from '../../waveEvents/ChestEnemy';
import { CHEST_COINS } from '../../WaveEvents';
import { Pet } from '../Pet';
import { CROWDED_BOARD, DANGER_DISTANCE } from '../trouble';
import { TroubleWatch } from '../TroubleWatch';
import { CHEST_FACTOR, DoubleChest } from './DoubleChest';
import { FreezeBoard } from './FreezeBoard';
import { RestoreHeart } from './RestoreHeart';
import { NEAR_RADIUS, StopNear } from './StopNear';

const FRAME = 1 / 60;
const FREEZE_SECONDS = 2;
const CLOSE = DANGER_DISTANCE - 0.1;
const WARMUP: Phase = { kind: 'warmup', count: 8, speed: 0.5, spawnInterval: 1.5 };
const TEST_STAGE: Phase = { kind: 'test', count: 4, speed: 0.5, spawnInterval: 3, seconds: 12 };
const NEXT_WAVE: Phase = { kind: 'words', count: 10, speed: 1, spawnInterval: 2, wave: 2 };
const CHEST_SIDE = 1;
const ONE_HEART_LOST = LEVEL_LIVES - 1;

function petBoard(overrides: Partial<MechanicContext> = {}) {
  const announce = vi.fn<MechanicContext['announce']>();
  const addCoins = vi.fn<MechanicContext['addCoins']>();
  const board = fakeBoard({ announce, addCoins, ...overrides });
  const spec = petSpec('cube-cat');
  if (!spec) throw new Error('Missing the cube cat');
  const pet = new Pet(spec, board.context);
  const trouble = new TroubleWatch(board.context);
  const combo = (hits: number) => {
    for (let hit = 0; hit < hits; hit += 1) board.context.stats.recordHit();
  };
  const crowd = () => board.enemiesAt(SPAWN_RADIUS, CROWDED_BOARD);
  return { ...board, announce, addCoins, pet, trouble, combo, crowd };
}

function power(kind: PetPower['kind'], strength: number): PetPower {
  return { kind, strength };
}

describe('RestoreHeart', () => {
  it('keeps a lost heart away while the hero is safe', () => {
    const restoreLife = vi.fn<MechanicContext['restoreLife']>(() => true);
    const { context, pet, trouble, enemyAt, announce } = petBoard({
      restoreLife,
      lives: ONE_HEART_LOST,
    });
    const heal = new RestoreHeart(power('restoreHeart', 1), pet, context, trouble);
    enemyAt(SPAWN_RADIUS);
    heal.update();
    expect(restoreLife).not.toHaveBeenCalled();
    expect(announce).not.toHaveBeenCalled();
  });

  it('gives back a lost heart once per level when the hero is in trouble', () => {
    const restoreLife = vi.fn<MechanicContext['restoreLife']>(() => true);
    const { context, pet, trouble, enemyAt, announce } = petBoard({
      restoreLife,
      lives: ONE_HEART_LOST,
    });
    const heal = new RestoreHeart(power('restoreHeart', 1), pet, context, trouble);
    enemyAt(CLOSE);
    heal.update();
    heal.update();
    expect(restoreLife).toHaveBeenCalledTimes(1);
    expect(announce).toHaveBeenCalledWith('Nowe serce!', 'callout', '#5ce1ff');
    heal.onPhaseChange(NEXT_WAVE);
    heal.update();
    expect(restoreLife).toHaveBeenCalledTimes(2);
  });

  it('keeps its charge while every heart is still there', () => {
    const restoreLife = vi.fn<MechanicContext['restoreLife']>(() => true);
    const { context, pet, trouble, crowd, announce } = petBoard({ restoreLife });
    const heal = new RestoreHeart(power('restoreHeart', 1), pet, context, trouble);
    crowd();
    heal.update();
    expect(restoreLife).not.toHaveBeenCalled();
    expect(announce).not.toHaveBeenCalled();
  });
});

describe('FreezeBoard', () => {
  it('stays calm while one enemy walks far away', () => {
    const { context, pet, trouble, enemyAt, announce } = petBoard();
    const freeze = new FreezeBoard(power('freezeBoard', FREEZE_SECONDS), pet, context, trouble);
    const far = enemyAt(SPAWN_RADIUS);
    freeze.update();
    expect(far.isFrozen).toBe(false);
    expect(announce).not.toHaveBeenCalled();
  });

  it('freezes the whole board once when an enemy comes too close', () => {
    const { context, pet, trouble, enemyAt, announce } = petBoard();
    const freeze = new FreezeBoard(power('freezeBoard', FREEZE_SECONDS), pet, context, trouble);
    const far = enemyAt(SPAWN_RADIUS);
    const near = enemyAt(CLOSE);
    freeze.update();
    expect([far.isFrozen, near.isFrozen]).toEqual([true, true]);
    expect(announce).toHaveBeenCalledWith('Zamrożone!', 'callout', '#5ce1ff');
    for (let time = 0; time < FREEZE_SECONDS; time += FRAME)
      near.update(FRAME, time, near.object.position);
    expect(near.isFrozen).toBe(false);
    freeze.update();
    expect(near.isFrozen).toBe(false);
  });

  it('freezes a crowded board before anyone comes close', () => {
    const { context, pet, trouble, crowd, enemies } = petBoard();
    const freeze = new FreezeBoard(power('freezeBoard', FREEZE_SECONDS), pet, context, trouble);
    crowd();
    freeze.update();
    expect(enemies.every((enemy) => enemy.isFrozen)).toBe(true);
  });

  it('ignores harmless enemies and the warm up', () => {
    const warmup = petBoard({ phase: WARMUP });
    const resting = new FreezeBoard(
      power('freezeBoard', 2),
      warmup.pet,
      warmup.context,
      warmup.trouble,
    );
    warmup.enemyAt(CLOSE);
    resting.update();
    expect(warmup.enemies[0].isFrozen).toBe(false);

    const { context, pet, trouble, enemies } = petBoard();
    const freeze = new FreezeBoard(power('freezeBoard', FREEZE_SECONDS), pet, context, trouble);
    const word = new PowerEnemy('mróz', context.createLabel(), 1, 'crystal', 'freeze');
    word.object.position.set(0, 0, -1);
    enemies.push(word);
    freeze.update();
    expect(word.isFrozen).toBe(false);
  });

  it('stays out of a placement stage, where the kid types alone', () => {
    const { context, pet, trouble, enemyAt, announce } = petBoard({ phase: TEST_STAGE });
    const freeze = new FreezeBoard(power('freezeBoard', FREEZE_SECONDS), pet, context, trouble);
    const near = enemyAt(CLOSE);
    freeze.update();
    expect(near.isFrozen).toBe(false);
    expect(announce).not.toHaveBeenCalled();
  });

  it('starts again on a new arena wave', () => {
    const { context, pet, trouble, enemyAt, announce } = petBoard();
    const freeze = new FreezeBoard(power('freezeBoard', FREEZE_SECONDS), pet, context, trouble);
    const near = enemyAt(CLOSE);
    freeze.update();
    for (let time = 0; time < FREEZE_SECONDS; time += FRAME)
      near.update(FRAME, time, near.object.position);
    freeze.onPhaseChange(NEXT_WAVE);
    freeze.update();
    expect(announce).toHaveBeenCalledTimes(2);
  });
});

describe('StopNear', () => {
  it('waits for a combo of ten before it can stop anyone', () => {
    const { context, pet, trouble, enemyAt, combo, announce } = petBoard();
    const stop = new StopNear(power('stopNear', 2), pet, context, trouble);
    const near = enemyAt(CLOSE);
    combo(POWER_COMBOS.stopNear - 1);
    stop.onHit();
    stop.update();
    expect(near.isFrozen).toBe(false);
    expect(announce).not.toHaveBeenCalled();
  });

  it('keeps a stop from combo ten until the hero is in trouble', () => {
    const { context, pet, trouble, enemyAt, combo, announce } = petBoard();
    const stop = new StopNear(power('stopNear', 2), pet, context, trouble);
    const far = enemyAt(NEAR_RADIUS + 2);
    combo(POWER_COMBOS.stopNear);
    stop.onHit();
    stop.update();
    expect(announce).not.toHaveBeenCalled();

    const near = enemyAt(CLOSE);
    const around = enemyAt(NEAR_RADIUS - 0.5);
    context.stats.breakCombo();
    stop.update();
    expect([near.isFrozen, around.isFrozen, far.isFrozen]).toEqual([true, true, false]);
    expect(announce).toHaveBeenCalledWith('Stop!', 'callout', '#5ce1ff');
  });

  it('stops once for each combo of ten', () => {
    const { context, pet, trouble, enemyAt, combo, announce } = petBoard();
    const stop = new StopNear(power('stopNear', 2), pet, context, trouble);
    combo(POWER_COMBOS.stopNear);
    stop.onHit();
    enemyAt(CLOSE);
    stop.update();
    enemyAt(CLOSE);
    stop.update();
    expect(announce).toHaveBeenCalledTimes(1);
  });

  it('stays ready with nobody near the hero on a crowded board', () => {
    const { context, pet, trouble, crowd, enemyAt, combo, announce } = petBoard();
    const stop = new StopNear(power('stopNear', 2), pet, context, trouble);
    combo(POWER_COMBOS.stopNear);
    stop.onHit();
    crowd();
    stop.update();
    expect(announce).not.toHaveBeenCalled();
    const near = enemyAt(NEAR_RADIUS - 0.5);
    stop.update();
    expect(near.isFrozen).toBe(true);
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
