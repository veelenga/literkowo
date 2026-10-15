export type WordLanguage = 'pl' | 'en';

export interface LessonResult {
  accuracy: number;
  wpm: number;
  score: number;
}

export interface Profile {
  id: string;
  name: string;
  avatar: string;
  wordLanguage: WordLanguage;
  bestScore: number;
  gamesPlayed: number;
  lessonResults: Record<number, LessonResult>;
}

export const AVATARS = ['🦊', '🐺', '🦉', '🐉', '🦄', '🐸', '🐧', '🦋'];

export const LESSON_PASS_ACCURACY = 0.9;

export function createProfile(name: string, avatar: string): Profile {
  return {
    id: crypto.randomUUID(),
    name,
    avatar,
    wordLanguage: 'pl',
    bestScore: 0,
    gamesPlayed: 0,
    lessonResults: {},
  };
}

export function highestUnlockedLesson(profile: Profile): number {
  let lesson = 1;
  while (profile.lessonResults[lesson]?.accuracy >= LESSON_PASS_ACCURACY) lesson += 1;
  return lesson;
}
