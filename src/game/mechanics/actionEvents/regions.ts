import { REGIONS, regionOf, type Level } from '../../../course/regions';
import type { MechanicContext } from '../Mechanic';

export const FOREST_REGION_INDEX = 1;

export type UnlockContext = Pick<MechanicContext, 'level' | 'allMechanicsUnlocked'>;

export function regionIndexOf(level: Level): number {
  return REGIONS.indexOf(regionOf(level));
}

export function isForestOrLater(level: Level): boolean {
  return regionIndexOf(level) >= FOREST_REGION_INDEX;
}

export function hasForestMechanics(context: UnlockContext): boolean {
  return context.allMechanicsUnlocked || isForestOrLater(context.level);
}
