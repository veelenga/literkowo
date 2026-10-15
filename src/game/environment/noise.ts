export type Noise2D = (x: number, y: number) => number;

const HASH_X = 374761393;
const HASH_Y = 668265263;
const HASH_Z = 2246822519;
const HASH_SEED = 3266489917;
const HASH_MIX = 1274126177;
const UINT32_RANGE = 4294967296;
const QUANTIZE = 1000;

function mix32(value: number): number {
  let h = Math.imul(value ^ (value >>> 13), HASH_MIX);
  h ^= h >>> 16;
  return (h >>> 0) / UINT32_RANGE;
}

export function hash2(x: number, y: number, seed: number): number {
  return mix32(Math.imul(x, HASH_X) + Math.imul(y, HASH_Y) + Math.imul(seed, HASH_SEED));
}

export function hash3(x: number, y: number, z: number, seed: number): number {
  const qx = Math.round(x * QUANTIZE);
  const qy = Math.round(y * QUANTIZE);
  const qz = Math.round(z * QUANTIZE);
  return mix32(
    Math.imul(qx, HASH_X) +
      Math.imul(qy, HASH_Y) +
      Math.imul(qz, HASH_Z) +
      Math.imul(seed, HASH_SEED),
  );
}

const fade = (t: number): number => t * t * t * (t * (t * 6 - 15) + 10);
const lerp = (a: number, b: number, t: number): number => a + (b - a) * t;

export function valueNoise(seed: number): Noise2D {
  return (x, y) => {
    const ix = Math.floor(x);
    const iy = Math.floor(y);
    const u = fade(x - ix);
    const v = fade(y - iy);
    const top = lerp(hash2(ix, iy, seed), hash2(ix + 1, iy, seed), u);
    const bottom = lerp(hash2(ix, iy + 1, seed), hash2(ix + 1, iy + 1, seed), u);
    return lerp(top, bottom, v);
  };
}

export function fbm(seed: number, octaves = 4, lacunarity = 2, gain = 0.5): Noise2D {
  const layers = Array.from({ length: octaves }, (_, index) => valueNoise(seed + index * 101));
  const total = layers.reduce((sum, _, index) => sum + gain ** index, 0);
  return (x, y) => {
    let sum = 0;
    let frequency = 1;
    let amplitude = 1;
    for (const layer of layers) {
      sum += layer(x * frequency, y * frequency) * amplitude;
      frequency *= lacunarity;
      amplitude *= gain;
    }
    return sum / total;
  };
}

export function ridged(seed: number, octaves = 4): Noise2D {
  const base = fbm(seed, octaves);
  return (x, y) => 1 - Math.abs(base(x, y) * 2 - 1);
}

export const clamp01 = (value: number): number => Math.min(1, Math.max(0, value));

export function smoothstep(edge0: number, edge1: number, value: number): number {
  const t = clamp01((value - edge0) / (edge1 - edge0));
  return t * t * (3 - 2 * t);
}
