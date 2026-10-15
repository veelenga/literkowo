import { describe, expect, it } from 'vitest';
import { planFor } from '../game/LevelPlan';
import { AVATARS, STARTER_SKINS } from '../profiles/Profile';
import { levelCoins } from './coins';
import { courseFor } from './course';
import { HATS, PETS, SHOP_ITEMS, SKINS, TROPHIES, itemKey, priceOf, type ShopItem } from './shop';

const TYPICAL_STARS = 2;
const STAR_RANGE = [1, 2, 3];
const FIRST_PET_LEVELS = { min: 4, max: 6 };

function coinsPerLevel(stars: number): number[] {
  return courseFor('pl').levels.map((level) => {
    const words = planFor(level).reduce((sum, phase) => sum + phase.count, 0);
    return levelCoins({ runCoins: words, won: true, stars });
  });
}

function levelsToAfford(price: number, stars: number): number {
  let saved = 0;
  let levels = 0;
  const course = coinsPerLevel(stars);
  while (saved < price) {
    saved += course[levels % course.length];
    levels += 1;
  }
  return levels;
}

function cheapest(items: readonly ShopItem[]): number {
  return Math.min(...items.filter((item) => item.unlock.by === 'coins').map(priceOf));
}

describe('shop catalogue', () => {
  it('has six pets, six hats and a skin for every character', () => {
    expect(PETS).toHaveLength(6);
    expect(HATS).toHaveLength(6);
    expect(SKINS.map((skin) => skin.id)).toEqual(AVATARS);
  });

  it('gives every item a unique key', () => {
    const keys = SHOP_ITEMS.map(itemKey);
    expect(new Set(keys).size).toBe(keys.length);
  });

  it('keeps the starter skins free and locks every other skin', () => {
    for (const skin of SKINS) {
      expect(skin.unlock.by === 'free').toBe(STARTER_SKINS.includes(skin.id));
    }
  });

  it('unlocks some items by rank in every kind', () => {
    for (const items of [PETS, HATS, SKINS]) {
      expect(items.some((item) => item.unlock.by === 'rank')).toBe(true);
    }
  });

  it('gives every trophy a unique id', () => {
    const ids = TROPHIES.map((trophy) => trophy.id);
    expect(new Set(ids).size).toBe(ids.length);
  });
});

describe('shop economy', () => {
  it('lets a child afford the first pet in four to six levels', () => {
    for (const stars of STAR_RANGE) {
      const levels = levelsToAfford(cheapest(PETS), stars);
      expect(levels).toBeGreaterThanOrEqual(FIRST_PET_LEVELS.min);
      expect(levels).toBeLessThanOrEqual(FIRST_PET_LEVELS.max);
    }
  });

  it('makes the first hat come before the first pet', () => {
    expect(levelsToAfford(cheapest(HATS), TYPICAL_STARS)).toBeLessThan(
      levelsToAfford(cheapest(PETS), TYPICAL_STARS),
    );
  });

  it('keeps the most expensive skin beyond the first region', () => {
    const priciest = Math.max(...SKINS.map(priceOf));
    const [firstRegion] = courseFor('pl').regions;
    expect(levelsToAfford(priciest, TYPICAL_STARS)).toBeGreaterThan(firstRegion.levels.length);
  });
});
