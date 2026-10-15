import { REGIONS, type Level } from '../../../course/regions';

export type EnemyKind = 'jumper' | 'balloon' | 'bat' | 'swarm' | 'splitter' | 'shield';
export type Random = () => number;

const ENEMY_KINDS: readonly EnemyKind[] = [
  'jumper',
  'balloon',
  'bat',
  'swarm',
  'splitter',
  'shield',
];
export const ENEMY_TYPE_TAG = 'enemy-type';
export const SPECIAL_SHARE = 0.25;
export const KIND_WEIGHTS: Readonly<Record<EnemyKind, number>> = {
  jumper: 3,
  balloon: 2,
  bat: 2,
  swarm: 2,
  splitter: 2,
  shield: 2,
};
export const BONUS_WORDS: Readonly<Record<EnemyKind, number>> = {
  jumper: 0,
  balloon: 1,
  bat: 0,
  swarm: 0,
  splitter: 0,
  shield: 0,
};

interface Unlock {
  region: string;
  level: number;
}

const UNLOCKS: Readonly<Record<EnemyKind, Unlock>> = {
  jumper: { region: 'polana', level: 3 },
  balloon: { region: 'polana', level: 3 },
  bat: { region: 'las', level: 1 },
  swarm: { region: 'gory', level: 1 },
  splitter: { region: 'gory', level: 2 },
  shield: { region: 'jaskinia', level: 1 },
};
const FIRST_REGION_CAP = 1;
const LATER_REGION_CAP = 3;

export function unlockedKinds(level: Level): EnemyKind[] {
  return ENEMY_KINDS.filter((kind) => isUnlocked(UNLOCKS[kind], level));
}

export function boardCap(level: Level): number {
  return regionIndex(level.regionId) === 0 ? FIRST_REGION_CAP : LATER_REGION_CAP;
}

export function rollKind(kinds: readonly EnemyKind[], random: Random): EnemyKind | undefined {
  const roll = random();
  if (kinds.length === 0 || roll >= SPECIAL_SHARE) return undefined;
  const total = kinds.reduce((sum, kind) => sum + KIND_WEIGHTS[kind], 0);
  let position = (roll / SPECIAL_SHARE) * total;
  for (const kind of kinds) {
    position -= KIND_WEIGHTS[kind];
    if (position < 0) return kind;
  }
  return kinds[kinds.length - 1];
}

export function randomInt(min: number, max: number, random: Random): number {
  return min + Math.floor(random() * (max - min + 1));
}

function isUnlocked(unlock: Unlock, level: Level): boolean {
  const current = regionIndex(level.regionId);
  const required = regionIndex(unlock.region);
  return current > required || (current === required && level.index >= unlock.level);
}

function regionIndex(regionId: string): number {
  return REGIONS.findIndex((region) => region.id === regionId);
}
