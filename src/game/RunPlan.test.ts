import { describe, expect, it } from 'vitest';
import { tempoAt, type Phase } from './RunPlan';

const PRECISION = 6;
const STEADY: Phase = { kind: 'words', count: 5, speed: 0.5, spawnInterval: 4 };
const RAMPED: Phase = { ...STEADY, rampTo: { speed: 0.7, spawnInterval: 3 } };

describe('tempoAt', () => {
  it('keeps the pace of a phase without a ramp', () => {
    expect(tempoAt(STEADY, 0)).toEqual({ speed: 0.5, spawnInterval: 4 });
    expect(tempoAt(STEADY, 4)).toEqual({ speed: 0.5, spawnInterval: 4 });
  });

  it('eases from the start pace at the first spawn to the end pace at the last spawn', () => {
    const speeds = [0, 1, 2, 3, 4].map((spawned) => tempoAt(RAMPED, spawned).speed);
    const expected = [0.5, 0.55, 0.6, 0.65, 0.7];
    speeds.forEach((speed, index) => expect(speed).toBeCloseTo(expected[index], PRECISION));
    expect(tempoAt(RAMPED, 2).spawnInterval).toBeCloseTo(3.5, PRECISION);
  });

  it('holds the end pace past the last spawn', () => {
    expect(tempoAt(RAMPED, 9)).toEqual({ speed: 0.7, spawnInterval: 3 });
  });

  it('starts a single spawn phase at its start pace', () => {
    expect(tempoAt({ ...RAMPED, count: 1 }, 0)).toEqual({ speed: 0.5, spawnInterval: 4 });
  });
});
