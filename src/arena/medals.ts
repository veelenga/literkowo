import { accuracyPercent, starThresholdPercents } from '../course/scoring';

export const MEDALS = [0, 1, 2, 3] as const;

export type Medal = (typeof MEDALS)[number];

export const NO_MEDAL: Medal = 0;
export const BRONZE: Medal = 1;
export const SILVER: Medal = 2;
export const GOLD: Medal = 3;

export const MEDAL_WAVES = [3, 6, 10] as const;

export interface MedalGoal {
  readonly medal: Medal;
  readonly waves: number;
  readonly accuracyPercent: number;
}

export interface RunGrade {
  readonly wavesCleared: number;
  readonly accuracy: number;
}

export function medalFor({ wavesCleared, accuracy }: RunGrade): Medal {
  return gradedMedal(waveGrade(wavesCleared), accuracy);
}

export function gradedMedal(grade: number, accuracy: number): Medal {
  return toMedal(Math.min(grade, accuracyGrade(accuracy)));
}

export function gradeOf(value: number, thresholds: readonly number[]): number {
  return thresholds.filter((threshold) => value >= threshold).length;
}

export function nextMedalGoal(medal: Medal): MedalGoal | undefined {
  const waves = MEDAL_WAVES.at(medal);
  const percent = starThresholdPercents().at(medal);
  if (waves === undefined || percent === undefined) return undefined;
  return { medal: toMedal(medal + 1), waves, accuracyPercent: percent };
}

export function isMedal(value: unknown): value is Medal {
  return MEDALS.some((medal) => medal === value);
}

function waveGrade(wavesCleared: number): number {
  return gradeOf(wavesCleared, MEDAL_WAVES);
}

function accuracyGrade(accuracy: number): number {
  return gradeOf(accuracyPercent(accuracy), starThresholdPercents());
}

function toMedal(grade: number): Medal {
  return MEDALS.find((medal) => medal === grade) ?? NO_MEDAL;
}
