import * as THREE from 'three';
import type { EnemyBody, EnemyLook } from '../../Enemy';
import { blockAssembly, chunkyBlock, type Block } from '../../effects/chunkyGeometry';
import type { BobMotion } from '../../effects/enemyStyles';
import { softGlowTexture } from '../../effects/glowAssets';
import { withLuminance } from '../../effects/luminance';
import { cachedGeometry } from '../enemyTypes/bodies';
import { Crater } from './Crater';
import { EventEnemy, type EventHost } from './EventEnemy';

export const START_HEIGHT = 11;
export const FALL_SECONDS = 1.2;
export const GROUND_SECONDS = 6;

const LABEL_CLASS = 'is-meteor';
const FADE_SECONDS = 0.5;
const FALL_OFFSET = 2.5;
const HOVER = 0.42;
const LABEL_GAP = 1.2;
const STILL: BobMotion = { speed: 0, height: 0, ripple: 0 };
const LOOK: EnemyLook = { shape: 'wisp', colors: [0xff7a1a, 0xff4a2a, 0xffb02a], scale: 1 };
const STREAK = { puffs: 5, spacing: 0.5, lean: 0.12, size: 0.34, shrink: 0.15, opacity: 0.8 };
const HALO = { size: 1.9, luminance: 1.3, flickerSpeed: 17, flickerAmount: 0.08 };
const COOLED = { heat: 0.35, color: new THREE.Color(0xa8200c) };
const CORE_SIZE = 0.52;

const ROCK: readonly Block[] = [
  { size: [0.7, 0.32, 0.64], position: [0, -0.22, 0] },
  { size: [0.46, 0.4, 0.5], position: [-0.2, 0.08, 0.04], rotation: [0.1, 0.2, 0.15] },
  { size: [0.42, 0.38, 0.46], position: [0.2, 0.1, -0.06], rotation: [-0.15, 0.4, -0.2] },
  { size: [0.32, 0.28, 0.32], position: [0.04, 0.3, 0.16], rotation: [0.3, 0.1, 0.2] },
  { size: [0.28, 0.24, 0.28], position: [0.3, -0.1, 0.26], rotation: [0.2, 0.6, 0.3] },
];

function rockBody(): EnemyBody {
  return {
    shell: cachedGeometry('meteor-rock', () => blockAssembly(ROCK)),
    core: cachedGeometry('meteor-core', () => chunkyBlock(CORE_SIZE, CORE_SIZE, CORE_SIZE)),
    shellShade: 0.35,
    shellOpacity: 0.98,
    motion: { hoverHeight: HOVER, bob: STILL, facesViewer: true },
    sparkCount: 0,
    hasTrail: false,
  };
}

function createHalo(color: THREE.Color): THREE.Sprite {
  const material = new THREE.SpriteMaterial({
    map: softGlowTexture(),
    color: withLuminance(color.clone(), HALO.luminance),
    blending: THREE.AdditiveBlending,
    transparent: true,
    depthWrite: false,
  });
  const sprite = new THREE.Sprite(material);
  sprite.scale.setScalar(HALO.size);
  return sprite;
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
  private readonly halo: THREE.Sprite;
  private readonly crater = new Crater();
  private readonly hot = new THREE.Color();
  private readonly cooling = new THREE.Color();
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
    this.halo = createHalo(this.color);
    this.hot.copy(this.color);
    this.object.add(...this.streak, this.crater.group);
    this.rig.add(this.halo);
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
    if (this.landed) this.smoulder(delta);
    else this.fall();
    this.rig.position.y += this.altitude;
    this.burn(elapsed);
  }

  private get cooled(): number {
    return this.landed ? Math.min(1, this.age / GROUND_SECONDS) : 0;
  }

  private get heat(): number {
    return THREE.MathUtils.lerp(1, COOLED.heat, this.cooled);
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
    this.crater.open();
    this.host.land(this.object.position, this.color);
  }

  private smoulder(delta: number): void {
    const presence = THREE.MathUtils.clamp(1 - (this.age - GROUND_SECONDS) / FADE_SECONDS, 0, 1);
    this.crater.update(delta, this.heat, presence);
    this.recolor(this.cooling.copy(this.hot).lerp(COOLED.color, this.cooled));
    this.rig.scale.multiplyScalar(presence);
    if (presence <= 0) this.host.dismiss(this);
  }

  private burn(elapsed: number): void {
    const flicker = 1 + Math.sin(elapsed * HALO.flickerSpeed) * HALO.flickerAmount;
    this.halo.scale.setScalar(HALO.size * this.heat * flicker);
    this.halo.material.opacity = this.heat;
  }
}
