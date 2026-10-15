import { describe, expect, it } from 'vitest';
import { FEVER_COMBO, calloutFor } from './combo';
import { SessionStats } from './SessionStats';

describe('combo', () => {
  it('announces milestones only on the exact combo', () => {
    expect(calloutFor(4)).toBeUndefined();
    expect(calloutFor(5)).toBe('super');
    expect(calloutFor(15)).toBe('ultra');
    expect(calloutFor(16)).toBeUndefined();
  });

  it('enters fever at the threshold and doubles word points until a mistake', () => {
    const stats = new SessionStats();
    for (let i = 0; i < FEVER_COMBO - 1; i += 1) stats.recordHit();
    expect(stats.fever).toBe(false);
    stats.recordHit();
    expect(stats.fever).toBe(true);
    stats.recordWord('abc');
    expect(stats.score).toBe(3 * 10 * stats.multiplier * 2);
    stats.recordMistake();
    expect(stats.fever).toBe(false);
  });
});
