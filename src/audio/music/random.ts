const MULBERRY_INCREMENT = 0x6d2b79f5;
const UINT32_RANGE = 4294967296;

export type RandomSource = () => number;

export function createSeededRandom(seed: number): RandomSource {
  let state = seed >>> 0;
  return () => {
    state = (state + MULBERRY_INCREMENT) >>> 0;
    let value = state;
    value = Math.imul(value ^ (value >>> 15), value | 1);
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
    return ((value ^ (value >>> 14)) >>> 0) / UINT32_RANGE;
  };
}

export function chance(probability: number, random: RandomSource = Math.random): boolean {
  return random() < probability;
}

export function pick<T>(items: readonly T[], random: RandomSource = Math.random): T {
  return items[Math.floor(random() * items.length)];
}

export function between(min: number, max: number, random: RandomSource = Math.random): number {
  return min + random() * (max - min);
}
