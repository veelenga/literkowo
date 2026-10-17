import * as THREE from 'three';
import {
  AmbientParticles,
  scaleAmbient,
  type AmbientSpec,
  type SpawnSurface,
} from '../../AmbientParticles';
import * as props from '../../props';
import { ARENA, distance, NEAR_STAGE } from '../layout';
import { plant, shapes } from '../planting';
import { scatter } from '../scatter';
import { smoothstep } from '../noise';
import type { Rng } from '../random';
import type { Occupancy, Spot } from '../scatter';
import type { BiomeContext } from '../types';

export interface LightPool extends Spot {
  radius: number;
  color: THREE.Color;
  strength: number;
}

export interface BoulderOptions {
  palette: props.RockPalette;
  capFrom?: number;
  variants: number;
  count: number;
  spacing: number;
  scale: [number, number];
  sink: number;
  accept: (x: number, z: number) => number;
}

const PATH_STEPS = 48;
const PEBBLE_SCALE: [number, number] = [0.18, 0.32];
const PEBBLE_MARGIN = 1.5;
const PEBBLE_SINK = 0.04;

export const SWAY = { tall: 0.005, canopy: 0.012, foliage: 0.06, grass: 0.13 };

export const weightIf = (allowed: boolean, weight = 1): number => (allowed ? weight : 0);

export function within(inner: number, outer: number): (x: number, z: number) => boolean {
  return (x, z) => {
    const radius = distance(x, z);
    return radius > inner && radius < outer;
  };
}

export function addPebbles(
  context: BiomeContext,
  palette: props.RockPalette,
  count: number,
  allowed: (x: number, z: number) => boolean = () => true,
): void {
  const inBand = within(ARENA.clearing + PEBBLE_MARGIN, ARENA.walkable);
  plant(context, {
    models: shapes(
      context.rng,
      2,
      (rng) => props.boulder(rng, palette),
      context.materials.surface(),
    ),
    spots: scatter(context.rng, {
      count,
      region: NEAR_STAGE,
      accept: (x, z) => weightIf(inBand(x, z) && allowed(x, z)),
    }),
    scale: PEBBLE_SCALE,
    sink: PEBBLE_SINK,
  });
}

export function addBoulders(
  context: BiomeContext,
  occupancy: Occupancy,
  options: BoulderOptions,
): void {
  const { rng, materials } = context;
  const { palette, capFrom, variants, count, spacing, accept, scale, sink } = options;
  plant(context, {
    models: shapes(rng, variants, (r) => props.boulder(r, palette, capFrom), materials.surface()),
    spots: scatter(rng, { count, region: NEAR_STAGE, spacing, accept }, occupancy),
    scale,
    sink,
  });
}

export const tints = (hexes: number[]): THREE.Color[] => hexes.map((hex) => new THREE.Color(hex));

export function arenaRise(x: number, z: number, width: number): number {
  return smoothstep(ARENA.walkable, ARENA.walkable + width, distance(x, z));
}

export function windingPath(
  rng: Rng,
  angle: number,
  from: number,
  to: number,
  wiggle: number,
): Spot[] {
  const phase = rng.angle();
  const along = new THREE.Vector2(Math.cos(angle), Math.sin(angle));
  const across = new THREE.Vector2(-along.y, along.x);
  return Array.from({ length: PATH_STEPS + 1 }, (_, step) => {
    const radius = from + ((to - from) * step) / PATH_STEPS;
    const sway = Math.sin(radius * 0.21 + phase) * wiggle * smoothstep(from, from + 6, radius);
    return { x: along.x * radius + across.x * sway, z: along.y * radius + across.y * sway };
  });
}

export function distanceToPath(path: Spot[], x: number, z: number): number {
  let best = Number.POSITIVE_INFINITY;
  for (let k = 1; k < path.length; k += 1) {
    const a = path[k - 1];
    const b = path[k];
    const dx = b.x - a.x;
    const dz = b.z - a.z;
    const t = THREE.MathUtils.clamp(((x - a.x) * dx + (z - a.z) * dz) / (dx * dx + dz * dz), 0, 1);
    best = Math.min(best, Math.hypot(x - (a.x + dx * t), z - (a.z + dz * t)));
  }
  return best;
}

export function lightPools(
  base: THREE.Color,
  pools: LightPool[],
  x: number,
  z: number,
): THREE.Color {
  const lit = base.clone();
  for (const pool of pools) {
    const falloff = 1 - Math.hypot(x - pool.x, z - pool.z) / pool.radius;
    if (falloff > 0) lit.add(pool.color.clone().multiplyScalar(falloff * falloff * pool.strength));
  }
  return lit;
}

export function addParticles(
  context: BiomeContext,
  spec: AmbientSpec,
  surface?: SpawnSurface,
): void {
  const scaled = scaleAmbient(spec, context.detail.particles);
  const particles = new AmbientParticles(scaled, context.rng.fork(), surface);
  context.add(particles.points);
  context.animate(particles);
}

export function towardCenter(x: number, z: number): number {
  return Math.atan2(z, -x);
}
