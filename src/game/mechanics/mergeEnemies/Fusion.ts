import * as THREE from 'three';
import type { Enemy } from '../../Enemy';

const PULL_DURATION = 0.35;
const PULL_RATE = 9;
const PULSE_COUNT = 2;
const PULSE_AMOUNT = 0.18;
const FUSING_CLASS = 'is-fusing';
const HALF = 0.5;

export class Fusion {
  private elapsed = 0;

  constructor(
    readonly first: Enemy,
    readonly second: Enemy,
  ) {
    this.members.forEach((enemy) => enemy.label.classList.add(FUSING_CLASS));
  }

  get members(): readonly Enemy[] {
    return [this.first, this.second];
  }

  get midpoint(): THREE.Vector3 {
    return this.first.object.position.clone().lerp(this.second.object.position, HALF);
  }

  get isComplete(): boolean {
    return this.elapsed >= PULL_DURATION;
  }

  includes(enemy: Enemy): boolean {
    return enemy === this.first || enemy === this.second;
  }

  update(delta: number): void {
    this.elapsed += delta;
    const midpoint = this.midpoint;
    const pull = 1 - Math.exp(-PULL_RATE * delta);
    const scale = 1 + this.pulse * PULSE_AMOUNT;
    for (const enemy of this.members) {
      enemy.object.position.lerp(midpoint, pull);
      enemy.object.scale.setScalar(scale);
    }
  }

  release(): void {
    for (const enemy of this.members) {
      enemy.object.scale.setScalar(1);
      enemy.label.classList.remove(FUSING_CLASS);
    }
  }

  private get pulse(): number {
    const progress = Math.min(1, this.elapsed / PULL_DURATION);
    return Math.abs(Math.sin(progress * Math.PI * PULSE_COUNT));
  }
}
