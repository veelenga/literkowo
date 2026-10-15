import * as THREE from 'three';
import type { ThemeId } from '../course/regions';
import type { AmbientSpec } from './AmbientParticles';
import * as props from './props';

export type EnemyShape = 'crystal' | 'wisp' | 'shard' | 'orb' | 'shell';

export interface PropSpec {
  build: () => THREE.Object3D;
  count: number;
  innerScale?: number;
}

export interface Theme {
  id: ThemeId;
  sky: number;
  fog: [near: number, far: number];
  ground: [light: number, dark: number];
  hemisphere: [sky: number, ground: number, intensity: number];
  sun: [color: number, intensity: number];
  enemyColors: number[];
  enemyShape: EnemyShape;
  props: PropSpec[];
  ambient?: AmbientSpec;
  clouds: number;
  water?: number;
}

const THEMES: Record<ThemeId, Theme> = {
  meadow: {
    id: 'meadow',
    sky: 0xbfe8ff,
    fog: [26, 52],
    ground: [0x8fd16b, 0x5fae4e],
    hemisphere: [0xdff6ff, 0x4f7a3a, 0.9],
    sun: [0xfff1d6, 2.2],
    enemyColors: [0x9b5de5, 0xf15bb5, 0x00bbf9, 0x00f5d4],
    enemyShape: 'crystal',
    props: [
      { build: () => props.coneTree([0x3f9a5a, 0x4fae6b, 0x2f8a4f, 0x6cc27e]), count: 60 },
      { build: () => props.roundTree([0x5fb86a, 0x7ccc6f]), count: 25 },
      { build: () => props.rock(), count: 24 },
      {
        build: () => props.flower([0xffd166, 0xef476f, 0xf8f9fa, 0x8ecae6]),
        count: 70,
        innerScale: 0.5,
      },
      { build: () => props.bush([0x4fae6b, 0x3f9a5a]), count: 20 },
    ],
    ambient: { count: 40, color: 0xfff4b0, size: 0.14, mode: 'drift' },
    clouds: 6,
  },
  forest: {
    id: 'forest',
    sky: 0x2b3a5c,
    fog: [14, 36],
    ground: [0x3f7a4a, 0x274d33],
    hemisphere: [0x6b7fb3, 0x1f3324, 0.6],
    sun: [0xffd9a3, 1.1],
    enemyColors: [0x7cf5a8, 0xb8ff7a, 0x5ee6d9],
    enemyShape: 'wisp',
    props: [
      {
        build: () => props.coneTree([0x1f5e3c, 0x27704a, 0x17493a], 0x4a2f1a),
        count: 140,
        innerScale: 0.9,
      },
      { build: () => props.mushroom(), count: 45, innerScale: 0.5 },
      { build: () => props.rock(0x5f6b73), count: 16 },
      { build: () => props.bush([0x27704a, 0x1f5e3c]), count: 30 },
    ],
    ambient: { count: 120, color: 0xd9ff7a, size: 0.16, mode: 'drift' },
    clouds: 0,
  },
  mountains: {
    id: 'mountains',
    sky: 0xd9ecff,
    fog: [24, 50],
    ground: [0xf4f7fb, 0xcfdbe8],
    hemisphere: [0xffffff, 0x9fb3c8, 1.0],
    sun: [0xffffff, 2.4],
    enemyColors: [0x7dd3fc, 0xbae6fd, 0xa5b4fc],
    enemyShape: 'shard',
    props: [
      { build: () => props.snowPine(), count: 70 },
      { build: () => props.rock(0x6b7a8a), count: 40 },
      { build: () => props.rock(0xe2e8f0), count: 30 },
    ],
    ambient: { count: 220, color: 0xffffff, size: 0.12, mode: 'fall' },
    clouds: 8,
  },
  cave: {
    id: 'cave',
    sky: 0x0b0f1f,
    fog: [10, 30],
    ground: [0x2c3047, 0x161a2b],
    hemisphere: [0x3b4a7a, 0x0b0f1f, 0.5],
    sun: [0x8fa3ff, 0.7],
    enemyColors: [0xc084fc, 0xf472b6, 0x60a5fa],
    enemyShape: 'orb',
    props: [
      { build: () => props.stalagmite(), count: 90, innerScale: 0.9 },
      {
        build: () => props.crystalCluster([0x60a5fa, 0xc084fc, 0x34d399]),
        count: 40,
        innerScale: 0.7,
      },
      { build: () => props.rock(0x3a3f55), count: 30 },
    ],
    ambient: { count: 80, color: 0x93c5fd, size: 0.14, mode: 'drift' },
    clouds: 0,
  },
  island: {
    id: 'island',
    sky: 0xffc9a3,
    fog: [26, 56],
    ground: [0xfde9b8, 0xf3d79a],
    hemisphere: [0xffe3c4, 0xd9b27a, 0.9],
    sun: [0xffb070, 2.0],
    enemyColors: [0xff8fab, 0xffd166, 0x06d6a0],
    enemyShape: 'shell',
    props: [
      { build: () => props.palm(), count: 36, innerScale: 0.8 },
      { build: () => props.shell(), count: 50, innerScale: 0.4 },
      { build: () => props.rock(0xc9b79c), count: 14 },
      { build: () => props.bush([0x3fae5e, 0x2f8a4f]), count: 14 },
    ],
    ambient: { count: 50, color: 0xfff7d6, size: 0.12, mode: 'drift' },
    clouds: 5,
    water: 0x4cc3e8,
  },
};

export function themeFor(id: ThemeId): Theme {
  return THEMES[id];
}
