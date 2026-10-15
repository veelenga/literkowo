import type * as THREE from 'three';
import type { MaterialKit } from './materials';
import type { Rng } from './random';
import type { Terrain, TerrainSpec } from './Terrain';

export interface Animated {
  update(delta: number, elapsed: number): void;
}

export interface BiomeContext {
  rng: Rng;
  terrain: Terrain;
  materials: MaterialKit;
  sunDirection: THREE.Vector3;
  add(object: THREE.Object3D): void;
  animate(item: Animated): void;
}

export interface Landscape {
  terrain: TerrainSpec;
  decorate(context: BiomeContext): void;
}

export type Biome = (rng: Rng) => Landscape;
