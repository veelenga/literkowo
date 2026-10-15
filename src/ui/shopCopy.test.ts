import { describe, expect, it } from 'vitest';
import { findItem, TROPHIES, type ItemKind, type ShopItem, type Trophy } from '../course/shop';
import { itemDescription, itemName, trophyCopy, unlockHint } from './shopCopy';

function item(kind: ItemKind, id: string): ShopItem {
  const found = findItem(kind, id);
  if (!found) throw new Error(`Missing shop item ${kind} ${id}`);
  return found;
}

function trophy(id: string): Trophy {
  const found = TROPHIES.find((candidate) => candidate.id === id);
  if (!found) throw new Error(`Missing trophy ${id}`);
  return found;
}

describe('shop copy', () => {
  it('names pets and hats from the feature texts', () => {
    expect(itemName(item('pet', 'cube-cat'))).toBe('Kostka');
    expect(itemName(item('hat', 'cap'))).toBe('Czapka z daszkiem');
    expect(itemDescription(item('hat', 'crown'))).toBe('Tylko dla prawdziwych legend.');
  });

  it('numbers skins in roster order and gives them no description', () => {
    expect(itemName(item('skin', 'a'))).toBe('Postać 1');
    expect(itemName(item('skin', 'g'))).toBe('Postać 7');
    expect(itemDescription(item('skin', 'g'))).toBeUndefined();
  });

  it('fills trophy names with the region and the level', () => {
    expect(trophyCopy(trophy('region-las')).name).toBe('Las');
    expect(trophyCopy(trophy('level-25'))).toEqual({
      name: 'Poziom 25',
      hint: 'Zdobądź poziom 25',
    });
    expect(trophyCopy(trophy('first-boss')).name).toBe('Pogromca bossa');
  });

  it('explains how a locked item unlocks', () => {
    expect(unlockHint({ by: 'coins', price: 200 })).toBe('Odblokuj w sklepie. Cena: 200');
    expect(unlockHint({ by: 'rank', rank: 'apprentice' })).toBe('Odblokujesz z rangą Uczeń');
    expect(unlockHint({ by: 'free' })).toBeUndefined();
  });
});
