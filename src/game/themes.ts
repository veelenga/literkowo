import type { ThemeId } from '../course/catalog';
import type { AmbientSpec } from './AmbientParticles';
import { cave } from './environment/biomes/cave';
import { forest } from './environment/biomes/forest';
import { island } from './environment/biomes/island';
import { meadow } from './environment/biomes/meadow';
import { mountains } from './environment/biomes/mountains';
import type { CloudShadowSpec } from './environment/materials';
import type { SkySpec } from './environment/SkyDome';
import type { Biome } from './environment/types';

export type EnemyShape = 'crystal' | 'wisp' | 'shard' | 'orb' | 'shell';

export interface LightSpec {
  hemisphere: { sky: number; ground: number; intensity: number };
  sun: { color: number; intensity: number; direction: [x: number, y: number, z: number] };
}

export interface FogSpec {
  color: number;
  near: number;
  far: number;
}

export interface Theme {
  id: ThemeId;
  enemyColors: number[];
  enemyShape: EnemyShape;
  seed: number;
  landscape: Biome;
  sky: SkySpec;
  fog: FogSpec;
  light: LightSpec;
  clouds?: CloudShadowSpec;
  ambient: AmbientSpec[];
}

const THEMES: Record<ThemeId, Theme> = {
  meadow: {
    id: 'meadow',
    enemyColors: [0x9b5de5, 0xf15bb5, 0x00bbf9, 0x00f5d4],
    enemyShape: 'crystal',
    seed: 1207,
    landscape: meadow,
    sky: {
      top: 0x6fa8ff,
      horizon: 0xffd6a0,
      bottom: 0xf3d4a0,
      sun: { color: 0xffc070, size: 0.012, glow: 0.8 },
    },
    fog: { color: 0xf3d4a0, near: 30, far: 74 },
    light: {
      hemisphere: { sky: 0x93a8ff, ground: 0xa88a4a, intensity: 1.35 },
      sun: { color: 0xffa452, intensity: 4, direction: [-0.55, 0.5, -0.67] },
    },
    clouds: { strength: 0.5, scale: 0.045, speed: 1.1 },
    ambient: [
      {
        count: 110,
        colors: [0xfff1a8, 0xffd36b],
        size: 0.26,
        glow: 1.7,
        motion: 'drift',
        height: [0.4, 3.2],
        additive: true,
        speed: 0.8,
      },
    ],
  },
  forest: {
    id: 'forest',
    enemyColors: [0x7cf5a8, 0xb8ff7a, 0x5ee6d9],
    enemyShape: 'wisp',
    seed: 2203,
    landscape: forest,
    sky: { top: 0x0d1530, horizon: 0x2c3f6e, bottom: 0x1a2648 },
    fog: { color: 0x1a2648, near: 18, far: 48 },
    light: {
      hemisphere: { sky: 0x6a82c8, ground: 0x1d2e2c, intensity: 1.5 },
      sun: { color: 0x9db8ff, intensity: 1.6, direction: [0.45, 0.65, -0.6] },
    },
    ambient: [
      {
        count: 170,
        colors: [0xd8ff6a, 0xfff07a, 0x9dffb0],
        size: 0.42,
        glow: 3.2,
        motion: 'blink',
        height: [0.4, 3.6],
        additive: true,
        speed: 0.9,
      },
    ],
  },
  mountains: {
    id: 'mountains',
    enemyColors: [0x2f7bff, 0x7c4dff, 0x00a8d6],
    enemyShape: 'shard',
    seed: 3301,
    landscape: mountains,
    sky: { top: 0x4f95ff, horizon: 0xdcecff, bottom: 0xd3e4f7 },
    fog: { color: 0xd3e4f7, near: 28, far: 70 },
    light: {
      hemisphere: { sky: 0x8fb8ff, ground: 0xd8e4f5, intensity: 1.35 },
      sun: { color: 0xfff1dc, intensity: 2.5, direction: [-0.5, 0.65, -0.55] },
    },
    clouds: { strength: 0.35, scale: 0.04, speed: 1.6 },
    ambient: [
      {
        count: 650,
        colors: [0xffffff, 0xeaf4ff],
        size: 0.17,
        glow: 1,
        motion: 'fall',
        height: [0, 13],
        opacity: 0.9,
        speed: 1.3,
      },
    ],
  },
  cave: {
    id: 'cave',
    enemyColors: [0xc084fc, 0xf472b6, 0x60a5fa],
    enemyShape: 'orb',
    seed: 4409,
    landscape: cave,
    sky: { top: 0x05070f, horizon: 0x0c0f22, bottom: 0x0c0f22 },
    fog: { color: 0x0c0f22, near: 20, far: 50 },
    light: {
      hemisphere: { sky: 0x7078d0, ground: 0x1a1f3c, intensity: 1.9 },
      sun: { color: 0x9aa6ff, intensity: 1.2, direction: [0.2, 0.9, -0.35] },
    },
    ambient: [
      {
        count: 140,
        colors: [0x5ef2d8, 0xb98cff, 0x7ab8ff],
        size: 0.22,
        glow: 2.6,
        motion: 'rise',
        height: [0.2, 8],
        additive: true,
        speed: 0.35,
      },
    ],
  },
  island: {
    id: 'island',
    enemyColors: [0xff4f8b, 0x8f5cff, 0x00b894],
    enemyShape: 'shell',
    seed: 5503,
    landscape: island,
    sky: {
      top: 0x7a6cc9,
      horizon: 0xffa27a,
      bottom: 0xffb994,
      sun: { color: 0xffa050, size: 0.05, glow: 1.4 },
    },
    fog: { color: 0xffb994, near: 36, far: 84 },
    light: {
      hemisphere: { sky: 0xffd2c0, ground: 0xffe2a8, intensity: 1.35 },
      sun: { color: 0xffb06a, intensity: 3.2, direction: [0.35, 0.32, -0.88] },
    },
    clouds: { strength: 0.3, scale: 0.04, speed: 1.2 },
    ambient: [],
  },
};

export function themeFor(id: ThemeId): Theme {
  return THEMES[id];
}
