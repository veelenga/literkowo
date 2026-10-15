import { BossPhases } from './BossPhases';
import { Fever } from './Fever';
import type { Mechanic, MechanicContext, MechanicType } from './Mechanic';

const MECHANICS: readonly MechanicType[] = [Fever, BossPhases];

export function createMechanics(context: MechanicContext): Mechanic[] {
  return MECHANICS.map((Type) => new Type(context));
}
