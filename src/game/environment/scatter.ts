import type { Rng } from './random';

export interface Region {
  minX: number;
  maxX: number;
  minZ: number;
  maxZ: number;
}

export interface Spot {
  x: number;
  z: number;
}

export interface ScatterOptions {
  count: number;
  region: Region;
  spacing?: number;
  accept?: (x: number, z: number) => number;
}

interface Footprint extends Spot {
  radius: number;
}

const ATTEMPTS_PER_SPOT = 24;
const DEFAULT_CELL = 2;

export class Occupancy {
  private readonly cells = new Map<string, Footprint[]>();
  private largest = 0;

  constructor(private readonly cellSize = DEFAULT_CELL) {}

  fits(x: number, z: number, radius: number): boolean {
    const reach = Math.ceil((radius + this.largest) / this.cellSize);
    const ci = Math.floor(x / this.cellSize);
    const cj = Math.floor(z / this.cellSize);
    for (let i = ci - reach; i <= ci + reach; i += 1) {
      for (let j = cj - reach; j <= cj + reach; j += 1) {
        const blocked = this.cells
          .get(`${i}:${j}`)
          ?.some((other) => Math.hypot(other.x - x, other.z - z) < other.radius + radius);
        if (blocked) return false;
      }
    }
    return true;
  }

  reserve(x: number, z: number, radius: number): void {
    const key = `${Math.floor(x / this.cellSize)}:${Math.floor(z / this.cellSize)}`;
    const bucket = this.cells.get(key) ?? [];
    bucket.push({ x, z, radius });
    this.cells.set(key, bucket);
    this.largest = Math.max(this.largest, radius);
  }
}

export function scatter(rng: Rng, options: ScatterOptions, occupancy?: Occupancy): Spot[] {
  const spots: Spot[] = [];
  const { region, spacing = 0 } = options;
  const attempts = options.count * ATTEMPTS_PER_SPOT;
  for (let attempt = 0; attempt < attempts && spots.length < options.count; attempt += 1) {
    const x = rng.range(region.minX, region.maxX);
    const z = rng.range(region.minZ, region.maxZ);
    if (options.accept && !rng.chance(options.accept(x, z))) continue;
    if (occupancy && spacing > 0) {
      if (!occupancy.fits(x, z, spacing)) continue;
      occupancy.reserve(x, z, spacing);
    }
    spots.push({ x, z });
  }
  return spots;
}
