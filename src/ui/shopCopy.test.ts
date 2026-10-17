// @vitest-environment jsdom
import { describe, expect, it } from 'vitest';
import { HAT_POWER_KINDS, PET_POWER_KINDS, type ItemPower } from '../course/powers';
import {
  HATS,
  PETS,
  findItem,
  TROPHIES,
  type ItemKind,
  type ShopItem,
  type Trophy,
} from '../course/shop';
import { i18n } from '../i18n/i18n';
import {
  itemDescription,
  itemName,
  itemPower,
  powerLine,
  trophyCopy,
  unlockHint,
} from './shopCopy';

const PLACEHOLDER = /\{\w+\}/;
const DASHES = /[-–—]/;

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
    expect(trophyCopy(trophy('arena-wave-20'))).toEqual({
      name: 'Fala 20',
      hint: 'Przetrwaj 20 fal na arenie',
    });
    expect(trophyCopy(trophy('arena-gold')).name).toBe('Złoty medal');
    expect(trophyCopy(trophy('stamps-30'))).toEqual({
      name: '30 pieczątek',
      hint: 'Zbierz 30 pieczątek w wyzwaniu dnia',
    });
    expect(trophyCopy(trophy('week-streak-4')).name).toBe('4 tygodnie z rzędu');
  });

  it('explains how a locked item unlocks', () => {
    expect(unlockHint({ by: 'coins', price: 200 })).toBe('Odblokuj w sklepie. Cena: 200');
    expect(unlockHint({ by: 'rank', rank: 'apprentice' })).toBe('Odblokujesz z rangą Uczeń');
    expect(unlockHint({ by: 'free' })).toBeUndefined();
    expect(unlockHint({ by: 'arena', goal: { kind: 'gold' } })).toBe(
      'Zdobądź złoty medal na arenie',
    );
    expect(unlockHint({ by: 'arena', goal: { kind: 'wave', wave: 15 } })).toBe(
      'Przetrwaj 15 fal na arenie',
    );
  });

  it('says what every pet and hat does', () => {
    expect(itemPower(item('pet', 'cube-cat'))).toBe(
      'Raz na poziom łapie najbliższego wroga, gdy bohater jest w opałach',
    );
    expect(itemPower(item('pet', 'dragon'))).toBe(
      'Dwa razy na poziom łapie nietoperza, gdy bohater jest w opałach',
    );
    expect(itemPower(item('pet', 'bee'))).toBe(
      'Trzy razy na poziom przekłuwa balonik, zanim odleci',
    );
    expect(itemPower(item('hat', 'crown'))).toBe('Zbiera o 25% więcej monet');
    expect(itemPower(item('hat', 'headphones'))).toBe('Daje o 5% więcej XP');
    expect(itemPower(item('skin', 'a'))).toBeUndefined();
  });

  it('fills every power line in both languages', () => {
    const powers: ItemPower[] = [...PETS, ...HATS].map((spec) => spec.power);
    const kinds = [...PET_POWER_KINDS, ...HAT_POWER_KINDS];
    const samples = [...powers, ...kinds.map((kind) => ({ kind, strength: 1 }))];
    for (const language of ['pl', 'uk'] as const) {
      i18n.set(language);
      for (const power of samples) {
        const line = powerLine(power);
        expect(line).not.toMatch(PLACEHOLDER);
        expect(line).not.toMatch(DASHES);
      }
    }
    i18n.set('pl');
  });

  it('names the new trophies and their goals', () => {
    expect(trophyCopy(trophy('words-2000'))).toEqual({
      name: '2000 słów',
      hint: 'Napisz razem 2000 słów',
    });
    expect(trophyCopy(trophy('wpm-30')).name).toBe('Tempo 30');
    expect(trophyCopy(trophy('star-streak-5')).hint).toBe(
      'Zdobądź trzy gwiazdki na 5 kolejnych poziomach',
    );
    expect(trophyCopy(trophy('first-item')).name).toBe('Pierwszy zakup');
    expect(trophyCopy(trophy('five-items')).hint).toBe('Miej 5 rzeczy ze sklepu');
  });

  it('fills every trophy name and hint in both languages', () => {
    for (const language of ['pl', 'uk'] as const) {
      i18n.set(language);
      for (const each of TROPHIES) {
        const { name, hint } = trophyCopy(each);
        expect(`${name} ${hint}`).not.toMatch(PLACEHOLDER);
        expect(`${name} ${hint}`).not.toMatch(DASHES);
      }
    }
    i18n.set('pl');
  });
});
