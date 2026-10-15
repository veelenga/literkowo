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
  const updated = awardTrophies({
    ...profile,
    totalScore: profile.totalScore + attempt.score,
    lettersFreed: profile.lettersFreed + attempt.lettersFreed,
    xp: profile.xp + attempt.xp,
    coins: profile.coins + payout.total,
    keyStats: { ...profile.keyStats, ...attempt.keyStats },
    arena: withEndlessRun(profile.arena, run),
    counters: countRun(profile.counters, {
      tally: attempt.tally,
      coins: payout.total,
      avatar: profile.avatar,
      perfect: false,
      wpm: 0,
    }),
  });
  const best = endlessBest(updated.arena, run.key);
  return { profile: updated, medal: run.medal, best, newBestWave, payout };
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
