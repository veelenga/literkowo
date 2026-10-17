import {
  entriesOf,
  isCount,
  isNonEmptyString,
  isRecord,
  isShare,
  isWholeNumber,
  stringsOf,
  wholeOf,
} from '../profiles/raw';
import { isMedal, NO_MEDAL, type Medal } from './medals';

export interface Placement {
  regionId: string;
  date: string;
}

export interface EndlessBest {
  wave: number;
  score: number;
  accuracy: number;
  medal: Medal;
  date: string;
  runs: number;
}

export interface DailyBest {
  score: number;
  accuracy: number;
  seconds: number;
  medal: Medal;
}

export interface DailyRecord {
  date: string;
  keySet: string;
  tries: number;
  best?: DailyBest;
  stamps: string[];
  chests: string[];
  weekStreak: number;
  bestWeekStreak: number;
  totalStamps: number;
}

export interface ArenaRecord {
  placement?: Placement;
  endless: Record<string, EndlessBest>;
  medalsPaid: Record<string, Medal>;
  daily?: DailyRecord;
}

export interface EndlessRun {
  readonly key: string;
  readonly wavesCleared: number;
  readonly score: number;
  readonly accuracy: number;
  readonly medal: Medal;
  readonly date: string;
}

const KEY_SEPARATOR = '/';

export function emptyArenaRecord(): ArenaRecord {
  return { endless: {}, medalsPaid: {} };
}

export function arenaKey(keySetId: string, difficultyId: string): string {
  return `${keySetId}${KEY_SEPARATOR}${difficultyId}`;
}

export function endlessBest(record: ArenaRecord, key: string): EndlessBest | undefined {
  return record.endless[key];
}

export function paidMedal(record: ArenaRecord, key: string): Medal {
  return record.medalsPaid[key] ?? NO_MEDAL;
}

export function bestEndlessWave(record: ArenaRecord): number {
  return Math.max(0, ...Object.values(record.endless).map((best) => best.wave));
}

export function bestEndlessMedal(record: ArenaRecord): Medal {
  return Object.values(record.endless).reduce<Medal>(
    (medal, best) => higherMedal(medal, best.medal),
    NO_MEDAL,
  );
}

export function isNewBestWave(record: ArenaRecord, run: EndlessRun): boolean {
  return run.wavesCleared > (endlessBest(record, run.key)?.wave ?? 0);
}

export function withEndlessRun(record: ArenaRecord, run: EndlessRun): ArenaRecord {
  return {
    ...record,
    endless: { ...record.endless, [run.key]: improvedBest(endlessBest(record, run.key), run) },
    medalsPaid: {
      ...record.medalsPaid,
      [run.key]: higherMedal(paidMedal(record, run.key), run.medal),
    },
  };
}

function improvedBest(best: EndlessBest | undefined, run: EndlessRun): EndlessBest {
  const runs = (best?.runs ?? 0) + 1;
  const medal = higherMedal(best?.medal ?? NO_MEDAL, run.medal);
  if (best && !isBetterRun(run, best)) return { ...best, medal, runs };
  const { wavesCleared, score, accuracy, date } = run;
  return { wave: wavesCleared, score, accuracy, medal, date, runs };
}

function isBetterRun(run: EndlessRun, best: EndlessBest): boolean {
  if (run.wavesCleared !== best.wave) return run.wavesCleared > best.wave;
  return run.score > best.score;
}

function higherMedal(first: Medal, second: Medal): Medal {
  return first >= second ? first : second;
}

export function arenaRecordOf(value: unknown): ArenaRecord {
  if (!isRecord(value)) return emptyArenaRecord();
  const record: ArenaRecord = {
    endless: entriesOf(value.endless, endlessBestOf),
    medalsPaid: entriesOf(value.medalsPaid, medalOf),
  };
  const placement = placementOf(value.placement);
  if (placement) record.placement = placement;
  const daily = dailyRecordOf(value.daily);
  if (daily) record.daily = daily;
  return record;
}

function placementOf(value: unknown): Placement | undefined {
  if (!isRecord(value)) return undefined;
  const { regionId, date } = value;
  if (!isNonEmptyString(regionId) || !isNonEmptyString(date)) return undefined;
  return { regionId, date };
}

function endlessBestOf(value: unknown): EndlessBest | undefined {
  if (!isRecord(value)) return undefined;
  const { wave, score, accuracy, medal, date, runs } = value;
  if (!isWholeNumber(wave) || !isCount(score) || !isShare(accuracy)) return undefined;
  if (!isMedal(medal) || !isNonEmptyString(date)) return undefined;
  return { wave, score, accuracy, medal, date, runs: wholeOf(runs) };
}

function dailyRecordOf(value: unknown): DailyRecord | undefined {
  if (!isRecord(value)) return undefined;
  const { date, keySet, tries } = value;
  if (!isNonEmptyString(date) || !isNonEmptyString(keySet)) return undefined;
  const daily: DailyRecord = {
    date,
    keySet,
    tries: wholeOf(tries),
    stamps: stringsOf(value.stamps),
    chests: stringsOf(value.chests),
    weekStreak: wholeOf(value.weekStreak),
    bestWeekStreak: wholeOf(value.bestWeekStreak),
    totalStamps: wholeOf(value.totalStamps),
  };
  const best = dailyBestOf(value.best);
  if (best) daily.best = best;
  return daily;
}

function dailyBestOf(value: unknown): DailyBest | undefined {
  if (!isRecord(value)) return undefined;
  const { score, accuracy, seconds, medal } = value;
  if (!isCount(score) || !isShare(accuracy) || !isCount(seconds) || !isMedal(medal)) {
    return undefined;
  }
  return { score, accuracy, seconds, medal };
}

function medalOf(value: unknown): Medal | undefined {
  return isMedal(value) ? value : undefined;
}
