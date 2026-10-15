import type { Level } from '../course/regions';
import { regionOf, REGIONS } from '../course/regions';

export type PhaseKind = 'warmup' | 'words' | 'boss';

export interface Phase {
  kind: PhaseKind;
  count: number;
  speed: number;
  spawnInterval: number;
}

const WARMUP_COUNT = 8;
const WARMUP_SPEED = 0.55;
const WARMUP_INTERVAL = 1.5;
const WORDS_BASE_COUNT = 10;
const WORDS_PER_REGION = 2;
const WORDS_BASE_SPEED = 0.7;
const WORDS_SPEED_PER_LEVEL = 0.025;
const WORDS_BASE_INTERVAL = 3.4;
const WORDS_INTERVAL_PER_LEVEL = 0.06;
const WORDS_MIN_INTERVAL = 1.8;
const BOSS_BASE_HITS = 6;
const BOSS_HITS_PER_REGION = 2;
const BOSS_BASE_SPEED = 0.32;
const BOSS_SPEED_PER_REGION = 0.05;

export function planFor(level: Level): Phase[] {
  const regionIndex = REGIONS.indexOf(regionOf(level));
  if (level.isBoss) {
    return [
      {
        kind: 'boss',
        count: BOSS_BASE_HITS + regionIndex * BOSS_HITS_PER_REGION,
        speed: BOSS_BASE_SPEED + regionIndex * BOSS_SPEED_PER_REGION,
        spawnInterval: 0,
      },
    ];
  }
  return [
    { kind: 'warmup', count: WARMUP_COUNT, speed: WARMUP_SPEED, spawnInterval: WARMUP_INTERVAL },
    {
      kind: 'words',
      count: WORDS_BASE_COUNT + regionIndex * WORDS_PER_REGION,
      speed: WORDS_BASE_SPEED + level.order * WORDS_SPEED_PER_LEVEL,
      spawnInterval: Math.max(
        WORDS_MIN_INTERVAL,
        WORDS_BASE_INTERVAL - level.order * WORDS_INTERVAL_PER_LEVEL,
      ),
    },
  ];
}
