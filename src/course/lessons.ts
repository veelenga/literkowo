import type { WordLanguage } from '../profiles/Profile';

export interface Lesson {
  id: number;
  title: Record<WordLanguage, string>;
  newKeys: string;
}

const LESSON_STEPS: Array<[string, string, string]> = [
  ['f j', 'F J', 'f j'],
  ['d k', 'D K', 'dk'],
  ['s l', 'S L', 'sl'],
  ['a ;', 'A ;', 'a;'],
  ['g h', 'G H', 'gh'],
  ['e i', 'E I', 'ei'],
  ['r u', 'R U', 'ru'],
  ['t y', 'T Y', 'ty'],
  ['w o', 'W O', 'wo'],
  ['q p', 'Q P', 'qp'],
  ['v m', 'V M', 'vm'],
  ['c n', 'C N', 'cn'],
  ['x z', 'X Z', 'xz'],
  ['b , .', 'B , .', 'b,.'],
  ['ą ę ó', 'Ą Ę Ó', 'ąęó'],
  ['ł ś ć', 'Ł Ś Ć', 'łść'],
  ['ż ź ń', 'Ż Ź Ń', 'żźń'],
];

export const LESSONS: Lesson[] = LESSON_STEPS.map(([pl, en, keys], index) => ({
  id: index + 1,
  title: { pl, en },
  newKeys: keys.replace(/ /g, ''),
}));

export function allowedKeysUpTo(lessonId: number): string {
  return LESSONS.filter((lesson) => lesson.id <= lessonId)
    .map((lesson) => lesson.newKeys)
    .join('');
}

export function lessonById(lessonId: number): Lesson {
  return LESSONS.find((lesson) => lesson.id === lessonId) ?? LESSONS[0];
}
