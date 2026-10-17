import { describe, expect, it, vi } from 'vitest';
import { normalizeProfile } from './profileSchema';

const { CHANGED_PRICE } = vi.hoisted(() => ({ CHANGED_PRICE: 9_999 }));

vi.mock(import('../course/shop'), async (importOriginal) => ({
  ...(await importOriginal()),
  priceOf: () => CHANGED_PRICE,
}));

const VERSION_7_PROFILE = {
  schemaVersion: 7,
  id: 'x',
  name: 'A',
  avatar: 'c',
  coins: 40,
  inventory: { pets: ['cube-cat'], hats: ['cap', 'wizard'], skins: ['g'] },
  levelResults: { 'polana-19': { stars: 2, score: 90, accuracy: 0.95, wpm: 18 } },
};

describe('counters migration', () => {
  it('seeds the same counters after a shop price changes', () => {
    const profile = normalizeProfile(VERSION_7_PROFILE);
    expect(profile?.counters).toMatchObject({ bossesBeaten: 1, coinsEarned: 40 + 160 + 75 + 200 });
  });
});
