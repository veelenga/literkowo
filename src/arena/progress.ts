import type { RunCoins } from '../course/coins';
import { creditRun, type RunTotals } from '../course/progress';
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

const NOT_A_LEVEL = { perfect: false, wpm: 0 } as const;

export interface EndlessAttempt extends RunTotals, RunCoins {
  readonly keySet: KeySet;
  readonly difficulty: ArenaDifficulty;
  readonly wavesCleared: number;
  readonly accuracy: number;
  readonly date: string;
}

export interface ArenaRunTotals extends RunTotals {
  readonly coins: number;
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
  return creditRun({ ...profile, arena: run.arena }, run, { ...NOT_A_LEVEL, coins: run.coins });
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
