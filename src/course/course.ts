import type { LevelResult, WordLanguage } from '../profiles/Profile';
import { regionsFor, type Level, type Region } from './catalog';

export type LevelResults = Readonly<Partial<Record<string, LevelResult>>>;

export interface Course {
  readonly regions: readonly Region[];
  readonly levels: readonly Level[];
  next(level: Level): Level | undefined;
  previous(level: Level): Level | undefined;
  isFirst(level: Level): boolean;
  isUnlocked(level: Level, results: LevelResults): boolean;
  allowedKeys(level: Level): string;
}

class LanguageCourse implements Course {
  readonly regions: readonly Region[];
  readonly levels: readonly Level[];

  constructor(language: WordLanguage) {
    this.regions = regionsFor(language);
    this.levels = this.regions.flatMap((region) => region.levels);
  }

  next(level: Level): Level | undefined {
    const position = this.positionOf(level);
    return position < 0 ? undefined : this.levels.at(position + 1);
  }

  previous(level: Level): Level | undefined {
    const position = this.positionOf(level);
    return position > 0 ? this.levels.at(position - 1) : undefined;
  }

  isFirst(level: Level): boolean {
    return this.positionOf(level) === 0;
  }

  isUnlocked(level: Level, results: LevelResults): boolean {
    if (this.isFirst(level)) return true;
    const previous = this.previous(level);
    return previous !== undefined && (results[previous.id]?.stars ?? 0) > 0;
  }

  allowedKeys(level: Level): string {
    return this.levels
      .filter((candidate) => candidate.order <= level.order)
      .map((candidate) => candidate.newKeys)
      .join('');
  }

  private positionOf(level: Level): number {
    return this.levels.findIndex((candidate) => candidate.id === level.id);
  }
}

const COURSES: Record<WordLanguage, Course> = {
  pl: new LanguageCourse('pl'),
  en: new LanguageCourse('en'),
};

export function courseFor(language: WordLanguage): Course {
  return COURSES[language];
}
