import { isRecord, type RawRecord } from './raw';

const GRADUAL_COURSE_TARGETS: Readonly<Record<string, readonly number[]>> = {
  polana: [2, 7, 12, 17, 19],
  las: [4, 9, 14, 16],
  gory: [4, 9, 14, 16],
  jaskinia: [4, 9, 14, 22, 24],
  wyspa: [7, 14, 22, 24],
};
const NO_TARGET = 0;

type ResultEntry = [levelId: string, result: unknown];

export function gradualCourseResults(value: unknown): RawRecord {
  if (!isRecord(value)) return {};
  const entries = Object.entries(GRADUAL_COURSE_TARGETS).flatMap(([regionId, targets]) =>
    targets.flatMap((target, position) => {
      const result = value[levelId(regionId, position + 1)];
      const previous = position > 0 ? targets[position - 1] : NO_TARGET;
      return result === undefined ? [] : spannedResults(regionId, previous + 1, target, result);
    }),
  );
  return Object.fromEntries(entries);
}

function spannedResults(
  regionId: string,
  first: number,
  target: number,
  result: unknown,
): ResultEntry[] {
  const from = hasStars(result) ? first : target;
  return Array.from({ length: target - from + 1 }, (_, offset) => [
    levelId(regionId, from + offset),
    result,
  ]);
}

function hasStars(result: unknown): boolean {
  return isRecord(result) && typeof result.stars === 'number' && result.stars > 0;
}

function levelId(regionId: string, index: number): string {
  return `${regionId}-${index}`;
}
