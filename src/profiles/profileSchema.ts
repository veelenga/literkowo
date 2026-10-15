import {
  MAX_PRACTICE_DAYS,
  RECENT_WINDOW,
  SPEED_WINDOW,
  isPracticeDay,
  recentMissesWithin,
  type KeyStat,
} from '../course/keyStats';
import {
  AVATARS,
  DEFAULT_WORD_LANGUAGE,
  PROFILE_SCHEMA_VERSION,
  isWordLanguage,
  type LevelResult,
  type Profile,
} from './Profile';

type RawRecord = Readonly<Record<string, unknown>>;
type Migration = (raw: RawRecord) => RawRecord;

export interface ParsedProfiles {
  profiles: Profile[];
  intact: boolean;
}

const LEGACY_SCHEMA_VERSION = 1;
const SCORE_SCHEMA_VERSION = 2;
const XP_SCHEMA_VERSION = 3;
const SCORE_PER_SEEDED_XP = 10;

const MIGRATIONS: Partial<Record<number, Migration>> = {
  [LEGACY_SCHEMA_VERSION]: (raw) => ({ ...raw, totalScore: raw.totalScore ?? raw.bestScore }),
  [SCORE_SCHEMA_VERSION]: (raw) => ({
    ...raw,
    xp: raw.xp ?? Math.round(countOf(raw.totalScore) / SCORE_PER_SEEDED_XP),
  }),
  [XP_SCHEMA_VERSION]: (raw) => ({ ...raw, keyStats: {} }),
};

export function parseProfiles(json: string): ParsedProfiles {
  const entries = parseJson(json);
  if (!Array.isArray(entries)) return { profiles: [], intact: false };
  const profiles = entries.map(normalizeProfile).filter((profile) => profile !== undefined);
  return { profiles, intact: profiles.length === entries.length };
}

export function normalizeProfile(value: unknown): Profile | undefined {
  if (!isRecord(value)) return undefined;
  const raw = migrate(value);
  const { id, name } = raw;
  if (!isNonEmptyString(id) || !isNonEmptyString(name)) return undefined;
  return {
    schemaVersion: PROFILE_SCHEMA_VERSION,
    id,
    name,
    avatar: AVATARS.find((avatar) => avatar === raw.avatar) ?? AVATARS[0],
    wordLanguage: isWordLanguage(raw.wordLanguage) ? raw.wordLanguage : DEFAULT_WORD_LANGUAGE,
    totalScore: countOf(raw.totalScore),
    lettersFreed: countOf(raw.lettersFreed),
    xp: countOf(raw.xp),
    coins: countOf(raw.coins),
    seenStories: stringsOf(raw.seenStories),
    levelResults: levelResultsOf(raw.levelResults),
    keyStats: keyStatsOf(raw.keyStats),
  };
}

function parseJson(json: string): unknown {
  try {
    return JSON.parse(json);
  } catch {
    return undefined;
  }
}

function migrate(raw: RawRecord): RawRecord {
  let migrated = raw;
  for (let version = schemaVersionOf(raw); version < PROFILE_SCHEMA_VERSION; version += 1) {
    migrated = MIGRATIONS[version]?.(migrated) ?? migrated;
  }
  return migrated;
}

function schemaVersionOf({ schemaVersion }: RawRecord): number {
  return typeof schemaVersion === 'number' && Number.isInteger(schemaVersion)
    ? schemaVersion
    : LEGACY_SCHEMA_VERSION;
}

function levelResultsOf(value: unknown): Record<string, LevelResult> {
  if (!isRecord(value)) return {};
  const results: Record<string, LevelResult> = {};
  for (const [levelId, entry] of Object.entries(value)) {
    const result = levelResultOf(entry);
    if (result) results[levelId] = result;
  }
  return results;
}

function levelResultOf(value: unknown): LevelResult | undefined {
  if (!isRecord(value)) return undefined;
  const { stars, score, accuracy, wpm } = value;
  if (!isCount(stars) || !isCount(score) || !isCount(accuracy) || !isCount(wpm)) return undefined;
  return { stars, score, accuracy, wpm };
}

function keyStatsOf(value: unknown): Record<string, KeyStat> {
  if (!isRecord(value)) return {};
  const stats: Record<string, KeyStat> = {};
  for (const [key, entry] of Object.entries(value)) {
    const stat = keyStatOf(entry);
    if (stat && isSingleChar(key)) stats[key] = stat;
  }
  return stats;
}

function keyStatOf(value: unknown): KeyStat | undefined {
  if (!isRecord(value)) return undefined;
  const { hits, misses, recentMisses, recentCount, speedMs, speedSamples, days } = value;
  if (!isCount(hits) || !isCount(misses)) return undefined;
  const recent = wholeUpTo(recentCount, RECENT_WINDOW);
  const samples = wholeUpTo(speedSamples, SPEED_WINDOW);
  return {
    hits,
    misses,
    recentMisses: recentMissesWithin(wholeOf(recentMisses), recent),
    recentCount: recent,
    speedMs: samples > 0 ? countOf(speedMs) : 0,
    speedSamples: samples,
    days: practiceDaysOf(days),
  };
}

function practiceDaysOf(value: unknown): string[] {
  const days = new Set(stringsOf(value).filter(isPracticeDay));
  return [...days].sort().slice(-MAX_PRACTICE_DAYS);
}

function wholeUpTo(value: unknown, limit: number): number {
  return Math.min(limit, wholeOf(value));
}

function wholeOf(value: unknown): number {
  return Number.isInteger(value) ? countOf(value) : 0;
}

function isSingleChar(value: string): boolean {
  return [...value].length === 1;
}

function stringsOf(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((item) => typeof item === 'string') : [];
}

function countOf(value: unknown): number {
  return isCount(value) ? value : 0;
}

function isCount(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value) && value >= 0;
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.length > 0;
}

function isRecord(value: unknown): value is RawRecord {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}
