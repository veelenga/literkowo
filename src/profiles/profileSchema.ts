import { arenaRecordOf, emptyArenaRecord } from '../arena/record';
import { countersOf } from '../course/counters';
import {
  MAX_PRACTICE_DAYS,
  RECENT_WINDOW,
  SPEED_WINDOW,
  isPracticeDay,
  recentMissesWithin,
  type KeyStat,
} from '../course/keyStats';
import { HATS, PETS, SKINS, TROPHIES } from '../course/shop';
import { awardTrophies } from '../course/trophies';
import {
  AVATARS,
  DEFAULT_WORD_LANGUAGE,
  PROFILE_SCHEMA_VERSION,
  STARTER_SKINS,
  isWordLanguage,
  starterInventory,
  type Equipped,
  type Inventory,
  type LevelResult,
  type Profile,
} from './Profile';
import { seededCounters } from './countersMigration';
import { gradualCourseResults } from './courseMigration';
import { countOf, isCount, isNonEmptyString, isRecord, stringsOf, type RawRecord } from './raw';

type Migration = (raw: RawRecord) => RawRecord;

export interface ParsedProfiles {
  profiles: Profile[];
  intact: boolean;
}

const LEGACY_SCHEMA_VERSION = 1;
const SCORE_SCHEMA_VERSION = 2;
const XP_SCHEMA_VERSION = 3;
const KEY_STATS_SCHEMA_VERSION = 4;
const INVENTORY_SCHEMA_VERSION = 5;
const GRADUAL_COURSE_SCHEMA_VERSION = 6;
const ARENA_SCHEMA_VERSION = 7;
const SCORE_PER_SEEDED_XP = 10;
const KNOWN_PETS = PETS.map((pet) => pet.id);
const KNOWN_HATS = HATS.map((hat) => hat.id);
const KNOWN_SKINS = SKINS.map((skin) => skin.id);
const KNOWN_TROPHIES = TROPHIES.map((trophy) => trophy.id);

const MIGRATIONS: Partial<Record<number, Migration>> = {
  [LEGACY_SCHEMA_VERSION]: (raw) => ({ ...raw, totalScore: raw.totalScore ?? raw.bestScore }),
  [SCORE_SCHEMA_VERSION]: (raw) => ({
    ...raw,
    xp: raw.xp ?? Math.round(countOf(raw.totalScore) / SCORE_PER_SEEDED_XP),
  }),
  [XP_SCHEMA_VERSION]: (raw) => ({ ...raw, keyStats: {} }),
  [KEY_STATS_SCHEMA_VERSION]: (raw) => ({
    ...raw,
    inventory: starterInventory(avatarOf(raw.avatar)),
    equipped: {},
  }),
  [INVENTORY_SCHEMA_VERSION]: (raw) => ({
    ...raw,
    levelResults: gradualCourseResults(raw.levelResults),
  }),
  [GRADUAL_COURSE_SCHEMA_VERSION]: (raw) => ({ ...raw, arena: emptyArenaRecord() }),
};

export function serializeProfiles(profiles: readonly Profile[]): string {
  return JSON.stringify(profiles);
}

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
  const avatar = avatarOf(raw.avatar);
  const inventory = inventoryOf(raw.inventory, avatar);
  const profile: Profile = {
    schemaVersion: PROFILE_SCHEMA_VERSION,
    id,
    name,
    avatar,
    wordLanguage: isWordLanguage(raw.wordLanguage) ? raw.wordLanguage : DEFAULT_WORD_LANGUAGE,
    totalScore: countOf(raw.totalScore),
    lettersFreed: countOf(raw.lettersFreed),
    xp: countOf(raw.xp),
    coins: countOf(raw.coins),
    seenStories: stringsOf(raw.seenStories),
    levelResults: levelResultsOf(raw.levelResults),
    keyStats: keyStatsOf(raw.keyStats),
    inventory,
    equipped: equippedOf(raw.equipped, inventory),
    arena: arenaRecordOf(raw.arena),
    counters: countersOf(raw.counters),
  };
  if (!predatesCounters(value)) return profile;
  return awardTrophies({ ...profile, counters: seededCounters(profile) });
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

function predatesCounters(raw: RawRecord): boolean {
  return schemaVersionOf(raw) <= ARENA_SCHEMA_VERSION;
}

function schemaVersionOf({ schemaVersion }: RawRecord): number {
  return typeof schemaVersion === 'number' && Number.isInteger(schemaVersion)
    ? schemaVersion
    : LEGACY_SCHEMA_VERSION;
}

function avatarOf(value: unknown): string {
  return AVATARS.find((avatar) => avatar === value) ?? AVATARS[0];
}

function inventoryOf(value: unknown, avatar: string): Inventory {
  const raw = isRecord(value) ? value : {};
  return {
    pets: knownIdsOf(raw.pets, KNOWN_PETS),
    hats: knownIdsOf(raw.hats, KNOWN_HATS),
    skins: knownIdsOf([...stringsOf(raw.skins), ...STARTER_SKINS, avatar], KNOWN_SKINS),
    trophies: knownIdsOf(raw.trophies, KNOWN_TROPHIES),
  };
}

function equippedOf(value: unknown, inventory: Inventory): Equipped {
  if (!isRecord(value)) return {};
  const equipped: Equipped = {};
  if (isOneOf(value.pet, inventory.pets)) equipped.pet = value.pet;
  if (isOneOf(value.hat, inventory.hats)) equipped.hat = value.hat;
  return equipped;
}

function knownIdsOf(value: unknown, known: readonly string[]): string[] {
  return [...new Set(stringsOf(value))].filter((id) => known.includes(id));
}

function isOneOf(value: unknown, options: readonly string[]): value is string {
  return typeof value === 'string' && options.includes(value);
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
