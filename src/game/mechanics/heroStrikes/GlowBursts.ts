import * as THREE from 'three';
import { easeOutCubic } from '../../effects/easing';
import { withLuminance } from '../../effects/luminance';
import type { GlowBatch, GlowShape } from './GlowBatch';

export interface GlowStyle {
  readonly shape: GlowShape;
  readonly duration: number;
  readonly startSize: number;
  readonly endSize: number;
  readonly opacity: number;
  readonly whiteness: number;
  readonly luminance: number;
  readonly drag: number;
}

interface Burst {
  readonly position: THREE.Vector3;
  readonly velocity: THREE.Vector3;
  readonly color: THREE.Color;
  style: GlowStyle | undefined;
  age: number;
}

const WHITE = new THREE.Color(0xffffff);
const STILL = new THREE.Vector3();
const MIN_SPEED_SHARE = 0.4;
const launch = new THREE.Vector3();

export class GlowBursts {
  private readonly first: number;
  private readonly bursts: Burst[];
  private cursor = 0;

  constructor(
    private readonly batch: GlowBatch,
    capacity: number,
  ) {
    this.first = batch.reserve(capacity);
    this.bursts = Array.from({ length: capacity }, createBurst);
  }

  emit(
    position: THREE.Vector3,
    color: THREE.Color,
    style: GlowStyle,
    velocity: THREE.Vector3 = STILL,
  ): void {
    const index = this.cursor;
    this.cursor = (index + 1) % this.bursts.length;
    const burst = this.bursts[index];
    burst.position.copy(position);
    burst.velocity.copy(velocity);
    burst.color.copy(color).lerp(WHITE, style.whiteness);
    withLuminance(burst.color, style.luminance);
    burst.style = style;
    burst.age = 0;
    this.draw(index, burst, style);
  }

  scatter(
    position: THREE.Vector3,
    color: THREE.Color,
    style: GlowStyle,
    count: number,
    speed: number,
  ): void {
    for (let spawned = 0; spawned < count; spawned += 1) {
      launch
        .randomDirection()
        .multiplyScalar(speed * THREE.MathUtils.randFloat(MIN_SPEED_SHARE, 1));
      this.emit(position, color, style, launch);
    }
  }

  update(delta: number): void {
    for (let index = 0; index < this.bursts.length; index += 1) {
      const burst = this.bursts[index];
      const style = burst.style;
      if (!style) continue;
      burst.age += delta;
      if (burst.age >= style.duration) this.retire(index, burst);
      else this.move(index, burst, style, delta);
    }
  }

  private move(index: number, burst: Burst, style: GlowStyle, delta: number): void {
    burst.position.addScaledVector(burst.velocity, delta);
    burst.velocity.multiplyScalar(Math.exp(-style.drag * delta));
    this.draw(index, burst, style);
  }

  private draw(index: number, burst: Burst, style: GlowStyle): void {
    const progress = burst.age / style.duration;
    const size = THREE.MathUtils.lerp(style.startSize, style.endSize, easeOutCubic(progress));
    const alpha = style.opacity * (1 - progress) ** 2;
    this.batch.show(this.first + index, burst.position, size, burst.color, alpha, style.shape);
  }

  private retire(index: number, burst: Burst): void {
    burst.style = undefined;
    this.batch.hide(this.first + index);
  }
}

function createBurst(): Burst {
  return {
    position: new THREE.Vector3(),
    velocity: new THREE.Vector3(),
    color: new THREE.Color(),
    style: undefined,
    age: 0,
  };
}
