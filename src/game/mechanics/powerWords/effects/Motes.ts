import * as THREE from 'three';
import { softGlowTexture } from '../../../effects/glowAssets';

export interface MoteStyle {
  readonly color: number;
  readonly size: number;
  readonly lifetime: number;
  readonly gravity: number;
  readonly drag: number;
  readonly opacity: number;
}

interface Mote {
  readonly position: THREE.Vector3;
  readonly velocity: THREE.Vector3;
  age: number;
  lifetime: number;
}

const LIFETIME_SPREAD = 0.3;
const FADE_IN = 0.1;

function createMote(): Mote {
  return { position: new THREE.Vector3(), velocity: new THREE.Vector3(), age: 0, lifetime: 0 };
}

export class Motes {
  readonly points: THREE.Points<THREE.BufferGeometry, THREE.PointsMaterial>;
  private readonly motes: Mote[];
  private readonly positions: THREE.BufferAttribute;
  private readonly colors: THREE.BufferAttribute;
  private cursor = 0;

  constructor(
    capacity: number,
    private readonly style: MoteStyle,
  ) {
    this.motes = Array.from({ length: capacity }, createMote);
    this.positions = new THREE.BufferAttribute(new Float32Array(capacity * 3), 3);
    this.colors = new THREE.BufferAttribute(new Float32Array(capacity * 4).fill(1), 4);
    this.positions.setUsage(THREE.DynamicDrawUsage);
    this.colors.setUsage(THREE.DynamicDrawUsage);
    this.motes.forEach((_, index) => this.colors.setW(index, 0));
    this.points = this.createPoints();
  }

  get liveCount(): number {
    return this.motes.filter((mote) => mote.age < mote.lifetime).length;
  }

  spawn(position: THREE.Vector3, velocity: THREE.Vector3): void {
    const mote = this.motes[this.cursor];
    this.cursor = (this.cursor + 1) % this.motes.length;
    mote.position.copy(position);
    mote.velocity.copy(velocity);
    mote.age = 0;
    mote.lifetime = this.style.lifetime * THREE.MathUtils.randFloat(1 - LIFETIME_SPREAD, 1);
  }

  update(delta: number): void {
    this.motes.forEach((mote, index) => this.advance(mote, index, delta));
    this.positions.needsUpdate = true;
    this.colors.needsUpdate = true;
  }

  private advance(mote: Mote, index: number, delta: number): void {
    if (mote.age >= mote.lifetime) {
      this.colors.setW(index, 0);
      return;
    }
    mote.age += delta;
    mote.velocity.y += this.style.gravity * delta;
    mote.velocity.multiplyScalar(Math.max(0, 1 - this.style.drag * delta));
    mote.position.addScaledVector(mote.velocity, delta);
    this.positions.setXYZ(index, mote.position.x, mote.position.y, mote.position.z);
    this.colors.setW(index, this.alphaOf(mote));
  }

  private alphaOf(mote: Mote): number {
    const progress = Math.min(1, mote.age / mote.lifetime);
    const fadeIn = Math.min(1, progress / FADE_IN);
    return fadeIn * (1 - progress) * this.style.opacity;
  }

  private createPoints(): THREE.Points<THREE.BufferGeometry, THREE.PointsMaterial> {
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', this.positions);
    geometry.setAttribute('color', this.colors);
    const material = new THREE.PointsMaterial({
      color: this.style.color,
      size: this.style.size,
      map: softGlowTexture(),
      transparent: true,
      depthWrite: false,
      vertexColors: true,
    });
    const points = new THREE.Points(geometry, material);
    points.frustumCulled = false;
    return points;
  }
}
