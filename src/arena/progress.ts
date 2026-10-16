import { countRun, type Tally } from '../course/counters';
import type { KeyStats } from '../course/keyStats';
import { awardTrophies } from '../course/trophies';
import type { Profile } from '../profiles/Profile';
import type { ArenaDifficulty } from './difficulty';
import { arenaPayout, type ArenaPayout } from './economy';
import type { KeySet } from './keySets';
import { medalFor, type Medal } from './medals';
import {
  arenaKey,
  endlessBest,
  isNewBestWave,
  paidMedal,
  withEndlessRun,
  type ArenaRecord,
  type EndlessBest,
  type EndlessRun,
} from './record';

export interface EndlessAttempt {
  readonly keySet: KeySet;
  readonly difficulty: ArenaDifficulty;
  readonly wavesCleared: number;
  readonly score: number;
  readonly accuracy: number;
  readonly lettersFreed: number;
  readonly xp: number;
  readonly runCoins: number;
  readonly coinBoost: number;
  readonly keyStats: KeyStats;
  readonly tally: Tally;
  readonly date: string;
}

export interface ArenaRunTotals {
  readonly score: number;
  readonly lettersFreed: number;
  readonly xp: number;
  readonly coins: number;
  readonly keyStats: KeyStats;
  readonly tally: Tally;
  readonly arena: ArenaRecord;
}

export interface EndlessOutcome {
  readonly profile: Profile;
  readonly medal: Medal;
  readonly best: EndlessBest | undefined;
  readonly newBestWave: boolean;
  readonly payout: ArenaPayout;
}

export function recordEndlessRun(profile: Profile, attempt: EndlessAttempt): EndlessOutcome {
  const run = endlessRunOf(attempt);
  const newBestWave = isNewBestWave(profile.arena, run);
  const payout = arenaPayout({
    runCoins: attempt.runCoins,
    coinBoost: attempt.coinBoost,
    paidMedal: paidMedal(profile.arena, run.key),
    medal: run.medal,
    newBestWave,
  });
  const updated = withArenaRun(profile, {
    ...attempt,
    coins: payout.total,
    arena: withEndlessRun(profile.arena, run),
  });
  const best = endlessBest(updated.arena, run.key);
  return { profile: updated, medal: run.medal, best, newBestWave, payout };
}

export function withArenaRun(profile: Profile, run: ArenaRunTotals): Profile {
  return awardTrophies({
    ...profile,
    totalScore: profile.totalScore + run.score,
    lettersFreed: profile.lettersFreed + run.lettersFreed,
    xp: profile.xp + run.xp,
    coins: profile.coins + run.coins,
    keyStats: { ...profile.keyStats, ...run.keyStats },
    arena: run.arena,
    counters: countRun(profile.counters, {
      tally: run.tally,
      coins: run.coins,
      avatar: profile.avatar,
      perfect: false,
      wpm: 0,
    }),
  });
}

function endlessRunOf(attempt: EndlessAttempt): EndlessRun {
  const { keySet, difficulty, wavesCleared, score, accuracy, date } = attempt;
  return {
    key: arenaKey(keySet.id, difficulty.id),
    wavesCleared,
    score,
    accuracy,
    medal: medalFor({ wavesCleared, accuracy }),
    date,
  };
}
