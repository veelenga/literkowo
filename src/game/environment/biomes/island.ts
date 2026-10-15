import * as THREE from 'three';
import * as props from '../../props';
import { instances, type Placement } from '../instancing';
import { ARENA, distance, NEAR_STAGE, STAGE, tallPropAllowed, viewWeight } from '../layout';
import { fbm, smoothstep, type Noise2D } from '../noise';
import { facingAway, plant, shapes } from '../planting';
import type { Rng } from '../random';
import { Occupancy, scatter, type Spot } from '../scatter';
import type { BiomeContext, Landscape } from '../types';
import { Water } from '../Water';
import { addParticles, arenaRise, SWAY, tints, towardCenter, weightIf, within } from './common';

const CELL = 1.2;
const STEP = 0.4;
const WATER_LEVEL = -0.22;
const SHORE_BASE = 15.2;
const SHORE_SWING = 2;
const SEABED_DEPTH = 3.4;
const SHORE_FALLOFF = 5;
const PIER = { start: 14, length: 8.5, width: 1.5, angle: -0.86, deck: 0.16 };
const TORCH_RADIUS = 14.9;
const TORCH_ANGLES = [-2.6, -1.95, -1.15, -0.45];
const PALM_SPREAD = 0.45;
const PALMS = 30;
const BUSHES = 14;
const SHORE_ROCKS = 14;
const SHORE_ROCK_REACH = [-0.8, 3.5] as const;
const GRASS_TUFTS = 160;
const SHELL_COUNT = 30;
const STARFISH_COUNT = 16;
const SPARKLES = 200;
const SPARKLE_MIN_DEPTH = 0.3;

interface Islet extends Spot {
  radius: number;
}

const ISLETS: Islet[] = [
  { x: -25.5, z: -15.5, radius: 3.2 },
  { x: 25.8, z: -12.8, radius: 2.6 },
  { x: -18.5, z: -25, radius: 2.4 },
  { x: 21, z: -27, radius: 3 },
];

const GROUND = {
  sand: new THREE.Color(0xffec9c),
  sandLight: new THREE.Color(0xfff6c8),
  wetSand: new THREE.Color(0xf2c97e),
  seabed: new THREE.Color(0xe3b977),
  grass: new THREE.Color(0x86d64e),
  side: new THREE.Color(0xd9ac6c),
};

const PALM: props.PalmPalette = {
  bark: 0xb07a45,
  barkDark: 0x8f5d32,
  frond: { top: 0x6edb58, side: 0x34a84a, bottom: 0x22773a },
  coconut: 0x6b4423,
};
const SHORE_ROCK: props.RockPalette = { dark: 0x8a7a6a, light: 0xcbb89e };
const TROPICAL: props.Tones = { top: 0x7fe06a, side: 0x3fae55, bottom: 0x2a7a40 };
const SHELLS = [0xff9aa2, 0xffd6a5, 0xfdffb6, 0xcaffbf, 0xa0c4ff, 0xffc6ff];
const STARFISH = [0xff7b5c, 0xffa94d, 0xff5d8f];

interface Island {
  outline: Noise2D;
  dunes: Noise2D;
  patches: Noise2D;
  shoreAt(x: number, z: number): number;
}

export function island(rng: Rng): Landscape {
  const outline = fbm(rng.seed(), 2);
  const land: Island = {
    outline,
    dunes: fbm(rng.seed(), 2),
    patches: fbm(rng.seed(), 2),
    shoreAt: (x, z) => {
      const angle = Math.atan2(z, x);
      return (
        SHORE_BASE + SHORE_SWING * outline(Math.cos(angle) * 1.6 + 5, Math.sin(angle) * 1.6 + 5)
      );
    },
  };
  return {
    terrain: {
      cell: CELL,
      step: STEP,
      strata: 0.06,
      variation: 0.04,
      height: (x, z) => height(land, x, z),
      surface: (x, z, h) => surface(land, x, z, h),
    },
    decorate: (context) => decorate(context, land),
  };
}

function isletHeight(x: number, z: number): number {
  return Math.max(
    ...ISLETS.map((islet) => {
      const d = Math.hypot(x - islet.x, z - islet.z);
      return 0.4 - smoothstep(islet.radius - 0.8, islet.radius + 3, d) * SEABED_DEPTH;
    }),
  );
}

function height(land: Island, x: number, z: number): number {
  const r = distance(x, z);
  const shore = land.shoreAt(x, z);
  const dunes = arenaRise(x, z, 1.5) * Math.max(0, land.dunes(x * 0.2, z * 0.2) * 1.8 - 0.9);
  const main =
    dunes * (1 - smoothstep(shore - 2.5, shore - 1, r)) -
    smoothstep(shore - 1.2, shore + SHORE_FALLOFF, r) * SEABED_DEPTH;
  return Math.max(main, isletHeight(x, z));
}

function surface(land: Island, x: number, z: number, h: number) {
  if (h < 0) return { top: GROUND.seabed.clone(), side: GROUND.side };
  const r = distance(x, z);
  const top = GROUND.sand
    .clone()
    .lerp(GROUND.sandLight, smoothstep(0.5, 0.75, land.patches(x * 0.15, z * 0.15)));
  if (r > land.shoreAt(x, z) - 1.4 && h < STEP / 2) top.lerp(GROUND.wetSand, 0.7);
  if (r > ARENA.walkable - 3 && land.patches(x * 0.09 + 9, z * 0.09) > 0.62)
    top.lerp(GROUND.grass, 0.85);
  return { top, side: GROUND.side };
}

function leanIntoView(x: number): number {
  return -Math.PI / 2 - Math.sign(x) * PALM_SPREAD;
}

function onSand(context: BiomeContext, x: number, z: number): boolean {
  return context.terrain.heightAt(x, z) >= 0;
}

function decorate(context: BiomeContext, land: Island): void {
  const occupancy = new Occupancy();
  addPier(context, occupancy);
  addTorches(context, occupancy);
  addPalms(context, occupancy);
  addBushes(context, occupancy);
  addShoreRocks(context, land, occupancy);
  addBeachGrass(context);
  addTrinkets(context);
  addWater(context);
}

function addPalms(context: BiomeContext, occupancy: Occupancy): void {
  const { rng, materials } = context;
  plant(context, {
    models: shapes(
      rng,
      3,
      (r) => props.palmTree(r, PALM),
      materials.surface({ sway: SWAY.canopy }),
    ),
    spots: scatter(
      rng,
      {
        count: PALMS,
        region: STAGE,
        spacing: 1.7,
        accept: (x, z) =>
          weightIf(tallPropAllowed(x, z) && onSand(context, x, z), viewWeight(x, z)),
      },
      occupancy,
    ),
    scale: [0.9, 1.25],
    orient: leanIntoView,
  });
}

function addBushes(context: BiomeContext, occupancy: Occupancy): void {
  const { rng, materials } = context;
  plant(context, {
    models: shapes(
      rng,
      2,
      (r) => props.chunkyBush(r, TROPICAL),
      materials.surface({ sway: SWAY.canopy }),
    ),
    spots: scatter(
      rng,
      {
        count: BUSHES,
        region: NEAR_STAGE,
        spacing: 0.9,
        accept: (x, z) => weightIf(distance(x, z) > ARENA.walkable + 0.5 && onSand(context, x, z)),
      },
      occupancy,
    ),
    scale: [0.6, 0.95],
    turn: 'grid',
  });
}

function addShoreRocks(context: BiomeContext, land: Island, occupancy: Occupancy): void {
  const { rng, materials } = context;
  plant(context, {
    models: shapes(rng, 3, (r) => props.boulder(r, SHORE_ROCK), materials.surface()),
    spots: scatter(
      rng,
      {
        count: SHORE_ROCKS,
        region: NEAR_STAGE,
        spacing: 1.2,
        accept: (x, z) => {
          const offshore = distance(x, z) - land.shoreAt(x, z);
          return weightIf(offshore > SHORE_ROCK_REACH[0] && offshore < SHORE_ROCK_REACH[1]);
        },
      },
      occupancy,
    ),
    scale: [0.5, 1.3],
    sink: 0.25,
  });
}

function addBeachGrass(context: BiomeContext): void {
  const { rng, materials } = context;
  plant(context, {
    models: shapes(
      rng,
      3,
      (r) => props.grassTuft(r, 0x4f9a35, 0xd2ec7a),
      materials.surface({ sway: SWAY.grass }),
      false,
    ),
    spots: scatter(rng, {
      count: GRASS_TUFTS,
      region: NEAR_STAGE,
      accept: (x, z) => weightIf(distance(x, z) > ARENA.walkable - 1.2 && onSand(context, x, z)),
    }),
    scale: [1, 1.6],
  });
}

function addTrinkets(context: BiomeContext): void {
  const { rng, materials } = context;
  const inBand = within(ARENA.clearing + 0.8, ARENA.walkable);
  const accept = (x: number, z: number) => weightIf(inBand(x, z) && onSand(context, x, z));
  plant(context, {
    models: shapes(rng, 2, (r) => props.seashell(r), materials.surface(), false),
    spots: scatter(rng, { count: SHELL_COUNT, region: NEAR_STAGE, accept }),
    scale: [1, 1.5],
    tints: tints(SHELLS),
  });
  plant(context, {
    models: shapes(rng, 1, (r) => props.starfish(r), materials.surface(), false),
    spots: scatter(rng, { count: STARFISH_COUNT, region: NEAR_STAGE, accept }),
    scale: [1, 1.6],
    tints: tints(STARFISH),
  });
}

function addPier(context: BiomeContext, occupancy: Occupancy): void {
  const { materials } = context;
  const along = new THREE.Vector2(Math.cos(PIER.angle), Math.sin(PIER.angle));
  for (let d = 0; d <= PIER.length; d += 1) {
    occupancy.reserve(along.x * (PIER.start + d), along.y * (PIER.start + d), PIER.width);
  }
  const geometry = props.pier(PIER.length, PIER.width, 0xc08a52, 0x7a5232);
  const placement: Placement = {
    x: along.x * PIER.start,
    z: along.y * PIER.start,
    y: PIER.deck,
    rotation: facingAway(along.x, along.y),
  };
  context.add(instances(geometry, materials.surface(), [placement], { castShadow: true }));
}

function addTorches(context: BiomeContext, occupancy: Occupancy): void {
  const { rng, materials, terrain } = context;
  const torch = props.tikiTorch(rng.fork(), 0xc99a5b, 0x7a5232);
  const placements: Placement[] = TORCH_ANGLES.map((angle) => {
    const x = Math.cos(angle) * TORCH_RADIUS;
    const z = Math.sin(angle) * TORCH_RADIUS;
    occupancy.reserve(x, z, 0.8);
    return {
      x,
      z,
      y: terrain.heightAt(x, z),
      rotation: towardCenter(x, z),
      tint: new THREE.Color(0xff8a2a),
    };
  });
  context.add(
    instances(torch.solid, materials.surface(), placements, { castShadow: true, tinted: false }),
  );
  context.add(
    instances(torch.glow, materials.glow({ intensity: 3, pulse: 0.2, speed: 10 }), placements),
  );
}

function addWater(context: BiomeContext): void {
  const { terrain } = context;
  const water = new Water(
    {
      level: WATER_LEVEL,
      shallow: 0x2fe8d6,
      deep: 0x0f86c8,
      rim: 0xffb39a,
      foam: 0xffffff,
      glint: 0xffd9a0,
      depthRange: 2.6,
      amplitude: 0.16,
      lightDirection: context.sunDirection,
      region: { minX: -54, maxX: 54, minZ: -42, maxZ: 22 },
      cell: 0.9,
    },
    (x, z) => WATER_LEVEL - terrain.heightAt(x, z),
  );
  context.add(water.mesh);
  context.animate(water);
  addParticles(
    context,
    {
      count: SPARKLES,
      colors: [0xfff3c8, 0xffcf8a],
      size: 0.3,
      glow: 3.5,
      motion: 'twinkle',
      height: [0.06, 0.1],
      additive: true,
      speed: 0.8,
      region: { minX: -30, maxX: 30, minZ: -24, maxZ: 12 },
    },
    (x, z) => (WATER_LEVEL - terrain.heightAt(x, z) > SPARKLE_MIN_DEPTH ? WATER_LEVEL : undefined),
  );
}
