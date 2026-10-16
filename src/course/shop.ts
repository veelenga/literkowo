import type { ArenaGoal } from '../arena/goals';
import { AVATARS, STARTER_SKINS } from '../profiles/Profile';
import { REGIONS, type ThemeId } from './catalog';
import type { CounterId } from './counters';
import type { HatPower, HatPowerKind, PetPower, PetPowerKind } from './powers';
import type { RankId } from './xp';

export const ITEM_KINDS = ['pet', 'hat', 'skin'] as const;

export type ItemKind = (typeof ITEM_KINDS)[number];

export type Unlock =
  | { readonly by: 'free' }
  | { readonly by: 'coins'; readonly price: number }
  | { readonly by: 'rank'; readonly rank: RankId }
  | { readonly by: 'arena'; readonly goal: ArenaGoal };

export interface ShopItem {
  readonly kind: ItemKind;
  readonly id: string;
  readonly unlock: Unlock;
}

export const PET_IDS = [
  'cube-cat',
  'piggy',
  'bee',
  'star',
  'puppy',
  'ghost',
  'penguin',
  'dragon',
  'robot',
  'shadow',
] as const;
export const HAT_IDS = [
  'cap',
  'headphones',
  'horns',
  'halo',
  'beanie',
  'wizard',
  'helmet',
  'pirate',
  'crown',
  'laurel',
] as const;

export type PetId = (typeof PET_IDS)[number];
export type HatId = (typeof HAT_IDS)[number];

export interface PetSpec extends ShopItem {
  readonly kind: 'pet';
  readonly id: PetId;
  readonly color: string;
  readonly power: PetPower;
}

export interface HatSpec extends ShopItem {
  readonly kind: 'hat';
  readonly id: HatId;
  readonly color: string;
  readonly power: HatPower;
}

export type WearableSpec = PetSpec | HatSpec;

export interface SkinSpec extends ShopItem {
  readonly kind: 'skin';
}

export type TrophyRule =
  | { readonly kind: 'firstBoss' }
  | { readonly kind: 'region'; readonly regionId: string }
  | { readonly kind: 'playerLevel'; readonly level: number }
  | { readonly kind: 'masteredRegion' }
  | { readonly kind: 'arenaWave'; readonly wave: number }
  | { readonly kind: 'arenaGold' }
  | { readonly kind: 'stamps'; readonly stamps: number }
  | { readonly kind: 'weekStreak'; readonly weeks: number }
  | { readonly kind: 'starStreak'; readonly levels: number }
  | { readonly kind: 'counter'; readonly counter: CounterId; readonly goal: number }
  | { readonly kind: 'starterSkins' }
  | { readonly kind: 'everyRegionThreeStars' }
  | { readonly kind: 'itemsOwned'; readonly count: number };

export interface Trophy {
  readonly id: string;
  readonly rule: TrophyRule;
  readonly color: string;
}

const FREE: Unlock = { by: 'free' };
const SHADOW_WAVE = 15;

function coins(price: number): Unlock {
  return { by: 'coins', price };
}

function rank(rankId: RankId): Unlock {
  return { by: 'rank', rank: rankId };
}

function arena(goal: ArenaGoal): Unlock {
  return { by: 'arena', goal };
}

function pet(kind: PetPowerKind, strength: number): PetPower {
  return { kind, strength };
}

function hat(kind: HatPowerKind, strength: number): HatPower {
  return { kind, strength };
}

export const PETS: readonly PetSpec[] = [
  { kind: 'pet', id: 'cube-cat', unlock: coins(160), color: '#5ce1ff', power: pet('zap', 1) },
  { kind: 'pet', id: 'piggy', unlock: coins(250), color: '#ff9ec7', power: pet('doubleChest', 1) },
  { kind: 'pet', id: 'bee', unlock: coins(320), color: '#ffc61a', power: pet('popBalloon', 3) },
  {
    kind: 'pet',
    id: 'star',
    unlock: rank('apprentice'),
    color: '#ffe066',
    power: pet('restoreHeart', 1),
  },
  { kind: 'pet', id: 'puppy', unlock: coins(400), color: '#e8b878', power: pet('catchThief', 2) },
  { kind: 'pet', id: 'ghost', unlock: coins(480), color: '#c9b8ff', power: pet('catchGhost', 2) },
  {
    kind: 'pet',
    id: 'penguin',
    unlock: coins(700),
    color: '#7cc8ff',
    power: pet('freezeBoard', 2),
  },
  { kind: 'pet', id: 'dragon', unlock: coins(900), color: '#4ade80', power: pet('catchBat', 2) },
  {
    kind: 'pet',
    id: 'robot',
    unlock: rank('wordGuardian'),
    color: '#9fc3e0',
    power: pet('catchBomber', 1),
  },
  {
    kind: 'pet',
    id: 'shadow',
    unlock: arena({ kind: 'wave', wave: SHADOW_WAVE }),
    color: '#9a8cff',
    power: pet('stopNear', 2),
  },
];

export const HATS: readonly HatSpec[] = [
  { kind: 'hat', id: 'cap', unlock: coins(75), color: '#ff5f7e', power: hat('coins', 0.1) },
  { kind: 'hat', id: 'headphones', unlock: coins(200), color: '#3db4ff', power: hat('xp', 0.05) },
  { kind: 'hat', id: 'horns', unlock: coins(350), color: '#ff7a45', power: hat('solidGhosts', 1) },
  { kind: 'hat', id: 'halo', unlock: coins(600), color: '#ffe08a', power: hat('bossGuard', 1) },
  {
    kind: 'hat',
    id: 'beanie',
    unlock: coins(800),
    color: '#4fd1c5',
    power: hat('longFreeze', 0.5),
  },
  {
    kind: 'hat',
    id: 'wizard',
    unlock: rank('letterHunter'),
    color: '#7c5cff',
    power: hat('xp', 0.1),
  },
  { kind: 'hat', id: 'helmet', unlock: coins(1100), color: '#c9d4ea', power: hat('defuse', 1) },
  { kind: 'hat', id: 'pirate', unlock: coins(1500), color: '#ffcf5a', power: hat('coins', 0.2) },
  {
    kind: 'hat',
    id: 'crown',
    unlock: rank('legend'),
    color: '#ffbe2e',
    power: hat('coins', 0.25),
  },
  {
    kind: 'hat',
    id: 'laurel',
    unlock: arena({ kind: 'gold' }),
    color: '#7dd56f',
    power: hat('feverSlip', 1),
  },
];

const LOCKED_SKINS: Readonly<Record<string, Unlock>> = {
  g: coins(200),
  h: coins(250),
  i: coins(300),
  j: rank('apprentice'),
  k: coins(400),
  l: coins(500),
  m: rank('letterHunter'),
  n: coins(650),
  o: coins(800),
  p: rank('wordGuardian'),
  q: coins(1200),
  r: rank('keyboardMaster'),
};

export const SKINS: readonly SkinSpec[] = AVATARS.map((id) => ({
  kind: 'skin',
  id,
  unlock: STARTER_SKINS.includes(id) ? FREE : (LOCKED_SKINS[id] ?? FREE),
}));

export const SHOP_ITEMS: readonly ShopItem[] = [...PETS, ...HATS, ...SKINS];

const REGION_TROPHY_COLORS: Readonly<Record<ThemeId, string>> = {
  meadow: '#7dd56f',
  forest: '#2fbf71',
  mountains: '#8fb8de',
  cave: '#b98cff',
  island: '#3db4ff',
};

const PLAYER_LEVEL_TROPHIES = [
  { level: 10, color: '#d98c4a' },
  { level: 25, color: '#c9d2e3' },
  { level: 50, color: '#ffbe2e' },
] as const;

const ARENA_WAVE_TROPHIES = [
  { wave: 10, color: '#7c5cff' },
  { wave: 20, color: '#5ce1ff' },
] as const;

const STAMP_TROPHIES = [
  { stamps: 7, color: '#7cf5a8' },
  { stamps: 30, color: '#3ee07a' },
] as const;

const WEEK_STREAK_TROPHY = { weeks: 4, color: '#ffc63a' } as const;

const STAR_STREAK_LEVELS = 5;

const COUNTER_TROPHIES: readonly { counter: CounterId; goal: number; color: string }[] = [
  { counter: 'perfectLevels', goal: 1, color: '#3ee07a' },
  { counter: 'bestWpm', goal: 20, color: '#d98c4a' },
  { counter: 'bestWpm', goal: 30, color: '#c9d2e3' },
  { counter: 'bestWpm', goal: 40, color: '#ffbe2e' },
  { counter: 'wordsTyped', goal: 500, color: '#5ce1ff' },
  { counter: 'wordsTyped', goal: 2000, color: '#3db4ff' },
  { counter: 'wordsTyped', goal: 5000, color: '#7c5cff' },
  { counter: 'bossesBeaten', goal: 10, color: '#ff3d5f' },
  { counter: 'powerWords', goal: 50, color: '#ffc53d' },
  { counter: 'specialEnemies', goal: 100, color: '#b98cff' },
  { counter: 'coinsEarned', goal: 1000, color: '#ffd447' },
];

const COUNTER_TROPHY_IDS: Readonly<Record<CounterId, string>> = {
  perfectLevels: 'perfect-level',
  bestWpm: 'wpm',
  wordsTyped: 'words',
  bossesBeaten: 'bosses',
  powerWords: 'power-words',
  specialEnemies: 'special-enemies',
  coinsEarned: 'coins',
};

const ITEM_TROPHIES = [
  { id: 'first-item', count: 1, color: '#7cf5a8' },
  { id: 'five-items', count: 5, color: '#4ade80' },
] as const;

function counterTrophyId(counter: CounterId, goal: number): string {
  const id = COUNTER_TROPHY_IDS[counter];
  return goal > 1 ? `${id}-${goal}` : id;
}

export const TROPHIES: readonly Trophy[] = [
  { id: 'first-boss', rule: { kind: 'firstBoss' }, color: '#ff3d5f' },
  ...REGIONS.map((region) => ({
    id: `region-${region.id}`,
    rule: { kind: 'region', regionId: region.id } as const,
    color: REGION_TROPHY_COLORS[region.theme],
  })),
  ...PLAYER_LEVEL_TROPHIES.map(({ level, color }) => ({
    id: `level-${level}`,
    rule: { kind: 'playerLevel', level } as const,
    color,
  })),
  { id: 'mastered-region', rule: { kind: 'masteredRegion' }, color: '#3ee07a' },
  ...ARENA_WAVE_TROPHIES.map(({ wave, color }) => ({
    id: `arena-wave-${wave}`,
    rule: { kind: 'arenaWave', wave } as const,
    color,
  })),
  { id: 'arena-gold', rule: { kind: 'arenaGold' }, color: '#ffd23f' },
  ...STAMP_TROPHIES.map(({ stamps, color }) => ({
    id: `stamps-${stamps}`,
    rule: { kind: 'stamps', stamps } as const,
    color,
  })),
  {
    id: `week-streak-${WEEK_STREAK_TROPHY.weeks}`,
    rule: { kind: 'weekStreak', weeks: WEEK_STREAK_TROPHY.weeks },
    color: WEEK_STREAK_TROPHY.color,
  },
  {
    id: `star-streak-${STAR_STREAK_LEVELS}`,
    rule: { kind: 'starStreak', levels: STAR_STREAK_LEVELS },
    color: '#ffe066',
  },
  { id: 'every-region-three-stars', rule: { kind: 'everyRegionThreeStars' }, color: '#ffbe2e' },
  ...COUNTER_TROPHIES.map(({ counter, goal, color }) => ({
    id: counterTrophyId(counter, goal),
    rule: { kind: 'counter', counter, goal } as const,
    color,
  })),
  { id: 'starter-skins', rule: { kind: 'starterSkins' }, color: '#ff7ad9' },
  ...ITEM_TROPHIES.map(({ id, count, color }) => ({
    id,
    rule: { kind: 'itemsOwned', count } as const,
    color,
  })),
];

export function itemsOf(kind: ItemKind): readonly ShopItem[] {
  return SHOP_ITEMS.filter((item) => item.kind === kind);
}

export function findItem(kind: ItemKind, id: string | undefined): ShopItem | undefined {
  return SHOP_ITEMS.find((item) => item.kind === kind && item.id === id);
}

export function petSpec(id: string | undefined): PetSpec | undefined {
  return PETS.find((pet) => pet.id === id);
}

export function hatSpec(id: string | undefined): HatSpec | undefined {
  return HATS.find((hat) => hat.id === id);
}

export function wearableSpec(item: ShopItem): WearableSpec | undefined {
  if (item.kind === 'pet') return petSpec(item.id);
  if (item.kind === 'hat') return hatSpec(item.id);
  return undefined;
}

export function skinSpec(id: string): SkinSpec | undefined {
  return SKINS.find((skin) => skin.id === id);
}

export function priceOf(item: ShopItem): number {
  return item.unlock.by === 'coins' ? item.unlock.price : 0;
}

export function itemKey(item: Pick<ShopItem, 'kind' | 'id'>): string {
  return `${item.kind}:${item.id}`;
}
