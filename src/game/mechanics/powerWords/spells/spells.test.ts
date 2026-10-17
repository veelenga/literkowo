// @vitest-environment jsdom
import { describe, expect, it, vi } from 'vitest';
import { trackDisposal } from '../../../../testing/disposal';
import { fakeBoard } from '../../../../testing/enemyBoard';
import { groundRingsIn } from '../../../../testing/groundRings';
import { Boss } from '../../../Boss';
import type { MechanicContext } from '../../Mechanic';
import { PowerEnemy } from '../PowerEnemy';
import { FREEZE_SECONDS, FreezeSpell } from './Freeze';
import { KNOCKBACK, QUAKE_SHAKE, QuakeSpell } from './Quake';
import { ShieldSpell } from './Shield';
import type { Spell } from './Spell';
import { STRIKE_COUNT, StormSpell } from './Storm';

const FRAME = 1 / 30;
const VIEWER = { x: 0, y: 10, z: 10 };

function withCaster(overrides: Partial<MechanicContext> = {}) {
  const board = fakeBoard(overrides);
  const caster = new PowerEnemy('lód', board.context.createLabel(), 1, 'crystal', 'freeze');
  board.enemies.push(caster);
  return { ...board, caster };
}

function play(spell: { update(delta: number): void }, seconds: number): void {
  for (let time = 0; time < seconds; time += FRAME) spell.update(FRAME);
}

function expectRingFreedOnDispose(create: (context: MechanicContext) => Spell): void {
  const { context } = withCaster();
  const spell = create(context);
  const rings = groundRingsIn(context.scene);
  expect(rings).toHaveLength(1);
  spell.cast();
  expect(rings[0].visible).toBe(true);
  const counts = trackDisposal(rings[0].material);
  spell.dispose();
  expect(counts.get(rings[0].material)).toBe(1);
  expect(groundRingsIn(context.scene)).toHaveLength(0);
}

describe('FreezeSpell', () => {
  it('stops every other enemy for three seconds with frost around them', () => {
    const { context, enemyAt, caster } = withCaster();
    const near = enemyAt(3);
    const far = enemyAt(9);
    const spell = new FreezeSpell(context);
    spell.cast();
    spell.update(FRAME);
    expect(near.isFrozen && far.isFrozen).toBe(true);
    expect(caster.isFrozen).toBe(false);
    expect(spell.frostCount).toBeGreaterThan(0);
    const before = near.distanceToCenter;
    near.update(FREEZE_SECONDS - FRAME, 0, VIEWER);
    expect(near.distanceToCenter).toBe(before);
  });

  it('sends a ground ring out from the hero and frees it on dispose', () => {
    expectRingFreedOnDispose((context) => new FreezeSpell(context));
  });
});

describe('StormSpell', () => {
  it('strikes the three nearest enemies and spares the boss and the caster', () => {
    const burst = vi.fn<MechanicContext['particles']['burst']>();
    const { context, enemies, enemyAt, caster } = withCaster({ particles: { burst } });
    const boss = new Boss(
      context.createLabel(),
      1,
      { shape: 'crystal', colors: [1] },
      () => 'boss',
      3,
    );
    boss.object.position.set(0, 0, -2);
    enemies.push(boss);
    const struck = [enemyAt(3), enemyAt(4), enemyAt(5)];
    const spared = enemyAt(6);
    const spell = new StormSpell(context);
    spell.cast();
    spell.update(FRAME);
    expect(spell.boltsInSky).toBe(1);
    play(spell, 1);
    expect(enemies).toEqual([caster, boss, spared]);
    expect(burst).toHaveBeenCalledTimes(STRIKE_COUNT);
    expect(context.stats.score).toBeGreaterThan(0);
    expect(struck.every((enemy) => !enemies.includes(enemy))).toBe(true);
  });

  it('skips an enemy that left the board before the bolt landed', () => {
    const { context, enemies, enemyAt } = withCaster();
    const gone = enemyAt(3);
    const spell = new StormSpell(context);
    spell.cast();
    context.removeEnemy(gone);
    play(spell, 1);
    expect(spell.boltsInSky).toBe(0);
    expect(enemies).toHaveLength(1);
  });
});

describe('QuakeSpell', () => {
  it('knocks every enemy back by three units and shakes the camera', () => {
    const shakeCamera = vi.fn<MechanicContext['shakeCamera']>();
    const { context, enemyAt, caster } = withCaster({ shakeCamera });
    const near = enemyAt(4);
    const edge = enemyAt(11);
    caster.object.position.set(0, 0, -5);
    const spell = new QuakeSpell(context);
    spell.cast();
    play(spell, 1);
    expect(near.distanceToCenter).toBeCloseTo(4 + KNOCKBACK);
    expect(edge.distanceToCenter).toBeCloseTo(12);
    expect(caster.distanceToCenter).toBe(5);
    expect(shakeCamera).toHaveBeenCalledWith(QUAKE_SHAKE.strength, QUAKE_SHAKE.seconds);
  });

  it('raises a ring of dust around the hero', () => {
    const { context } = withCaster();
    const spell = new QuakeSpell(context);
    spell.cast();
    spell.update(FRAME);
    expect(spell.dustCount).toBeGreaterThan(0);
    play(spell, 2);
    expect(spell.dustCount).toBe(0);
  });

  it('sends a ground ring out from the hero and frees it on dispose', () => {
    expectRingFreedOnDispose((context) => new QuakeSpell(context));
  });
});

describe('ShieldSpell', () => {
  it('adds a shield and keeps the bubble up until the shield is used', () => {
    let shields = 0;
    const burst = vi.fn<MechanicContext['particles']['burst']>();
    const board = withCaster({
      particles: { burst },
      absorbNextHit: () => {
        shields += 1;
      },
    });
    const context: MechanicContext = {
      ...board.context,
      get shields() {
        return shields;
      },
    };
    const spell = new ShieldSpell(context);
    spell.cast();
    play(spell, 1);
    expect(shields).toBe(1);
    expect(spell.isBubbleUp).toBe(true);
    shields = 0;
    spell.update(FRAME);
    expect(spell.isBubbleUp).toBe(false);
    expect(burst).toHaveBeenCalledOnce();
  });
});
