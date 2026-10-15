// @vitest-environment jsdom
import { describe, expect, it } from 'vitest';
import {
  FRAME,
  VIEWER,
  enemyTypesBoard,
  rollFor,
  sequence,
  specialOf,
} from '../../testing/enemyTypes';
import { requireLevel } from '../../testing/levels';
import { SPAWN_RADIUS } from '../arena';
import { Boss } from '../Boss';
import { Enemy, type EnemyLook } from '../Enemy';
import type { Phase } from '../LevelPlan';
import { BomberEnemy } from './bombers/BomberEnemy';
import { MINION_TAG } from './bossPhases/Minions';
import { BalloonEnemy, ESCAPE_HEIGHT } from './enemyTypes/BalloonEnemy';
import { BatEnemy } from './enemyTypes/BatEnemy';
import { JumperEnemy } from './enemyTypes/JumperEnemy';
import { SPECIAL_SHARE, rollKind, unlockedKinds } from './enemyTypes/kinds';
import { BOMB_SHAKE } from './enemyTypes/Stage';
import { SwarmEnemy } from './enemyTypes/SwarmEnemy';
import { DONE_CLASS, NEXT_CLASS } from './enemyTypes/swarmGlyphs';
import { MergedEnemy } from './mergeEnemies/MergedEnemy';
import { wordPoints } from './mergeEnemies/scoring';
import { PowerEnemy } from './powerWords/PowerEnemy';
import { TWIN_TAG } from './twins/TwinEnemy';

const NO_SPECIAL = () => SPECIAL_SHARE;
const WARMUP: Phase = { kind: 'warmup', count: 8, speed: 0.55, spawnInterval: 1.5 };
const LOOK: EnemyLook = { shape: 'crystal', colors: [0x88ccff] };

describe('EnemyTypes unlocks', () => {
  it('opens types region by region', () => {
    const kindsAt = (id: string) => unlockedKinds(requireLevel(id));
    expect(kindsAt('polana-1')).toEqual([]);
    expect(kindsAt('polana-2')).toEqual([]);
    expect(kindsAt('polana-3')).toEqual(['jumper', 'balloon']);
    expect(kindsAt('las-1')).toEqual(['jumper', 'balloon', 'bat']);
    expect(kindsAt('gory-1')).toEqual(['jumper', 'balloon', 'bat', 'swarm']);
    expect(kindsAt('gory-2')).toEqual(['jumper', 'balloon', 'bat', 'swarm', 'splitter']);
    expect(kindsAt('jaskinia-2')).toEqual(['jumper', 'balloon', 'bat', 'swarm', 'splitter']);
  });

  it('turns about one spawn in four into a special enemy', () => {
    const kinds = unlockedKinds(requireLevel('gory-1'));
    expect(rollKind(kinds, () => SPECIAL_SHARE - 0.001)).toBe('swarm');
    expect(rollKind(kinds, () => 0)).toBe('jumper');
    expect(rollKind(kinds, NO_SPECIAL)).toBeUndefined();
    expect(rollKind([], () => 0)).toBeUndefined();
  });
});

describe('EnemyTypes', () => {
  it('keeps the first two meadow levels plain', () => {
    for (const id of ['polana-1', 'polana-2']) {
      const { spawn, enemies } = enemyTypesBoard(id, () => 0);
      const enemy = spawn();
      expect(enemies).toEqual([enemy]);
    }
  });

  it('replaces the fresh spawn in its place', () => {
    const { spawn, enemies, announce } = enemyTypesBoard('polana-3', () =>
      rollFor('jumper', 'polana-3'),
    );
    const jumper = spawn();
    expect(jumper).toBeInstanceOf(JumperEnemy);
    expect(enemies).toEqual([jumper]);
    expect(jumper.distanceToCenter).toBeCloseTo(SPAWN_RADIUS);
    expect(announce).toHaveBeenCalledWith('Skoczek', 'callout', expect.any(String));
  });

  it('brings bats from the forest and swarms from the mountains', () => {
    expect(enemyTypesBoard('las-1', () => rollFor('bat', 'las-1')).spawn()).toBeInstanceOf(
      BatEnemy,
    );
    expect(enemyTypesBoard('gory-1', () => rollFor('swarm', 'gory-1')).spawn()).toBeInstanceOf(
      SwarmEnemy,
    );
  });

  it('replaces nothing in the warm-up', () => {
    const { spawn, enemies } = enemyTypesBoard('gory-2', () => 0, { phase: WARMUP });
    const enemy = spawn();
    expect(enemies).toEqual([enemy]);
  });

  it('leaves the boss, power, merged and minion enemies alone', () => {
    const { spawn, enemies, context } = enemyTypesBoard('gory-2', () => 0);
    const label = () => context.createLabel();
    const minion = new Enemy('kot', label(), 1, LOOK);
    minion.tags.add(MINION_TAG);
    const kept: Enemy[] = [
      new Boss(label(), 1, LOOK, () => 'kot', 6),
      new PowerEnemy('las', label(), 1, 'crystal'),
      new MergedEnemy('kotlas', label(), 1, LOOK),
      minion,
    ];
    for (const enemy of kept) {
      enemies.push(enemy);
      expect(spawn(enemy)).toBe(enemy);
    }
    expect(enemies).toEqual(kept);
  });

  it('leaves enemies tagged by any other feature alone', () => {
    const { spawn, enemies, context } = setup('gory-2', () => 0);
    const label = () => context.createLabel();
    const twin = new Enemy('kot', label(), 1, LOOK);
    twin.tags.add(TWIN_TAG);
    const unknown = new Enemy('las', label(), 1, LOOK);
    unknown.tags.add('future-feature');
    const kept: Enemy[] = [twin, unknown, new BomberEnemy('parasol', label(), 1, 'crystal')];
    for (const enemy of kept) {
      enemies.push(enemy);
      expect(spawn(enemy)).toBe(enemy);
    }
    expect(enemies).toEqual(kept);
  });

  it('keeps one special on the meadow board and three later', () => {
    const meadow = enemyTypesBoard('polana-3', () => 0);
    meadow.spawn();
    const plain = meadow.spawn();
    expect(plain).not.toBeInstanceOf(JumperEnemy);

    const mountains = enemyTypesBoard('gory-2', () => 0);
    const specials = [mountains.spawn(), mountains.spawn(), mountains.spawn()];
    specials.forEach((enemy) => expect(enemy).toBeInstanceOf(JumperEnemy));
    expect(mountains.spawn()).not.toBeInstanceOf(JumperEnemy);
  });

  it('announces each type only the first time in a level', () => {
    const { spawn, announce, context } = enemyTypesBoard('gory-2', () => 0);
    context.removeEnemy(spawn());
    context.removeEnemy(spawn());
    expect(announce).toHaveBeenCalledOnce();
  });
});

describe('Jumper', () => {
  it('carries one new key repeated four to seven times', () => {
    const roll = rollFor('jumper', 'polana-3');
    const short = specialOf(enemyTypesBoard('polana-3', sequence(roll, 0)).spawn(), JumperEnemy);
    const long = specialOf(enemyTypesBoard('polana-3', sequence(roll, 0.999)).spawn(), JumperEnemy);
    expect(short.word).toHaveLength(4);
    expect(long.word).toHaveLength(7);
    for (const jumper of [short, long]) {
      expect(new Set(jumper.word).size).toBe(1);
      expect(requireLevel('polana-3').newKeys).toContain(jumper.word[0]);
    }
  });

  it('hops toward the hero at about the normal speed', () => {
    const { spawn, run } = enemyTypesBoard('polana-3', () => 0);
    const jumper = spawn();
    run(jumper, 4);
    expect(SPAWN_RADIUS - jumper.distanceToCenter).toBeGreaterThan(3);
    expect(SPAWN_RADIUS - jumper.distanceToCenter).toBeLessThan(5);
  });
});

describe('Balloon', () => {
  const balloonRoll = () => rollFor('balloon', 'polana-3');

  it('floats away without a mistake and without costing a life', () => {
    const { spawn, run, enemies, loseLife, context } = enemyTypesBoard('polana-3', balloonRoll);
    const balloon = specialOf(spawn(), BalloonEnemy);
    run(balloon, 8);
    expect(enemies).toContain(balloon);
    expect(balloon.altitude).toBeLessThan(ESCAPE_HEIGHT);
    run(balloon, 20);
    expect(enemies).not.toContain(balloon);
    expect(loseLife).not.toHaveBeenCalled();
    expect(context.stats.mistakes).toBe(0);
  });

  it('pays double word points when popped', () => {
    const { spawn, type, context } = enemyTypesBoard('polana-3', balloonRoll);
    const balloon = spawn();
    type(balloon);
    expect(context.stats.score).toBe(wordPoints(balloon.word, context.stats) * 2);
  });

  it('pays normal points for other types', () => {
    const { spawn, type, context } = enemyTypesBoard('polana-3', () => 0);
    const jumper = spawn();
    type(jumper);
    expect(context.stats.score).toBe(wordPoints(jumper.word, context.stats));
  });
});

describe('Bomber bat', () => {
  const batRoll = () => rollFor('bat', 'las-2');

  it('drops a bomb on the hero when nobody types it', () => {
    const { spawn, run, enemies, loseLife, shakeCamera } = enemyTypesBoard('las-2', batRoll);
    const bat = specialOf(spawn(), BatEnemy);
    expect(bat.word.length).toBeGreaterThanOrEqual(3);
    expect(bat.word.length).toBeLessThanOrEqual(4);
    run(bat, 30);
    expect(loseLife).toHaveBeenCalledOnce();
    expect(shakeCamera).toHaveBeenCalledWith(BOMB_SHAKE.strength, BOMB_SHAKE.seconds);
    expect(bat.hasDroppedBomb).toBe(true);
    expect(enemies).not.toContain(bat);
  });

  it('costs nothing when typed in time', () => {
    const { spawn, run, type, mechanic, loseLife } = enemyTypesBoard('las-2', batRoll);
    const bat = spawn();
    run(bat, 2);
    type(bat);
    for (let time = 0; time < 10; time += FRAME) mechanic.update(FRAME);
    expect(loseLife).not.toHaveBeenCalled();
  });

  it('keeps its height and never walks into the hero', () => {
    const { spawn, run } = enemyTypesBoard('las-2', batRoll);
    const bat = spawn();
    let closest = Number.POSITIVE_INFINITY;
    for (let step = 0; step < 300; step += 1) {
      run(bat, FRAME);
      closest = Math.min(closest, bat.distanceToCenter);
    }
    expect(closest).toBeGreaterThan(5);
    expect(bat.labelHeight).toBeGreaterThan(2.5);
  });
});

describe('Swarm', () => {
  const swarmRoll = rollFor('swarm', 'gory-2');

  it('carries five to seven letters, one per bug, typed in order', () => {
    const { spawn } = enemyTypesBoard('gory-2', sequence(swarmRoll, 0.5));
    const swarm = specialOf(spawn(), SwarmEnemy);
    expect(swarm.word.length).toBeGreaterThanOrEqual(5);
    expect(swarm.word.length).toBeLessThanOrEqual(7);
    expect(swarm.bugsLeft).toBe(swarm.word.length);
    [...swarm.word].forEach((char, index) => {
      expect(swarm.expectedChar).toBe(char);
      expect(swarm.label.querySelector(`.${NEXT_CLASS}`)?.textContent).toBe(char);
      expect(swarm.label.querySelectorAll(`.${DONE_CLASS}`)).toHaveLength(index);
      swarm.advance();
      expect(swarm.bugsLeft).toBe(swarm.word.length - index - 1);
    });
    expect(swarm.isComplete).toBe(true);
  });

  it('moves a bit faster than a walker', () => {
    const { spawn, run, enemyAt } = enemyTypesBoard('gory-2', () => swarmRoll);
    const swarm = spawn();
    const walker = enemyAt(SPAWN_RADIUS);
    run(swarm, 3);
    for (let time = 0; time < 3; time += FRAME) walker.update(FRAME, time, VIEWER);
    expect(swarm.distanceToCenter).toBeLessThan(walker.distanceToCenter);
  });
});
