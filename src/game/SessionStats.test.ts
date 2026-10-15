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

  it('keeps the fever through the allowed slips while each mistake still counts', () => {
    const stats = new SessionStats();
    stats.keepFeverOnSlips(1);
    for (let i = 0; i < 15; i += 1) stats.recordHit();
    stats.recordMistake();
    expect(stats).toMatchObject({ fever: true, combo: 0, mistakes: 1 });
    stats.recordMistake();
    expect(stats).toMatchObject({ fever: false, mistakes: 2 });
  });

  it('spends no slip outside the fever', () => {
    const stats = new SessionStats();
    stats.keepFeverOnSlips(1);
    stats.recordMistake();
    for (let i = 0; i < 15; i += 1) stats.recordHit();
    stats.recordMistake();
    expect(stats.fever).toBe(true);
  });
});
