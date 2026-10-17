import { regionOrder, type Level } from '../../../course/catalog';
import { allowedKeysFor, courseFor } from '../../../course/course';
import type { WordLanguage } from '../../../profiles/Profile';
import type { RandomSource } from '../../../random';
import type { MechanicContext } from '../Mechanic';

export type EnemyKind =
  | 'jumper'
  | 'balloon'
  | 'bat'
  | 'swarm'
  | 'splitter'
  | 'shield'
  | 'ghost'
  | 'chameleon'
  | 'bull'
  | 'nest'
  | 'thief';
export type KindsContext = Pick<MechanicContext, 'level' | 'language' | 'allMechanicsUnlocked'>;

const ENEMY_KINDS: readonly EnemyKind[] = [
  'jumper',
  'balloon',
  'bat',
  'swarm',
  'splitter',
  'shield',
  'ghost',
  'chameleon',
  'bull',
  'nest',
  'thief',
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
  ghost: 2,
  chameleon: 2,
  bull: 2,
  nest: 1,
  thief: 2,
};
export const BONUS_WORDS: Readonly<Record<EnemyKind, number>> = {
  jumper: 0,
  balloon: 1,
  bat: 0,
  swarm: 0,
  splitter: 0,
  shield: 0,
  ghost: 0,
  chameleon: 0,
  bull: 0,
  nest: 0,
  thief: 0,
};
export const KIND_LIMITS: Readonly<Partial<Record<EnemyKind, number>>> = {
  bull: 1,
  nest: 1,
  thief: 1,
};

interface Unlock {
  readonly key: string;
  readonly fallback?: Unlock;
}

const UNLOCKS: Readonly<Record<EnemyKind, Unlock>> = {
  jumper: { key: 's' },
  balloon: { key: 's' },
  bat: { key: 'g' },
  swarm: { key: 't' },
  splitter: { key: 'w' },
  shield: { key: 'v' },
  ghost: { key: 'e' },
  chameleon: { key: 'ą', fallback: { key: 'x' } },
  bull: { key: 'c' },
  nest: { key: 'ł', fallback: { key: 'b' } },
  thief: { key: 'r' },
};
const FIRST_REGION_ORDER = 0;
const FIRST_REGION_CAP = 1;
const LATER_REGION_CAP = 3;

export function unlockedKinds(level: Level, language: WordLanguage): EnemyKind[] {
  const allowed = allowedKeysFor(level, language);
  return ENEMY_KINDS.filter((kind) =>
    allowed.includes(reachableUnlock(UNLOCKS[kind], language).key),
  );
}

export function boardCap(level: Level): number {
  return regionOrder(level.regionId) === FIRST_REGION_ORDER ? FIRST_REGION_CAP : LATER_REGION_CAP;
}

export function availableKinds(context: KindsContext): EnemyKind[] {
  if (context.allMechanicsUnlocked) return [...ENEMY_KINDS];
  return unlockedKinds(context.level, context.language);
}

export function specialCap(context: KindsContext): number {
  return context.allMechanicsUnlocked ? LATER_REGION_CAP : boardCap(context.level);
}

export function rollKind(
  kinds: readonly EnemyKind[],
  random: RandomSource,
  share = SPECIAL_SHARE,
): EnemyKind | undefined {
  const roll = random.next();
  if (kinds.length === 0 || roll >= share) return undefined;
  const total = kinds.reduce((sum, kind) => sum + KIND_WEIGHTS[kind], 0);
  let position = (roll / share) * total;
  for (const kind of kinds) {
    position -= KIND_WEIGHTS[kind];
    if (position < 0) return kind;
  }
  return kinds[kinds.length - 1];
}

export function kindLimit(kind: EnemyKind): number {
  return KIND_LIMITS[kind] ?? Number.POSITIVE_INFINITY;
}

export function randomInt(min: number, max: number, random: RandomSource): number {
  return min + random.int(max - min + 1);
}

function reachableUnlock(unlock: Unlock, language: WordLanguage): Unlock {
  if (isTaught(unlock.key, language) || !unlock.fallback) return unlock;
  return reachableUnlock(unlock.fallback, language);
}

function isTaught(key: string, language: WordLanguage): boolean {
  return courseFor(language).levels.some((level) => level.newKeys.includes(key));
}
