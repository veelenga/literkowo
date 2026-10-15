import { describe, expect, it } from 'vitest';
import {
  EMPTY_KEY_STAT,
  MAX_PRACTICE_DAYS,
  MAX_SPEED_GAP_MS,
  RECENT_WINDOW,
  SPEED_WINDOW,
  isPracticeDay,
  practiceDay,
  recentAccuracy,
  recordHit,
  recordMiss,
  speedInterval,
  withPracticeDay,
  type KeyStat,
} from './keyStats';

function repeat(times: number, step: (stat: KeyStat) => KeyStat, from = EMPTY_KEY_STAT): KeyStat {
  let stat = from;
  for (let i = 0; i < times; i += 1) stat = step(stat);
  return stat;
}

describe('recording keystrokes', () => {
  it('counts hits and misses', () => {
    const stat = recordMiss(recordHit(recordHit(EMPTY_KEY_STAT)));
    expect(stat).toMatchObject({ hits: 2, misses: 1, recentCount: 3 });
  });

  it('has no accuracy before the first keystroke', () => {
    expect(recentAccuracy(EMPTY_KEY_STAT)).toBeUndefined();
  });

  it('measures accuracy over the recent keystrokes only', () => {
    const missed = repeat(10, recordMiss);
    expect(recentAccuracy(missed)).toBe(0);
    const recovered = repeat(RECENT_WINDOW, (stat) => recordHit(stat), missed);
    expect(recentAccuracy(recovered)).toBe(1);
    expect(recovered).toMatchObject({ hits: RECENT_WINDOW, misses: 10 });
  });

  it('keeps a window of the last keystrokes', () => {
    const stat = recordMiss(repeat(RECENT_WINDOW * 2, (current) => recordHit(current)));
    expect(stat.recentCount).toBe(RECENT_WINDOW);
    expect(recentAccuracy(stat)).toBeCloseTo((RECENT_WINDOW - 1) / RECENT_WINDOW);
  });

  it('averages the first intervals and then follows a moving average', () => {
    const first = recordHit(recordHit(EMPTY_KEY_STAT, 400), 800);
    expect(first).toMatchObject({ speedMs: 600, speedSamples: 2 });
    const settled = repeat(SPEED_WINDOW * 4, (stat) => recordHit(stat, 300), first);
    expect(settled.speedSamples).toBe(SPEED_WINDOW);
    expect(settled.speedMs).toBeCloseTo(300, 0);
  });

  it('leaves the speed alone for a hit without an interval', () => {
    const stat = recordHit(recordHit(EMPTY_KEY_STAT, 500));
    expect(stat).toMatchObject({ speedMs: 500, speedSamples: 1, hits: 2 });
  });
});

describe('speedInterval', () => {
  it('measures the time since the previous correct key', () => {
    expect(speedInterval(1000, 1450)).toBe(450);
  });

  it('ignores the first key and long gaps', () => {
    expect(speedInterval(undefined, 1000)).toBeUndefined();
    expect(speedInterval(0, MAX_SPEED_GAP_MS + 1)).toBeUndefined();
    expect(speedInterval(0, MAX_SPEED_GAP_MS)).toBe(MAX_SPEED_GAP_MS);
  });
});

describe('practice days', () => {
  it('formats the local date as an ISO day', () => {
    const day = practiceDay(new Date(2026, 0, 5, 23, 30));
    expect(day).toBe('2026-01-05');
    expect(isPracticeDay(day)).toBe(true);
    expect(isPracticeDay('5.01.2026')).toBe(false);
  });

  it('adds each day once', () => {
    const stat = withPracticeDay(withPracticeDay(EMPTY_KEY_STAT, '2026-01-05'), '2026-01-05');
    expect(stat.days).toEqual(['2026-01-05']);
  });

  it('keeps only the latest days', () => {
    const days = Array.from({ length: MAX_PRACTICE_DAYS + 2 }, (_, index) =>
      practiceDay(new Date(2026, 0, index + 1)),
    );
    const stat = days.reduce(withPracticeDay, EMPTY_KEY_STAT);
    expect(stat.days).toHaveLength(MAX_PRACTICE_DAYS);
    expect(stat.days.at(0)).toBe('2026-01-03');
    expect(stat.days.at(-1)).toBe('2026-01-12');
  });
});
