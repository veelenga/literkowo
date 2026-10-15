import { BossPhases } from './BossPhases';
import { Fever } from './Fever';
import type { Mechanic, MechanicContext, MechanicType } from './Mechanic';
import { MergeEnemies } from './MergeEnemies';

const MECHANICS: readonly MechanicType[] = [Fever, MergeEnemies, BossPhases];

export function createMechanics(context: MechanicContext): Mechanic[] {
  return MECHANICS.map((Type) => new Type(context));
}
