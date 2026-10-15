// @vitest-environment jsdom
import { describe, expect, it } from 'vitest';
import { petSpec, type PetId } from '../../../../course/shop';
import { FRAME, VIEWER, enemyTypesBoard, rollFor, specialOf } from '../../../../testing/enemyTypes';
import { SPAWN_RADIUS } from '../../../board';
import type { Phase } from '../../../RunPlan';
import { BomberEnemy } from '../../bombers/BomberEnemy';
import { BalloonEnemy } from '../../enemyTypes/BalloonEnemy';
import { BatEnemy } from '../../enemyTypes/BatEnemy';
import { GhostEnemy } from '../../enemyTypes/GhostEnemy';
import type { EnemyKind } from '../../enemyTypes/kinds';
import { ThiefEnemy } from '../../enemyTypes/ThiefEnemy';
import { ItemPowers } from '../../ItemPowers';
import type { Mechanic, MechanicContext } from '../../Mechanic';
import { Pet, ZAP_DELAY } from '../Pet';
import { CatchPrey, NOTICE_SECONDS } from './CatchPrey';
import type { PreyKind } from './preys';

const LEVEL = 'las-15';
const NEXT_WAVE: Phase = { kind: 'words', count: 10, speed: 1, spawnInterval: 2, wave: 2 };
const STARTING_SCORE = 250;
const BALLOON_FLIGHT_SECONDS = 15;
const BOMBER_WORD = 'kasztan';

function huntBoard(kind: EnemyKind, makePowers: (context: MechanicContext) => Partial<Mechanic>) {
  const board = enemyTypesBoard(LEVEL, () => rollFor(kind, LEVEL));
  const powers = makePowers(board.context);
  let elapsed = 0;
  const run = (seconds: number) => {
    for (let time = 0; time < seconds; time += FRAME) {
      elapsed += FRAME;
      powers.update?.(FRAME, elapsed);
      board.mechanic.update(FRAME);
      for (const enemy of [...board.enemies]) enemy.update(FRAME, elapsed, VIEWER);
    }
  };
  return { ...board, powers, run };
}

function withPet(kind: EnemyKind, pet: PetId) {
  return huntBoard(kind, (context) => new ItemPowers({ ...context, equipped: { pet } }));
}

function withPrey(kind: EnemyKind, prey: PreyKind, strength = 1) {
  return huntBoard(kind, (context) => {
    const spec = petSpec('cube-cat');
    if (!spec) throw new Error('Missing the cube cat');
    const pet = new Pet(spec, context);
    const hunt = new CatchPrey(prey, { kind: prey, strength }, pet, context);
    return {
      update: (delta: number, elapsed: number) => {
        pet.update(delta, elapsed);
        hunt.update(delta);
      },
      onPhaseChange: (phase: Phase) => hunt.onPhaseChange(phase),
    };
  });
}

describe('CatchPrey', () => {
  it('lets the dragon catch a bat once it has seen it', () => {
    const { spawn, run, enemies, announce, context } = withPet('bat', 'dragon');
    const bat = specialOf(spawn(), BatEnemy);
    run(NOTICE_SECONDS / 2);
    expect(enemies).toContain(bat);
    run(NOTICE_SECONDS / 2 + ZAP_DELAY * 2);
    expect(enemies).not.toContain(bat);
    expect(context.stats.score).toBeGreaterThan(0);
    expect(announce).toHaveBeenCalledWith('Nietoperz złapany!', 'callout', '#4ade80');
  });

  it('catches as many as the strength allows in a level', () => {
    const { spawn, run, enemies } = withPet('bat', 'dragon');
    const bats = [spawn(), spawn(), spawn()];
    run(NOTICE_SECONDS * 4);
    expect(enemies.filter((enemy) => bats.includes(enemy))).toHaveLength(1);
  });

  it('starts again on every new arena wave', () => {
    const { spawn, run, enemies, powers } = withPrey('ghost', 'catchGhost');
    spawn();
    run(NOTICE_SECONDS + ZAP_DELAY * 2);
    const second = spawn();
    run(NOTICE_SECONDS + ZAP_DELAY * 2);
    expect(enemies).toContain(second);
    powers.onPhaseChange?.(NEXT_WAVE);
    run(ZAP_DELAY * 2);
    expect(enemies).not.toContain(second);
  });

  it('lets the ghost pet chase ghosts', () => {
    const { spawn, run, enemies, announce } = withPet('ghost', 'ghost');
    const ghost = specialOf(spawn(), GhostEnemy);
    run(NOTICE_SECONDS + ZAP_DELAY * 2);
    expect(enemies).not.toContain(ghost);
    expect(announce).toHaveBeenCalledWith('Duch przegoniony!', 'callout', '#c9b8ff');
  });

  it('leaves the enemy the player is typing', () => {
    const { spawn, run, enemies } = withPet('ghost', 'ghost');
    const ghost = spawn();
    ghost.advance();
    run(NOTICE_SECONDS * 2);
    expect(enemies).toContain(ghost);
  });

  it('lets the bee pop a balloon only before it floats away', () => {
    const { spawn, run, enemies, announce } = withPet('balloon', 'bee');
    const balloon = specialOf(spawn(), BalloonEnemy);
    run(NOTICE_SECONDS * 2);
    expect(enemies).toContain(balloon);
    run(BALLOON_FLIGHT_SECONDS);
    expect(enemies).not.toContain(balloon);
    expect(balloon.isLeaving).toBe(false);
    expect(announce).toHaveBeenCalledWith('Balonik złapany!', 'callout', '#ffc61a');
  });

  it('lets the robot put out the fuse of a bomber', () => {
    const { run, enemies, enemyAt, context, announce } = withPet('ghost', 'robot');
    const bomber = new BomberEnemy(BOMBER_WORD, context.createLabel(), 1, 'crystal');
    bomber.object.position.set(0, 0, -SPAWN_RADIUS);
    enemies.push(bomber);
    const walker = enemyAt(SPAWN_RADIUS);
    run(NOTICE_SECONDS + ZAP_DELAY * 2);
    expect(enemies).toEqual([walker]);
    expect(announce).toHaveBeenCalledWith('Lont zgaszony!', 'callout', '#9fc3e0');
  });

  it('catches a thief before it steals', () => {
    const { spawn, run, enemies, context, announce } = withPet('thief', 'puppy');
    context.stats.score = STARTING_SCORE;
    const thief = specialOf(spawn(), ThiefEnemy);
    const caught = () => !enemies.includes(thief);
    for (let step = 0; step < SPAWN_RADIUS / FRAME && !caught(); step += 1) run(FRAME);
    expect(caught()).toBe(true);
    expect(enemies.some((enemy) => enemy instanceof ThiefEnemy)).toBe(false);
    expect(context.stats.score).toBeGreaterThan(STARTING_SCORE);
    expect(announce).toHaveBeenCalledWith('Złodziej złapany!', 'callout', '#e8b878');
  });
});
