export type WordLanguage = 'pl' | 'en';

export interface LevelResult {
  stars: number;
  score: number;
  accuracy: number;
  wpm: number;
}

export interface Profile {
  id: string;
  name: string;
  avatar: string;
  wordLanguage: WordLanguage;
  totalScore: number;
  lettersFreed: number;
  seenStories: string[];
  levelResults: Record<string, LevelResult>;
}

export const AVATARS = 'abcdefghijklmnopqr'.split('');

export function avatarImage(avatar: string): string {
  return `${import.meta.env.BASE_URL}characters/character-${avatar}.png`;
}

export function createProfile(name: string, avatar: string): Profile {
  return {
    id: crypto.randomUUID(),
    name,
    avatar,
    wordLanguage: 'pl',
    totalScore: 0,
    lettersFreed: 0,
    seenStories: [],
    levelResults: {},
  };
}

export function normalizeProfile(raw: Partial<Profile>): Profile {
  return {
    ...createProfile(raw.name ?? '?', raw.avatar ?? AVATARS[0]),
    ...raw,
    avatar: AVATARS.includes(raw.avatar ?? '') ? raw.avatar! : AVATARS[0],
    seenStories: raw.seenStories ?? [],
    levelResults: raw.levelResults ?? {},
    totalScore: raw.totalScore ?? 0,
    lettersFreed: raw.lettersFreed ?? 0,
  } as Profile;
}

export function totalStars(profile: Profile): number {
  return Object.values(profile.levelResults).reduce((sum, result) => sum + result.stars, 0);
}
