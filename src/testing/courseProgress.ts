import type { CourseProgress, LevelResults } from '../course/course';

const PLACEMENT_DATE = '2026-10-16';

export function courseProgress(levelResults: LevelResults = {}, placedIn?: string): CourseProgress {
  const placement = placedIn ? { regionId: placedIn, date: PLACEMENT_DATE } : undefined;
  return { levelResults, arena: placement ? { placement } : {} };
}
