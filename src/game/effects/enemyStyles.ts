import * as THREE from 'three';
import type { EnemyShape } from '../themes';
import { createAssetCache } from '../assetCache';
import { blockAssembly, chunkyBlock, chunkyGem, type Block } from './chunkyGeometry';
import type { FaceSpec } from './GlowingFace';

export interface SpinRates {
  x: number;
  y: number;
  z: number;
}

export interface BobMotion {
  speed: number;
  height: number;
  ripple: number;
}

export interface ShapeStyle {
  shellOpacity: number;
  shellShade: number;
  coreBoost: number;
  spin: SpinRates;
  bob: BobMotion;
  sparkCount: number;
  hasTrail: boolean;
  face?: FaceSpec;
}

const RIPPLE_FREQUENCY = 2.3;
const FULL_TURN = Math.PI * 2;
const SPIRAL = {
  blocks: 8,
  turns: 1.15,
  radius: 0.38,
  taper: 0.75,
  blockSize: 0.34,
  shrink: 0.6,
  bottom: -0.24,
  rise: 0.52,
};

const CUBE_CLUSTER: readonly Block[] = [
  { size: [0.5, 0.5, 0.5] },
  { size: [0.3, 0.3, 0.3], position: [0.32, 0.18, 0.08], rotation: [0.3, 0.5, 0.2] },
  { size: [0.26, 0.26, 0.26], position: [-0.28, -0.14, 0.18], rotation: [0.6, 0.2, 0.4] },
  { size: [0.22, 0.22, 0.22], position: [0.04, 0.3, -0.28], rotation: [0.2, 0.8, 0.1] },
];

const BLOCKY_ICICLE: readonly Block[] = [
  { size: [0.5, 0.3, 0.5], position: [0, 0.36, 0] },
  { size: [0.38, 0.28, 0.38], position: [0, 0.08, 0], rotation: [0, 0.25, 0] },
  { size: [0.27, 0.26, 0.27], position: [0, -0.18, 0], rotation: [0, 0.5, 0] },
  { size: [0.16, 0.24, 0.16], position: [0, -0.42, 0], rotation: [0, 0.75, 0] },
];

const CUBE_CREATURE: readonly Block[] = [
  { size: [0.8, 0.72, 0.72] },
  { size: [0.16, 0.2, 0.16], position: [-0.24, 0.44, 0], rotation: [0, 0, 0.25] },
  { size: [0.16, 0.2, 0.16], position: [0.24, 0.44, 0], rotation: [0, 0, -0.25] },
];

const CREATURE_FACE: FaceSpec = {
  color: 0xfff3a0,
  eyeSize: [0.13, 0.13, 0.04],
  eyeSpacing: 0.17,
  eyeHeight: 0.06,
  depth: 0.37,
  slant: 0,
  blinks: true,
};

const SHELL_BUILDERS: Record<EnemyShape, () => THREE.BufferGeometry> = {
  crystal: () => chunkyGem(0.55, 1),
  wisp: () => blockAssembly(CUBE_CLUSTER),
  shard: () => blockAssembly(BLOCKY_ICICLE),
  orb: () => blockAssembly(CUBE_CREATURE),
  shell: () => blockAssembly(spiralBlocks()),
};

const CORE_BUILDERS: Record<EnemyShape, () => THREE.BufferGeometry> = {
  crystal: () => new THREE.OctahedronGeometry(0.22, 0),
  wisp: () => chunkyBlock(0.24, 0.24, 0.24),
  shard: () => chunkyBlock(0.14, 0.42, 0.14),
  orb: () => chunkyBlock(0.36, 0.36, 0.36),
  shell: () => chunkyBlock(0.2, 0.2, 0.2),
};

export const SHAPE_STYLES: Record<EnemyShape, ShapeStyle> = {
  crystal: {
    shellOpacity: 0.58,
    shellShade: 1,
    coreBoost: 1,
    spin: { x: 0, y: 1.2, z: 0 },
    bob: { speed: 2.5, height: 0.15, ripple: 0 },
    sparkCount: 3,
    hasTrail: false,
  },
  wisp: {
    shellOpacity: 0.48,
    shellShade: 1,
    coreBoost: 1.1,
    spin: { x: 0.45, y: 0.9, z: 0.2 },
    bob: { speed: 3.4, height: 0.3, ripple: 0.45 },
    sparkCount: 2,
    hasTrail: true,
  },
  shard: {
    shellOpacity: 0.55,
    shellShade: 1,
    coreBoost: 1,
    spin: { x: 0, y: 3.4, z: 0 },
    bob: { speed: 2, height: 0.12, ripple: 0 },
    sparkCount: 3,
    hasTrail: false,
  },
  orb: {
    shellOpacity: 0.7,
    shellShade: 0.22,
    coreBoost: 1.5,
    spin: { x: 0, y: 0, z: 0 },
    bob: { speed: 2.2, height: 0.18, ripple: 0.3 },
    sparkCount: 3,
    hasTrail: false,
    face: CREATURE_FACE,
  },
  shell: {
    shellOpacity: 0.62,
    shellShade: 1,
    coreBoost: 1.2,
    spin: { x: 0, y: 1.3, z: 0 },
    bob: { speed: 2.6, height: 0.15, ripple: 0.2 },
    sparkCount: 2,
    hasTrail: false,
  },
};

const geometries = createAssetCache<THREE.BufferGeometry>();

export function shellGeometry(shape: EnemyShape): THREE.BufferGeometry {
  return geometries.get(`shell:${shape}`, SHELL_BUILDERS[shape]);
}

export function coreGeometry(shape: EnemyShape): THREE.BufferGeometry {
  return geometries.get(`core:${shape}`, CORE_BUILDERS[shape]);
}

export function bobOffset(bob: BobMotion, time: number): number {
  const swing = Math.sin(time * bob.speed);
  const ripple = Math.sin(time * bob.speed * RIPPLE_FREQUENCY) * bob.ripple;
  return (swing + ripple) * bob.height;
}

function spiralBlocks(): Block[] {
  return Array.from({ length: SPIRAL.blocks }, (_, index) => {
    const progress = index / (SPIRAL.blocks - 1);
    const angle = progress * SPIRAL.turns * FULL_TURN;
    const radius = SPIRAL.radius * (1 - progress * SPIRAL.taper);
    const size = SPIRAL.blockSize * (1 - progress * SPIRAL.shrink);
    return {
      size: [size, size, size],
      position: [
        Math.cos(angle) * radius,
        SPIRAL.bottom + progress * SPIRAL.rise,
        Math.sin(angle) * radius,
      ],
      rotation: [0, -angle, 0],
    };
  });
}
