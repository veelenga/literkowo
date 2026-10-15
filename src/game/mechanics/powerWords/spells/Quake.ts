import * as THREE from 'three';
import { SPAWN_RADIUS } from '../../../arena';
import type { Enemy } from '../../../Enemy';
import { GroundWave, type WaveStyle } from '../effects/GroundWave';
import { Motes, type MoteStyle } from '../effects/Motes';
import { SceneSpell, type SpellContext } from './Spell';

export const KNOCKBACK = 3;
export const QUAKE_SHAKE = { strength: 0.55, seconds: 0.6 };

const KNOCKBACK_SPEED = 14;
const MAX_RADIUS = SPAWN_RADIUS + 1;
const DUST_COLOR = 0xd9b98c;
const DUST: MoteStyle = {
  color: DUST_COLOR,
  size: 1.4,
  lifetime: 1.7,
  gravity: -4,
  drag: 2,
  opacity: 0.85,
};
const DUST_COUNT = 96;
const DUST_RADIUS = 1.3;
const DUST_HEIGHT = 0.15;
const DUST_SPEED = { min: 5, max: 9 };
const DUST_RISE = { min: 1, max: 3 };
const WAVE: WaveStyle = {
  color: DUST_COLOR,
  duration: 1.4,
  endDiameter: 22,
  opacity: 1,
  blending: THREE.AdditiveBlending,
};
const FULL_TURN = Math.PI * 2;

export class QuakeSpell extends SceneSpell {
  private readonly pushes = new Map<Enemy, number>();
  private readonly dust = new Motes(DUST_COUNT, DUST);
  private readonly wave = new GroundWave(WAVE);

  constructor(context: SpellContext) {
    super(context);
    this.root.add(this.dust.points, this.wave.mesh);
  }

  get dustCount(): number {
    return this.dust.liveCount;
  }

  cast(): void {
    for (const enemy of this.bystanders) {
      this.pushes.set(enemy, (this.pushes.get(enemy) ?? 0) + KNOCKBACK);
    }
    this.context.shakeCamera(QUAKE_SHAKE.strength, QUAKE_SHAKE.seconds);
    this.wave.play(this.heroPosition);
    this.raiseDust();
  }

  update(delta: number): void {
    for (const [enemy, left] of this.pushes) this.knock(enemy, left, delta);
    this.dust.update(delta);
    this.wave.update(delta);
  }

  private knock(enemy: Enemy, left: number, delta: number): void {
    if (!this.isOnBoard(enemy)) {
      this.pushes.delete(enemy);
      return;
    }
    const step = Math.min(left, KNOCKBACK_SPEED * delta);
    pushOutward(enemy.object.position, step);
    if (left > step) this.pushes.set(enemy, left - step);
    else this.pushes.delete(enemy);
  }

  private raiseDust(): void {
    const origin = new THREE.Vector3();
    const velocity = new THREE.Vector3();
    for (let index = 0; index < DUST_COUNT; index += 1) {
      const angle = (index / DUST_COUNT) * FULL_TURN;
      const speed = THREE.MathUtils.randFloat(DUST_SPEED.min, DUST_SPEED.max);
      origin
        .set(Math.cos(angle) * DUST_RADIUS, DUST_HEIGHT, Math.sin(angle) * DUST_RADIUS)
        .add(this.heroPosition);
      velocity.set(
        Math.cos(angle) * speed,
        THREE.MathUtils.randFloat(DUST_RISE.min, DUST_RISE.max),
        Math.sin(angle) * speed,
      );
      this.dust.spawn(origin, velocity);
    }
  }
}

function pushOutward(position: THREE.Vector3, step: number): void {
  const distance = Math.hypot(position.x, position.z);
  if (distance === 0) return;
  const scale = Math.min(MAX_RADIUS, distance + step) / distance;
  position.x *= scale;
  position.z *= scale;
}
