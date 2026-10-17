import type { RunCoins } from '../course/coins';
import type { RunTotals } from '../course/progress';
import { awardTrophies } from '../course/trophies';
import type { Profile } from '../profiles/Profile';
import {
  FAMILY_CHEST,
  dailyDay,
  isFamilyChestDue,
  triesLeft,
  withDailyTry,
  withFamilyChest,
} from './daily';
import type { DailyChoice } from './dailyPlan';
import { dailyPayout, type DailyPayout } from './economy';
import { dailyMedal } from './formats';
import { NO_MEDAL, type Medal } from './medals';
import { withArenaRun } from './progress';
import type { DailyBest, DailyRecord } from './record';

export interface DailyAttempt extends RunTotals, RunCoins {
  readonly choice: DailyChoice;
  readonly completed: boolean;
  readonly seconds: number;
  readonly accuracy: number;
  readonly wpm: number;
}

export interface DailyOutcome {
  readonly profile: Profile;
  readonly medal: Medal;
  readonly best: DailyBest | undefined;
  readonly improved: boolean;
  readonly stamped: boolean;
  readonly triesLeft: number;
  readonly payout: DailyPayout;
}

export interface FamilyPayment {
  readonly profile: Profile;
  readonly coins: number;
}

export interface BoardEntry {
  readonly profileId: string;
  readonly name: string;
  readonly medal: Medal;
}

const NO_COINS = 0;

export function recordDailyRun(
  profile: Profile,
  attempt: DailyAttempt,
  family: readonly Profile[],
): DailyOutcome {
  const { choice } = attempt;
  const medal = dailyMedal(choice.format, attempt);
  const step = withDailyTry(
    profile.arena.daily,
    {
      keySet: choice.keySet.id,
      score: attempt.score,
      accuracy: attempt.accuracy,
      seconds: attempt.seconds,
      medal,
    },
    choice.day,
  );
  const familyDue = isFamilyChestDue(
    step.record,
    recordsWith(family, profile.id, step.record),
    choice.day,
  );
  const daily = familyDue ? withFamilyChest(step.record, choice.day) : step.record;
  const payout = dailyPayout({
    runCoins: attempt.runCoins,
    coinBoost: attempt.coinBoost,
    ...step.rewards,
    family: familyDue ? FAMILY_CHEST.coins : NO_COINS,
  });
  const updated = withArenaRun(profile, {
    ...attempt,
    coins: payout.total,
    arena: { ...profile.arena, daily },
  });
  return {
    profile: updated,
    medal,
    best: dailyDay(daily, choice.day).best,
    improved: step.improved,
    stamped: step.stamped,
    triesLeft: triesLeft(daily, choice.day),
    payout,
  };
}

export function payFamilyChest(
  profile: Profile,
  family: readonly Profile[],
  today: string,
): FamilyPayment {
  const record = profile.arena.daily;
  const records = recordsWith(family, profile.id, record);
  if (!isFamilyChestDue(record, records, today)) return { profile, coins: NO_COINS };
  const coins = FAMILY_CHEST.coins;
  const paid = awardTrophies({
    ...profile,
    coins: profile.coins + coins,
    arena: { ...profile.arena, daily: withFamilyChest(record, today) },
    counters: { ...profile.counters, coinsEarned: profile.counters.coinsEarned + coins },
  });
  return { profile: paid, coins };
}

export function deviceBoard(profiles: readonly Profile[], today: string): BoardEntry[] {
  return profiles.flatMap((profile) => {
    const day = dailyDay(profile.arena.daily, today);
    if (day.tries === 0) return [];
    return [{ profileId: profile.id, name: profile.name, medal: day.best?.medal ?? NO_MEDAL }];
  });
}

function recordsWith(
  family: readonly Profile[],
  profileId: string,
  record: DailyRecord | undefined,
): (DailyRecord | undefined)[] {
  const others = family.filter((member) => member.id !== profileId);
  return [...others.map((member) => member.arena.daily), record];
}
