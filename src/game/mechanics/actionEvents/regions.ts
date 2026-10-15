import { REGIONS, regionOf, type Level } from '../../../course/regions';

export const FOREST_REGION_INDEX = 1;

export function regionIndexOf(level: Level): number {
  return REGIONS.indexOf(regionOf(level));
}

export function isForestOrLater(level: Level): boolean {
  return regionIndexOf(level) >= FOREST_REGION_INDEX;
}
