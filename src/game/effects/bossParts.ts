import * as THREE from 'three';
import { createAssetCache } from './assetCache';
import { chunkyBlock, mergeParts, placed } from './chunkyGeometry';
import type { FaceSpec } from './GlowingFace';

const TORSO = { width: 1.1, height: 0.95, depth: 0.85 };
const BROW = { width: 0.92, height: 0.14, depth: 0.2, lift: 0.25, reach: 0.4 };
const HORN = { radius: 0.13, height: 0.42, sides: 4, spread: 0.38, lift: 0.6, tilt: 0.35 };
const HEART_SIZE = 0.42;
const SIDES = [-1, 1] as const;
const QUARTER_TURN = Math.PI / 4;

export const BOSS_FACE: FaceSpec = {
  color: 0xffe066,
  eyeSize: [0.2, 0.08, 0.04],
  eyeSpacing: 0.22,
  eyeHeight: 0.1,
  depth: 0.44,
  slant: 0.3,
  blinks: false,
  mouth: { size: [0.46, 0.06, 0.04], height: -0.2 },
};

const geometries = createAssetCache<THREE.BufferGeometry>();

export function bossBodyGeometry(): THREE.BufferGeometry {
  return geometries('boss-body', () =>
    mergeParts([chunkyBlock(TORSO.width, TORSO.height, TORSO.depth), brow(), ...SIDES.map(horn)]),
  );
}

export function bossCoreGeometry(): THREE.BufferGeometry {
  return geometries('boss-core', () => chunkyBlock(HEART_SIZE, HEART_SIZE, HEART_SIZE));
}

function brow(): THREE.BufferGeometry {
  return placed(chunkyBlock(BROW.width, BROW.height, BROW.depth), {
    position: [0, BROW.lift, BROW.reach],
  });
}

function horn(side: number): THREE.BufferGeometry {
  const spike = new THREE.ConeGeometry(HORN.radius, HORN.height, HORN.sides).rotateY(QUARTER_TURN);
  return placed(spike, {
    position: [side * HORN.spread, HORN.lift, 0],
    rotation: [0, 0, -side * HORN.tilt],
  });
}
