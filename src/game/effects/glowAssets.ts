import * as THREE from 'three';
import { createAssetCache } from './assetCache';

type AlphaStop = readonly [offset: number, alpha: number];

const TEXTURE_SIZE = 128;
const SOFT_GLOW_STOPS: readonly AlphaStop[] = [
  [0, 1],
  [0.25, 0.65],
  [0.6, 0.18],
  [1, 0],
];
const GROUND_GLOW_STOPS: readonly AlphaStop[] = [
  [0, 0.3],
  [0.5, 0.35],
  [0.76, 0.95],
  [0.86, 0.5],
  [1, 0],
];
const SHOCKWAVE_STOPS: readonly AlphaStop[] = [
  [0, 0],
  [0.55, 0],
  [0.8, 1],
  [0.88, 0.5],
  [1, 0],
];

const textures = createAssetCache<THREE.Texture>();
const geometries = createAssetCache<THREE.BufferGeometry>();

export function softGlowTexture(): THREE.Texture {
  return textures('soft-glow', () => radialTexture(SOFT_GLOW_STOPS));
}

export function groundGlowTexture(): THREE.Texture {
  return textures('ground-glow', () => radialTexture(GROUND_GLOW_STOPS));
}

export function shockwaveTexture(): THREE.Texture {
  return textures('shockwave', () => radialTexture(SHOCKWAVE_STOPS));
}

export function groundPlaneGeometry(): THREE.BufferGeometry {
  return geometries('ground-plane', () => new THREE.PlaneGeometry(1, 1).rotateX(-Math.PI / 2));
}

function radialTexture(stops: readonly AlphaStop[]): THREE.Texture {
  const canvas = document.createElement('canvas');
  canvas.width = TEXTURE_SIZE;
  canvas.height = TEXTURE_SIZE;
  const context = canvas.getContext('2d');
  if (context) paintRadialGradient(context, stops);
  return new THREE.CanvasTexture(canvas);
}

function paintRadialGradient(context: CanvasRenderingContext2D, stops: readonly AlphaStop[]): void {
  const center = TEXTURE_SIZE / 2;
  const gradient = context.createRadialGradient(center, center, 0, center, center, center);
  for (const [offset, alpha] of stops)
    gradient.addColorStop(offset, `rgba(255, 255, 255, ${alpha})`);
  context.fillStyle = gradient;
  context.fillRect(0, 0, TEXTURE_SIZE, TEXTURE_SIZE);
}
