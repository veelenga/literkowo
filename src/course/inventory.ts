import { STARTER_SKINS, type Inventory, type Profile } from '../profiles/Profile';
import {
  SHOP_ITEMS,
  itemKey,
  priceOf,
  skinSpec,
  type ItemKind,
  type ShopItem,
  type Unlock,
} from './shop';
import { levelProgress, rankStartLevel, type RankId } from './xp';

export type ItemState =
  'equipped' | 'owned' | 'buyable' | 'claimable' | 'tooExpensive' | 'rankLocked';

export type BuyRefusal = 'owned' | 'tooExpensive' | 'rankLocked';
export type EquipRefusal = 'notOwned';

export type Outcome<Refusal> =
  | { readonly ok: true; readonly profile: Profile }
  | { readonly ok: false; readonly reason: Refusal };

export type WearableKind = Exclude<ItemKind, 'skin'>;

type InventoryList = Exclude<keyof Inventory, 'trophies'>;

const INVENTORY_LISTS: Readonly<Record<ItemKind, InventoryList>> = {
  pet: 'pets',
  hat: 'hats',
  skin: 'skins',
};

const AVAILABLE_STATES: readonly ItemState[] = ['buyable', 'claimable'];

export function ownedIds(inventory: Inventory, kind: ItemKind): readonly string[] {
  return inventory[INVENTORY_LISTS[kind]];
}

export function owns(inventory: Inventory, item: ShopItem): boolean {
  return ownedIds(inventory, item.kind).includes(item.id);
}

export function isEquipped(profile: Profile, item: ShopItem): boolean {
  if (item.kind === 'skin') return profile.avatar === item.id;
  return profile.equipped[item.kind] === item.id;
}

export function itemState(profile: Profile, item: ShopItem): ItemState {
  if (isEquipped(profile, item) && owns(profile.inventory, item)) return 'equipped';
  if (owns(profile.inventory, item)) return 'owned';
  return lockedState(profile, item.unlock);
}

export function hasRank(xp: number, rank: RankId): boolean {
  return levelProgress(xp).level >= rankStartLevel(rank);
}

export function buy(profile: Profile, item: ShopItem): Outcome<BuyRefusal> {
  const state = itemState(profile, item);
  if (state === 'equipped' || state === 'owned') return { ok: false, reason: 'owned' };
  if (state === 'tooExpensive' || state === 'rankLocked') return { ok: false, reason: state };
  return {
    ok: true,
    profile: {
      ...profile,
      coins: profile.coins - priceOf(item),
      inventory: withItem(profile.inventory, item),
    },
  };
}

export function equip(profile: Profile, item: ShopItem): Outcome<EquipRefusal> {
  if (!owns(profile.inventory, item)) return { ok: false, reason: 'notOwned' };
  if (item.kind === 'skin') return { ok: true, profile: { ...profile, avatar: item.id } };
  return {
    ok: true,
    profile: { ...profile, equipped: { ...profile.equipped, [item.kind]: item.id } },
  };
}

export function unequip(profile: Profile, kind: WearableKind): Profile {
  const equipped = { ...profile.equipped };
  delete equipped[kind];
  return { ...profile, equipped };
}

export function availableItems(profile: Profile): ShopItem[] {
  return SHOP_ITEMS.filter((item) => AVAILABLE_STATES.includes(itemState(profile, item)));
}

export function hasNewItems(before: Profile, after: Profile): boolean {
  const earlier = new Set(availableItems(before).map(itemKey));
  return availableItems(after).some((item) => !earlier.has(itemKey(item)));
}

export function isSkinLocked(skin: string, ownedSkins: readonly string[] = STARTER_SKINS): boolean {
  return skinSpec(skin) !== undefined && !ownedSkins.includes(skin);
}

function lockedState(profile: Profile, unlock: Unlock): ItemState {
  switch (unlock.by) {
    case 'free':
      return 'claimable';
    case 'coins':
      return profile.coins >= unlock.price ? 'buyable' : 'tooExpensive';
    case 'rank':
      return hasRank(profile.xp, unlock.rank) ? 'claimable' : 'rankLocked';
  }
}

function withItem(inventory: Inventory, item: ShopItem): Inventory {
  const list = INVENTORY_LISTS[item.kind];
  return { ...inventory, [list]: [...inventory[list], item.id] };
}
