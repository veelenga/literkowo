import { describe, expect, it } from 'vitest';
import { GOLD } from '../arena/medals';
import { emptyArenaRecord } from '../arena/record';
import { createProfile, STARTER_SKINS, type Profile } from '../profiles/Profile';
import {
  buy,
  equip,
  hasNewItems,
  isSkinLocked,
  itemState,
  unequip,
  type Outcome,
} from './inventory';
import { findItem, type ItemKind, type ShopItem } from './shop';
import { xpForLevel } from '../testing/xp';

const APPRENTICE_LEVEL = 5;
const LEGEND_LEVEL = 50;

function item(kind: ItemKind, id: string): ShopItem {
  const found = findItem(kind, id);
  if (!found) throw new Error(`Missing shop item ${kind} ${id}`);
  return found;
}

function profileWith(changes: Partial<Profile> = {}): Profile {
  return { ...createProfile('Ola', 'a'), ...changes };
}

function accepted<Refusal>(outcome: Outcome<Refusal>): Profile {
  if (!outcome.ok) throw new Error(`Refused: ${String(outcome.reason)}`);
  return outcome.profile;
}

const CAT = item('pet', 'cube-cat');
const STAR = item('pet', 'star');
const CAP = item('hat', 'cap');
const CROWN = item('hat', 'crown');
const SKIN_G = item('skin', 'g');

describe('buy', () => {
  it('spends coins and adds the item', () => {
    const profile = accepted(buy(profileWith({ coins: 200 }), CAT));
    expect(profile.coins).toBe(40);
    expect(profile.inventory.pets).toEqual(['cube-cat']);
  });

  it('cannot buy the same item twice', () => {
    const profile = accepted(buy(profileWith({ coins: 400 }), CAT));
    expect(buy(profile, CAT)).toEqual({ ok: false, reason: 'owned' });
  });

  it('cannot buy an item the profile cannot afford', () => {
    expect(buy(profileWith({ coins: 159 }), CAT)).toEqual({ ok: false, reason: 'tooExpensive' });
  });

  it('keeps rank items locked until the rank is reached', () => {
    const chick = profileWith({ coins: 5000 });
    expect(buy(chick, STAR)).toEqual({ ok: false, reason: 'rankLocked' });
    const apprentice = profileWith({ xp: xpForLevel(APPRENTICE_LEVEL) });
    const claimed = accepted(buy(apprentice, STAR));
    expect(claimed.inventory.pets).toEqual(['star']);
    expect(claimed.coins).toBe(0);
  });

  it('adds a bought skin to the skins', () => {
    const profile = accepted(buy(profileWith({ coins: 200 }), SKIN_G));
    expect(profile.inventory.skins).toContain('g');
  });
});

describe('equip', () => {
  it('equips only owned items', () => {
    expect(equip(profileWith(), CAP)).toEqual({ ok: false, reason: 'notOwned' });
    const owner = accepted(buy(profileWith({ coins: 75 }), CAP));
    expect(accepted(equip(owner, CAP)).equipped).toEqual({ hat: 'cap' });
  });

  it('changes the avatar when a skin is equipped', () => {
    expect(equip(profileWith(), SKIN_G).ok).toBe(false);
    expect(accepted(equip(profileWith(), item('skin', 'c'))).avatar).toBe('c');
  });

  it('takes a pet or a hat off', () => {
    const owner = accepted(buy(profileWith({ coins: 160 }), CAT));
    const wearing = accepted(equip(owner, CAT));
    expect(unequip(wearing, 'pet').equipped).toEqual({});
  });
});

describe('itemState', () => {
  it('describes every step from locked to equipped', () => {
    const poor = profileWith({ coins: 10 });
    expect(itemState(poor, CAP)).toBe('tooExpensive');
    expect(itemState(poor, CROWN)).toBe('rankLocked');
    const rich = profileWith({ coins: 75 });
    expect(itemState(rich, CAP)).toBe('buyable');
    const owner = accepted(buy(rich, CAP));
    expect(itemState(owner, CAP)).toBe('owned');
    expect(itemState(accepted(equip(owner, CAP)), CAP)).toBe('equipped');
    expect(itemState(profileWith({ xp: xpForLevel(LEGEND_LEVEL) }), CROWN)).toBe('claimable');
  });
});

describe('arena items', () => {
  const LAUREL_LIKE: ShopItem = {
    kind: 'hat',
    id: 'cap',
    unlock: { by: 'arena', goal: { kind: 'gold' } },
  };
  const best = { wave: 15, score: 1, accuracy: 0.97, medal: GOLD, date: '2026-10-15', runs: 1 };

  it('stays locked until the arena goal is reached and then is claimed for free', () => {
    const poor = profileWith({ coins: 5000 });
    expect(itemState(poor, LAUREL_LIKE)).toBe('arenaLocked');
    expect(buy(poor, LAUREL_LIKE)).toEqual({ ok: false, reason: 'arenaLocked' });

    const arena = { ...emptyArenaRecord(), endless: { 'las/normal': best } };
    const champion = profileWith({ arena });
    expect(itemState(champion, LAUREL_LIKE)).toBe('claimable');
    expect(accepted(buy(champion, LAUREL_LIKE)).coins).toBe(0);
  });
});

describe('hasNewItems', () => {
  it('spots an item that just became affordable', () => {
    expect(hasNewItems(profileWith({ coins: 50 }), profileWith({ coins: 80 }))).toBe(true);
    expect(hasNewItems(profileWith({ coins: 80 }), profileWith({ coins: 90 }))).toBe(false);
  });

  it('spots an item unlocked by a new rank', () => {
    const before = profileWith({ xp: xpForLevel(APPRENTICE_LEVEL) - 1 });
    expect(hasNewItems(before, profileWith({ xp: xpForLevel(APPRENTICE_LEVEL) }))).toBe(true);
  });

  it('leaves trophies to the trophy note', () => {
    const before = profileWith();
    const after = profileWith({
      inventory: { ...before.inventory, trophies: ['first-boss'] },
    });
    expect(hasNewItems(before, after)).toBe(false);
  });
});

describe('isSkinLocked', () => {
  it('locks every skin a new profile does not own', () => {
    expect(STARTER_SKINS.some((skin) => isSkinLocked(skin))).toBe(false);
    expect(isSkinLocked('g')).toBe(true);
    expect(isSkinLocked('g', [...STARTER_SKINS, 'g'])).toBe(false);
  });
});
