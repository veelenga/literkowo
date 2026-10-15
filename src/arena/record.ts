import { isCount, isNonEmptyString, isRecord, stringsOf, type RawRecord } from '../profiles/raw';
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

export const GHOST_VERSION = 1;
const GHOST_MARK_SIZE = 3;

export interface GhostRun {
  version: typeof GHOST_VERSION;
  seed: number;
  avatar: string;
  hat?: string;
  pet?: string;
  marks: number[];
  hearts: number[];
}

export interface TrackBest {
  score: number;
  accuracy: number;
  medal: Medal;
  date: string;
  ghost: GhostRun;
}

export interface ArenaRecord {
  placement?: Placement;
  endless: Record<string, EndlessBest>;
  medalsPaid: Record<string, Medal>;
  daily?: DailyRecord;
  tracks: Record<string, TrackBest>;
  shadowWins: Record<string, string>;
  modifierWins: Record<string, number>;
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
  return { endless: {}, medalsPaid: {}, tracks: {}, shadowWins: {}, modifierWins: {} };
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
    tracks: entriesOf(value.tracks, trackBestOf),
    shadowWins: entriesOf(value.shadowWins, nonEmptyStringOf),
    modifierWins: entriesOf(value.modifierWins, wholeNumberOf),
  };
  const placement = placementOf(value.placement);
  if (placement) record.placement = placement;
  const daily = dailyRecordOf(value.daily);
  if (daily) record.daily = daily;
  return record;
}

function entriesOf<T>(value: unknown, read: (entry: unknown) => T | undefined): Record<string, T> {
  if (!isRecord(value)) return {};
  const entries: Record<string, T> = {};
  for (const [key, entry] of Object.entries(value)) {
    const parsed = read(entry);
    if (parsed !== undefined) entries[key] = parsed;
  }
  return entries;
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
  return { wave, score, accuracy, medal, date, runs: wholeNumberOf(runs) ?? 0 };
}

function dailyRecordOf(value: unknown): DailyRecord | undefined {
  if (!isRecord(value)) return undefined;
  const { date, keySet, tries } = value;
  if (!isNonEmptyString(date) || !isNonEmptyString(keySet)) return undefined;
  const daily: DailyRecord = {
    date,
    keySet,
    tries: wholeNumberOf(tries) ?? 0,
    stamps: stringsOf(value.stamps),
    chests: stringsOf(value.chests),
    weekStreak: wholeNumberOf(value.weekStreak) ?? 0,
    bestWeekStreak: wholeNumberOf(value.bestWeekStreak) ?? 0,
    totalStamps: wholeNumberOf(value.totalStamps) ?? 0,
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

function trackBestOf(value: unknown): TrackBest | undefined {
  if (!isRecord(value)) return undefined;
  const { score, accuracy, medal, date } = value;
  const ghost = ghostOf(value.ghost);
  if (!isCount(score) || !isShare(accuracy) || !isMedal(medal)) return undefined;
  if (!isNonEmptyString(date) || !ghost) return undefined;
  return { score, accuracy, medal, date, ghost };
}

function ghostOf(value: unknown): GhostRun | undefined {
  if (!isRecord(value) || value.version !== GHOST_VERSION) return undefined;
  const { seed, avatar } = value;
  const marks = numbersOf(value.marks);
  const hearts = numbersOf(value.hearts);
  if (!isCount(seed) || !isNonEmptyString(avatar) || !marks || !hearts) return undefined;
  if (marks.length % GHOST_MARK_SIZE !== 0) return undefined;
  return withOutfit({ version: GHOST_VERSION, seed, avatar, marks, hearts }, value);
}

function withOutfit(ghost: GhostRun, raw: RawRecord): GhostRun {
  const outfit: GhostRun = { ...ghost };
  if (isNonEmptyString(raw.hat)) outfit.hat = raw.hat;
  if (isNonEmptyString(raw.pet)) outfit.pet = raw.pet;
  return outfit;
}

function numbersOf(value: unknown): number[] | undefined {
  if (!Array.isArray(value)) return undefined;
  const numbers = value.filter(isCount);
  return numbers.length === value.length ? numbers : undefined;
}

function medalOf(value: unknown): Medal | undefined {
  return isMedal(value) ? value : undefined;
}

function nonEmptyStringOf(value: unknown): string | undefined {
  return isNonEmptyString(value) ? value : undefined;
}

function wholeNumberOf(value: unknown): number | undefined {
  return isWholeNumber(value) ? value : undefined;
}

function isWholeNumber(value: unknown): value is number {
  return isCount(value) && Number.isInteger(value);
}

function isShare(value: unknown): value is number {
  return isCount(value) && value <= 1;
}
