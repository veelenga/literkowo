import { describe, expect, it } from 'vitest';
import {
  EMPTY_KEY_STAT,
  MAX_SPEED_GAP_MS,
  RECENT_WINDOW,
  recordHit,
  type KeyStat,
} from '../course/keyStats';
import { KeyTracker } from './KeyTracker';

const TODAY = '2026-03-04';
const PAST_DAYS = ['2026-03-01', '2026-03-02'];

function tracker(baseline = {}): KeyTracker {
  return new KeyTracker(baseline, 'fjdk', TODAY);
}

describe('KeyTracker', () => {
  it('records hits and misses for the keys of the level', () => {
    const keys = tracker();
    keys.hit('f', 0);
    keys.miss('j');
    keys.miss('q');
    expect(keys.statOf('f')).toMatchObject({ hits: 1, misses: 0, days: [TODAY] });
    expect(keys.statOf('j')).toMatchObject({ hits: 0, misses: 1 });
    expect(keys.statOf('q')).toBeUndefined();
  });

  it('times a hit from the previous correct key', () => {
    const keys = tracker();
    keys.hit('f', 1000);
    keys.miss('j');
    keys.hit('j', 1600);
    keys.hit('d', 1600 + MAX_SPEED_GAP_MS + 1);
    expect(keys.statOf('f')).toMatchObject({ speedSamples: 0 });
    expect(keys.statOf('j')).toMatchObject({ speedMs: 600, speedSamples: 1 });
    expect(keys.statOf('d')).toMatchObject({ speedSamples: 0 });
  });

  it('builds on the stored statistics', () => {
    const f = { ...recordHit(EMPTY_KEY_STAT), days: PAST_DAYS };
    const keys = tracker({ f, k: f });
    keys.hit('f', 0);
    expect(keys.statOf('f')).toMatchObject({ hits: 2, days: [...PAST_DAYS, TODAY] });
    expect(keys.stats.k).toBe(f);
    expect(keys.report().practised).toEqual({ f: keys.statOf('f') });
  });

  it('reports the weakest keys of the run', () => {
    const keys = tracker();
    keys.hit('f', 0);
    keys.miss('j');
    keys.hit('j', 100);
    keys.miss('d');
    keys.miss('d');
    keys.hit('d', 200);
    expect(keys.report().weakest).toEqual([
      { key: 'd', accuracy: 1 / 3 },
      { key: 'j', accuracy: 0.5 },
    ]);
  });

  it('reports keys that became mastered in the run', () => {
    let f: KeyStat = { ...EMPTY_KEY_STAT, days: PAST_DAYS };
    for (let i = 0; i < RECENT_WINDOW; i += 1) f = recordHit(f, 300);
    const keys = tracker({ f });
    keys.hit('f', 0);
    keys.hit('f', 300);
    expect(keys.report().mastered).toEqual(['f']);
  });
});
