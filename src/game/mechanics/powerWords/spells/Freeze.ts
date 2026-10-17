import * as THREE from 'three';
import {
  GROUND_RING_LIFT,
  groundRing,
  PulsePool,
  type PulseSettings,
} from '../../../effects/PulsePool';
import { Motes, type MoteStyle } from '../effects/Motes';
import { POWER_SPECS } from '../powers';
import { SceneSpell, type SpellContext } from './Spell';

export const FREEZE_SECONDS = 3;

const FROST: MoteStyle = {
  color: 0xe4f7ff,
  size: 0.55,
  lifetime: 1.8,
  gravity: -0.6,
  drag: 1.8,
  opacity: 0.95,
};
const FROST_CAPACITY = 240;
const FROST_BURST = 30;
const FROST_SPEED = 2.2;
const DRIZZLE_INTERVAL = 0.08;
const DRIZZLE_SPREAD = 0.7;
const DRIZZLE_SPEED = 0.4;
const WAVE: PulseSettings = {
  poolSize: 1,
  duration: 0.9,
  startScale: 1,
  endScale: 26,
  opacity: 0.9,
  groundLift: GROUND_RING_LIFT,
};
const WAVE_COLOR = new THREE.Color(POWER_SPECS.freeze.color);

export class FreezeSpell extends SceneSpell {
  private readonly frost = new Motes(FROST_CAPACITY, FROST);
  private readonly wave = new PulsePool(WAVE, groundRing);
  private readonly velocity = new THREE.Vector3();
  private sinceDrizzle = 0;

  constructor(context: SpellContext) {
    super(context);
    this.root.add(this.frost.points, this.wave.group);
  }

  get frostCount(): number {
    return this.frost.liveCount;
  }

  cast(): void {
    this.wave.play(this.heroPosition, WAVE_COLOR);
    for (const enemy of this.bystanders) {
      enemy.freeze(FREEZE_SECONDS);
      this.burstFrost(enemy.burstPosition);
    }
  }

  update(delta: number): void {
    this.drizzle(delta);
    this.frost.update(delta);
    this.wave.update(delta);
  }

  private burstFrost(origin: THREE.Vector3): void {
    for (let index = 0; index < FROST_BURST; index += 1) {
      this.velocity.randomDirection().multiplyScalar(FROST_SPEED * Math.random());
      this.frost.spawn(origin, this.velocity);
    }
  }

  private drizzle(delta: number): void {
    this.sinceDrizzle += delta;
    if (this.sinceDrizzle < DRIZZLE_INTERVAL) return;
    this.sinceDrizzle = 0;
    for (const enemy of this.bystanders.filter((candidate) => candidate.isFrozen)) {
      const origin = enemy.burstPosition.add(randomOffset(DRIZZLE_SPREAD));
      this.velocity.randomDirection().multiplyScalar(DRIZZLE_SPEED);
      this.frost.spawn(origin, this.velocity);
    }
  }
}

function randomOffset(spread: number): THREE.Vector3 {
  return new THREE.Vector3(
    THREE.MathUtils.randFloatSpread(spread),
    THREE.MathUtils.randFloatSpread(spread),
    THREE.MathUtils.randFloatSpread(spread),
  );
}
