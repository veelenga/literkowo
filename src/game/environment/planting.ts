import type * as THREE from 'three';
import { instances, type Placement } from './instancing';
import type { Rng } from './random';
import type { Spot } from './scatter';
import type { BiomeContext } from './types';

export interface ModelPart {
  geometry: THREE.BufferGeometry;
  material: THREE.Material;
  castShadow?: boolean;
  tinted?: boolean;
}

export type Model = ModelPart[];

export interface PlantOptions {
  models: Model[];
  spots: Spot[];
  scale?: [number, number];
  stretch?: [number, number];
  tilt?: number;
  sink?: number;
  tints?: THREE.Color[];
  turn?: 'free' | 'grid';
  orient?: (x: number, z: number) => number;
  elevation?: (x: number, z: number) => number;
  snap?: boolean;
}

const GRID_TURN_JITTER = 0.1;
const QUARTER_TURN = Math.PI / 2;

export function variants(rng: Rng, count: number, build: (rng: Rng) => Model): Model[] {
  return Array.from({ length: count }, () => build(rng.fork()));
}

export function shapes(
  rng: Rng,
  count: number,
  build: (rng: Rng) => THREE.BufferGeometry,
  material: THREE.Material,
  castShadow = true,
): Model[] {
  return variants(rng, count, (variant) => [{ geometry: build(variant), material, castShadow }]);
}

function rotationFor(rng: Rng, options: PlantOptions, x: number, z: number): number {
  const jitter = rng.range(-GRID_TURN_JITTER, GRID_TURN_JITTER);
  if (options.orient) return options.orient(x, z) + jitter * 2;
  if (options.turn === 'grid') return rng.int(0, 3) * QUARTER_TURN + jitter;
  return rng.angle();
}

export function facingAway(x: number, z: number): number {
  return Math.atan2(-z, x);
}

function placementFor(context: BiomeContext, options: PlantOptions, spot: Spot): Placement {
  const { rng, terrain } = context;
  const x = options.snap ? terrain.snap(spot.x) : spot.x;
  const z = options.snap ? terrain.snap(spot.z) : spot.z;
  const [minScale, maxScale] = options.scale ?? [1, 1];
  const [minStretch, maxStretch] = options.stretch ?? [1, 1];
  const tilt = options.tilt ?? 0;
  return {
    x,
    z,
    y: options.elevation ? options.elevation(x, z) : terrain.heightAt(x, z) - (options.sink ?? 0),
    scale: rng.range(minScale, maxScale),
    stretch: rng.range(minStretch, maxStretch),
    rotation: rotationFor(rng, options, x, z),
    tiltX: rng.range(-tilt, tilt),
    tiltZ: rng.range(-tilt, tilt),
    tint: options.tints ? rng.pick(options.tints) : undefined,
  };
}

function thin<T>(items: T[], density: number): T[] {
  return items.filter(
    (_, index) => Math.floor((index + 1) * density) > Math.floor(index * density),
  );
}

export function plant(context: BiomeContext, options: PlantOptions): Placement[] {
  const groups: Placement[][] = options.models.map(() => []);
  const all = options.spots.map((spot) => {
    const placement = placementFor(context, options, spot);
    groups[context.rng.int(0, options.models.length - 1)].push(placement);
    return placement;
  });
  groups.forEach((group, index) => {
    const placements = thin(group, context.detail.props);
    if (placements.length === 0) return;
    options.models[index].forEach((part) =>
      context.add(
        instances(part.geometry, part.material, placements, {
          castShadow: part.castShadow,
          tinted: part.tinted,
        }),
      ),
    );
  });
  return all;
}
