import * as THREE from 'three';
import * as props from '../../props';
import { instances, type Placement } from '../instancing';
import { ARENA, distance, NEAR_STAGE, STAGE, tallPropAllowed, viewWeight } from '../layout';
import { LightShafts } from '../LightShafts';
import { Mist } from '../Mist';
import { fbm, smoothstep, type Noise2D } from '../noise';
import { plant, shapes, variants } from '../planting';
import type { Rng } from '../random';
import { Occupancy, scatter, type Spot } from '../scatter';
import type { BiomeContext, Landscape } from '../types';
import {
  addBoulders,
  arenaRise,
  lightPools,
  SWAY,
  tints,
  towardCenter,
  weightIf,
  type BoulderOptions,
  type LightPool,
} from './common';

const CELL = 1.2;
const STEP = 0.5;
const LANTERN_GLOW = 0xffa64d;
const MOONLIGHT = 0x8fb8ff;
const MUSHROOM_GLOW = [0x18b8ff, 0x9a4dff, 0x1fe0a0, 0xff4fc8];
const LANTERN_LIGHT = { color: 0xffa040, intensity: 16, distance: 11, decay: 1.6, height: 1.6 };
const LIT_LANTERNS = 2;
const FLICKER = { amount: 0.08, speed: 9 };
const LANTERN_CLEARANCE = 1.2;
const PINES = 190;
const SAPLINGS = 26;
const FERNS = 170;
const GRASS_TUFTS = 420;
const LOGS = 6;
const STUMPS = 9;
const MUSHROOMS = 46;
const SHAFTS = 5;
const SHAFT_MAX_Z = 2;
const TALL_PINE: props.PineShape = { tiers: [4, 6], height: [5, 7.5], width: [1.4, 1.8] };
const GIANT_PINE: props.PineShape = { tiers: [5, 6], height: [6.5, 8.5], width: [1.5, 1.9] };
const SAPLING: props.PineShape = { tiers: [3, 4], height: [2.2, 3], width: [0.9, 1.1] };

const LANTERNS: Spot[] = [
  { x: -15.4, z: -3.6 },
  { x: 15.2, z: -5.6 },
  { x: -8.6, z: -13.6 },
  { x: 9.4, z: -13.2 },
];

const GROUND = {
  moss: new THREE.Color(0x2f7a5e),
  mossLight: new THREE.Color(0x3f9470),
  mossDeep: new THREE.Color(0x1d5a4c),
  needles: new THREE.Color(0x6b5a48),
  clearing: new THREE.Color(0x3f8f6e),
  soil: new THREE.Color(0x3d2c25),
};

const PINE: props.PinePalette = {
  trunk: 0x6b4428,
  needles: { top: 0x2f9470, side: 0x1b6b58, bottom: 0x10433c },
};
const DARK_PINE: props.PinePalette = {
  trunk: 0x5a3820,
  needles: { top: 0x267f68, side: 0x165a50, bottom: 0x0c3834 },
};
const FERN: props.Tones = { top: 0x4fbf7a, side: 0x2a8a5e };
const WOOD: props.WoodPalette = { bark: 0x6b4a2e, wood: 0xd9a96a, moss: 0x4fb35a };
const MOSSY_ROCK: props.RockPalette = { dark: 0x56606b, light: 0x8d98a6, cap: 0x4fb35a };
const BOULDERS: BoulderOptions = {
  palette: MOSSY_ROCK,
  variants: 2,
  count: 12,
  spacing: 1.2,
  scale: [0.5, 1.2],
  sink: 0.1,
  accept: (x, z) => weightIf(tallPropAllowed(x, z)),
};

interface Forest {
  hummocks: Noise2D;
  patches: Noise2D;
  needles: Noise2D;
  groves: Noise2D;
  mushrooms: Spot[];
  shafts: Spot[];
  pools: LightPool[];
}

export function forest(rng: Rng): Landscape {
  const mushrooms = scatter(rng.fork(), {
    count: MUSHROOMS,
    region: NEAR_STAGE,
    accept: (x, z) => weightIf(distance(x, z) > ARENA.walkable - 2.5, viewWeight(x, z)),
  });
  const shafts = scatter(rng.fork(), {
    count: SHAFTS,
    region: NEAR_STAGE,
    accept: (x, z) =>
      weightIf(distance(x, z) > ARENA.walkable + 1 && z < SHAFT_MAX_Z, viewWeight(x, z)),
  });
  const pools: LightPool[] = [
    ...shafts.map((spot) => ({
      ...spot,
      radius: 2.6,
      color: new THREE.Color(MOONLIGHT),
      strength: 0.3,
    })),
    ...LANTERNS.map((spot) => ({
      ...spot,
      radius: 5,
      color: new THREE.Color(LANTERN_GLOW),
      strength: 0.32,
    })),
    ...mushrooms.map((spot) => ({
      ...spot,
      radius: 2.2,
      color: new THREE.Color(0x3fc8ff),
      strength: 0.16,
    })),
  ];
  const land: Forest = {
    hummocks: fbm(rng.seed(), 3),
    patches: fbm(rng.seed(), 3),
    needles: fbm(rng.seed(), 2),
    groves: fbm(rng.seed(), 2),
    mushrooms,
    shafts,
    pools,
  };
  return {
    terrain: {
      cell: CELL,
      step: STEP,
      lip: 0.14,
      strata: 0.1,
      variation: 0.06,
      height: (x, z) => height(land, x, z),
      surface: (x, z) => surface(land, x, z),
    },
    decorate: (context) => decorate(context, land),
  };
}

function height(land: Forest, x: number, z: number): number {
  const rise = arenaRise(x, z, 5);
  const back = smoothstep(-8, -30, z) * 2.2;
  return Math.max(0, (land.hummocks(x * 0.08, z * 0.08) * 2.6 - 1 + back) * rise);
}

function surface(land: Forest, x: number, z: number) {
  const patch = land.patches(x * 0.12, z * 0.12);
  const top = GROUND.moss
    .clone()
    .lerp(GROUND.mossLight, smoothstep(0.58, 0.78, patch))
    .lerp(GROUND.mossDeep, smoothstep(0.45, 0.25, patch))
    .lerp(GROUND.needles, smoothstep(0.58, 0.72, land.needles(x * 0.09, z * 0.09)) * 0.75);
  if (distance(x, z) < ARENA.clearing) top.lerp(GROUND.clearing, 0.5);
  return { top: lightPools(top, land.pools, x, z), side: GROUND.soil };
}

function decorate(context: BiomeContext, land: Forest): void {
  const occupancy = new Occupancy();
  LANTERNS.forEach((spot) => occupancy.reserve(spot.x, spot.z, LANTERN_CLEARANCE));
  addPines(context, land, occupancy);
  addSaplings(context, occupancy);
  addLanterns(context);
  addMushrooms(context, land.mushrooms);
  addUndergrowth(context);
  addDeadwood(context, occupancy);
  addBoulders(context, occupancy, BOULDERS);
  if (context.detail.extras) {
    addShafts(context, land.shafts);
    addMist(context);
  }
}

function addPines(context: BiomeContext, land: Forest, occupancy: Occupancy): void {
  const { rng, materials } = context;
  const trunks = materials.surface({ sway: SWAY.tall });
  const grove = (x: number, z: number) => smoothstep(0.35, 0.6, land.groves(x * 0.06, z * 0.06));
  plant(context, {
    models: [
      ...shapes(rng, 2, (r) => props.blockPine(r, PINE, TALL_PINE), trunks),
      ...shapes(rng, 2, (r) => props.blockPine(r, DARK_PINE, GIANT_PINE), trunks),
    ],
    spots: scatter(
      rng,
      {
        count: PINES,
        region: STAGE,
        spacing: 1.45,
        accept: (x, z) =>
          weightIf(tallPropAllowed(x, z, 0.3), viewWeight(x, z) * (0.5 + 0.5 * grove(x, z))),
      },
      occupancy,
    ),
    scale: [0.85, 1.25],
    turn: 'grid',
    snap: true,
  });
}

function addSaplings(context: BiomeContext, occupancy: Occupancy): void {
  const { rng, materials } = context;
  plant(context, {
    models: shapes(
      rng,
      2,
      (r) => props.blockPine(r, PINE, SAPLING),
      materials.surface({ sway: SWAY.tall }),
    ),
    spots: scatter(
      rng,
      {
        count: SAPLINGS,
        region: NEAR_STAGE,
        spacing: 0.9,
        accept: (x, z) => weightIf(tallPropAllowed(x, z), viewWeight(x, z)),
      },
      occupancy,
    ),
    scale: [0.7, 1],
    turn: 'grid',
  });
}

function addUndergrowth(context: BiomeContext): void {
  const { rng, materials } = context;
  const foliage = materials.surface({ sway: SWAY.foliage });
  plant(context, {
    models: shapes(rng, 2, (r) => props.fern(r, FERN), foliage, false),
    spots: scatter(rng, {
      count: FERNS,
      region: NEAR_STAGE,
      accept: (x, z) => weightIf(distance(x, z) > ARENA.walkable - 2),
    }),
    scale: [0.9, 1.5],
  });
  plant(context, {
    models: shapes(rng, 3, (r) => props.grassTuft(r, 0x1f5e4a, 0x5fc89a), foliage, false),
    spots: scatter(rng, {
      count: GRASS_TUFTS,
      region: NEAR_STAGE,
      accept: (x, z) => weightIf(distance(x, z) > ARENA.clearing + 0.5, 0.8),
    }),
    scale: [0.8, 1.3],
  });
}

function addDeadwood(context: BiomeContext, occupancy: Occupancy): void {
  const { rng, materials } = context;
  const wood = materials.surface();
  plant(context, {
    models: shapes(rng, 2, (r) => props.fallenLog(r, WOOD), wood),
    spots: scatter(
      rng,
      {
        count: LOGS,
        region: NEAR_STAGE,
        spacing: 1.6,
        accept: (x, z) => weightIf(tallPropAllowed(x, z)),
      },
      occupancy,
    ),
    scale: [0.9, 1.2],
    turn: 'grid',
  });
  plant(context, {
    models: shapes(rng, 2, (r) => props.stump(r, WOOD), wood),
    spots: scatter(
      rng,
      {
        count: STUMPS,
        region: NEAR_STAGE,
        spacing: 0.8,
        accept: (x, z) => weightIf(distance(x, z) > ARENA.walkable),
      },
      occupancy,
    ),
    scale: [0.8, 1.2],
    turn: 'grid',
  });
}

function addLanterns(context: BiomeContext): void {
  const { rng, materials, terrain } = context;
  const lantern = props.lanternPost(rng.fork(), 0x5a3a22, 0x2b2f3a);
  const placements: Placement[] = LANTERNS.map((spot) => ({
    x: spot.x,
    z: spot.z,
    y: terrain.heightAt(spot.x, spot.z),
    rotation: towardCenter(spot.x, spot.z),
    tint: new THREE.Color(LANTERN_GLOW),
  }));
  context.add(
    instances(lantern.solid, materials.surface(), placements, { castShadow: true, tinted: false }),
  );
  context.add(
    instances(lantern.glow, materials.glow({ intensity: 3.2, pulse: 0.1, speed: 9 }), placements),
  );
  placements.slice(0, LIT_LANTERNS).forEach((placement, index) => {
    const light = new THREE.PointLight(
      LANTERN_LIGHT.color,
      LANTERN_LIGHT.intensity,
      LANTERN_LIGHT.distance,
      LANTERN_LIGHT.decay,
    );
    const toCenter = new THREE.Vector2(-placement.x, -placement.z).normalize().multiplyScalar(0.7);
    light.position.set(
      placement.x + toCenter.x,
      placement.y + LANTERN_LIGHT.height,
      placement.z + toCenter.y,
    );
    context.add(light);
    context.animate({
      update: (_delta, elapsed) => {
        const flicker =
          Math.sin(elapsed * FLICKER.speed + index * 2.1) * 0.6 +
          Math.sin(elapsed * FLICKER.speed * 2.7 + index) * 0.4;
        light.intensity = LANTERN_LIGHT.intensity * (1 + FLICKER.amount * flicker);
      },
    });
  });
}

function addMushrooms(context: BiomeContext, spots: Spot[]): void {
  const { rng, materials } = context;
  const glow = materials.glow({ intensity: 1.5, pulse: 0.25, speed: 1.4 });
  plant(context, {
    models: variants(rng, 3, (r) => {
      const cluster = props.mushroomCluster(r, 0xe8e0cf);
      return [
        { geometry: cluster.solid, material: materials.surface(), castShadow: true, tinted: false },
        { geometry: cluster.glow, material: glow },
      ];
    }),
    spots,
    scale: [0.8, 1.3],
    tints: tints(MUSHROOM_GLOW),
    turn: 'grid',
  });
}

function addShafts(context: BiomeContext, spots: Spot[]): void {
  const { terrain, sunDirection } = context;
  const feet = spots.map((spot) => ({ ...spot, y: terrain.heightAt(spot.x, spot.z) }));
  const shafts = new LightShafts(
    { color: MOONLIGHT, opacity: 0.5, length: 16, radius: 1, direction: sunDirection },
    feet,
  );
  context.add(shafts.mesh);
  context.animate(shafts);
}

function addMist(context: BiomeContext): void {
  const mist = new Mist({
    color: 0x5f7bb8,
    opacity: 0.22,
    height: 0.45,
    clearRadius: 9,
    scale: 0.16,
    speed: 0.06,
  });
  context.add(mist.mesh);
  context.animate(mist);
}
