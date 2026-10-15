import { describe, expect, it } from 'vitest';
import { requireLevel } from '../testing/levels';
import { regionOf } from './catalog';
import { EMPTY_KEY_STAT, RECENT_WINDOW, recordHit, recordMiss, type KeyStat } from './keyStats';
import {
  MASTERED_DAYS,
  MAX_KEY_WEIGHT,
  RIGHT_ALT_TARGET_INTERVAL_MS,
  TARGET_INTERVAL_MS,
  hasMasteredAccuracy,
  keyWeight,
  masteredShare,
  masteryOf,
  newlyMastered,
  regionKeys,
  weakestKeys,
} from './mastery';

const DAYS = ['2026-01-01', '2026-01-02', '2026-01-03'];
const FAST_MS = 500;

interface Practice {
  hits?: number;
  misses?: number;
  intervalMs?: number;
  days?: string[];
}

function practised({ hits = 0, misses = 0, intervalMs = FAST_MS, days = DAYS }: Practice): KeyStat {
  let stat: KeyStat = { ...EMPTY_KEY_STAT, days };
  for (let i = 0; i < misses; i += 1) stat = recordMiss(stat);
  for (let i = 0; i < hits; i += 1) stat = recordHit(stat, intervalMs);
  return stat;
}

describe('masteryOf', () => {
  it('is none without any keystroke', () => {
    expect(masteryOf('f', undefined)).toBe('none');
    expect(masteryOf('f', EMPTY_KEY_STAT)).toBe('none');
  });

  it('is learning below the solid accuracy or with few keystrokes', () => {
    expect(masteryOf('f', practised({ hits: 8, misses: 4 }))).toBe('learning');
    expect(masteryOf('f', practised({ hits: 3 }))).toBe('learning');
  });

  it('is solid at ninety percent with enough keystrokes', () => {
    expect(masteryOf('f', practised({ hits: 18, misses: 2 }))).toBe('solid');
  });

  it('is mastered when accurate, fast and practised on enough days', () => {
    expect(masteryOf('f', practised({ hits: RECENT_WINDOW }))).toBe('mastered');
  });

  it('needs a full window of recent keystrokes', () => {
    expect(masteryOf('f', practised({ hits: RECENT_WINDOW - 1 }))).toBe('solid');
  });

  it('needs enough different days', () => {
    const days = DAYS.slice(0, MASTERED_DAYS - 1);
    expect(masteryOf('f', practised({ hits: RECENT_WINDOW, days }))).toBe('solid');
  });

  it('needs the speed target', () => {
    const slow = practised({ hits: RECENT_WINDOW, intervalMs: TARGET_INTERVAL_MS + 100 });
    expect(masteryOf('f', slow)).toBe('solid');
  });

  it('gives right Alt letters a gentler speed target', () => {
    const intervalMs = RIGHT_ALT_TARGET_INTERVAL_MS - 100;
    expect(masteryOf('ą', practised({ hits: RECENT_WINDOW, intervalMs }))).toBe('mastered');
    expect(masteryOf('a', practised({ hits: RECENT_WINDOW, intervalMs }))).toBe('solid');
  });

  it('stays mastered with one miss in the window, shown as 97%', () => {
    expect(masteryOf('f', practised({ hits: RECENT_WINDOW - 1, misses: 1 }))).toBe('mastered');
    expect(masteryOf('f', recordMiss(practised({ hits: RECENT_WINDOW })))).toBe('mastered');
  });

  it('drops below mastered after two recent misses', () => {
    expect(masteryOf('f', practised({ hits: RECENT_WINDOW - 2, misses: 2 }))).toBe('solid');
  });
});

describe('hasMasteredAccuracy', () => {
  it('judges the accuracy rounded to a whole percent', () => {
    expect(hasMasteredAccuracy(29 / 30)).toBe(true);
    expect(hasMasteredAccuracy(0.965)).toBe(true);
    expect(hasMasteredAccuracy(0.964)).toBe(false);
    expect(hasMasteredAccuracy(0.96)).toBe(false);
  });
});

describe('masteredShare', () => {
  it('counts the mastered keys of a region', () => {
    const region = regionOf(requireLevel('polana-1'));
    const keys = regionKeys(region);
    expect(keys).toBe('fjdksla;');
    const stats = { f: practised({ hits: RECENT_WINDOW }), j: practised({ hits: 3 }) };
    expect(masteredShare(keys, stats)).toBe(1 / keys.length);
    expect(masteredShare('', stats)).toBe(0);
  });
});

describe('keyWeight', () => {
  it('is even for unknown and mastered keys', () => {
    expect(keyWeight('f', undefined)).toBe(1);
    expect(keyWeight('f', practised({ hits: RECENT_WINDOW }))).toBe(1);
  });

  it('grows up to the maximum for inaccurate keys', () => {
    expect(keyWeight('f', practised({ misses: 5, hits: 5 }))).toBe(MAX_KEY_WEIGHT);
    const middling = keyWeight('f', practised({ misses: 1, hits: 9 }));
    expect(middling).toBeGreaterThan(1);
    expect(middling).toBeLessThan(MAX_KEY_WEIGHT);
  });

  it('grows for slow keys', () => {
    const slow = practised({ hits: RECENT_WINDOW, intervalMs: TARGET_INTERVAL_MS * 2 });
    expect(keyWeight('f', slow)).toBe(MAX_KEY_WEIGHT);
  });
});

describe('weakestKeys', () => {
  it('lists the least accurate keys with a mistake first', () => {
    const tallies = {
      f: { hits: 9, misses: 1 },
      j: { hits: 2, misses: 2 },
      d: { hits: 10, misses: 0 },
      k: { hits: 3, misses: 3 },
    };
    expect(weakestKeys(tallies, 2)).toEqual([
      { key: 'k', accuracy: 0.5 },
      { key: 'j', accuracy: 0.5 },
    ]);
  });

  it('is empty after a run without mistakes', () => {
    expect(weakestKeys({ f: { hits: 4, misses: 0 } }, 2)).toEqual([]);
  });
});

describe('newlyMastered', () => {
  it('lists keys that became mastered', () => {
    const before = {
      f: practised({ hits: RECENT_WINDOW - 1 }),
      j: practised({ hits: RECENT_WINDOW }),
    };
    const after = {
      f: recordHit(before.f, FAST_MS),
      j: recordHit(before.j, FAST_MS),
      d: practised({ hits: 4 }),
    };
    expect(newlyMastered(before, after)).toEqual(['f']);
  });
});
