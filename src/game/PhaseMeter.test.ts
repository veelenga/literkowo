import { describe, expect, it } from 'vitest';
import { EMPTY_PHASE_RECORD, PhaseMeter } from './PhaseMeter';

const PRECISION = 6;

describe('PhaseMeter', () => {
  it('times each correct key from the key before it while a word waits', () => {
    const meter = new PhaseMeter();
    meter.wordReady(10, true);
    meter.hit(10.5);
    meter.hit(10.8);
    meter.hit(11.2);
    const record = meter.close();
    expect(record.hits).toBe(3);
    expect(record.typingSeconds).toBeCloseTo(1.2, PRECISION);
  });

  it('starts the clock again when a word lands on an empty board', () => {
    const meter = new PhaseMeter();
    meter.wordReady(0, true);
    meter.hit(0.4);
    meter.wordReady(5, true);
    meter.hit(5.3);
    expect(meter.close().typingSeconds).toBeCloseTo(0.7, PRECISION);
  });

  it('keeps the clock running when a word joins a busy board', () => {
    const meter = new PhaseMeter();
    meter.wordReady(0, true);
    meter.hit(1);
    meter.wordReady(1.5, false);
    meter.hit(2);
    expect(meter.close().typingSeconds).toBeCloseTo(2, PRECISION);
  });

  it('counts mistakes and enemies that reached the hero', () => {
    const meter = new PhaseMeter();
    meter.mistake();
    meter.mistake();
    meter.reach();
    expect(meter.close()).toEqual({ hits: 0, mistakes: 2, reached: 1, typingSeconds: 0 });
  });

  it('starts every phase with an empty record and carries the clock across', () => {
    const meter = new PhaseMeter();
    meter.wordReady(0, true);
    meter.hit(0.5);
    meter.close();
    expect(meter.close()).toEqual(EMPTY_PHASE_RECORD);
    meter.hit(1);
    expect(meter.close().typingSeconds).toBeCloseTo(0.5, PRECISION);
  });
});
