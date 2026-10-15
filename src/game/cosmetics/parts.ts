import * as THREE from 'three';
import { chunkyBlock, placed, type Placement, type Triple } from '../effects/chunkyGeometry';

const ROUGHNESS = 0.62;
const EYE_COLOR = 0x1b1530;
const EYE_SIZE: Triple = [0.06, 0.08, 0.025];

export interface FinishOptions {
  glow?: number;
  opacity?: number;
  roughness?: number;
  metalness?: number;
}

export function finish(
  color: THREE.ColorRepresentation,
  { glow = 0, opacity = 1, roughness = ROUGHNESS, metalness = 0 }: FinishOptions = {},
): THREE.MeshStandardMaterial {
  return new THREE.MeshStandardMaterial({
    color,
    emissive: glow > 0 ? color : 0x000000,
    emissiveIntensity: glow,
    roughness,
    metalness,
    transparent: opacity < 1,
    opacity,
  });
}

export function part(
  geometry: THREE.BufferGeometry,
  material: THREE.Material,
  placement: Placement = {},
): THREE.Mesh {
  const mesh = new THREE.Mesh(placed(geometry, placement), material);
  mesh.castShadow = true;
  return mesh;
}

export function block(
  size: Triple,
  material: THREE.Material,
  placement: Placement = {},
): THREE.Mesh {
  return part(chunkyBlock(...size), material, placement);
}

export interface EyeSpec {
  spacing: number;
  height: number;
  depth: number;
  scale?: number;
}

export function eyes({ spacing, height, depth, scale = 1 }: EyeSpec): THREE.Mesh[] {
  const material = finish(EYE_COLOR);
  const size: Triple = [EYE_SIZE[0] * scale, EYE_SIZE[1] * scale, EYE_SIZE[2]];
  return [-1, 1].map((side) =>
    block(size, material, { position: [(side * spacing) / 2, height, depth] }),
  );
}

export function shade(color: string, lightness: number): THREE.Color {
  return new THREE.Color(color).offsetHSL(0, 0, lightness);
}

export function pivot(position: Triple, ...children: THREE.Object3D[]): THREE.Group {
  const group = new THREE.Group();
  group.position.set(...position);
  group.add(...children);
  return group;
}
