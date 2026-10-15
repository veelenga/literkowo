import type { KeyStat } from '../course/keyStats';

export const WORD_LANGUAGES = ['pl', 'en'] as const;

export type WordLanguage = (typeof WORD_LANGUAGES)[number];

export const DEFAULT_WORD_LANGUAGE: WordLanguage = 'pl';

export const PROFILE_SCHEMA_VERSION = 4;

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
}

export const AVATARS = 'abcdefghijklmnopqr'.split('');

export function avatarImage(avatar: string): string {
  return `${import.meta.env.BASE_URL}characters/character-${avatar}.png`;
}

export function createProfile(name: string, avatar: string): Profile {
  return {
    schemaVersion: PROFILE_SCHEMA_VERSION,
    id: crypto.randomUUID(),
    name,
    avatar,
    wordLanguage: DEFAULT_WORD_LANGUAGE,
    totalScore: 0,
    lettersFreed: 0,
    xp: 0,
    coins: 0,
    seenStories: [],
    levelResults: {},
    keyStats: {},
  };
}

export function isWordLanguage(value: unknown): value is WordLanguage {
  return WORD_LANGUAGES.some((language) => language === value);
}

export function totalStars(profile: Profile): number {
  return Object.values(profile.levelResults).reduce((sum, result) => sum + result.stars, 0);
}
