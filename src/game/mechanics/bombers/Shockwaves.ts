import * as THREE from 'three';
import { disposeObject } from '../../disposal';
import { GroundWave, type WaveStyle } from '../powerWords/effects/GroundWave';

const POOL_SIZE = 3;

export class Shockwaves {
  readonly group = new THREE.Group();
  private readonly waves: GroundWave[];
  private cursor = 0;

  constructor(style: WaveStyle) {
    this.waves = Array.from({ length: POOL_SIZE }, () => new GroundWave(style));
    this.group.add(...this.waves.map((wave) => wave.mesh));
  }

  get activeCount(): number {
    return this.waves.filter((wave) => wave.mesh.visible).length;
  }

  play(center: THREE.Vector3): void {
    this.waves[this.cursor].play(center);
    this.cursor = (this.cursor + 1) % this.waves.length;
  }

  update(delta: number): void {
    this.waves.forEach((wave) => wave.update(delta));
  }

  dispose(): void {
    this.group.removeFromParent();
    disposeObject(this.group);
  }
}
