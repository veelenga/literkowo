import * as THREE from 'three';
import * as props from '../../props';
import { instances, type Placement } from '../instancing';
import { ARENA, distance, NEAR_STAGE, STAGE, tallPropAllowed, viewWeight } from '../layout';
import { fbm, smoothstep, type Noise2D } from '../noise';
import { plant, shapes, variants, type Model } from '../planting';
import type { Rng } from '../random';
import { Occupancy, scatter, type Spot } from '../scatter';
import type { BiomeContext, Landscape } from '../types';
import {
  addPebbles,
  arenaRise,
  lightPools,
  tints,
  weightIf,
  within,
  type LightPool,
} from './common';

const CELL = 1.2;
const STEP = 1;
const WALL_START = 18.5;
const WALL_END = 25;
const STALACTITE_TOP = 11;
const COLUMN_HEIGHT = 18;
const CRYSTAL_COLORS = [0x14c8a8, 0x9a4dff, 0x2f86ff, 0xff4fc0];
const CRYSTAL_GLOW = { intensity: 1.9, pulse: 0.14, speed: 1.1 };
const CRYSTAL_LIGHT = { intensity: 14, distance: 13, decay: 1.5, height: 2.6 };
const BIG_CRYSTAL_CLEARANCE = 2.4;
const CLUSTER_CLEARANCE = 1;
const CLUSTERS = 22;
const SHARDS = 18;
const STALAGMITES = 80;
const COLUMNS = 7;
const COLUMN_RING = [17, 24] as const;
const STALACTITES = 22;
const STALACTITE_SIZE = 2.2;
const STALACTITE_MAX_Z = -2;
const BIG_CRYSTAL_SPREAD = 3;
const BOULDERS = 18;
const PEBBLES = 16;

interface BigCrystal extends Spot {
  color: number;
  scale: number;
}

const BIG_CRYSTALS: BigCrystal[] = [
  { x: -15.6, z: -6.6, color: 0x14c8a8, scale: 2 },
  { x: 15.3, z: -8.4, color: 0x9a4dff, scale: 2.2 },
  { x: -2.6, z: -16.8, color: 0x2f86ff, scale: 1.9 },
];

const GROUND = {
  floor: new THREE.Color(0x4a5282),
  floorDark: new THREE.Color(0x363d68),
  floorLight: new THREE.Color(0x5f69a2),
  clearing: new THREE.Color(0x6a74b0),
  wall: new THREE.Color(0x2a2e4a),
  wallTop: new THREE.Color(0x3a4064),
};

const STONE = { top: 0x8e98cc, side: 0x6a73a8, band: 0x565e92 };
const DARK_ROCK: props.RockPalette = { dark: 0x2f3452, light: 0x555d85 };

interface Cave {
  floor: Noise2D;
  walls: Noise2D;
  rubble: Noise2D;
  clusters: Spot[];
  pools: LightPool[];
}

export function cave(rng: Rng): Landscape {
  const clusters = scatter(rng.fork(), {
    count: CLUSTERS,
    region: NEAR_STAGE,
    accept: (x, z) =>
      weightIf(
        tallPropAllowed(x, z) &&
          BIG_CRYSTALS.every((big) => Math.hypot(big.x - x, big.z - z) > BIG_CRYSTAL_SPREAD),
        viewWeight(x, z),
      ),
  });
  const pools: LightPool[] = [
    ...BIG_CRYSTALS.map((big) => ({
      ...big,
      radius: 6.5,
      color: new THREE.Color(big.color),
      strength: 0.5,
    })),
    ...clusters.map((spot) => ({
      ...spot,
      radius: 2.4,
      color: new THREE.Color(0x6f7dff),
      strength: 0.22,
    })),
  ];
  const land: Cave = {
    floor: fbm(rng.seed(), 3),
    walls: fbm(rng.seed(), 3),
    rubble: fbm(rng.seed(), 2),
    clusters,
    pools,
  };
  return {
    terrain: {
      cell: CELL,
      step: STEP,
      strata: 0.06,
      variation: 0.07,
      roughness: 0.32,
      metalness: 0.2,
      height: (x, z) => height(land, x, z),
      surface: (x, z, h) => surface(land, x, z, h),
    },
    decorate: (context) => decorate(context, land),
  };
}

function height(land: Cave, x: number, z: number): number {
  const r = distance(x, z);
  const rubble = arenaRise(x, z, 3) * Math.max(0, land.rubble(x * 0.15, z * 0.15) * 2.4 - 1.1);
  const wall = smoothstep(WALL_START, WALL_END, r) * (7 + land.walls(x * 0.08, z * 0.08) * 7);
  return Math.max(rubble, wall);
}

function surface(land: Cave, x: number, z: number, h: number) {
  const tone = land.floor(x * 0.13, z * 0.13);
  const base = GROUND.floor
    .clone()
    .lerp(GROUND.floorLight, smoothstep(0.6, 0.8, tone))
    .lerp(GROUND.floorDark, smoothstep(0.42, 0.2, tone))
    .lerp(
      GROUND.clearing,
      (1 - smoothstep(ARENA.clearing - 2, ARENA.clearing + 1, distance(x, z))) * 0.45,
    )
    .lerp(GROUND.wallTop, smoothstep(1, 4, h));
  return { top: lightPools(base, land.pools, x, z), side: GROUND.wall };
}

function crystalModels(context: BiomeContext, count: number): Model[] {
  const { rng, materials } = context;
  const glow = materials.glow(CRYSTAL_GLOW);
  return variants(rng, count, (r) => {
    const cluster = props.crystalCluster(r, DARK_ROCK);
    return [
      { geometry: cluster.solid, material: materials.surface(), castShadow: true, tinted: false },
      { geometry: cluster.glow, material: glow },
    ];
  });
}

function decorate(context: BiomeContext, land: Cave): void {
  const occupancy = new Occupancy();
  BIG_CRYSTALS.forEach((big) => occupancy.reserve(big.x, big.z, BIG_CRYSTAL_CLEARANCE));
  land.clusters.forEach((spot) => occupancy.reserve(spot.x, spot.z, CLUSTER_CLEARANCE));
  addBigCrystals(context);
  addCrystalClusters(context, land.clusters);
  addStalagmites(context, occupancy);
  addColumns(context, occupancy);
  addStalactites(context);
  addBoulders(context, occupancy);
  addPebbles(context, DARK_ROCK, PEBBLES);
}

function addCrystalClusters(context: BiomeContext, clusters: Spot[]): void {
  const colors = tints(CRYSTAL_COLORS);
  plant(context, {
    models: crystalModels(context, 2),
    spots: clusters,
    scale: [1, 1.6],
    tints: colors,
  });
  plant(context, {
    models: crystalModels(context, 2),
    spots: scatter(context.rng, {
      count: SHARDS,
      region: NEAR_STAGE,
      accept: (x, z) => weightIf(within(ARENA.clearing + 2, ARENA.walkable)(x, z)),
    }),
    scale: [0.3, 0.5],
    tints: colors,
  });
}

function addStalagmites(context: BiomeContext, occupancy: Occupancy): void {
  const { rng, materials } = context;
  plant(context, {
    models: shapes(rng, 3, (r) => props.stalagmite(r, STONE), materials.surface()),
    spots: scatter(
      rng,
      {
        count: STALAGMITES,
        region: NEAR_STAGE,
        spacing: 1.1,
        accept: (x, z) => weightIf(tallPropAllowed(x, z), viewWeight(x, z)),
      },
      occupancy,
    ),
    scale: [0.8, 1.4],
    turn: 'grid',
  });
}

function addColumns(context: BiomeContext, occupancy: Occupancy): void {
  const { rng, materials } = context;
  const ring = within(COLUMN_RING[0], COLUMN_RING[1]);
  plant(context, {
    models: shapes(rng, 2, (r) => props.rockColumn(r, STONE, COLUMN_HEIGHT), materials.surface()),
    spots: scatter(
      rng,
      {
        count: COLUMNS,
        region: STAGE,
        spacing: 3,
        accept: (x, z) => weightIf(ring(x, z) && tallPropAllowed(x, z)),
      },
      occupancy,
    ),
    scale: [1, 1.3],
    stretch: [0.9, 1],
    turn: 'grid',
  });
}

function addBoulders(context: BiomeContext, occupancy: Occupancy): void {
  const { rng, materials } = context;
  plant(context, {
    models: shapes(rng, 2, (r) => props.boulder(r, DARK_ROCK), materials.surface()),
    spots: scatter(
      rng,
      {
        count: BOULDERS,
        region: NEAR_STAGE,
        spacing: 1,
        accept: (x, z) => weightIf(tallPropAllowed(x, z)),
      },
      occupancy,
    ),
    scale: [0.5, 1.2],
    sink: 0.1,
  });
}

function addBigCrystals(context: BiomeContext): void {
  const { rng, materials, terrain } = context;
  const cluster = props.crystalCluster(rng.fork(), DARK_ROCK);
  const placements: Placement[] = BIG_CRYSTALS.map((big) => ({
    x: big.x,
    z: big.z,
    y: terrain.heightAt(big.x, big.z),
    scale: big.scale,
    rotation: rng.angle(),
    tint: new THREE.Color(big.color),
  }));
  context.add(
    instances(cluster.solid, materials.surface(), placements, { castShadow: true, tinted: false }),
  );
  context.add(instances(cluster.glow, materials.glow(CRYSTAL_GLOW), placements));
  BIG_CRYSTALS.forEach((big, index) => {
    const light = new THREE.PointLight(
      big.color,
      CRYSTAL_LIGHT.intensity,
      CRYSTAL_LIGHT.distance,
      CRYSTAL_LIGHT.decay,
    );
    light.position.set(big.x * 0.9, placements[index].y + CRYSTAL_LIGHT.height, big.z * 0.9);
    context.add(light);
    context.animate({
      update: (_delta, elapsed) => {
        light.intensity =
          CRYSTAL_LIGHT.intensity * (1 + 0.12 * Math.sin(elapsed * CRYSTAL_GLOW.speed + index * 2));
      },
    });
  });
}

function addStalactites(context: BiomeContext): void {
  const { rng, materials } = context;
  const ring = within(WALL_START, WALL_END - 1);
  plant(context, {
    models: shapes(
      rng,
      2,
      (r) => props.stalactite(r, STONE, STALACTITE_SIZE),
      materials.surface(),
      false,
    ),
    spots: scatter(rng, {
      count: STALACTITES,
      region: STAGE,
      accept: (x, z) => weightIf(ring(x, z) && z < STALACTITE_MAX_Z),
    }),
    scale: [0.8, 1.3],
    turn: 'grid',
    elevation: () => STALACTITE_TOP,
  });
}
