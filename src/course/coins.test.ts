import { describe, expect, it } from 'vitest';
import { boostedCoins, levelCoins } from './coins';
import { MAX_BOOST, NO_BOOST } from './powers';

const NO_HAT = NO_BOOST.coins;

describe('levelCoins', () => {
  it('adds a finishing bonus and coins for each star', () => {
    expect(levelCoins({ runCoins: 12, won: true, stars: 3, coinBoost: NO_HAT })).toBe(37);
    expect(levelCoins({ runCoins: 12, won: true, stars: 0, coinBoost: NO_HAT })).toBe(22);
  });

  it('keeps the coins found during a lost level', () => {
    expect(levelCoins({ runCoins: 7, won: false, stars: 0, coinBoost: NO_HAT })).toBe(7);
  });

  it('scales the whole payout with the coin hat, bonuses included', () => {
    expect(levelCoins({ runCoins: 30, won: true, stars: 3, coinBoost: 1.1 })).toBe(60);
    expect(levelCoins({ runCoins: 30, won: true, stars: 3, coinBoost: 1.2 })).toBe(66);
  });
});

describe('boostedCoins', () => {
  it('rounds down and never goes over the cap or under the plain payout', () => {
    expect(boostedCoins(19, 1.1)).toBe(20);
    expect(boostedCoins(100, 3)).toBe(100 * MAX_BOOST.coins);
    expect(boostedCoins(100, 0.5)).toBe(100);
  });
});
