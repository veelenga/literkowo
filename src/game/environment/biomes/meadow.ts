import * as THREE from 'three';
import * as props from '../../props';
import { ARENA, distance, NEAR_STAGE, STAGE, tallPropAllowed, viewWeight } from '../layout';
import { fbm, smoothstep, type Noise2D } from '../noise';
import { plant, shapes } from '../planting';
import type { Rng } from '../random';
import { Occupancy, scatter } from '../scatter';
import type { BiomeContext, Landscape } from '../types';
import { addPebbles, arenaRise, distanceToPath, SWAY, weightIf, windingPath } from './common';

const CELL = 1.2;
const STEP = 0.6;
const PATH_WIDTH = 1.05;
const CHECKER_SHADE = 0.035;
const GOLDEN_BASE = 0.12;
const TREES = 85;
const BIRCH_SHARE = 0.3;
const BUSHES = 45;
const BOULDERS = 16;
const PEBBLES = 10;
const GRASS_TUFTS = 1100;
const FLOWER_COUNT = 340;

const GROUND = {
  grass: new THREE.Color(0x72c443),
  grassLight: new THREE.Color(0xaee05a),
  grassDeep: new THREE.Color(0x46a33c),
  golden: new THREE.Color(0xf2cf55),
  clearing: new THREE.Color(0x8ad957),
  dirt: new THREE.Color(0xd9a467),
  dirtSide: new THREE.Color(0x9a6a3e),
};

const OAK: props.TreePalette = {
  trunk: 0x8a5a33,
  leaves: { top: 0x9be05a, side: 0x5fb945, bottom: 0x3f8a34 },
};
const DEEP_OAK: props.TreePalette = {
  trunk: 0x7a4c2b,
  leaves: { top: 0x7fd052, side: 0x48a33f, bottom: 0x2f7430 },
};
const BIRCH: props.BirchPalette = {
  bark: 0xf6f1e7,
  mark: 0x3b3b40,
  leaves: { top: 0xffe066, side: 0xf4b740, bottom: 0xc98a2e },
};
const BUSH: props.Tones = { top: 0x8bd655, side: 0x52ad42, bottom: 0x347d31 };
const STONE: props.RockPalette = { dark: 0x7d858f, light: 0xb9c0c8, cap: 0x7cc84f };
const FLOWERS: Array<[petal: number, core: number]> = [
  [0xff4f6d, 0xffe066],
  [0xffd23f, 0xff8c2a],
  [0xffffff, 0xffc93c],
  [0x5aa9ff, 0xffffff],
  [0xc77dff, 0xffe066],
];
const STEM = 0x3f9a3a;

interface Meadow {
  hills: Noise2D;
  patches: Noise2D;
  groves: Noise2D;
  bloom: Noise2D;
  pathDistance(x: number, z: number): number;
}

export function meadow(rng: Rng): Landscape {
  const paths = [windingPath(rng, -2.2, 6, 48, 2.4), windingPath(rng, 0.8, 6, 30, 1.6)];
  const land: Meadow = {
    hills: fbm(rng.seed(), 3),
    patches: fbm(rng.seed(), 3),
    groves: fbm(rng.seed(), 2),
    bloom: fbm(rng.seed(), 2),
    pathDistance: (x, z) => Math.min(...paths.map((path) => distanceToPath(path, x, z))),
  };
  return {
    terrain: {
      cell: CELL,
      step: STEP,
      lip: 0.18,
      strata: 0.08,
      height: (x, z) => height(land, x, z),
      surface: (x, z, h) => surface(land, x, z, h),
    },
    decorate: (context) => decorate(context, land),
  };
}

function height(land: Meadow, x: number, z: number): number {
  const rise = arenaRise(x, z, 6);
  if (rise <= 0) return 0;
  const back = smoothstep(-6, -30, z) * 3;
  const base = land.hills(x * 0.06 + 31, z * 0.06 + 17) * 5.2 - 1.5 + back;
  const carve = 1 - smoothstep(PATH_WIDTH * 3.5, PATH_WIDTH, land.pathDistance(x, z)) * 0.85;
  return Math.max(0, base * rise * carve);
}

function surface(land: Meadow, x: number, z: number, h: number) {
  if (land.pathDistance(x, z) < PATH_WIDTH)
    return { top: GROUND.dirt.clone(), side: GROUND.dirtSide };
  const patch = land.patches(x * 0.11, z * 0.11);
  const top = GROUND.grass
    .clone()
    .lerp(GROUND.grassLight, smoothstep(0.55, 0.78, patch))
    .lerp(GROUND.grassDeep, smoothstep(0.42, 0.22, patch))
    .lerp(GROUND.golden, GOLDEN_BASE + Math.min(0.4, h * 0.07));
  if (distance(x, z) < ARENA.clearing) {
    const checker = (Math.floor(x / CELL) + Math.floor(z / CELL)) % 2 === 0 ? 1 : -1;
    top.lerp(GROUND.clearing, 0.55).multiplyScalar(1 + checker * CHECKER_SHADE);
  }
  return { top, side: GROUND.dirtSide };
}

interface Planting {
  context: BiomeContext;
  land: Meadow;
  occupancy: Occupancy;
  offPath(x: number, z: number, margin: number): boolean;
}

function decorate(context: BiomeContext, land: Meadow): void {
  const planting: Planting = {
    context,
    land,
    occupancy: new Occupancy(),
    offPath: (x, z, margin) => land.pathDistance(x, z) > PATH_WIDTH + margin,
  };
  addTrees(planting);
  addBushes(planting);
  addBoulders(planting);
  addPebbles(context, STONE, PEBBLES);
  addGrass(planting);
  addFlowers(planting);
}

function addTrees({ context, land, occupancy, offPath }: Planting): void {
  const { rng, materials } = context;
  const canopy = materials.surface({ sway: SWAY.canopy });
  const grove = (x: number, z: number) => smoothstep(0.4, 0.62, land.groves(x * 0.05, z * 0.05));
  const spots = scatter(
    rng,
    {
      count: TREES,
      region: STAGE,
      spacing: 1.7,
      accept: (x, z) =>
        weightIf(
          tallPropAllowed(x, z, 0.5) && offPath(x, z, 1.6),
          viewWeight(x, z) * (0.35 + 0.65 * grove(x, z)),
        ),
    },
    occupancy,
  );
  const birches = Math.floor(spots.length * BIRCH_SHARE);
  plant(context, {
    models: [
      ...shapes(rng, 2, (r) => props.chunkyTree(r, OAK), canopy),
      ...shapes(rng, 2, (r) => props.chunkyTree(r, DEEP_OAK), canopy),
    ],
    spots: spots.slice(birches),
    scale: [0.85, 1.25],
    turn: 'grid',
    snap: true,
  });
  plant(context, {
    models: shapes(rng, 2, (r) => props.birchTree(r, BIRCH), canopy),
    spots: spots.slice(0, birches),
    scale: [0.9, 1.2],
    turn: 'grid',
    snap: true,
  });
}

function addBushes({ context, occupancy, offPath }: Planting): void {
  const { rng, materials } = context;
  plant(context, {
    models: shapes(
      rng,
      2,
      (r) => props.chunkyBush(r, BUSH),
      materials.surface({ sway: SWAY.canopy }),
    ),
    spots: scatter(
      rng,
      {
        count: BUSHES,
        region: NEAR_STAGE,
        spacing: 0.9,
        accept: (x, z) =>
          weightIf(distance(x, z) > ARENA.walkable + 0.4 && offPath(x, z, 0.6), viewWeight(x, z)),
      },
      occupancy,
    ),
    scale: [0.7, 1.1],
    turn: 'grid',
  });
}

function addBoulders({ context, occupancy, offPath }: Planting): void {
  const { rng, materials } = context;
  plant(context, {
    models: shapes(rng, 2, (r) => props.boulder(r, STONE), materials.surface()),
    spots: scatter(
      rng,
      {
        count: BOULDERS,
        region: NEAR_STAGE,
        spacing: 1.3,
        accept: (x, z) => weightIf(tallPropAllowed(x, z) && offPath(x, z, 1)),
      },
      occupancy,
    ),
    scale: [0.6, 1.4],
    sink: 0.1,
  });
}

function addGrass({ context, offPath }: Planting): void {
  const { rng, materials } = context;
  plant(context, {
    models: shapes(
      rng,
      3,
      (r) => props.grassTuft(r, 0x4fa83a, 0xd8f77c),
      materials.surface({ sway: SWAY.grass }),
      false,
    ),
    spots: scatter(rng, {
      count: GRASS_TUFTS,
      region: NEAR_STAGE,
      accept: (x, z) => weightIf(distance(x, z) > ARENA.clearing + 0.3 && offPath(x, z, 0.1)),
    }),
    scale: [0.8, 1.35],
  });
}

function addFlowers({ context, land, offPath }: Planting): void {
  const { rng, materials } = context;
  const stems = materials.surface({ sway: SWAY.grass });
  plant(context, {
    models: FLOWERS.map(([petal, core]) => [
      { geometry: props.flower(rng.fork(), petal, core, STEM), material: stems },
    ]),
    spots: scatter(rng, {
      count: FLOWER_COUNT,
      region: NEAR_STAGE,
      accept: (x, z) =>
        weightIf(
          distance(x, z) > ARENA.clearing + 0.6 && offPath(x, z, 0.3),
          0.06 + 0.94 * smoothstep(0.5, 0.68, land.bloom(x * 0.14, z * 0.14)),
        ),
    }),
    scale: [0.9, 1.3],
  });
}
