import * as THREE from 'three';
import { softGlowTexture } from '../../effects/glowAssets';
import { Enemy } from '../../Enemy';
import type { EnemyShape } from '../../themes';
import { StarSparks } from './effects/StarSparks';

export const POWER_TAG = 'power-word';

const GOLD = 0xffc53d;
const BODY_SCALE = 1.15;
const STAR_COUNT = 5;
const PULSE = { speed: 2.4, amount: 0.09 };
const HALO = { size: 3.2, minOpacity: 0.25, maxOpacity: 0.6 };

export class PowerEnemy extends Enemy {
  private readonly stars = new StarSparks(STAR_COUNT);
  private readonly halo = createHalo();

  constructor(word: string, label: HTMLElement, speed: number, shape: EnemyShape) {
    super(word, label, speed, { shape, colors: [GOLD], scale: BODY_SCALE });
    this.tags.add(POWER_TAG);
    this.rig.add(this.stars.group, this.halo);
  }

  override update(delta: number, elapsed: number, viewer: THREE.Vector3Like): void {
    super.update(delta, elapsed, viewer);
    const wave = (Math.sin(elapsed * PULSE.speed) + 1) / 2;
    this.rig.scale.multiplyScalar(1 + wave * PULSE.amount);
    this.halo.material.opacity = THREE.MathUtils.lerp(HALO.minOpacity, HALO.maxOpacity, wave);
    this.stars.update(delta);
  }
}

export function isPowerEnemy(enemy: Pick<Enemy, 'tags'>): boolean {
  return enemy.tags.has(POWER_TAG);
}

function createHalo(): THREE.Sprite {
  const material = new THREE.SpriteMaterial({
    map: softGlowTexture(),
    color: GOLD,
    blending: THREE.AdditiveBlending,
    transparent: true,
    depthWrite: false,
  });
  const halo = new THREE.Sprite(material);
  halo.scale.setScalar(HALO.size);
  return halo;
}
