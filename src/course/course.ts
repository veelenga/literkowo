import type { ArenaRecord } from '../arena/record';
import type { LevelResult, WordLanguage } from '../profiles/Profile';
import { REGIONS, regionsFor, type Level, type LevelKind, type Region } from './catalog';

export type LevelResults = Readonly<Partial<Record<string, LevelResult>>>;

export interface CourseProgress {
  readonly levelResults: LevelResults;
  readonly arena: Pick<ArenaRecord, 'placement'>;
}

export type LockReason = 'window' | 'review' | 'boss';

export const OPEN_AHEAD = 3;

const GATE_KINDS: ReadonlySet<LevelKind> = new Set(['review', 'boss']);
const FIRST_POSITION = 0;
const NOT_FOUND = -1;
const WINDOW_LOCK = 'window';

export interface Course {
  readonly regions: readonly Region[];
  readonly levels: readonly Level[];
  next(level: Level): Level | undefined;
  previous(level: Level): Level | undefined;
  isFirst(level: Level): boolean;
  isUnlocked(level: Level, progress: CourseProgress): boolean;
  isSkipped(level: Level, progress: CourseProgress): boolean;
  current(progress: CourseProgress): Level | undefined;
  lockReason(level: Level, progress: CourseProgress): LockReason | undefined;
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

  isUnlocked(level: Level, progress: CourseProgress): boolean {
    const position = this.positionOf(level);
    return position !== NOT_FOUND && position <= this.lastOpenPosition(progress);
  }

  isSkipped(level: Level, progress: CourseProgress): boolean {
    const position = this.positionOf(level);
    if (position === NOT_FOUND || isWon(level, progress.levelResults)) return false;
    return position <= this.lastPlacedPosition(progress);
  }

  current(progress: CourseProgress): Level | undefined {
    const results = progress.levelResults;
    const open = this.levels.slice(FIRST_POSITION, this.lastOpenPosition(progress) + 1);
    const ahead = open.slice(this.furthestReached(progress) + 1);
    const unwon = (level: Level) => !isWon(level, results);
    return ahead.find(unwon) ?? open.find(unwon);
  }

  allowedKeys(level: Level): string {
    return this.levels
      .filter((candidate) => candidate.order <= level.order)
      .map((candidate) => candidate.newKeys)
      .join('');
  }

  lockReason(level: Level, progress: CourseProgress): LockReason | undefined {
    if (this.isUnlocked(level, progress)) return undefined;
    const isGate = level.kind === 'review' || level.kind === 'boss';
    if (isGate && !this.isGateOpen(level, progress.levelResults)) return level.kind;
    return WINDOW_LOCK;
  }

  private positionOf(level: Level): number {
    return this.levels.findIndex((candidate) => candidate.id === level.id);
  }

  private furthestWon(results: LevelResults): number {
    return this.levels.findLastIndex((level) => isWon(level, results));
  }

  private furthestReached(progress: CourseProgress): number {
    return Math.max(this.furthestWon(progress.levelResults), this.placedStart(progress) - 1);
  }

  private placedStart(progress: CourseProgress): number {
    const last = this.lastPlacedPosition(progress);
    if (last === NOT_FOUND || last < this.levels.length - 1) return last + 1;
    const first = this.placedRegion(progress)?.levels.at(0);
    return first ? this.positionOf(first) : NOT_FOUND;
  }

  private lastPlacedPosition(progress: CourseProgress): number {
    const region = this.placedRegion(progress);
    const last = region?.levels.at(-1);
    return last ? this.positionOf(last) : NOT_FOUND;
  }

  private placedRegion(progress: CourseProgress): Region | undefined {
    const placedId = progress.arena.placement?.regionId;
    const order = REGIONS.findIndex((region) => region.id === placedId);
    if (order === NOT_FOUND) return undefined;
    const covered = new Set(REGIONS.slice(0, order + 1).map((region) => region.id));
    return this.regions.findLast((region) => covered.has(region.id));
  }

  private lastOpenPosition(progress: CourseProgress): number {
    const placedOpen = Math.min(this.lastPlacedPosition(progress) + 1, this.levels.length - 1);
    return Math.max(this.windowEnd(progress.levelResults), placedOpen);
  }

  private windowEnd(results: LevelResults): number {
    const furthest = this.furthestWon(results);
    if (furthest === NOT_FOUND) return FIRST_POSITION;
    const limit = Math.min(furthest + OPEN_AHEAD, this.levels.length - 1);
    for (let position = furthest + 1; position <= limit; position += 1) {
      const level = this.levels[position];
      if (!GATE_KINDS.has(level.kind)) continue;
      return this.isGateOpen(level, results) ? position : position - 1;
    }
    return limit;
  }

  private isGateOpen(gate: Level, results: LevelResults): boolean {
    const before = this.levels.filter(
      (level) => level.regionId === gate.regionId && level.order < gate.order,
    );
    if (gate.kind === 'review') {
      return before
        .filter((level) => level.kind === 'practice')
        .every((level) => isWon(level, results));
    }
    const review = before.findLast((level) => level.kind === 'review');
    return review === undefined || isWon(review, results);
  }
}

function isWon(level: Level, results: LevelResults): boolean {
  return (results[level.id]?.stars ?? 0) > 0;
}

const COURSES: Record<WordLanguage, Course> = {
  pl: new LanguageCourse('pl'),
  en: new LanguageCourse('en'),
};

export function courseFor(language: WordLanguage): Course {
  return COURSES[language];
}
