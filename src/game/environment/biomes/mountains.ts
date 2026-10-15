import * as THREE from 'three';
import * as props from '../../props';
import { instances } from '../instancing';
import { ARENA, distance, NEAR_STAGE, STAGE, tallPropAllowed, viewWeight } from '../layout';
import { fbm, hash2, ridged, smoothstep, type Noise2D } from '../noise';
import { plant, shapes, variants } from '../planting';
import type { Rng } from '../random';
import { Occupancy, scatter } from '../scatter';
import type { BiomeContext, Landscape } from '../types';
import { addParticles, addPebbles, arenaRise, SWAY, tints, weightIf } from './common';

const CELL = 1.2;
const STEP = 0.8;
const MAX_HEIGHT = 14;
const POND = { x: -17.6, z: -3.4, radius: 3.6 };
const ICE_LIFT = 0.03;
const ICE_SEED = 19;
const SNOWMAN_SPOT = { x: 12.6, z: -10.4 };
const SNOWMAN_CLEARANCE = 1.2;
const POND_CLEARANCE = 0.6;
const PINES = 85;
const BOULDERS = 28;
const SPIRES = 12;
const SPIRE_SIZE = 2.2;
const SPIRE_MIN_RADIUS = 19;
const PEBBLES = 14;
const DRIFTS = 22;
const ICE_CRYSTALS = 10;
const GLITTER = 260;
const SNOW_CAP_FROM = 0.55;
const ICE_GLOW = { intensity: 1.5, pulse: 0.12, speed: 1.2 };
const ICE_ROUGHNESS = 0.22;
const PINE_SHAPE: props.PineShape = { tiers: [3, 4], height: [3.2, 5], width: [1.3, 1.7] };

const GROUND = {
  snow: new THREE.Color(0xf2f7ff),
  snowShade: new THREE.Color(0xd3e2f6),
  rock: new THREE.Color(0x7d8ba2),
  rockTop: new THREE.Color(0x9eabbd),
  ice: new THREE.Color(0x8fd3f2),
  iceLight: new THREE.Color(0xc4ecff),
};

const SNOW_PINE: props.PinePalette = {
  trunk: 0x5b3b22,
  needles: { top: 0x3a9a6b, side: 0x237556, bottom: 0x174d3c },
  snow: 0xf7fbff,
};
const BOULDER: props.RockPalette = { dark: 0x66748a, light: 0xa8b5c7, cap: 0xf7fbff };
const DRIFT: props.RockPalette = { dark: 0xd7e3f4, light: 0xffffff };
const ICE_ROCK: props.RockPalette = { dark: 0x66748a, light: 0xdfe9f7 };
const SPIRE = { top: 0xf2f7ff, side: 0x7d8ba2, band: 0x6c7990 };
const ICE_CRYSTAL = [0x9fe8ff, 0xc9f4ff, 0xa9c8ff];

interface Mountains {
  ridges: Noise2D;
  drifts: Noise2D;
  rocks: Noise2D;
  groves: Noise2D;
}

const inPond = (x: number, z: number, margin = 0): boolean =>
  Math.hypot(x - POND.x, z - POND.z) < POND.radius + margin;

export function mountains(rng: Rng): Landscape {
  const land: Mountains = {
    ridges: ridged(rng.seed(), 4),
    drifts: fbm(rng.seed(), 3),
    rocks: fbm(rng.seed(), 2),
    groves: fbm(rng.seed(), 2),
  };
  return {
    terrain: {
      cell: CELL,
      step: STEP,
      lip: 0.24,
      strata: 0.07,
      variation: 0.03,
      height: (x, z) => height(land, x, z),
      surface: (x, z, h) => surface(land, x, z, h),
    },
    decorate: (context) => decorate(context, land),
  };
}

function height(land: Mountains, x: number, z: number): number {
  if (inPond(x, z, 1.2)) return 0;
  const rise = arenaRise(x, z, 4);
  const back = smoothstep(-4, -30, z) * 7;
  const base = land.ridges(x * 0.05 + 7, z * 0.05 + 3) * 5.5 - 2.4 + back;
  return THREE.MathUtils.clamp(base * rise, 0, MAX_HEIGHT);
}

function surface(land: Mountains, x: number, z: number, h: number) {
  const drift = land.drifts(x * 0.1, z * 0.1);
  const exposed = h > 2 && land.rocks(x * 0.12, z * 0.12) > 0.62;
  const top = exposed
    ? GROUND.rockTop.clone()
    : GROUND.snow.clone().lerp(GROUND.snowShade, smoothstep(0.5, 0.25, drift));
  return { top, side: GROUND.rock };
}

function decorate(context: BiomeContext, land: Mountains): void {
  const occupancy = new Occupancy();
  occupancy.reserve(POND.x, POND.z, POND.radius + POND_CLEARANCE);
  occupancy.reserve(SNOWMAN_SPOT.x, SNOWMAN_SPOT.z, SNOWMAN_CLEARANCE);
  addPines(context, land, occupancy);
  addBoulders(context, occupancy);
  addSpires(context, occupancy);
  addPebbles(context, BOULDER, PEBBLES, (x, z) => !inPond(x, z, 0.5));
  addDrifts(context);
  addIceCrystals(context, occupancy);
  addSnowman(context);
  addPond(context);
  addGlitter(context);
}

function addPines(context: BiomeContext, land: Mountains, occupancy: Occupancy): void {
  const { rng, materials } = context;
  const grove = (x: number, z: number) => smoothstep(0.38, 0.6, land.groves(x * 0.06, z * 0.06));
  plant(context, {
    models: shapes(
      rng,
      3,
      (r) => props.blockPine(r, SNOW_PINE, PINE_SHAPE),
      materials.surface({ sway: SWAY.tall }),
    ),
    spots: scatter(
      rng,
      {
        count: PINES,
        region: STAGE,
        spacing: 1.6,
        accept: (x, z) =>
          weightIf(tallPropAllowed(x, z, 0.4), viewWeight(x, z) * (0.25 + 0.75 * grove(x, z))),
      },
      occupancy,
    ),
    scale: [0.85, 1.35],
    turn: 'grid',
    snap: true,
  });
}

function addBoulders(context: BiomeContext, occupancy: Occupancy): void {
  const { rng, materials } = context;
  plant(context, {
    models: shapes(rng, 3, (r) => props.boulder(r, BOULDER, SNOW_CAP_FROM), materials.surface()),
    spots: scatter(
      rng,
      {
        count: BOULDERS,
        region: NEAR_STAGE,
        spacing: 2,
        accept: (x, z) => weightIf(tallPropAllowed(x, z, 0.8), viewWeight(x, z)),
      },
      occupancy,
    ),
    scale: [0.9, 2.2],
    sink: 0.2,
  });
}

function addSpires(context: BiomeContext, occupancy: Occupancy): void {
  const { rng, materials } = context;
  plant(context, {
    models: shapes(rng, 2, (r) => props.stalagmite(r, SPIRE, SPIRE_SIZE), materials.surface()),
    spots: scatter(
      rng,
      {
        count: SPIRES,
        region: STAGE,
        spacing: 2.4,
        accept: (x, z) => weightIf(distance(x, z) > SPIRE_MIN_RADIUS && tallPropAllowed(x, z)),
      },
      occupancy,
    ),
    scale: [0.9, 1.5],
    turn: 'grid',
    snap: true,
  });
}

function addDrifts(context: BiomeContext): void {
  const { rng, materials } = context;
  plant(context, {
    models: shapes(rng, 2, (r) => props.boulder(r, DRIFT), materials.surface()),
    spots: scatter(rng, {
      count: DRIFTS,
      region: NEAR_STAGE,
      accept: (x, z) => weightIf(distance(x, z) > ARENA.clearing + 2 && !inPond(x, z, 0.8)),
    }),
    scale: [0.45, 0.9],
    stretch: [0.3, 0.45],
    sink: 0.08,
  });
}

function addIceCrystals(context: BiomeContext, occupancy: Occupancy): void {
  const { rng, materials } = context;
  const glow = materials.glow(ICE_GLOW);
  plant(context, {
    models: variants(rng, 2, (r) => {
      const cluster = props.crystalCluster(r, ICE_ROCK);
      return [
        { geometry: cluster.solid, material: materials.surface(), castShadow: true, tinted: false },
        { geometry: cluster.glow, material: glow },
      ];
    }),
    spots: scatter(
      rng,
      {
        count: ICE_CRYSTALS,
        region: NEAR_STAGE,
        spacing: 1,
        accept: (x, z) => weightIf(tallPropAllowed(x, z), viewWeight(x, z)),
      },
      occupancy,
    ),
    scale: [0.5, 0.85],
    tints: tints(ICE_CRYSTAL),
  });
}

function addGlitter(context: BiomeContext): void {
  const { terrain } = context;
  addParticles(
    context,
    {
      count: GLITTER,
      colors: [0xffffff, 0xd6f1ff],
      size: 0.16,
      glow: 3,
      motion: 'twinkle',
      height: [0.04, 0.08],
      additive: true,
      speed: 0.9,
    },
    (x, z) => (distance(x, z) > ARENA.clearing ? terrain.heightAt(x, z) : undefined),
  );
}

function addSnowman(context: BiomeContext): void {
  const { rng, materials, terrain } = context;
  const { x, z } = SNOWMAN_SPOT;
  context.add(
    instances(
      props.snowman(rng.fork(), 0xf7fbff, 0xe63946),
      materials.surface(),
      [{ x, z, y: terrain.heightAt(x, z), rotation: -0.35, scale: 1.1 }],
      { castShadow: true },
    ),
  );
}

function addPond(context: BiomeContext): void {
  const { terrain, materials } = context;
  const positions: number[] = [];
  const colors: number[] = [];
  const cell = terrain.cell;
  const reach = Math.ceil(POND.radius / cell) + 1;
  for (let i = -reach; i <= reach; i += 1) {
    for (let j = -reach; j <= reach; j += 1) {
      const x = terrain.snap(POND.x + i * cell);
      const z = terrain.snap(POND.z + j * cell);
      if (!inPond(x, z)) continue;
      const shade = GROUND.ice.clone().lerp(GROUND.iceLight, hash2(i, j, ICE_SEED) * 0.6);
      const half = cell / 2;
      const corners = [
        [x - half, z - half],
        [x - half, z + half],
        [x + half, z + half],
        [x - half, z - half],
        [x + half, z + half],
        [x + half, z - half],
      ];
      corners.forEach(([cx, cz]) => {
        positions.push(cx, ICE_LIFT, cz);
        colors.push(shade.r, shade.g, shade.b);
      });
    }
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
  geometry.computeVertexNormals();
  const ice = new THREE.Mesh(
    geometry,
    materials.surface({ roughness: ICE_ROUGHNESS, metalness: 0.1 }),
  );
  ice.receiveShadow = true;
  context.add(ice);
}
