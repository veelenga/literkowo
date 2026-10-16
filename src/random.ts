import { uniformFloat64 } from 'pure-rand/distribution/uniformFloat64';
import { mersenne } from 'pure-rand/generator/mersenne';

export type SeedPart = string | number;

export interface RandomSource {
  next(): number;
  int(maxExclusive: number): number;
  pick<T>(items: readonly T[]): T;
  shuffle<T>(items: readonly T[]): T[];
  stream(...labels: readonly SeedPart[]): RandomSource;
}

type Derive = (labels: readonly SeedPart[]) => RandomSource;

const FNV_OFFSET = 2166136261;
const FNV_PRIME = 16777619;
const PART_SEPARATOR = '|';

class DrawnRandom implements RandomSource {
  constructor(
    private readonly draw: () => number,
    private readonly derive: Derive,
  ) {}

  next(): number {
    return this.draw();
  }

  int(maxExclusive: number): number {
    return Math.floor(this.next() * maxExclusive);
  }

  pick<T>(items: readonly T[]): T {
    return items[this.int(items.length)];
  }

  shuffle<T>(items: readonly T[]): T[] {
    const shuffled = [...items];
    for (let index = shuffled.length - 1; index > 0; index -= 1) {
      const swap = this.int(index + 1);
      [shuffled[index], shuffled[swap]] = [shuffled[swap], shuffled[index]];
    }
    return shuffled;
  }

  stream(...labels: readonly SeedPart[]): RandomSource {
    return this.derive(labels);
  }
}

export function seededRandom(seed: number): RandomSource {
  const generator = mersenne(seed);
  return new DrawnRandom(
    () => uniformFloat64(generator),
    (labels) => seededRandom(hashSeed([seed, ...labels])),
  );
}

export function randomFrom(draw: () => number): RandomSource {
  const source: RandomSource = new DrawnRandom(draw, () => source);
  return source;
}

const SYSTEM_RANDOM = randomFrom(() => Math.random());

export function systemRandom(): RandomSource {
  return SYSTEM_RANDOM;
}

export function hashSeed(parts: readonly SeedPart[]): number {
  let hash = FNV_OFFSET;
  for (const character of parts.join(PART_SEPARATOR)) {
    hash = Math.imul(hash ^ character.charCodeAt(0), FNV_PRIME);
  }
  return hash >>> 0;
}
