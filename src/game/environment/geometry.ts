import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { hash3 } from './noise';

export type FaceShader = (center: THREE.Vector3, normal: THREE.Vector3) => THREE.Color;
export type VertexShader = (point: THREE.Vector3) => THREE.Color;

const VERTICES_PER_FACE = 3;
const ROUGHEN_AXES = 3;

function faceted(source: THREE.BufferGeometry): THREE.BufferGeometry {
  const geometry = source.index ? source.toNonIndexed() : source.clone();
  source.dispose();
  geometry.deleteAttribute('uv');
  geometry.deleteAttribute('normal');
  geometry.computeVertexNormals();
  return geometry;
}

export function paint(
  source: THREE.BufferGeometry,
  shade: FaceShader | THREE.Color,
): THREE.BufferGeometry {
  const geometry = faceted(source);
  const position = geometry.getAttribute('position');
  const normals = geometry.getAttribute('normal');
  const colors = new Float32Array(position.count * 3);
  const center = new THREE.Vector3();
  const normal = new THREE.Vector3();
  const corner = new THREE.Vector3();
  for (let face = 0; face < position.count; face += VERTICES_PER_FACE) {
    center.set(0, 0, 0);
    for (let k = 0; k < VERTICES_PER_FACE; k += 1)
      center.add(corner.fromBufferAttribute(position, face + k));
    center.divideScalar(VERTICES_PER_FACE);
    normal.fromBufferAttribute(normals, face);
    const color = shade instanceof THREE.Color ? shade : shade(center, normal);
    for (let k = 0; k < VERTICES_PER_FACE; k += 1) color.toArray(colors, (face + k) * 3);
  }
  geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  return geometry;
}

export function paintVertices(
  source: THREE.BufferGeometry,
  shade: VertexShader,
): THREE.BufferGeometry {
  const geometry = faceted(source);
  const position = geometry.getAttribute('position');
  const colors = new Float32Array(position.count * 3);
  const point = new THREE.Vector3();
  for (let i = 0; i < position.count; i += 1) {
    shade(point.fromBufferAttribute(position, i)).toArray(colors, i * 3);
  }
  geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  return geometry;
}

export function roughen<T extends THREE.BufferGeometry>(
  geometry: T,
  amount: number,
  seed: number,
): T {
  const position = geometry.getAttribute('position');
  for (let i = 0; i < position.count; i += 1) {
    const x = position.getX(i);
    const y = position.getY(i);
    const z = position.getZ(i);
    const offsets = Array.from(
      { length: ROUGHEN_AXES },
      (_, axis) => (hash3(x, y, z, seed + axis) - 0.5) * 2 * amount,
    );
    position.setXYZ(i, x + offsets[0], y + offsets[1], z + offsets[2]);
  }
  position.needsUpdate = true;
  return geometry;
}

export function merge(parts: THREE.BufferGeometry[]): THREE.BufferGeometry {
  const merged = mergeGeometries(parts, false);
  parts.forEach((part) => part.dispose());
  if (!merged) throw new Error('Cannot merge prop geometry parts');
  return merged;
}

export function gradient(bottom: THREE.Color, top: THREE.Color, from: number, to: number) {
  return (y: number): THREE.Color => {
    const t = THREE.MathUtils.clamp((y - from) / (to - from), 0, 1);
    return bottom.clone().lerp(top, t);
  };
}

export function vary(color: THREE.Color, amount: number, random: number): THREE.Color {
  return color.clone().multiplyScalar(1 + (random - 0.5) * 2 * amount);
}

export const color = (hex: number): THREE.Color => new THREE.Color(hex);
