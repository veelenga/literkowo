import type * as THREE from 'three';

export class CameraShake {
  private left = 0;
  private duration = 0;
  private strength = 0;

  private get amplitude(): number {
    return this.left > 0 ? (this.left / this.duration) * this.strength : 0;
  }

  start(strength: number, seconds: number): void {
    if (seconds <= 0 || strength < this.amplitude) return;
    this.strength = strength;
    this.duration = seconds;
    this.left = seconds;
  }

  apply(position: THREE.Vector3, delta: number): void {
    if (this.left <= 0) return;
    this.left = Math.max(0, this.left - delta);
    position.x += (Math.random() - 0.5) * this.amplitude;
    position.y += (Math.random() - 0.5) * this.amplitude;
  }
}
