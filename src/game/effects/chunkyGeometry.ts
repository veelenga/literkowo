import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

export type Triple = readonly [number, number, number];

export interface Placement {
  position?: Triple;
  rotation?: Triple;
}

export interface Block extends Placement {
  size: Triple;
}

type ProfilePoint = readonly [radius: number, height: number];

const BEVEL_SEGMENTS = 1;
const BEVEL_RATIO = 0.2;
const GEM_FACETS = 6;
const GEM_PROFILE: readonly ProfilePoint[] = [
  [0, -0.6],
  [1, 0.02],
  [0.72, 0.32],
  [0, 0.32],
];
const ZERO: Triple = [0, 0, 0];
const UNIT_SCALE = new THREE.Vector3(1, 1, 1);

export function chunkyBlock(width: number, height: number, depth: number): THREE.BufferGeometry {
  const bevel = Math.min(width, height, depth) * BEVEL_RATIO;
  return new RoundedBoxGeometry(width, height, depth, BEVEL_SEGMENTS, bevel);
}

export function chunkyGem(radius: number, height: number): THREE.BufferGeometry {
  const profile = GEM_PROFILE.map(([x, y]) => new THREE.Vector2(x * radius, y * height));
  return new THREE.LatheGeometry(profile, GEM_FACETS).center();
}

export function blockAssembly(blocks: readonly Block[]): THREE.BufferGeometry {
  return mergeParts(blocks.map((block) => placed(chunkyBlock(...block.size), block)));
}

export function placed(geometry: THREE.BufferGeometry, placement: Placement): THREE.BufferGeometry {
  const position = new THREE.Vector3(...(placement.position ?? ZERO));
  const rotation = new THREE.Quaternion().setFromEuler(
    new THREE.Euler(...(placement.rotation ?? ZERO)),
  );
  return geometry.applyMatrix4(new THREE.Matrix4().compose(position, rotation, UNIT_SCALE));
}

export function mergeParts(parts: THREE.BufferGeometry[]): THREE.BufferGeometry {
  const flattened = parts.map(withoutIndex);
  const merged = mergeGeometries(flattened);
  for (const part of [...parts, ...flattened]) part.dispose();
  return merged;
}

function withoutIndex(geometry: THREE.BufferGeometry): THREE.BufferGeometry {
  return geometry.index ? geometry.toNonIndexed() : geometry.clone();
}
