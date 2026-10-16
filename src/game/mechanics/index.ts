import { ArenaWaves } from './ArenaWaves';
import { Bombers } from './Bombers';
import { BossPhases } from './BossPhases';
import { EnemyTypes } from './EnemyTypes';
import { Fever } from './Fever';
import { HeroStrikes } from './HeroStrikes';
import { ItemPowers } from './ItemPowers';
import type { Mechanic, MechanicContext, MechanicType } from './Mechanic';
import { MergeEnemies } from './MergeEnemies';
import { Modifiers } from './Modifiers';
import { PlacementStages } from './PlacementStages';
import { PowerWords } from './PowerWords';
import { SpeedSurge } from './SpeedSurge';
import { Twins } from './Twins';
import { WaveEvents } from './WaveEvents';

const MECHANICS: readonly MechanicType[] = [
  Fever,
  PowerWords,
  MergeEnemies,
  BossPhases,
  EnemyTypes,
  SpeedSurge,
  Bombers,
  Twins,
  HeroStrikes,
  WaveEvents,
  ItemPowers,
  ArenaWaves,
  PlacementStages,
  Modifiers,
];

export function createMechanics(context: MechanicContext): Mechanic[] {
  return MECHANICS.map((Type) => new Type(context));
}
