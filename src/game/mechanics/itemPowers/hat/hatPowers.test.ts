// @vitest-environment jsdom
import { describe, expect, it, vi } from 'vitest';
import { FEVER_COMBO } from '../../../combo';
import { hatSpec, type HatId, type HatSpec } from '../../../../course/shop';
import { fakeBoard } from '../../../../testing/enemyBoard';
import { FRAME, VIEWER, enemyTypesBoard, rollFor, specialOf } from '../../../../testing/enemyTypes';
import { SPAWN_RADIUS } from '../../../board';
import type { Phase } from '../../../RunPlan';
import { BomberEnemy } from '../../bombers/BomberEnemy';
import { FADE_CYCLE_SECONDS, GhostEnemy } from '../../enemyTypes/GhostEnemy';
import type { MechanicContext } from '../../Mechanic';
import { PowerEnemy } from '../../powerWords/PowerEnemy';
import { FREEZE_SECONDS } from '../../powerWords/spells/Freeze';
import { BoostRewards, boostOf } from './BoostRewards';
import { BossGuard } from './BossGuard';
import { DEFUSE_DISTANCE, Defuse } from './Defuse';
import { FeverSlip } from './FeverSlip';
import { LongFreeze } from './LongFreeze';
import { SolidGhosts } from './SolidGhosts';

const BOSS: Phase = { kind: 'boss', count: 6, speed: 0.4, spawnInterval: 0 };
const WORDS: Phase = { kind: 'words', count: 10, speed: 1, spawnInterval: 2 };
const NEXT_WAVE: Phase = { ...WORDS, wave: 2 };
const BOMBER_WORD = 'kasztan';

function hat(id: HatId): HatSpec {
  const spec = hatSpec(id);
  if (!spec) throw new Error(`Missing the hat ${id}`);
  return spec;
}

function countGuards(context: MechanicContext): ReturnType<typeof vi.fn> {
  let guards = 0;
  Object.defineProperty(context, 'guards', { get: () => guards });
  const guardNextHit = vi.fn(() => {
    guards += 1;
  });
  Object.assign(context, { guardNextHit });
  return guardNextHit;
}

function hatBoard(overrides: Partial<MechanicContext> = {}) {
  const announce = vi.fn<MechanicContext['announce']>();
  const boostRewards = vi.fn<MechanicContext['boostRewards']>();
  const board = fakeBoard({ announce, boostRewards, ...overrides });
  const fever = () => {
    for (let hit = 0; hit < FEVER_COMBO; hit += 1) board.context.stats.recordHit();
  };
  return { ...board, announce, boostRewards, fever };
}

describe('BoostRewards', () => {
  it('boosts the run and says so once the level starts', () => {
    const cap = hat('cap');
    const { context, boostRewards, announce } = hatBoard({ playing: false });
    const boost = new BoostRewards(cap.power, cap, context);
    expect(boostRewards).toHaveBeenCalledWith({ coins: 1.1, xp: 1 });
    boost.update();
    expect(announce).not.toHaveBeenCalled();

    const playing = hatBoard();
    const started = new BoostRewards(cap.power, cap, playing.context);
    started.update();
    started.update();
    expect(playing.announce).toHaveBeenCalledTimes(1);
    expect(playing.announce).toHaveBeenCalledWith('Monety +10%', 'callout', cap.color);
  });

  it('turns coin and XP shares into reward factors', () => {
    expect(boostOf(hat('crown').power)).toEqual({ coins: 1.25, xp: 1 });
    expect(boostOf(hat('headphones').power)).toEqual({ coins: 1, xp: 1.05 });
  });
});

describe('FeverSlip', () => {
  it('keeps the fever through one slip per level while the mistake counts', () => {
    const laurel = hat('laurel');
    const { context, fever, announce } = hatBoard();
    const slip = new FeverSlip(laurel.power, laurel, context);
    fever();
    slip.onHit();
    context.stats.recordMistake();
    slip.onMistake();
    expect(context.stats).toMatchObject({ fever: true, mistakes: 1, combo: 0 });
    expect(announce).toHaveBeenCalledWith('Szał trwa!', 'callout', laurel.color);

    context.stats.recordMistake();
    slip.onMistake();
    expect(context.stats.fever).toBe(false);
    expect(announce).toHaveBeenCalledTimes(1);
  });

  it('gets a new slip on every arena wave', () => {
    const { context, fever } = hatBoard();
    const laurel = hat('laurel');
    const slip = new FeverSlip(laurel.power, laurel, context);
    fever();
    context.stats.recordMistake();
    context.stats.recordMistake();
    slip.onPhaseChange(NEXT_WAVE);
    fever();
    context.stats.recordMistake();
    expect(context.stats.fever).toBe(true);
  });
});

describe('SolidGhosts', () => {
  it('keeps every ghost solid', () => {
    const horns = hat('horns');
    const board = enemyTypesBoard('las-10', () => rollFor('ghost', 'las-10'));
    const solid = new SolidGhosts(horns, board.context);
    const ghost = specialOf(board.spawn(), GhostEnemy);
    solid.onSpawn(ghost);
    solid.onSpawn(specialOf(board.spawn(), GhostEnemy));
    for (let time = 0; time < FADE_CYCLE_SECONDS / 2; time += FRAME) {
      ghost.update(FRAME, time, VIEWER);
    }
    expect(ghost.solidity).toBe(1);
    const callouts = board.announce.mock.calls.filter(([text]) => text === 'Duch nie zniknie!');
    expect(callouts).toEqual([['Duch nie zniknie!', 'callout', horns.color]]);
  });
});

describe('LongFreeze', () => {
  it('makes the freeze power word last longer', () => {
    const { context, enemyAt, announce } = hatBoard();
    const beanie = hat('beanie');
    const longer = new LongFreeze(beanie.power, beanie, context);
    const walker = enemyAt(SPAWN_RADIUS);
    longer.onWordComplete(walker);
    expect(walker.isFrozen).toBe(false);
    longer.onWordComplete(new PowerEnemy('mróz', context.createLabel(), 1, 'crystal', 'freeze'));
    for (let time = 0; time < FREEZE_SECONDS * 1.4; time += FRAME)
      walker.update(FRAME, time, VIEWER);
    expect(walker.isFrozen).toBe(true);
    expect(longer.seconds).toBeCloseTo(FREEZE_SECONDS * 1.5);
    expect(announce).toHaveBeenCalledWith('Mocny mróz!', 'callout', expect.any(String));
  });

  it('ignores other power words', () => {
    const { context, enemyAt } = hatBoard();
    const longer = new LongFreeze({ kind: 'longFreeze', strength: 0.5 }, hat('cap'), context);
    const walker = enemyAt(SPAWN_RADIUS);
    longer.onWordComplete(new PowerEnemy('burza', context.createLabel(), 1, 'crystal', 'storm'));
    expect(walker.isFrozen).toBe(false);
  });
});

describe('BossGuard', () => {
  it('guards the hero once at the start of a boss fight', () => {
    const halo = hat('halo');
    const { context, announce } = hatBoard();
    const guardNextHit = countGuards(context);
    const guard = new BossGuard(halo.power, halo, context);
    guard.onPhaseChange(WORDS);
    expect(guardNextHit).not.toHaveBeenCalled();
    guard.onPhaseChange(BOSS);
    expect(guardNextHit).toHaveBeenCalledTimes(halo.power.strength);
    expect(announce).toHaveBeenCalledWith('Tarcza na bossa!', 'callout', halo.color);
    guard.update(FRAME);
    expect(context.scene.children[0].visible).toBe(true);
    guard.dispose();
    expect(context.scene.children).toHaveLength(0);
  });

  it('tops the guards up instead of stacking them', () => {
    const halo = hat('halo');
    const guardNextHit = vi.fn<MechanicContext['guardNextHit']>();
    const { context } = hatBoard({ guardNextHit, guards: halo.power.strength });
    new BossGuard(halo.power, halo, context).onPhaseChange(BOSS);
    expect(guardNextHit).not.toHaveBeenCalled();
  });
});

describe('Defuse', () => {
  it('puts out a bomber next to the hero, keeps the heart and counts the mistake', () => {
    const calls: string[] = [];
    const guardNextHit = vi.fn(() => calls.push('guard'));
    const loseLife = vi.fn(() => calls.push('hit'));
    const { context, enemies, announce } = hatBoard({ guardNextHit, loseLife });
    const defuse = new Defuse(hat('helmet'), context);
    const bomberAt = (distance: number) => {
      const bomber = new BomberEnemy(BOMBER_WORD, context.createLabel(), 1, 'crystal');
      bomber.object.position.set(0, 0, -distance);
      enemies.push(bomber);
      return bomber;
    };
    const far = bomberAt(SPAWN_RADIUS);
    const close = bomberAt(DEFUSE_DISTANCE - 0.1);
    defuse.update();
    expect(enemies).toEqual([far]);
    expect(calls).toEqual(['guard', 'hit']);
    expect(close.isComplete).toBe(false);
    expect(announce).toHaveBeenCalledWith('Bomba rozbrojona!', 'callout', expect.any(String));
  });
});
