import { emptyArenaRecord, type ArenaRecord } from '../arena/record';
import { emptyCounters, type Counters } from '../course/counters';
import type { KeyStat } from '../course/keyStats';

export const WORD_LANGUAGES = ['pl', 'en'] as const;

export type WordLanguage = (typeof WORD_LANGUAGES)[number];

export const DEFAULT_WORD_LANGUAGE: WordLanguage = 'pl';

export const PROFILE_SCHEMA_VERSION = 8;

export interface LevelResult {
  stars: number;
  score: number;
  accuracy: number;
  wpm: number;
}

export interface Profile {
  schemaVersion: number;
  id: string;
  name: string;
  avatar: string;
  wordLanguage: WordLanguage;
  totalScore: number;
  lettersFreed: number;
  xp: number;
  coins: number;
  seenStories: string[];
  levelResults: Record<string, LevelResult>;
  keyStats: Record<string, KeyStat>;
  inventory: Inventory;
  equipped: Equipped;
  arena: ArenaRecord;
  counters: Counters;
}

export interface Inventory {
  pets: string[];
  hats: string[];
  skins: string[];
  trophies: string[];
}

export interface Equipped {
  pet?: string;
  hat?: string;
}

export const AVATARS = 'abcdefghijklmnopqr'.split('');

const STARTER_SKIN_COUNT = 6;

export const STARTER_SKINS: readonly string[] = AVATARS.slice(0, STARTER_SKIN_COUNT);

export function starterInventory(avatar: string): Inventory {
  return { pets: [], hats: [], skins: [...new Set([...STARTER_SKINS, avatar])], trophies: [] };
}

export function avatarImage(avatar: string): string {
  return `${import.meta.env.BASE_URL}characters/character-${avatar}.png`;
}

export function createProfile(
  name: string,
  avatar: string,
  wordLanguage: WordLanguage = DEFAULT_WORD_LANGUAGE,
): Profile {
  return {
    schemaVersion: PROFILE_SCHEMA_VERSION,
    id: crypto.randomUUID(),
    name,
    avatar,
    wordLanguage,
    totalScore: 0,
    lettersFreed: 0,
    xp: 0,
    coins: 0,
    seenStories: [],
    levelResults: {},
    keyStats: {},
    inventory: starterInventory(avatar),
    equipped: {},
    arena: emptyArenaRecord(),
    counters: emptyCounters(),
  };
}

export function isWordLanguage(value: unknown): value is WordLanguage {
  return WORD_LANGUAGES.some((language) => language === value);
}

export function totalStars(profile: Profile): number {
  return Object.values(profile.levelResults).reduce((sum, result) => sum + result.stars, 0);
}
