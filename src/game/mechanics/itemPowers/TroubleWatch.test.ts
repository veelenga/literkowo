// @vitest-environment jsdom
import { describe, expect, it } from 'vitest';
import { fakeBoard } from '../../../testing/enemyBoard';
import { SPAWN_RADIUS } from '../../board';
import type { Phase } from '../../RunPlan';
import type { MechanicContext } from '../Mechanic';
import {
  CROWDED_BOARD,
  FAST_PACE,
  LAST_HEART,
  MISSES_IN_TROUBLE,
  MISS_WINDOW_SECONDS,
} from './trouble';
import { TroubleWatch } from './TroubleWatch';

const FRAME = 1 / 60;
const ENEMY_PACE = 1;
const WARMUP: Phase = { kind: 'warmup', count: 8, speed: 0.5, spawnInterval: 1.5 };
const FIRST_WAVE: Phase = {
  kind: 'words',
  count: 10,
  speed: ENEMY_PACE / FAST_PACE,
  spawnInterval: 2,
  wave: 1,
};

function watchOver(overrides: Partial<MechanicContext> = {}) {
  const board = fakeBoard(overrides);
  return { ...board, watch: new TroubleWatch(board.context) };
}

describe('TroubleWatch', () => {
  it('counts only the mistakes of the last few seconds', () => {
    const { watch } = watchOver();
    for (let miss = 0; miss < MISSES_IN_TROUBLE; miss += 1) watch.onMistake();
    expect(watch.isOn).toBe(true);
    watch.update(MISS_WINDOW_SECONDS + FRAME);
    expect(watch.isOn).toBe(false);
  });

  it('compares the enemies with the pace the run started at', () => {
    const steady = watchOver();
    steady.enemyAt(SPAWN_RADIUS);
    expect(steady.watch.isOn).toBe(false);

    const climbed = watchOver({ phase: FIRST_WAVE });
    climbed.enemyAt(SPAWN_RADIUS);
    expect(climbed.watch.isOn).toBe(true);
  });

  it('reads the hearts left from the game', () => {
    expect(watchOver().watch.isOn).toBe(false);
    expect(watchOver({ lives: LAST_HEART }).watch.isOn).toBe(true);
  });

  it('rests in the warm up and outside play', () => {
    const warmup = watchOver({ phase: WARMUP });
    warmup.enemiesAt(SPAWN_RADIUS, CROWDED_BOARD);
    expect(warmup.watch.isOn).toBe(false);

    const paused = watchOver({ playing: false });
    paused.enemiesAt(SPAWN_RADIUS, CROWDED_BOARD);
    expect(paused.watch.isOn).toBe(false);
  });
});
