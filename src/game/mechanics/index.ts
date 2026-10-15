import { Bombers } from './Bombers';
import { BossPhases } from './BossPhases';
import { Companion } from './Companion';
import { EnemyTypes } from './EnemyTypes';
import { Fever } from './Fever';
import { HeroStrikes } from './HeroStrikes';
import type { Mechanic, MechanicContext, MechanicType } from './Mechanic';
import { MergeEnemies } from './MergeEnemies';
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
  Companion,
];

export function createMechanics(context: MechanicContext): Mechanic[] {
  return MECHANICS.map((Type) => new Type(context));
}
