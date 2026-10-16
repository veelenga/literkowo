import type { Modifier } from '../game/RunPlan';
import { gradedMedal, gradeOf, MEDALS, nextMedalGoal, type Medal } from './medals';
import { weekdayOf } from './week';

export const DAILY_FORMAT_IDS = [
  'fog',
  'twoMinutes',
  'darkness',
  'longWords',
  'oneHeart',
  'bosses',
  'bigWave',
] as const;

export type DailyFormatId = (typeof DAILY_FORMAT_IDS)[number];

export type DailyRunKind = 'waves' | 'timeAttack' | 'bosses';

export type DailyGrade = 'time' | 'pace';

export interface DailyFormat {
  readonly id: DailyFormatId;
  readonly run: DailyRunKind;
  readonly seconds: number;
  readonly modifiers: readonly Modifier[];
  readonly slower: boolean;
  readonly grade: DailyGrade;
}

export interface DailyRunGrade {
  readonly seconds: number;
  readonly completed: boolean;
  readonly accuracy: number;
  readonly wpm: number;
}

export interface DailyGoal {
  readonly medal: Medal;
  readonly grade: DailyGrade;
  readonly target: number;
  readonly accuracyPercent: number;
}

export const DAILY_SECONDS = 180;
export const TIME_ATTACK_SECONDS = 120;
export const MINUTE_GRADES = [60, 120, 180] as const;
export const PACE_GRADES = [10, 15, 20] as const;

const TOP_GRADE = MEDALS.length - 1;
const NO_MODIFIERS: readonly Modifier[] = [];

const WAVES: Omit<DailyFormat, 'id'> = {
  run: 'waves',
  seconds: DAILY_SECONDS,
  modifiers: NO_MODIFIERS,
  slower: false,
  grade: 'time',
};

export const DAILY_FORMATS: readonly DailyFormat[] = [
  { ...WAVES, id: 'fog', modifiers: ['fog'] },
  {
    ...WAVES,
    id: 'twoMinutes',
    run: 'timeAttack',
    seconds: TIME_ATTACK_SECONDS,
    grade: 'pace',
  },
  { ...WAVES, id: 'darkness', modifiers: ['darkness'] },
  { ...WAVES, id: 'longWords', modifiers: ['longWords'], slower: true },
  { ...WAVES, id: 'oneHeart', modifiers: ['oneHeart'], slower: true },
  { ...WAVES, id: 'bosses', run: 'bosses' },
  { ...WAVES, id: 'bigWave' },
];

export function formatOn(day: string): DailyFormat {
  return formatOnWeekday(weekdayOf(day));
}

export function formatOnWeekday(weekday: number): DailyFormat {
  const format = DAILY_FORMATS.at(weekday);
  if (!format) throw new Error(`No daily format on weekday ${weekday}`);
  return format;
}

export function dailyMedal(format: DailyFormat, run: DailyRunGrade): Medal {
  return gradedMedal(dailyGrade(format, run), run.accuracy);
}

export function nextDailyGoal(format: DailyFormat, medal: Medal): DailyGoal | undefined {
  const goal = nextMedalGoal(medal);
  const target = gradeThresholds(format.grade).at(medal);
  if (!goal || target === undefined) return undefined;
  return { medal: goal.medal, grade: format.grade, target, accuracyPercent: goal.accuracyPercent };
}

function gradeThresholds(grade: DailyGrade): readonly number[] {
  return grade === 'pace' ? PACE_GRADES : MINUTE_GRADES;
}

function dailyGrade(format: DailyFormat, run: DailyRunGrade): number {
  if (format.grade === 'pace') return gradeOf(run.wpm, gradeThresholds(format.grade));
  return run.completed ? TOP_GRADE : gradeOf(run.seconds, gradeThresholds(format.grade));
}
