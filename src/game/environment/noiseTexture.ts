import * as THREE from 'three';
import { createAssetCache } from '../assetCache';
import { valueNoise } from './noise';

const TEXTURE_SIZE = 128;
const PERIOD = 16;
const OCTAVES = [
  { frequency: 1, weight: 0.6 },
  { frequency: 2, weight: 0.28 },
  { frequency: 4, weight: 0.12 },
];
const NOISE_SEED = 911;
const BYTE = 255;
const RGBA_CHANNELS = 4;

const textures = createAssetCache<THREE.DataTexture>();

function periodic(
  sample: (x: number, y: number) => number,
  x: number,
  y: number,
  period: number,
): number {
  const u = x / period;
  const v = y / period;
  const wrapX = x - period;
  const wrapY = y - period;
  return (
    sample(x, y) * (1 - u) * (1 - v) +
    sample(wrapX, y) * u * (1 - v) +
    sample(x, wrapY) * (1 - u) * v +
    sample(wrapX, wrapY) * u * v
  );
}

export function noiseTexture(): THREE.DataTexture {
  return textures.get('noise', createNoiseTexture);
}

function createNoiseTexture(): THREE.DataTexture {
  const data = new Uint8Array(TEXTURE_SIZE * TEXTURE_SIZE * RGBA_CHANNELS);
  const layers = OCTAVES.map((octave, index) => ({
    ...octave,
    noise: valueNoise(NOISE_SEED + index),
  }));
  for (let j = 0; j < TEXTURE_SIZE; j += 1) {
    for (let i = 0; i < TEXTURE_SIZE; i += 1) {
      const x = (i / TEXTURE_SIZE) * PERIOD;
      const y = (j / TEXTURE_SIZE) * PERIOD;
      const value = layers.reduce(
        (sum, layer) =>
          sum +
          layer.weight *
            periodic(
              layer.noise,
              x * layer.frequency,
              y * layer.frequency,
              PERIOD * layer.frequency,
            ),
        0,
      );
      const offset = (j * TEXTURE_SIZE + i) * RGBA_CHANNELS;
      data.fill(Math.round(value * BYTE), offset, offset + RGBA_CHANNELS);
    }
  }
  const texture = new THREE.DataTexture(data, TEXTURE_SIZE, TEXTURE_SIZE);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.magFilter = THREE.LinearFilter;
  texture.minFilter = THREE.LinearMipmapLinearFilter;
  texture.generateMipmaps = true;
  texture.needsUpdate = true;
  return texture;
}

export const NOISE_PERIOD = PERIOD;
