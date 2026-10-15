import * as THREE from 'three';
import type { WordSource } from '../../../course/WordSource';
import { SPAWN_RADIUS } from '../../board';
import type { Enemy, EnemyLook } from '../../Enemy';
import type { Phase } from '../../RunPlan';
import { wordWithin } from '../enemyTypes/words';
import { ChestEnemy } from './ChestEnemy';
import { EventEnemy, type EventHost } from './EventEnemy';
import { MeteorEnemy } from './MeteorEnemy';

export type WaveEventKind = 'rush' | 'meteors' | 'chest';
export type Random = () => number;

export const WAVE_EVENT_KINDS: readonly WaveEventKind[] = ['rush', 'meteors', 'chest'];
export const RUSH = { pieces: 6, seconds: 4, speedShare: 1.15, scale: 0.8 };
export const METEORS = { pieces: 8, spacing: 0.35, minRadius: 4.5, maxRadius: 9 };
export const CHEST = { letters: 5 };

const RUSH_LABEL_CLASS = 'is-rush';
const TWO_LETTERS = { min: 2, max: 2 };
const CHEST_LETTERS = { min: CHEST.letters, max: CHEST.letters };
const ARC_MARGIN = 0.35;
const HALF = 0.5;

export interface EventKit {
  readonly words: WordSource;
  readonly letters: string;
  readonly phase: Phase;
  readonly look: EnemyLook;
  readonly enemies: readonly Enemy[];
  readonly host: EventHost;
  readonly random: Random;
  createLabel(): HTMLElement;
}

export interface EventPlan {
  readonly pieces: number;
  readonly spacing: number;
  readonly radius?: number;
  create(kit: EventKit): Enemy;
}

export const EVENT_PLANS: Readonly<Record<WaveEventKind, EventPlan>> = {
  rush: {
    pieces: RUSH.pieces,
    spacing: RUSH.seconds / RUSH.pieces,
    radius: SPAWN_RADIUS,
    create: (kit) =>
      new EventEnemy(
        rushWord(kit),
        kit.createLabel(),
        kit.phase.speed * RUSH.speedShare,
        { ...kit.look, scale: RUSH.scale },
        RUSH_LABEL_CLASS,
      ),
  },
  meteors: {
    pieces: METEORS.pieces,
    spacing: METEORS.spacing,
    create: (kit) =>
      new MeteorEnemy(freeLetter(kit), kit.createLabel(), landingSpot(kit.random), kit.host),
  },
  chest: {
    pieces: 1,
    spacing: 0,
    create: (kit) =>
      new ChestEnemy(
        wordWithin(kit.words, CHEST_LETTERS),
        kit.createLabel(),
        kit.random() < HALF ? 1 : -1,
        kit.host,
      ),
  },
};

function rushWord(kit: EventKit): string {
  return kit.random() < HALF ? kit.words.singleLetter() : wordWithin(kit.words, TWO_LETTERS);
}

function freeLetter(kit: EventKit): string {
  const taken = new Set(kit.enemies.map((enemy) => enemy.expectedChar));
  const free = [...kit.letters].filter((letter) => !taken.has(letter));
  const pool = free.length ? free : [...kit.letters];
  return pool[Math.floor(kit.random() * pool.length)];
}

function landingSpot(random: Random): THREE.Vector3 {
  const angle = Math.PI - ARC_MARGIN + random() * (Math.PI + ARC_MARGIN * 2);
  const radius = THREE.MathUtils.lerp(METEORS.minRadius, METEORS.maxRadius, random());
  return new THREE.Vector3(Math.cos(angle) * radius, 0, Math.sin(angle) * radius);
}
