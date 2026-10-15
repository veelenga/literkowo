import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import {
  color,
  merge,
  paint,
  paintVertices,
  roughen,
  vary,
  type FaceShader,
} from './environment/geometry';
import { hash3 } from './environment/noise';
import type { Rng } from './environment/random';

export interface Tones {
  top: number;
  side: number;
  bottom?: number;
}

export interface TreePalette {
  trunk: number;
  leaves: Tones;
}

export interface BirchPalette {
  bark: number;
  mark: number;
  leaves: Tones;
}

export interface PinePalette {
  trunk: number;
  needles: Tones;
  snow?: number;
}

export interface PineShape {
  tiers: [number, number];
  height: [number, number];
  width: [number, number];
}

export interface RockPalette {
  dark: number;
  light: number;
  cap?: number;
}

export interface PalmPalette {
  bark: number;
  barkDark: number;
  frond: Tones;
  coconut: number;
}

export interface WoodPalette {
  bark: number;
  wood: number;
  moss: number;
}

export interface GlowingProp {
  solid: THREE.BufferGeometry;
  glow: THREE.BufferGeometry;
}

const UP_FACE = 0.6;
const BEVEL_FACE = 0.25;
const FACE_VARIATION = 0.06;
const BOTTOM_SHADE = 0.55;
const BEVEL_SEGMENTS = 1;
const QUARTER_TURN = Math.PI / 2;
const EIGHTH_TURN = Math.PI / 4;
const GLOW_LIGHT = new THREE.Vector3(-0.4, 0.8, 0.45).normalize();

function tones(palette: Tones, seed: number, variation = FACE_VARIATION): FaceShader {
  const top = color(palette.top);
  const side = color(palette.side);
  const bevel = side.clone().lerp(top, 0.5);
  const bottom =
    palette.bottom === undefined
      ? side.clone().multiplyScalar(BOTTOM_SHADE)
      : color(palette.bottom);
  return (center, normal) => {
    const base =
      normal.y > UP_FACE
        ? top
        : normal.y > BEVEL_FACE
          ? bevel
          : normal.y < -UP_FACE
            ? bottom
            : side;
    return vary(base, variation, hash3(center.x, center.y, center.z, seed));
  };
}

function solid(hex: number): Tones {
  return { top: hex, side: hex };
}

function block(width: number, height: number, depth: number, bevel = 0): THREE.BufferGeometry {
  return bevel > 0
    ? new RoundedBoxGeometry(width, height, depth, BEVEL_SEGMENTS, bevel)
    : new THREE.BoxGeometry(width, height, depth);
}

function at<T extends THREE.BufferGeometry>(
  geometry: T,
  x: number,
  y: number,
  z: number,
  turn = 0,
): T {
  geometry.rotateY(turn);
  geometry.translate(x, y, z);
  return geometry;
}

function squareFrustum(
  top: number,
  bottom: number,
  height: number,
  segments = 1,
): THREE.BufferGeometry {
  return new THREE.CylinderGeometry(top, bottom, height, 4, segments).rotateY(EIGHTH_TURN);
}

function glowShade(seed: number, boost = 1): FaceShader {
  return (center, normal) => {
    const light = 0.62 + 0.38 * Math.max(0, normal.dot(GLOW_LIGHT));
    return vary(
      new THREE.Color(1, 1, 1),
      0.08,
      hash3(center.x, center.y, center.z, seed),
    ).multiplyScalar(light * boost);
  };
}

export function chunkyTree(rng: Rng, palette: TreePalette): THREE.BufferGeometry {
  const seed = rng.seed();
  const trunkHeight = rng.range(1.3, 1.9);
  const crown = rng.range(2.1, 2.7);
  const leaves = tones(palette.leaves, seed);
  const leafBlock = (size: number, height: number, x: number, y: number, z: number) =>
    paint(at(block(size, height, size, size * 0.12), x, y, z), leaves);
  const parts = [
    paint(
      at(block(0.44, trunkHeight, 0.44, 0.05), 0, trunkHeight / 2, 0),
      tones(solid(palette.trunk), seed),
    ),
    leafBlock(crown, crown * 0.78, 0, trunkHeight + crown * 0.36, 0),
  ];
  const directions = [
    [1, 0],
    [-1, 0],
    [0, 1],
    [0, -1],
  ];
  const extras = rng.int(1, 3);
  for (let k = 0; k < extras; k += 1) {
    const [dx, dz] = directions[(k + rng.int(0, 3)) % directions.length];
    const size = crown * rng.range(0.45, 0.62);
    const y = trunkHeight + crown * rng.range(0.2, 0.62);
    parts.push(leafBlock(size, size * 0.85, dx * crown * 0.48, y, dz * crown * 0.48));
  }
  if (rng.chance(0.6)) {
    const size = crown * rng.range(0.45, 0.6);
    parts.push(
      leafBlock(
        size,
        size * 0.8,
        rng.range(-0.3, 0.3),
        trunkHeight + crown * 0.82,
        rng.range(-0.3, 0.3),
      ),
    );
  }
  return merge(parts);
}

export function birchTree(rng: Rng, palette: BirchPalette): THREE.BufferGeometry {
  const seed = rng.seed();
  const bands = 9;
  const height = rng.range(2.6, 3.5);
  const bandHeight = height / bands;
  const bark = color(palette.bark);
  const mark = color(palette.mark);
  const trunk = paint(
    at(new THREE.BoxGeometry(0.3, height, 0.3, 1, bands, 1), 0, height / 2, 0),
    (center, normal) => {
      if (Math.abs(normal.y) > UP_FACE) return bark;
      const band = Math.floor(center.y / bandHeight);
      const side = Math.round(normal.x * 2 + normal.z * 3);
      return hash3(band, side, 0, seed) < 0.32 ? mark : bark;
    },
  );
  const leaves = tones(palette.leaves, seed);
  const lower = rng.range(1.4, 1.8);
  const upper = lower * rng.range(0.6, 0.75);
  return merge([
    trunk,
    paint(at(block(lower, lower * 0.8, lower, 0.14), 0, height - 0.1, 0), leaves),
    paint(
      at(
        block(upper, upper * 0.9, upper, 0.1),
        rng.range(-0.2, 0.2),
        height + lower * 0.6,
        rng.range(-0.2, 0.2),
      ),
      leaves,
    ),
  ]);
}

export function blockPine(rng: Rng, palette: PinePalette, shape: PineShape): THREE.BufferGeometry {
  const seed = rng.seed();
  const trunkHeight = rng.range(0.7, 1.1);
  const tiers = rng.int(shape.tiers[0], shape.tiers[1]);
  const height = rng.range(shape.height[0], shape.height[1]);
  const width = rng.range(shape.width[0], shape.width[1]);
  const spacing = height / tiers;
  const tierHeight = spacing * 1.3;
  const needles = tones(palette.needles, seed);
  const snow = palette.snow === undefined ? undefined : color(palette.snow);
  const parts = [
    paint(
      at(block(0.36, trunkHeight, 0.36), 0, trunkHeight / 2, 0),
      tones(solid(palette.trunk), seed),
    ),
  ];
  for (let k = 0; k < tiers; k += 1) {
    const t = tiers > 1 ? k / (tiers - 1) : 0;
    const radius = width * (1 - t * 0.62);
    const centerY = trunkHeight + k * spacing + tierHeight / 2;
    const tier = at(
      squareFrustum(radius * 0.42, radius, tierHeight, 2),
      0,
      centerY,
      0,
      rng.range(-0.08, 0.08),
    );
    parts.push(
      paint(tier, (center, normal) =>
        snow && (normal.y > 0.9 || center.y > centerY + tierHeight * 0.12)
          ? vary(snow, 0.03, hash3(center.x, center.y, center.z, seed))
          : needles(center, normal),
      ),
    );
  }
  const tipHeight = spacing * 0.9;
  const tip = at(
    new THREE.ConeGeometry(width * 0.32, tipHeight, 4).rotateY(EIGHTH_TURN),
    0,
    trunkHeight + height + tipHeight * 0.3,
    0,
  );
  parts.push(paint(tip, snow ? snow : needles));
  return merge(parts);
}

export function chunkyBush(rng: Rng, leaves: Tones): THREE.BufferGeometry {
  const seed = rng.seed();
  const shade = tones(leaves, seed);
  const main = rng.range(0.9, 1.25);
  const parts = [paint(at(block(main, main * 0.75, main, main * 0.14), 0, main * 0.32, 0), shade)];
  const extras = rng.int(1, 2);
  for (let k = 0; k < extras; k += 1) {
    const size = main * rng.range(0.55, 0.7);
    const angle = rng.angle();
    parts.push(
      paint(
        at(
          block(size, size * 0.8, size, size * 0.14),
          Math.cos(angle) * main * 0.45,
          size * 0.3,
          Math.sin(angle) * main * 0.45,
        ),
        shade,
      ),
    );
  }
  return merge(parts);
}

export function boulder(rng: Rng, palette: RockPalette, capFrom = 0.62): THREE.BufferGeometry {
  const seed = rng.seed();
  const geometry = roughen(new THREE.IcosahedronGeometry(1, 1), 0.12, seed);
  geometry.scale(rng.range(0.9, 1.1), rng.range(0.62, 0.82), rng.range(0.8, 1));
  geometry.translate(0, 0.42, 0);
  const dark = color(palette.dark);
  const light = color(palette.light);
  const cap = palette.cap === undefined ? undefined : color(palette.cap);
  return paint(geometry, (center, normal) => {
    if (cap && normal.y > capFrom)
      return vary(cap, 0.03, hash3(center.x, center.y, center.z, seed));
    const base = dark.clone().lerp(light, THREE.MathUtils.clamp(normal.y * 0.5 + 0.5, 0, 1));
    return vary(base, FACE_VARIATION, hash3(center.x, center.y, center.z, seed));
  });
}

export function grassTuft(rng: Rng, base: number, tip: number): THREE.BufferGeometry {
  const bottom = color(base);
  const top = color(tip);
  const blades = rng.int(3, 5);
  const parts: THREE.BufferGeometry[] = [];
  for (let k = 0; k < blades; k += 1) {
    const height = rng.range(0.28, 0.58);
    const width = rng.range(0.05, 0.08);
    const blade = new THREE.CylinderGeometry(0, width, height, 4, 1, true).rotateY(EIGHTH_TURN);
    blade.translate(0, height / 2, 0);
    blade.rotateX(rng.range(-0.35, 0.35));
    blade.rotateZ(rng.range(-0.35, 0.35));
    blade.translate(rng.range(-0.16, 0.16), 0, rng.range(-0.16, 0.16));
    parts.push(
      paintVertices(blade, (point) =>
        bottom.clone().lerp(top, THREE.MathUtils.clamp(point.y / 0.5, 0, 1)),
      ),
    );
  }
  return merge(parts);
}

export function flower(rng: Rng, petal: number, core: number, stem: number): THREE.BufferGeometry {
  const seed = rng.seed();
  const height = rng.range(0.32, 0.52);
  const stemShade = tones(solid(stem), seed);
  const leafTurn = rng.angle();
  return merge([
    paint(at(new THREE.BoxGeometry(0.05, height, 0.05), 0, height / 2, 0), stemShade),
    paint(at(new THREE.BoxGeometry(0.16, 0.03, 0.06), 0.06, height * 0.4, 0, leafTurn), stemShade),
    paint(
      at(new THREE.BoxGeometry(0.26, 0.07, 0.26), 0, height, 0, EIGHTH_TURN),
      tones({ top: petal, side: petal }, seed),
    ),
    paint(at(new THREE.BoxGeometry(0.1, 0.06, 0.1), 0, height + 0.05, 0), tones(solid(core), seed)),
  ]);
}

export function mushroomCluster(rng: Rng, stem: number): GlowingProp {
  const seed = rng.seed();
  const stems: THREE.BufferGeometry[] = [];
  const caps: THREE.BufferGeometry[] = [];
  const count = rng.int(2, 4);
  const stemShade = tones(solid(stem), seed);
  const capShade = glowShade(seed);
  for (let k = 0; k < count; k += 1) {
    const x = k === 0 ? 0 : rng.range(-0.45, 0.45);
    const z = k === 0 ? 0 : rng.range(-0.45, 0.45);
    const height = k === 0 ? rng.range(0.6, 0.85) : rng.range(0.25, 0.55);
    const width = 0.12 + height * 0.18;
    const cap = rng.range(0.5, 0.75) * (0.55 + height);
    const capHeight = cap * 0.42;
    stems.push(paint(at(block(width, height, width), x, height / 2, z), stemShade));
    caps.push(
      paint(
        at(
          block(cap, capHeight, cap, capHeight * 0.3),
          x,
          height + capHeight * 0.3,
          z,
          rng.range(0, QUARTER_TURN),
        ),
        capShade,
      ),
    );
  }
  return { solid: merge(stems), glow: merge(caps) };
}

export function lanternPost(rng: Rng, wood: number, metal: number): GlowingProp {
  const seed = rng.seed();
  const height = rng.range(2.2, 2.5);
  const reach = 0.62;
  const woodShade = tones(solid(wood), seed);
  const metalShade = tones(solid(metal), seed);
  return {
    solid: merge([
      paint(at(block(0.2, height, 0.2, 0.03), 0, height / 2, 0), woodShade),
      paint(
        at(new THREE.BoxGeometry(0.85, 0.1, 0.12), reach / 2 + 0.05, height - 0.12, 0),
        woodShade,
      ),
      paint(
        at(new THREE.ConeGeometry(0.32, 0.26, 4).rotateY(EIGHTH_TURN), reach, height - 0.38, 0),
        metalShade,
      ),
      paint(at(new THREE.BoxGeometry(0.3, 0.06, 0.3), reach, height - 0.98, 0), metalShade),
      paint(at(new THREE.BoxGeometry(0.04, 0.14, 0.04), reach, height - 0.2, 0), metalShade),
    ]),
    glow: paint(
      at(new THREE.BoxGeometry(0.28, 0.4, 0.28), reach, height - 0.72, 0),
      glowShade(seed),
    ),
  };
}

export function crystalCluster(rng: Rng, rock: RockPalette): GlowingProp {
  const seed = rng.seed();
  const shards: THREE.BufferGeometry[] = [];
  const count = rng.int(3, 6);
  for (let k = 0; k < count; k += 1) {
    const lead = k === 0;
    const height = lead ? rng.range(1.4, 2.1) : rng.range(0.5, 1.3);
    const radius = lead ? rng.range(0.24, 0.32) : rng.range(0.12, 0.24);
    const shard = merge([
      paint(at(squareFrustum(radius, radius * 1.05, height), 0, height / 2, 0), glowShade(seed)),
      paint(
        at(
          new THREE.ConeGeometry(radius, radius * 1.8, 4).rotateY(EIGHTH_TURN),
          0,
          height + radius * 0.9,
          0,
        ),
        glowShade(seed, 1.2),
      ),
    ]);
    const angle = rng.angle();
    shard.rotateZ(lead ? rng.range(-0.12, 0.12) : -rng.range(0.25, 0.6));
    shard.rotateY(angle);
    const offset = lead ? 0 : rng.range(0.2, 0.45);
    shard.translate(Math.cos(angle) * offset, 0, -Math.sin(angle) * offset);
    shards.push(shard);
  }
  const base = roughen(new THREE.IcosahedronGeometry(0.6, 0), 0.08, seed);
  base.scale(1.3, 0.45, 1.3);
  return {
    solid: paint(base, tones({ top: rock.light, side: rock.dark }, seed)),
    glow: merge(shards),
  };
}

export function stalagmite(
  rng: Rng,
  palette: Tones & { band: number },
  size = 1,
): THREE.BufferGeometry {
  const seed = rng.seed();
  const tiers = rng.int(3, 4);
  const height = rng.range(1.6, 4) * size;
  const base = rng.range(0.5, 0.85) * size;
  const tierHeight = height / tiers;
  const main = tones(palette, seed);
  const band = tones({ top: palette.top, side: palette.band }, seed);
  const parts: THREE.BufferGeometry[] = [];
  for (let k = 0; k < tiers; k += 1) {
    const width = base * (1 - (k / tiers) * 0.72);
    const tier = at(
      squareFrustum(width * 0.72, width, tierHeight),
      0,
      k * tierHeight + tierHeight / 2,
      0,
      rng.range(0, QUARTER_TURN),
    );
    parts.push(paint(tier, k % 2 === 0 ? main : band));
  }
  const tipHeight = height * 0.28;
  parts.push(
    paint(
      at(new THREE.ConeGeometry(base * 0.26, tipHeight, 4), 0, height + tipHeight / 2, 0),
      main,
    ),
  );
  return merge(parts);
}

export function stalactite(
  rng: Rng,
  palette: Tones & { band: number },
  size = 1,
): THREE.BufferGeometry {
  return stalagmite(rng, palette, size).rotateX(Math.PI);
}

export function rockColumn(
  rng: Rng,
  palette: Tones & { band: number },
  height: number,
): THREE.BufferGeometry {
  const seed = rng.seed();
  const waist = rng.range(0.55, 0.8);
  return merge([
    stalagmite(rng, palette, 1.8),
    paint(
      at(squareFrustum(waist, waist * 1.1, height), 0, height / 2, 0, rng.range(0, QUARTER_TURN)),
      tones(palette, seed),
    ),
    stalactite(rng, palette, 1.8).translate(0, height, 0),
  ]);
}

function frond(
  segments: Array<{ length: number; width: number; pitch: number }>,
  thickness: number,
  shade: FaceShader,
): THREE.BufferGeometry {
  const parts: THREE.BufferGeometry[] = [];
  let x = 0;
  let y = 0;
  segments.forEach((segment) => {
    const leaf = new THREE.BoxGeometry(segment.length, thickness, segment.width);
    leaf.translate(segment.length / 2, 0, 0);
    leaf.rotateZ(segment.pitch);
    leaf.translate(x, y, 0);
    parts.push(paint(leaf, shade));
    x += Math.cos(segment.pitch) * segment.length * 0.96;
    y += Math.sin(segment.pitch) * segment.length * 0.96;
  });
  return merge(parts);
}

export function palmTree(rng: Rng, palette: PalmPalette): THREE.BufferGeometry {
  const seed = rng.seed();
  const segments = rng.int(6, 8);
  const segmentHeight = 0.5;
  const lean = rng.range(0.6, 1.5);
  const parts: THREE.BufferGeometry[] = [];
  for (let k = 0; k < segments; k += 1) {
    const t = k / segments;
    const width = THREE.MathUtils.lerp(0.46, 0.3, t);
    const piece = block(width, segmentHeight * 0.94, width, 0.04);
    piece.rotateZ(-lean * t * 0.5);
    piece.translate(lean * t * t, k * segmentHeight + segmentHeight / 2, 0);
    parts.push(paint(piece, tones(solid(k % 2 === 0 ? palette.bark : palette.barkDark), seed)));
  }
  const crown = new THREE.Vector3(lean, segments * segmentHeight, 0);
  const leaves = tones(palette.frond, seed, 0.08);
  const fronds = rng.int(6, 7);
  for (let f = 0; f < fronds; f += 1) {
    const droop = rng.range(0.85, 1.15);
    const leaf = frond(
      [
        { length: 0.75, width: 0.5, pitch: 0.35 },
        { length: 0.75, width: 0.44, pitch: -0.2 * droop },
        { length: 0.7, width: 0.32, pitch: -0.75 * droop },
      ],
      0.07,
      leaves,
    );
    leaf.rotateY((f / fronds) * Math.PI * 2 + rng.range(-0.2, 0.2));
    leaf.translate(crown.x, crown.y, crown.z);
    parts.push(leaf);
  }
  const nut = tones(solid(palette.coconut), seed);
  for (let k = 0; k < 3; k += 1) {
    const angle = (k / 3) * Math.PI * 2 + 0.4;
    parts.push(
      paint(
        at(
          block(0.24, 0.24, 0.24, 0.04),
          crown.x + Math.cos(angle) * 0.22,
          crown.y - 0.22,
          Math.sin(angle) * 0.22,
        ),
        nut,
      ),
    );
  }
  return merge(parts);
}

export function fern(rng: Rng, leaves: Tones): THREE.BufferGeometry {
  const seed = rng.seed();
  const shade = tones(leaves, seed, 0.1);
  const count = rng.int(5, 7);
  const parts: THREE.BufferGeometry[] = [];
  for (let k = 0; k < count; k += 1) {
    const size = rng.range(0.8, 1.15);
    const leaf = frond(
      [
        { length: 0.32 * size, width: 0.2, pitch: 0.75 },
        { length: 0.32 * size, width: 0.16, pitch: 0.1 },
        { length: 0.26 * size, width: 0.1, pitch: -0.45 },
      ],
      0.04,
      shade,
    );
    leaf.rotateY((k / count) * Math.PI * 2 + rng.range(-0.25, 0.25));
    parts.push(leaf);
  }
  return merge(parts);
}

export function tikiTorch(rng: Rng, pole: number, poleDark: number): GlowingProp {
  const seed = rng.seed();
  const height = rng.range(1.6, 1.9);
  const bands = 4;
  const piece = height / bands;
  const parts = Array.from({ length: bands }, (_, k) =>
    paint(
      at(block(0.15, piece * 0.96, 0.15), 0, k * piece + piece / 2, 0),
      tones(solid(k % 2 === 0 ? pole : poleDark), seed),
    ),
  );
  parts.push(
    paint(at(block(0.32, 0.24, 0.32, 0.05), 0, height + 0.08, 0), tones(solid(poleDark), seed)),
  );
  const flame = merge([
    paint(
      at(new THREE.BoxGeometry(0.22, 0.3, 0.22), 0, height + 0.32, 0, EIGHTH_TURN),
      glowShade(seed),
    ),
    paint(at(new THREE.BoxGeometry(0.12, 0.22, 0.12), 0, height + 0.52, 0), glowShade(seed, 1.25)),
  ]);
  return { solid: merge(parts), glow: flame };
}

export function starfish(rng: Rng): THREE.BufferGeometry {
  const seed = rng.seed();
  const shade = tones({ top: 0xffffff, side: 0xd8d8d8 }, seed);
  const arms = Array.from({ length: 5 }, (_, k) =>
    paint(
      at(
        new THREE.BoxGeometry(0.24, 0.05, 0.08).translate(0.13, 0, 0),
        0,
        0.03,
        0,
        (k / 5) * Math.PI * 2,
      ),
      shade,
    ),
  );
  return merge([
    ...arms,
    paint(at(new THREE.BoxGeometry(0.14, 0.07, 0.14), 0, 0.035, 0, EIGHTH_TURN), shade),
  ]);
}

export function seashell(rng: Rng): THREE.BufferGeometry {
  const seed = rng.seed();
  const shade = tones({ top: 0xffffff, side: 0xe6e6e6 }, seed);
  const spiral = new THREE.ConeGeometry(0.1, 0.24, 4).rotateZ(QUARTER_TURN);
  return merge([
    paint(at(spiral, 0, 0.08, 0), shade),
    paint(at(block(0.14, 0.12, 0.14, 0.03), 0.1, 0.07, 0), shade),
  ]);
}

export function fallenLog(rng: Rng, palette: WoodPalette): THREE.BufferGeometry {
  const seed = rng.seed();
  const length = rng.range(1.8, 2.8);
  const bark = color(palette.bark);
  const wood = color(palette.wood);
  const moss = color(palette.moss);
  const shade: FaceShader = (center, normal) => {
    const base = Math.abs(normal.x) > UP_FACE ? wood : normal.y > UP_FACE ? moss : bark;
    return vary(base, FACE_VARIATION, hash3(center.x, center.y, center.z, seed));
  };
  return merge([
    paint(at(block(length, 0.55, 0.55, 0.07), 0, 0.27, 0), shade),
    paint(at(block(0.2, 0.42, 0.2, 0.03), rng.range(-0.5, 0.5), 0.62, 0), shade),
  ]);
}

export function stump(rng: Rng, palette: WoodPalette): THREE.BufferGeometry {
  const seed = rng.seed();
  const height = rng.range(0.35, 0.6);
  return paint(
    at(block(0.75, height, 0.75, 0.06), 0, height / 2, 0),
    tones({ top: palette.wood, side: palette.bark }, seed),
  );
}

export function snowman(rng: Rng, snow: number, accent: number): THREE.BufferGeometry {
  const seed = rng.seed();
  const body = tones({ top: snow, side: snow }, seed, 0.03);
  const coal = tones(solid(0x23262e), seed);
  return merge([
    paint(at(block(0.95, 0.85, 0.95, 0.2), 0, 0.42, 0), body),
    paint(at(block(0.72, 0.65, 0.72, 0.16), 0, 1.15, 0), body),
    paint(at(block(0.52, 0.5, 0.52, 0.12), 0, 1.7, 0), body),
    paint(at(new THREE.BoxGeometry(0.78, 0.14, 0.78), 0, 1.44, 0), tones(solid(accent), seed)),
    paint(
      at(new THREE.ConeGeometry(0.07, 0.32, 4).rotateX(QUARTER_TURN), 0, 1.68, 0.4),
      tones(solid(0xff8a1f), seed),
    ),
    paint(at(new THREE.BoxGeometry(0.08, 0.08, 0.04), -0.12, 1.8, 0.26), coal),
    paint(at(new THREE.BoxGeometry(0.08, 0.08, 0.04), 0.12, 1.8, 0.26), coal),
    paint(
      at(new THREE.BoxGeometry(0.62, 0.06, 0.06), 0.55, 1.25, 0, -0.5),
      tones(solid(0x6b4a2b), seed),
    ),
  ]);
}

export function pier(
  length: number,
  width: number,
  plank: number,
  post: number,
): THREE.BufferGeometry {
  const plankWidth = 0.42;
  const count = Math.floor(length / plankWidth);
  const parts: THREE.BufferGeometry[] = [];
  for (let k = 0; k < count; k += 1) {
    const shade = tones(solid(plank), k, 0.1);
    parts.push(
      paint(at(new THREE.BoxGeometry(plankWidth * 0.92, 0.1, width), k * plankWidth, 0, 0), shade),
    );
  }
  const postShade = tones(solid(post), count);
  for (let x = 0; x < length; x += 2) {
    [-1, 1].forEach((side) =>
      parts.push(
        paint(
          at(new THREE.BoxGeometry(0.2, 1.6, 0.2), x, -0.6, side * (width / 2 + 0.05)),
          postShade,
        ),
      ),
    );
  }
  return merge(parts);
}
