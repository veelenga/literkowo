import * as THREE from 'three';
import { isMesh, isTexture } from './threeGuards';

export const CHARACTER_HEIGHT = 1.9;
export const IDLE_CLIP = 'idle';

const HEAD_NODE = 'head';

const MISSING_CLIP_ERROR = 'Character model has no animation clip named';
const LIT_ROUGHNESS = 0.85;

const SHADOW_COLOR = 0x000000;
const SHADOW_DIAMETER = 1;
const SHADOW_LIFT = 0.01;
const SHADOW_OPACITY = 0.35;
const SHADOW_TEXTURE_SIZE = 64;
const SHADOW_SOFT_CORE = 0.15;
const PIXEL_CENTER = 0.5;
const RGBA_CHANNELS = 4;
const ALPHA_CHANNEL = 3;
const MAX_BYTE = 255;

export function characterModelUrl(character: string): string {
  return `${import.meta.env.BASE_URL}models/characters/character-${character}.glb`;
}

export function findClip(clips: THREE.AnimationClip[], name: string): THREE.AnimationClip {
  const clip = THREE.AnimationClip.findByName(clips, name);
  if (!clip) throw new Error(`${MISSING_CLIP_ERROR} ${name}`);
  return clip;
}

export function fitToCharacterHeight(model: THREE.Object3D): void {
  model.updateMatrixWorld(true);
  const bounds = new THREE.Box3().setFromObject(model);
  const center = bounds.getCenter(new THREE.Vector3());
  const scale = CHARACTER_HEIGHT / (bounds.max.y - bounds.min.y);
  model.scale.setScalar(scale);
  model.position.set(-center.x * scale, -bounds.min.y * scale, -center.z * scale);
}

export function mountOnHead(model: THREE.Object3D, accessory: THREE.Object3D): void {
  const head = model.getObjectByName(HEAD_NODE) ?? model;
  const bounds = localBounds(head);
  const center = bounds.getCenter(new THREE.Vector3());
  accessory.position.set(center.x, bounds.max.y, center.z);
  accessory.scale.setScalar(bounds.max.x - bounds.min.x);
  head.add(accessory);
}

function localBounds(node: THREE.Object3D): THREE.Box3 {
  node.updateWorldMatrix(true, true);
  const toLocal = node.matrixWorld.clone().invert();
  return new THREE.Box3().setFromObject(node, true).applyMatrix4(toLocal);
}

export function prepareMeshes(model: THREE.Object3D): void {
  model.traverse((child) => {
    if (!isMesh(child)) return;
    child.castShadow = true;
    child.receiveShadow = true;
    child.material = Array.isArray(child.material)
      ? child.material.map(litMaterial)
      : litMaterial(child.material);
  });
}

function litMaterial(source: THREE.Material): THREE.MeshStandardMaterial {
  const map = 'map' in source && isTexture(source.map) ? source.map : null;
  if (map) keepPixelsCrisp(map);
  const material = new THREE.MeshStandardMaterial({ map, roughness: LIT_ROUGHNESS, metalness: 0 });
  source.dispose();
  return material;
}

function keepPixelsCrisp(texture: THREE.Texture): void {
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.magFilter = THREE.NearestFilter;
  texture.needsUpdate = true;
}

export function createContactShadow(opacity = SHADOW_OPACITY): THREE.Mesh {
  const geometry = new THREE.CircleGeometry(SHADOW_DIAMETER / 2);
  geometry.rotateX(-Math.PI / 2);
  const material = new THREE.MeshBasicMaterial({
    color: SHADOW_COLOR,
    map: createShadowTexture(),
    transparent: true,
    opacity,
    depthWrite: false,
  });
  const shadow = new THREE.Mesh(geometry, material);
  shadow.position.y = SHADOW_LIFT;
  return shadow;
}

function createShadowTexture(): THREE.DataTexture {
  const size = SHADOW_TEXTURE_SIZE;
  const pixels = new Uint8Array(size * size * RGBA_CHANNELS);
  for (let row = 0; row < size; row += 1) {
    for (let column = 0; column < size; column += 1) {
      const alphaIndex = (row * size + column) * RGBA_CHANNELS + ALPHA_CHANNEL;
      pixels[alphaIndex] = shadowAlphaAt(column, row, size) * MAX_BYTE;
    }
  }
  const texture = new THREE.DataTexture(pixels, size, size);
  texture.magFilter = THREE.LinearFilter;
  texture.minFilter = THREE.LinearFilter;
  texture.needsUpdate = true;
  return texture;
}

function shadowAlphaAt(column: number, row: number, size: number): number {
  const half = size / 2;
  const offsetX = column + PIXEL_CENTER - half;
  const offsetY = row + PIXEL_CENTER - half;
  const distanceFromCenter = Math.hypot(offsetX, offsetY) / half;
  return 1 - THREE.MathUtils.smoothstep(distanceFromCenter, SHADOW_SOFT_CORE, 1);
}
