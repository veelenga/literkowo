import { afterEach, describe, expect, it, vi } from 'vitest';
import { hashSeed, randomFrom, seededRandom, systemRandom, type RandomSource } from './random';

const SEED = 20261016;
const OTHER_SEED = 20261017;
const DRAWS = 200;
const ITEMS = ['a', 'b', 'c', 'd', 'e'] as const;
const INT_LIMIT = 7;
const FNV_OF_A = 0xe40c292c;
const CLOSE_SEED_GAP = 0.01;
const MIDDLE = 0.5;
const QUARTER = 0.25;
const UINT32_RANGE = 2 ** 32;

function draws(source: RandomSource, count = DRAWS): number[] {
  return Array.from({ length: count }, () => source.next());
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe('seededRandom', () => {
  it('repeats the same sequence for the same seed', () => {
    expect(draws(seededRandom(SEED))).toEqual(draws(seededRandom(SEED)));
  });

  it('gives a different sequence for a different seed', () => {
    expect(draws(seededRandom(SEED))).not.toEqual(draws(seededRandom(OTHER_SEED)));
  });

  it('starts close seeds far apart', () => {
    const first = seededRandom(1).next();
    const second = seededRandom(2).next();
    expect(Math.abs(first - second)).toBeGreaterThan(CLOSE_SEED_GAP);
  });

  it('draws numbers from zero up to one', () => {
    const values = draws(seededRandom(SEED));
    expect(values.every((value) => value >= 0 && value < 1)).toBe(true);
  });

  it('draws whole numbers below the limit', () => {
    const random = seededRandom(SEED);
    const values = Array.from({ length: DRAWS }, () => random.int(INT_LIMIT));
    expect(
      values.every((value) => Number.isInteger(value) && value >= 0 && value < INT_LIMIT),
    ).toBe(true);
    expect(new Set(values).size).toBe(INT_LIMIT);
  });

  it('picks only from the given items', () => {
    const random = seededRandom(SEED);
    const picked = Array.from({ length: DRAWS }, () => random.pick(ITEMS));
    expect(new Set(picked)).toEqual(new Set(ITEMS));
  });

  it('shuffles into a copy with the same items', () => {
    const items = [...ITEMS];
    const shuffled = seededRandom(SEED).shuffle(items);
    expect(items).toEqual([...ITEMS]);
    expect([...shuffled].sort()).toEqual([...ITEMS]);
  });

  it('shuffles the same way for the same seed', () => {
    expect(seededRandom(SEED).shuffle(ITEMS)).toEqual(seededRandom(SEED).shuffle(ITEMS));
  });
});

describe('streams', () => {
  it('repeat for the same labels', () => {
    const random = seededRandom(SEED);
    expect(draws(random.stream('words', 1))).toEqual(draws(random.stream('words', 1)));
  });

  it('differ between labels', () => {
    const random = seededRandom(SEED);
    expect(draws(random.stream('words', 1))).not.toEqual(draws(random.stream('words', 2)));
    expect(draws(random.stream('words'))).not.toEqual(draws(random.stream('arc')));
  });

  it('do not depend on what the parent drew', () => {
    const fresh = seededRandom(SEED);
    const used = seededRandom(SEED);
    draws(used);
    expect(draws(used.stream('twins'))).toEqual(draws(fresh.stream('twins')));
  });

  it('do not shift the parent sequence', () => {
    const plain = seededRandom(SEED);
    const forked = seededRandom(SEED);
    draws(forked.stream('twins'));
    expect(draws(forked)).toEqual(draws(plain));
  });
});

describe('systemRandom', () => {
  it('draws from Math.random', () => {
    vi.spyOn(Math, 'random').mockReturnValue(MIDDLE);
    expect(systemRandom().next()).toBe(MIDDLE);
    expect(systemRandom().stream('words').int(INT_LIMIT)).toBe(Math.floor(MIDDLE * INT_LIMIT));
  });
});

describe('randomFrom', () => {
  it('draws from the given function in every stream', () => {
    const random = randomFrom(() => QUARTER);
    expect(random.next()).toBe(QUARTER);
    expect(random.stream('twins').pick(ITEMS)).toBe(ITEMS[Math.floor(QUARTER * ITEMS.length)]);
  });
});

describe('hashSeed', () => {
  it('is FNV-1a over the parts', () => {
    expect(hashSeed(['a'])).toBe(FNV_OF_A);
  });

  it('is stable for the same parts', () => {
    expect(hashSeed(['2026-10-16', 'las'])).toBe(hashSeed(['2026-10-16', 'las']));
  });

  it('changes with any part and with their order', () => {
    const daily = hashSeed(['2026-10-16', 'las']);
    expect(hashSeed(['2026-10-17', 'las'])).not.toBe(daily);
    expect(hashSeed(['2026-10-16', 'gory'])).not.toBe(daily);
    expect(hashSeed(['las', '2026-10-16'])).not.toBe(daily);
  });

  it('gives an unsigned 32 bit number', () => {
    const seed = hashSeed(['2026-10-16', 'las', 3]);
    expect(Number.isInteger(seed) && seed >= 0 && seed < UINT32_RANGE).toBe(true);
  });
});
