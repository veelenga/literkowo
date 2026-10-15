import { describe, expect, it } from 'vitest';
import { levelCoins } from './coins';

describe('levelCoins', () => {
  it('adds a finishing bonus and coins for each star', () => {
    expect(levelCoins({ runCoins: 12, won: true, stars: 3 })).toBe(37);
    expect(levelCoins({ runCoins: 12, won: true, stars: 0 })).toBe(22);
  });

  it('keeps the coins found during a lost level', () => {
    expect(levelCoins({ runCoins: 7, won: false, stars: 0 })).toBe(7);
  });
});
