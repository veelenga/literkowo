import { REGIONS } from '../course/catalog';
import { hatSpec, petSpec, type ShopItem, type Trophy, type Unlock } from '../course/shop';
import type { RankId } from '../course/xp';
import { format } from '../i18n/format';
import { i18n } from '../i18n/i18n';
import { AVATARS } from '../profiles/Profile';

interface ItemCopy {
  readonly name: string;
  readonly description?: string;
}

interface TrophyCopy {
  readonly name: string;
  readonly hint: string;
}

const FIRST_NUMBER = 1;

export function itemName(item: ShopItem): string {
  return itemCopy(item).name;
}

export function itemDescription(item: ShopItem): string | undefined {
  return itemCopy(item).description;
}

export function trophyCopy({ rule }: Trophy): TrophyCopy {
  const copy = i18n.t.features.shop.trophies;
  switch (rule.kind) {
    case 'firstBoss':
      return copy.firstBoss;
    case 'masteredRegion':
      return copy.masteredRegion;
    case 'playerLevel':
      return filled(copy.playerLevel, { level: rule.level });
    case 'region':
      return filled(copy.region, { region: regionName(rule.regionId) });
    case 'arenaWave':
      return filled(copy.arenaWave, { wave: rule.wave });
    case 'arenaGold':
      return copy.arenaGold;
  }
}

export function rankTitle(rank: RankId): string {
  return i18n.t.features.progression.ranks[rank];
}

export function unlockHint(unlock: Unlock): string | undefined {
  const copy = i18n.t.features.shop;
  if (unlock.by === 'coins') return format(copy.skinPriceHint, { price: unlock.price });
  if (unlock.by === 'rank') return format(copy.skinRankHint, { rank: rankTitle(unlock.rank) });
  return undefined;
}

function itemCopy(item: ShopItem): ItemCopy {
  const copy = i18n.t.features.shop;
  const pet = item.kind === 'pet' ? petSpec(item.id) : undefined;
  if (pet) return copy.pets[pet.id];
  const hat = item.kind === 'hat' ? hatSpec(item.id) : undefined;
  if (hat) return copy.hats[hat.id];
  return { name: format(copy.skinName, { number: AVATARS.indexOf(item.id) + FIRST_NUMBER }) };
}

function filled(copy: TrophyCopy, values: Readonly<Record<string, string | number>>): TrophyCopy {
  return { name: format(copy.name, values), hint: format(copy.hint, values) };
}

function regionName(regionId: string): string {
  return REGIONS.find((region) => region.id === regionId)?.name[i18n.current] ?? regionId;
}
