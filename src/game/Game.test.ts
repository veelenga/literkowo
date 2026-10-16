// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { difficultyById } from '../arena/difficulty';
import { endlessPlan } from '../arena/endlessPlan';
import { keySetById } from '../arena/keySets';
import { regionOf } from '../course/catalog';
import type { Enemy } from './Enemy';
import { Game, themeFor, type GameEvents } from './Game';
import type { Mechanic, MechanicContext } from './mechanics/Mechanic';

interface SpawnRecord {
  readonly index: number | undefined;
  readonly word: string;
  readonly time: number;
  readonly angle: number;
}

const recorder = vi.hoisted(() => ({ spawns: [] as SpawnRecord[] }));
const screen = vi.hoisted(() => ({ width: 1280, height: 720 }));

vi.mock('./RenderHost', () => ({
  renderHost: {
    viewport: screen,
    attach: () => undefined,
    detach: () => undefined,
    render: () => undefined,
    recordFrame: () => undefined,
  },
}));

vi.mock('./World', () => ({
  World: class {
    update(): void {}
    dispose(): void {}
  },
}));

vi.mock('./quality', async (importOriginal) => {
  const actual = await importOriginal<typeof import('./quality')>();
  return { ...actual, currentQuality: () => actual.QUALITY_PRESETS.low };
});

vi.mock('three/addons/loaders/GLTFLoader.js', () => ({
  GLTFLoader: class {
    load(): void {}
  },
}));

vi.mock('./mechanics', async (importOriginal) => {
  const actual = await importOriginal<typeof import('./mechanics')>();
  return {
    createMechanics: (context: MechanicContext): Mechanic[] => [
      ...actual.createMechanics(context),
      spawnRecorder(),
    ],
  };
});

function spawnRecorder(): Mechanic {
  let time = 0;
  return {
    update: (_delta, elapsed) => (time = elapsed),
    onSpawn: (enemy: Enemy) =>
      recorder.spawns.push({
        index: enemy.spawnIndex,
        word: enemy.word,
        time,
        angle: Math.atan2(enemy.object.position.z, enemy.object.position.x),
      }),
    dispose: () => undefined,
  };
}

const SEED = 20261016;
const OTHER_SEED = 4242;
const SCRIPT_SPAWNS = 16;
const RUN_MS = 60_000;
const MANY_LIVES = 99;
const KEY_SET = 'las';
const DIFFICULTY = 'fast';
const CHARACTER = 'a';
const LANGUAGE = 'pl';
const KEY_GAP_MS = 300;
const SLOWER_KEY_GAP_MS = 900;

function typistEvents(onNextKey: (char: string | undefined) => void): GameEvents {
  return {
    onStats: () => undefined,
    onRewards: () => undefined,
    onNextKey,
    onPause: () => undefined,
    onProgress: () => undefined,
    onAnnounce: () => undefined,
    onFinished: () => undefined,
  };
}

function required<T>(value: T | undefined): T {
  if (value === undefined) throw new Error('Missing test data');
  return value;
}

function play(seed: number, keyGapMs = KEY_GAP_MS): SpawnRecord[] {
  recorder.spawns = [];
  let nextKey: string | undefined;
  const keySet = required(keySetById(KEY_SET, LANGUAGE));
  const plan = {
    ...endlessPlan({ keySet, difficulty: required(difficultyById(DIFFICULTY)) }),
    lives: MANY_LIVES,
    seed,
  };
  const game = new Game(
    document.createElement('div'),
    {
      character: CHARACTER,
      plan,
      level: keySet.bossLevel,
      language: LANGUAGE,
      theme: themeFor(regionOf(keySet.bossLevel).theme),
      keyStats: {},
      equipped: {},
    },
    typistEvents((char) => (nextKey = char)),
  );
  game.start();
  for (let time = 0; time < RUN_MS; time += keyGapMs) {
    vi.advanceTimersByTime(keyGapMs);
    if (nextKey) game.typeCharacter(nextKey);
  }
  game.destroy();
  return [...recorder.spawns];
}

function scriptSpawns(records: readonly SpawnRecord[]): SpawnRecord[] {
  const firsts = new Map<number, SpawnRecord>();
  for (const record of records) {
    if (record.index !== undefined && !firsts.has(record.index)) firsts.set(record.index, record);
  }
  return [...firsts.values()].slice(0, SCRIPT_SPAWNS);
}

beforeEach(() => {
  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(null);
  vi.useFakeTimers({
    toFake: ['requestAnimationFrame', 'cancelAnimationFrame', 'performance', 'setTimeout'],
  });
});

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
});

describe('Game with a seed', () => {
  it('spawns the same words at the same times and angles', () => {
    const first = scriptSpawns(play(SEED));
    const second = scriptSpawns(play(SEED));
    expect(first).toHaveLength(SCRIPT_SPAWNS);
    expect(second).toEqual(first);
  });

  it('numbers the spawns of the script in order', () => {
    const indexes = scriptSpawns(play(SEED)).map((record) => record.index);
    expect(indexes).toEqual(Array.from({ length: SCRIPT_SPAWNS }, (_, index) => index));
  });

  it('plays the whole run the same, mechanics included', () => {
    expect(play(SEED)).toEqual(play(SEED));
  });

  it('keeps the words and angles when a slower typist ends a wave later', () => {
    const steady = scriptSpawns(play(SEED));
    const slower = scriptSpawns(play(SEED, SLOWER_KEY_GAP_MS));
    expect(slower).toHaveLength(SCRIPT_SPAWNS);
    expect(slower.map(({ word, angle }) => ({ word, angle }))).toEqual(
      steady.map(({ word, angle }) => ({ word, angle })),
    );
  });

  it('spawns other words and angles with another seed', () => {
    const first = scriptSpawns(play(SEED));
    const other = scriptSpawns(play(OTHER_SEED));
    expect(other.map((record) => record.word)).not.toEqual(first.map((record) => record.word));
    expect(other.map((record) => record.angle)).not.toEqual(first.map((record) => record.angle));
  });
});
