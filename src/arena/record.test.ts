import { describe, expect, it } from 'vitest';
import { BRONZE, GOLD, NO_MEDAL, SILVER } from './medals';
import {
  arenaKey,
  arenaRecordOf,
  emptyArenaRecord,
  endlessBest,
  isNewBestWave,
  paidMedal,
  withEndlessRun,
  type ArenaRecord,
  type EndlessRun,
} from './record';

const KEY = arenaKey('las', 'normal');
const DAY = '2026-10-15';
const NEXT_DAY = '2026-10-16';

function run(overrides: Partial<EndlessRun> = {}): EndlessRun {
  return {
    key: KEY,
    wavesCleared: 4,
    score: 900,
    accuracy: 0.95,
    medal: BRONZE,
    date: DAY,
    ...overrides,
  };
}

describe('arenaKey', () => {
  it('joins the key set and the difficulty', () => {
    expect(arenaKey('polana', 'calm')).toBe('polana/calm');
  });
});

describe('withEndlessRun', () => {
  it('keeps the first run as the best', () => {
    const record = withEndlessRun(emptyArenaRecord(), run());
    expect(endlessBest(record, KEY)).toEqual({
      wave: 4,
      score: 900,
      accuracy: 0.95,
      medal: BRONZE,
      date: DAY,
      runs: 1,
    });
    expect(paidMedal(record, KEY)).toBe(BRONZE);
  });

  it('replaces the best with more waves, or the same waves and more points', () => {
    const first = withEndlessRun(emptyArenaRecord(), run());
    const morePoints = withEndlessRun(first, run({ score: 1000, date: NEXT_DAY }));
    expect(endlessBest(morePoints, KEY)).toMatchObject({ wave: 4, score: 1000, runs: 2 });
    const moreWaves = withEndlessRun(morePoints, run({ wavesCleared: 7, score: 10 }));
    expect(endlessBest(moreWaves, KEY)).toMatchObject({ wave: 7, score: 10, runs: 3 });
  });

  it('keeps a better best and still counts the run and the medal', () => {
    const first = withEndlessRun(emptyArenaRecord(), run({ wavesCleared: 9, medal: BRONZE }));
    const shorter = withEndlessRun(first, run({ wavesCleared: 6, medal: SILVER }));
    expect(endlessBest(shorter, KEY)).toMatchObject({ wave: 9, medal: SILVER, runs: 2 });
    expect(paidMedal(shorter, KEY)).toBe(SILVER);
  });

  it('never lowers the medal or the paid medal', () => {
    const gold = withEndlessRun(emptyArenaRecord(), run({ wavesCleared: 10, medal: GOLD }));
    const worse = withEndlessRun(gold, run({ wavesCleared: 2, medal: NO_MEDAL }));
    expect(endlessBest(worse, KEY)?.medal).toBe(GOLD);
    expect(paidMedal(worse, KEY)).toBe(GOLD);
  });

  it('keeps other key sets and difficulties apart', () => {
    const record = withEndlessRun(emptyArenaRecord(), run());
    expect(endlessBest(record, arenaKey('las', 'fast'))).toBeUndefined();
    expect(paidMedal(record, arenaKey('polana', 'normal'))).toBe(NO_MEDAL);
  });
});

describe('isNewBestWave', () => {
  it('needs more waves than the best so far', () => {
    expect(isNewBestWave(emptyArenaRecord(), run({ wavesCleared: 0 }))).toBe(false);
    expect(isNewBestWave(emptyArenaRecord(), run({ wavesCleared: 1 }))).toBe(true);
    const record = withEndlessRun(emptyArenaRecord(), run());
    expect(isNewBestWave(record, run({ wavesCleared: 4 }))).toBe(false);
    expect(isNewBestWave(record, run({ wavesCleared: 5 }))).toBe(true);
  });
});

describe('arenaRecordOf', () => {
  it('reads anything but an object as an empty record', () => {
    expect(arenaRecordOf(undefined)).toEqual(emptyArenaRecord());
    expect(arenaRecordOf([1, 2])).toEqual(emptyArenaRecord());
  });

  it('keeps a full record as it is', () => {
    const record: ArenaRecord = {
      placement: { regionId: 'gory', date: DAY },
      endless: {
        [KEY]: { wave: 7, score: 2400, accuracy: 0.96, medal: SILVER, date: DAY, runs: 3 },
      },
      medalsPaid: { [KEY]: SILVER },
      daily: {
        date: DAY,
        keySet: 'las',
        tries: 2,
        best: { score: 800, accuracy: 0.97, seconds: 180, medal: GOLD },
        stamps: [DAY],
        chests: ['2026-W42'],
        weekStreak: 1,
        bestWeekStreak: 2,
        totalStamps: 5,
      },
      tracks: {
        'las-2': {
          score: 4120,
          accuracy: 0.95,
          medal: SILVER,
          date: DAY,
          ghost: {
            version: 1,
            seed: 42,
            avatar: 'c',
            hat: 'cap',
            marks: [12, 0, 3, 8, 1, 6],
            hearts: [140],
          },
        },
      },
      shadowWins: { 'p1/las-2': DAY },
      modifierWins: { 'las-4': 5 },
    };
    expect(arenaRecordOf(JSON.parse(JSON.stringify(record)))).toEqual(record);
  });

  it('drops broken entries and keeps the rest', () => {
    const parsed = arenaRecordOf({
      placement: { regionId: '' },
      endless: {
        [KEY]: { wave: 3, score: 10, accuracy: 0.9, medal: BRONZE, date: DAY, runs: 1 },
        'las/fast': { wave: -1, score: 10, accuracy: 0.9, medal: BRONZE, date: DAY },
        'las/calm': { wave: 2, score: 10, accuracy: 1.5, medal: BRONZE, date: DAY },
        'gory/calm': { wave: 2, score: 10, accuracy: 0.9, medal: 7, date: DAY },
      },
      medalsPaid: { [KEY]: BRONZE, 'las/fast': 'gold' },
      daily: { date: DAY },
      tracks: {
        'las-2': {
          score: 1,
          accuracy: 1,
          medal: GOLD,
          date: DAY,
          ghost: { version: 1, seed: 1, avatar: 'a', marks: [1, 2], hearts: [] },
        },
      },
      shadowWins: { 'p1/las-2': 3 },
      modifierWins: { 'las-4': 1.5 },
    });
    expect(parsed).toEqual({
      endless: {
        [KEY]: { wave: 3, score: 10, accuracy: 0.9, medal: BRONZE, date: DAY, runs: 1 },
      },
      medalsPaid: { [KEY]: BRONZE },
      tracks: {},
      shadowWins: {},
      modifierWins: {},
    });
  });
});
