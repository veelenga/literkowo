import { describe, expect, it } from 'vitest';
import { SessionStats } from './SessionStats';

describe('SessionStats', () => {
  it('measures speed from active time only', () => {
    const stats = new SessionStats();
    for (let i = 0; i < 25; i += 1) stats.recordHit();
    stats.addActiveTime(30);
    expect(stats.wpm).toBe(10);
    stats.freeze();
    stats.addActiveTime(600);
    expect(stats.wpm).toBe(10);
  });

  it('raises the multiplier with combo and resets it on a mistake', () => {
    const stats = new SessionStats();
    for (let i = 0; i < 10; i += 1) stats.recordHit();
    expect(stats.multiplier).toBe(3);
    stats.recordMistake();
    expect(stats.multiplier).toBe(1);
    expect(stats.accuracy).toBeCloseTo(10 / 11);
  });
});
