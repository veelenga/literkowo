import {
  EMPTY_KEY_STAT,
  recordHit,
  recordMiss,
  speedInterval,
  withPracticeDay,
  type KeyStat,
  type KeyStats,
} from '../course/keyStats';
import { newlyMastered, weakestKeys, type KeyAccuracy, type KeyTally } from '../course/mastery';

export const WEAKEST_KEYS_SHOWN = 2;

export interface KeyReport {
  readonly practised: KeyStats;
  readonly weakest: readonly KeyAccuracy[];
  readonly mastered: readonly string[];
}

type Outcome = 'hit' | 'miss';

export class KeyTracker {
  private readonly practised = new Map<string, KeyStat>();
  private readonly tallies = new Map<string, KeyTally>();
  private lastHitAt: number | undefined;

  constructor(
    private readonly baseline: KeyStats,
    private readonly tracked: string,
    private readonly day: string,
  ) {}

  get stats(): KeyStats {
    return { ...this.baseline, ...Object.fromEntries(this.practised) };
  }

  statOf(key: string): KeyStat | undefined {
    return this.practised.get(key) ?? this.baseline[key];
  }

  hit(key: string, now: number): void {
    const interval = speedInterval(this.lastHitAt, now);
    this.lastHitAt = now;
    this.record(key, 'hit', (stat) => recordHit(stat, interval));
  }

  miss(key: string): void {
    this.record(key, 'miss', recordMiss);
  }

  report(): KeyReport {
    const practised = Object.fromEntries(this.practised);
    return {
      practised,
      weakest: weakestKeys(Object.fromEntries(this.tallies), WEAKEST_KEYS_SHOWN),
      mastered: newlyMastered(this.baseline, practised),
    };
  }

  private record(key: string, outcome: Outcome, apply: (stat: KeyStat) => KeyStat): void {
    if (!this.tracked.includes(key)) return;
    this.practised.set(key, apply(this.startingStat(key)));
    this.tallies.set(key, tallied(this.tallies.get(key), outcome));
  }

  private startingStat(key: string): KeyStat {
    const current = this.practised.get(key);
    if (current) return current;
    return withPracticeDay(this.baseline[key] ?? EMPTY_KEY_STAT, this.day);
  }
}

function tallied(tally: KeyTally = { hits: 0, misses: 0 }, outcome: Outcome): KeyTally {
  return outcome === 'hit'
    ? { ...tally, hits: tally.hits + 1 }
    : { ...tally, misses: tally.misses + 1 };
}
