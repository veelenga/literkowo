// @vitest-environment jsdom
import { describe, expect, it, vi } from 'vitest';
import { fakeBoard } from '../../testing/enemyBoard';
import { levelWords, requireLevel } from '../../testing/levels';
import { MAX_ENEMIES, SPAWN_RADIUS } from '../board';
import { Boss } from '../Boss';
import type { Enemy } from '../Enemy';
import type { Phase } from '../RunPlan';
import type { MechanicContext } from './Mechanic';
import { CHEST_COINS, EVENT_WINDOW, WaveEvents, eventDelay } from './WaveEvents';
import { CHEST_DEPTH, ChestEnemy } from './waveEvents/ChestEnemy';
import { WAVE_EVENT_TAG } from './waveEvents/EventEnemy';
import { CHEST, METEORS, RUSH } from './waveEvents/events';
import { FALL_SECONDS, GROUND_SECONDS, MeteorEnemy, START_HEIGHT } from './waveEvents/MeteorEnemy';

const FRAME = 1 / 30;
const VIEWER = { x: 0, y: 15, z: 15.5 };
const LEVEL = 'las-10';
const WORDS: Phase = { kind: 'words', count: 12, speed: 1, spawnInterval: 3 };
const WARMUP: Phase = { kind: 'warmup', count: 8, speed: 0.55, spawnInterval: 1.5 };
const BOSS: Phase = { kind: 'boss', count: 8, speed: 0.4, spawnInterval: 0 };
const PICK = { rush: 0, meteors: 0.4, chest: 0.8 };

function eventBoard(roll: number, phase: Phase = WORDS) {
  const level = requireLevel(LEVEL);
  const announce = vi.fn<MechanicContext['announce']>();
  const addCoins = vi.fn<MechanicContext['addCoins']>();
  const board = fakeBoard({
    level,
    phase,
    words: levelWords(level, 'pl'),
    announce,
    addCoins,
  });
  const mechanic = new WaveEvents(board.context, () => roll);
  mechanic.onPhaseChange(phase);
  const wait = (seconds: number) => {
    for (let time = 0; time < seconds; time += FRAME) {
      mechanic.update(FRAME);
      for (const enemy of [...board.enemies]) enemy.update(FRAME, time, VIEWER);
    }
  };
  const untilEvent = () => wait(eventDelay(phase, () => roll) + FRAME);
  const pieces = () => board.enemies.filter((enemy) => enemy.tags.has(WAVE_EVENT_TAG));
  return { ...board, mechanic, announce, addCoins, wait, untilEvent, pieces };
}

function typeOut(enemy: Enemy, mechanic: WaveEvents, context: MechanicContext): void {
  while (!enemy.isComplete) enemy.advance();
  mechanic.onWordComplete(enemy);
  context.removeEnemy(enemy);
}

describe('WaveEvents timing', () => {
  it('starts once per words phase after the first third of the words', () => {
    const { mechanic, wait, announce } = eventBoard(PICK.rush);
    const earliest = WORDS.count * WORDS.spawnInterval * EVENT_WINDOW.start;
    wait(earliest - FRAME * 2);
    expect(mechanic.hasFired).toBe(false);
    wait(FRAME * 3);
    expect(mechanic.hasFired).toBe(true);
    expect(announce).toHaveBeenCalledWith('Fala!', 'banner', expect.any(String));
    wait(60);
    expect(announce).toHaveBeenCalledOnce();
  });

  it('arms again for every words phase', () => {
    const { mechanic, untilEvent, wait, announce } = eventBoard(PICK.rush);
    untilEvent();
    expect(announce).toHaveBeenCalledOnce();
    mechanic.onPhaseChange(BOSS);
    wait(60);
    expect(announce).toHaveBeenCalledOnce();
    mechanic.onPhaseChange(WORDS);
    untilEvent();
    expect(announce).toHaveBeenCalledTimes(2);
  });

  it('never starts in the warm-up or next to a boss', () => {
    const warmup = eventBoard(PICK.rush, WARMUP);
    warmup.wait(60);
    expect(warmup.mechanic.hasFired).toBe(false);

    const boss = eventBoard(PICK.rush, BOSS);
    boss.wait(60);
    expect(boss.mechanic.hasFired).toBe(false);

    const guarded = eventBoard(PICK.rush);
    guarded.enemies.push(
      new Boss(
        guarded.context.createLabel(),
        1,
        { shape: 'orb', colors: [0xffffff] },
        () => 'kot',
        6,
      ),
    );
    guarded.wait(60);
    expect(guarded.mechanic.hasFired).toBe(false);
  });

  it('stops spawning when the phase changes', () => {
    const { mechanic, untilEvent, wait, pieces } = eventBoard(PICK.rush);
    untilEvent();
    const started = pieces().length;
    mechanic.onPhaseChange(BOSS);
    wait(RUSH.seconds);
    expect(pieces()).toHaveLength(started);
  });
});

describe('Rush', () => {
  it('sends six one and two letter words over four seconds', () => {
    const { untilEvent, wait, pieces } = eventBoard(PICK.rush);
    untilEvent();
    wait(RUSH.seconds);
    const words = pieces();
    expect(words).toHaveLength(RUSH.pieces);
    for (const word of words) {
      expect(word.word.length).toBeLessThanOrEqual(2);
      expect(word.distanceToCenter).toBeGreaterThan(
        SPAWN_RADIUS - RUSH.seconds * RUSH.speedShare - 1,
      );
    }
  });

  it('keeps to the board limit', () => {
    const { untilEvent, wait, pieces, enemies, enemyAt, context } = eventBoard(PICK.rush);
    for (let index = 0; index < MAX_ENEMIES - 2; index += 1) enemyAt(SPAWN_RADIUS);
    untilEvent();
    wait(RUSH.seconds);
    expect(enemies).toHaveLength(MAX_ENEMIES);
    expect(pieces()).toHaveLength(2);
    context.removeEnemy(pieces()[0]);
    wait(1);
    expect(pieces()).toHaveLength(2);
    expect(enemies).toHaveLength(MAX_ENEMIES);
  });
});

describe('Meteor shower', () => {
  it('drops single letters from high up to the ground', () => {
    const { untilEvent, wait, pieces } = eventBoard(PICK.meteors);
    untilEvent();
    const [meteor] = pieces();
    if (!(meteor instanceof MeteorEnemy)) throw new Error('Expected a meteor');
    expect(meteor.word).toHaveLength(1);
    expect(meteor.altitude).toBeGreaterThan(START_HEIGHT * 0.9);
    wait(FALL_SECONDS);
    expect(meteor.isLanded).toBe(true);
    expect(meteor.altitude).toBe(0);
    expect(meteor.distanceToCenter).toBeGreaterThanOrEqual(METEORS.minRadius - 0.01);
    expect(meteor.distanceToCenter).toBeLessThanOrEqual(METEORS.maxRadius + 0.01);
  });

  it('drops eight separate meteors that can be typed in any order', () => {
    const { untilEvent, wait, pieces, context } = eventBoard(PICK.meteors);
    untilEvent();
    const seen = new Set<Enemy>();
    for (let step = 0; step < 300; step += 1) {
      wait(FRAME);
      for (const meteor of pieces()) seen.add(meteor);
      const newest = pieces().at(-1);
      if (newest) context.removeEnemy(newest);
    }
    expect(seen.size).toBe(METEORS.pieces);
  });

  it('burns out on the ground without harm', () => {
    const { untilEvent, wait, pieces } = eventBoard(PICK.meteors);
    untilEvent();
    wait(METEORS.pieces * METEORS.spacing + (FALL_SECONDS + GROUND_SECONDS + 1) * 2);
    expect(pieces()).toHaveLength(0);
  });
});

describe('Treasure chest', () => {
  it('walks across with a five letter word and never reaches the hero', () => {
    const { untilEvent, wait, pieces } = eventBoard(PICK.chest);
    untilEvent();
    const [chest] = pieces();
    expect(chest).toBeInstanceOf(ChestEnemy);
    expect(chest.word).toHaveLength(CHEST.letters);
    let closest = Number.POSITIVE_INFINITY;
    for (let step = 0; step < 600 && pieces().length > 0; step += 1) {
      wait(FRAME);
      closest = Math.min(closest, chest.distanceToCenter);
    }
    expect(closest).toBeGreaterThanOrEqual(CHEST_DEPTH - 0.01);
    expect(pieces()).toHaveLength(0);
  });

  it('drops coins when typed', () => {
    const { untilEvent, pieces, mechanic, context, addCoins, announce } = eventBoard(PICK.chest);
    untilEvent();
    typeOut(pieces()[0], mechanic, context);
    expect(addCoins).toHaveBeenCalledWith(CHEST_COINS);
    expect(announce).toHaveBeenCalledWith('Skarb!', 'callout', expect.any(String));
  });
});
