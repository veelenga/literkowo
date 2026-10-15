import * as THREE from 'three';
import { createAssetCache } from '../../assetCache';
import type { EnemyBody } from '../../Enemy';
import { blockAssembly, chunkyBlock, type Block } from '../../effects/chunkyGeometry';
import type { BobMotion } from '../../effects/enemyStyles';
import type { FaceSpec } from '../../effects/GlowingFace';

const JUMPER_HOVER = 0.38;
export const BALLOON_HOVER = 0.9;
export const BAT_HEIGHT = 2.5;
const SWARM_HOVER = 1.05;
export const BALLOON_KNOT_DROP = 0.56;
export const BAT_SHOULDER = 0.17;

const STILL: BobMotion = { speed: 0, height: 0, ripple: 0 };
const BALLOON_BOB: BobMotion = { speed: 1.6, height: 0.12, ripple: 0.25 };
const BAT_BOB: BobMotion = { speed: 5, height: 0.14, ripple: 0.2 };
const SWARM_BOB: BobMotion = { speed: 3.2, height: 0.12, ripple: 0.5 };
const SWARM_BUG_SIZE = 0.19;
const STRING_THICKNESS = 0.025;

const SLIME: readonly Block[] = [
  { size: [0.96, 0.44, 0.96], position: [0, -0.12, 0] },
  { size: [0.72, 0.3, 0.72], position: [0, 0.2, 0] },
  { size: [0.38, 0.16, 0.38], position: [0, 0.4, 0] },
];

const BALLOON: readonly Block[] = [
  { size: [0.6, 0.34, 0.6], position: [0, 0.42, 0] },
  { size: [0.82, 0.5, 0.82], position: [0, 0.08, 0] },
  { size: [0.56, 0.28, 0.56], position: [0, -0.28, 0] },
  { size: [0.2, 0.16, 0.2], position: [0, -0.46, 0] },
];

const BAT_TORSO: readonly Block[] = [
  { size: [0.4, 0.4, 0.34] },
  { size: [0.1, 0.2, 0.08], position: [-0.12, 0.27, 0], rotation: [0, 0, 0.3] },
  { size: [0.1, 0.2, 0.08], position: [0.12, 0.27, 0], rotation: [0, 0, -0.3] },
];

const BAT_WING: readonly Block[] = [
  { size: [0.42, 0.07, 0.3], position: [0.21, 0, 0] },
  { size: [0.34, 0.06, 0.24], position: [0.58, -0.05, 0], rotation: [0, 0, -0.25] },
  { size: [0.2, 0.05, 0.16], position: [0.82, -0.14, 0], rotation: [0, 0, -0.5] },
];

const SLIME_FACE: FaceSpec = {
  color: 0xffffff,
  eyeSize: [0.12, 0.15, 0.04],
  eyeSpacing: 0.17,
  eyeHeight: 0,
  depth: 0.49,
  slant: 0,
  blinks: true,
  mouth: { size: [0.16, 0.05, 0.04], height: -0.16 },
};

const BAT_FACE: FaceSpec = {
  color: 0xffe066,
  eyeSize: [0.09, 0.07, 0.04],
  eyeSpacing: 0.09,
  eyeHeight: 0.05,
  depth: 0.18,
  slant: 0.35,
  blinks: true,
};

const geometries = createAssetCache<THREE.BufferGeometry>();

export function cachedGeometry(
  key: string,
  build: () => THREE.BufferGeometry,
): THREE.BufferGeometry {
  return geometries.get(key, build);
}

export function jumperBody(): EnemyBody {
  return {
    shell: cachedGeometry('jumper-shell', () => blockAssembly(SLIME)),
    core: cachedGeometry('jumper-core', () => chunkyBlock(0.3, 0.22, 0.3)),
    shellShade: 0.95,
    shellOpacity: 0.74,
    motion: { hoverHeight: JUMPER_HOVER, bob: STILL, facesViewer: true },
    sparkCount: 0,
    hasTrail: false,
    face: SLIME_FACE,
  };
}

export function balloonBody(): EnemyBody {
  return {
    shell: cachedGeometry('balloon-shell', () => blockAssembly(BALLOON)),
    core: cachedGeometry('balloon-core', () => chunkyBlock(0.2, 0.2, 0.2)),
    shellShade: 1,
    shellOpacity: 0.94,
    motion: { hoverHeight: BALLOON_HOVER, bob: BALLOON_BOB, facesViewer: true },
    sparkCount: 0,
    hasTrail: false,
  };
}

export function batBody(): EnemyBody {
  return {
    shell: cachedGeometry('bat-shell', () => blockAssembly(BAT_TORSO)),
    core: cachedGeometry('bat-core', () => chunkyBlock(0.16, 0.16, 0.16)),
    shellShade: 0.32,
    shellOpacity: 0.96,
    motion: { hoverHeight: BAT_HEIGHT, bob: BAT_BOB, facesViewer: true },
    sparkCount: 0,
    hasTrail: false,
    face: BAT_FACE,
  };
}

export function swarmBody(): EnemyBody {
  return {
    shell: cachedGeometry('swarm-shell', () => chunkyBlock(0.26, 0.26, 0.26)),
    core: cachedGeometry('swarm-core', () => chunkyBlock(0.12, 0.12, 0.12)),
    shellShade: 1,
    shellOpacity: 0.4,
    motion: { hoverHeight: SWARM_HOVER, bob: SWARM_BOB, facesViewer: false },
    sparkCount: 0,
    hasTrail: false,
  };
}

export function batWingGeometry(): THREE.BufferGeometry {
  return cachedGeometry('bat-wing', () => blockAssembly(BAT_WING));
}

export function bugGeometry(): THREE.BufferGeometry {
  return cachedGeometry('swarm-bug', () =>
    chunkyBlock(SWARM_BUG_SIZE, SWARM_BUG_SIZE, SWARM_BUG_SIZE),
  );
}

export function stringGeometry(length: number): THREE.BufferGeometry {
  return cachedGeometry(`balloon-string:${length}`, () =>
    chunkyBlock(STRING_THICKNESS, length, STRING_THICKNESS).translate(0, -length / 2, 0),
  );
}

export function bombGeometry(size: number): THREE.BufferGeometry {
  return cachedGeometry(`bomb:${size}`, () => chunkyBlock(size, size, size));
}
