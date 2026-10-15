import { AVATARS, STARTER_SKINS } from '../profiles/Profile';
import { REGIONS, type ThemeId } from './catalog';
import type { RankId } from './xp';

export const ITEM_KINDS = ['pet', 'hat', 'skin'] as const;

export type ItemKind = (typeof ITEM_KINDS)[number];

export type Unlock =
  | { readonly by: 'free' }
  | { readonly by: 'coins'; readonly price: number }
  | { readonly by: 'rank'; readonly rank: RankId };

export interface ShopItem {
  readonly kind: ItemKind;
  readonly id: string;
  readonly unlock: Unlock;
}

export const PET_IDS = ['cube-cat', 'bee', 'star', 'ghost', 'robot', 'dragon'] as const;
export const HAT_IDS = ['cap', 'headphones', 'horns', 'wizard', 'halo', 'crown'] as const;

export type PetId = (typeof PET_IDS)[number];
export type HatId = (typeof HAT_IDS)[number];

export interface PetSpec extends ShopItem {
  readonly kind: 'pet';
  readonly id: PetId;
  readonly color: string;
}

export interface HatSpec extends ShopItem {
  readonly kind: 'hat';
  readonly id: HatId;
  readonly color: string;
}

export interface SkinSpec extends ShopItem {
  readonly kind: 'skin';
}

export type TrophyRule =
  | { readonly kind: 'firstBoss' }
  | { readonly kind: 'region'; readonly regionId: string }
  | { readonly kind: 'playerLevel'; readonly level: number }
  | { readonly kind: 'masteredRegion' };

export interface Trophy {
  readonly id: string;
  readonly rule: TrophyRule;
  readonly color: string;
}

const FREE: Unlock = { by: 'free' };

function coins(price: number): Unlock {
  return { by: 'coins', price };
}

function rank(rankId: RankId): Unlock {
  return { by: 'rank', rank: rankId };
}

export const PETS: readonly PetSpec[] = [
  { kind: 'pet', id: 'cube-cat', unlock: coins(160), color: '#5ce1ff' },
  { kind: 'pet', id: 'bee', unlock: coins(320), color: '#ffc61a' },
  { kind: 'pet', id: 'star', unlock: rank('apprentice'), color: '#ffe066' },
  { kind: 'pet', id: 'ghost', unlock: coins(480), color: '#c9b8ff' },
  { kind: 'pet', id: 'robot', unlock: rank('wordGuardian'), color: '#9fc3e0' },
  { kind: 'pet', id: 'dragon', unlock: coins(900), color: '#4ade80' },
];

export const HATS: readonly HatSpec[] = [
  { kind: 'hat', id: 'cap', unlock: coins(75), color: '#ff5f7e' },
  { kind: 'hat', id: 'headphones', unlock: coins(200), color: '#3db4ff' },
  { kind: 'hat', id: 'horns', unlock: coins(350), color: '#ff7a45' },
  { kind: 'hat', id: 'wizard', unlock: rank('letterHunter'), color: '#7c5cff' },
  { kind: 'hat', id: 'halo', unlock: coins(600), color: '#ffe08a' },
  { kind: 'hat', id: 'crown', unlock: rank('legend'), color: '#ffbe2e' },
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

export function skinSpec(id: string): SkinSpec | undefined {
  return SKINS.find((skin) => skin.id === id);
}

export function priceOf(item: ShopItem): number {
  return item.unlock.by === 'coins' ? item.unlock.price : 0;
}

export function itemKey(item: Pick<ShopItem, 'kind' | 'id'>): string {
  return `${item.kind}:${item.id}`;
}
