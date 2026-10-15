import * as THREE from 'three';
import type { EnemyBody, EnemyLook } from '../../Enemy';
import { blockAssembly, chunkyBlock, type Block } from '../../effects/chunkyGeometry';
import type { BobMotion } from '../../effects/enemyStyles';
import { cachedGeometry } from '../enemyTypes/bodies';
import { EventEnemy, type EventHost } from './EventEnemy';

export const START_HEIGHT = 11;
export const FALL_SECONDS = 1.2;
export const GROUND_SECONDS = 6;

const LABEL_CLASS = 'is-meteor';
const FADE_SECONDS = 0.5;
const FALL_OFFSET = 2.5;
const HOVER = 0.35;
const LABEL_GAP = 1;
const STILL: BobMotion = { speed: 0, height: 0, ripple: 0 };
const LOOK: EnemyLook = { shape: 'wisp', colors: [0xff7a1a, 0xff4a2a, 0xffb02a], scale: 0.8 };
const STREAK = { puffs: 5, spacing: 0.5, lean: 0.12, size: 0.34, shrink: 0.15, opacity: 0.8 };

const ROCK: readonly Block[] = [
  { size: [0.56, 0.5, 0.52] },
  { size: [0.3, 0.3, 0.3], position: [0.28, 0.16, 0.1], rotation: [0.4, 0.3, 0.2] },
  { size: [0.26, 0.26, 0.26], position: [-0.26, -0.12, 0.16], rotation: [0.2, 0.7, 0.4] },
];

function rockBody(): EnemyBody {
  return {
    shell: cachedGeometry('meteor-rock', () => blockAssembly(ROCK)),
    core: cachedGeometry('meteor-core', () => chunkyBlock(0.3, 0.3, 0.3)),
    shellShade: 0.55,
    shellOpacity: 0.97,
    motion: { hoverHeight: HOVER, bob: STILL, facesViewer: false },
    sparkCount: 0,
    hasTrail: false,
  };
}

function createStreak(color: THREE.Color): THREE.Mesh[] {
  const geometry = cachedGeometry('meteor-streak', () =>
    chunkyBlock(STREAK.size, STREAK.size, STREAK.size),
  );
  return Array.from({ length: STREAK.puffs }, (_, index) => {
    const step = index + 1;
    const material = new THREE.MeshBasicMaterial({
      color,
      transparent: true,
      opacity: STREAK.opacity * (1 - step / (STREAK.puffs + 1)),
      depthWrite: false,
    });
    const puff = new THREE.Mesh(geometry, material);
    puff.scale.setScalar(1 - step * STREAK.shrink);
    return puff;
  });
}

export class MeteorEnemy extends EventEnemy {
  private readonly start = new THREE.Vector3();
  private readonly landing = new THREE.Vector3();
  private readonly streak: THREE.Mesh[];
  private age = 0;
  private landed = false;

  constructor(
    word: string,
    label: HTMLElement,
    target: THREE.Vector3,
    private readonly host: EventHost,
  ) {
    super(word, label, 0, LOOK, LABEL_CLASS, rockBody());
    this.landing.set(target.x, 0, target.z);
    this.start.copy(this.landing).setLength(this.landing.length() + FALL_OFFSET);
    this.object.position.copy(this.start);
    this.streak = createStreak(this.color);
    this.object.add(...this.streak);
  }

  get isLanded(): boolean {
    return this.landed;
  }

  get altitude(): number {
    if (this.landed) return 0;
    const progress = Math.min(1, this.age / FALL_SECONDS);
    return START_HEIGHT * (1 - progress * progress);
  }

  override get labelHeight(): number {
    return HOVER + this.altitude + LABEL_GAP;
  }

  override update(delta: number, elapsed: number, viewer: THREE.Vector3Like): void {
    super.update(delta, elapsed, viewer);
    if (!this.isFrozen) this.age += delta;
    if (this.landed) this.smoulder();
    else this.fall();
    this.rig.position.y += this.altitude;
  }

  private fall(): void {
    const progress = Math.min(1, this.age / FALL_SECONDS);
    this.object.position.lerpVectors(this.start, this.landing, progress);
    this.placeStreak();
    if (progress >= 1) this.land();
  }

  private placeStreak(): void {
    this.refreshOutward();
    this.streak.forEach((puff, index) => {
      const step = index + 1;
      puff.position
        .copy(this.outward)
        .multiplyScalar(step * STREAK.lean)
        .setY(HOVER + this.altitude + step * STREAK.spacing);
    });
  }

  private land(): void {
    this.landed = true;
    this.age = 0;
    this.streak.forEach((puff) => (puff.visible = false));
    this.host.land(this.object.position, this.color);
  }

  private smoulder(): void {
    if (this.age < GROUND_SECONDS) return;
    const left = 1 - (this.age - GROUND_SECONDS) / FADE_SECONDS;
    this.rig.scale.multiplyScalar(Math.max(0, left));
    if (left <= 0) this.host.dismiss(this);
  }
}
