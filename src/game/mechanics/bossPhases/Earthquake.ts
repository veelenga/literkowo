import * as THREE from 'three';
import type { RandomSource } from '../../../random';
import { Boss } from '../../Boss';
import type { Enemy } from '../../Enemy';
import type { MechanicContext } from '../Mechanic';
import type { BossAttack } from './BossAttack';

export const QUAKE_SHAKE = { strength: 0.5, seconds: 1.2 };
const SCRAMBLE_ARC = { from: Math.PI - 0.35, span: Math.PI + 0.7 };
const DUST_COLOR = new THREE.Color(0xc9a77c);
const DUST_HEIGHT = 0.3;
const DUST_RING = { count: 6, radius: 4 };
const FULL_TURN = Math.PI * 2;
const RANDOM_STREAM = 'earthquake';

export type EarthquakeContext = Pick<
  MechanicContext,
  'enemies' | 'shakeCamera' | 'particles' | 'random'
>;

export class Earthquake implements BossAttack {
  private readonly random: RandomSource;

  constructor(private readonly context: EarthquakeContext) {
    this.random = context.random.stream(RANDOM_STREAM);
  }

  strike(): void {
    this.context.shakeCamera(QUAKE_SHAKE.strength, QUAKE_SHAKE.seconds);
    this.context.enemies
      .filter((enemy) => !(enemy instanceof Boss))
      .forEach((enemy) => this.scramble(enemy));
    this.raiseDustRing();
  }

  private scramble(enemy: Enemy): void {
    const distance = enemy.distanceToCenter;
    const angle = SCRAMBLE_ARC.from + this.random.next() * SCRAMBLE_ARC.span;
    enemy.object.position.setX(Math.cos(angle) * distance).setZ(Math.sin(angle) * distance);
    this.puff(enemy.object.position.x, enemy.object.position.z);
  }

  private raiseDustRing(): void {
    for (let index = 0; index < DUST_RING.count; index += 1) {
      const angle = (index / DUST_RING.count) * FULL_TURN;
      this.puff(Math.cos(angle) * DUST_RING.radius, Math.sin(angle) * DUST_RING.radius);
    }
  }

  private puff(x: number, z: number): void {
    this.context.particles.burst(new THREE.Vector3(x, DUST_HEIGHT, z), DUST_COLOR);
  }
}
