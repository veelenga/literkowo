import * as THREE from 'three';

export interface AmbientSpec {
  count: number;
  color: number;
  size: number;
  mode: 'drift' | 'fall';
}

const AREA = 30;
const MIN_HEIGHT = 0.3;
const MAX_HEIGHT = 9;
const FALL_SPEED = 1.6;
const DRIFT_SPEED = 0.35;

export class AmbientParticles {
  readonly points: THREE.Points;
  private readonly phases: number[];
  private readonly positions: THREE.BufferAttribute;

  constructor(private readonly spec: AmbientSpec) {
    const data = new Float32Array(spec.count * 3);
    this.phases = [];
    for (let i = 0; i < spec.count; i += 1) {
      data.set(this.randomPosition(), i * 3);
      this.phases.push(Math.random() * Math.PI * 2);
    }
    const geometry = new THREE.BufferGeometry();
    this.positions = new THREE.BufferAttribute(data, 3);
    geometry.setAttribute('position', this.positions);
    const material = new THREE.PointsMaterial({
      color: spec.color,
      size: spec.size,
      transparent: true,
      opacity: 0.85,
      depthWrite: false,
    });
    this.points = new THREE.Points(geometry, material);
  }

  update(delta: number, elapsed: number): void {
    for (let i = 0; i < this.spec.count; i += 1) {
      if (this.spec.mode === 'fall') this.fall(i, delta);
      else this.drift(i, delta, elapsed);
    }
    this.positions.needsUpdate = true;
  }

  private fall(i: number, delta: number): void {
    const y = this.positions.getY(i) - FALL_SPEED * delta;
    if (y < 0) {
      const [x, , z] = this.randomPosition();
      this.positions.setXYZ(i, x, MAX_HEIGHT, z);
      return;
    }
    this.positions.setY(i, y);
    this.positions.setX(i, this.positions.getX(i) + Math.sin(y * 2 + this.phases[i]) * delta * 0.4);
  }

  private drift(i: number, delta: number, elapsed: number): void {
    const phase = this.phases[i];
    this.positions.setX(
      i,
      this.positions.getX(i) + Math.sin(elapsed * 0.7 + phase) * DRIFT_SPEED * delta,
    );
    this.positions.setZ(
      i,
      this.positions.getZ(i) + Math.cos(elapsed * 0.5 + phase) * DRIFT_SPEED * delta,
    );
    this.positions.setY(i, MIN_HEIGHT + 1 + Math.sin(elapsed * 0.9 + phase) * 0.8);
  }

  private randomPosition(): [number, number, number] {
    return [
      (Math.random() - 0.5) * AREA,
      MIN_HEIGHT + Math.random() * (MAX_HEIGHT - MIN_HEIGHT),
      (Math.random() - 0.5) * AREA,
    ];
  }
}
