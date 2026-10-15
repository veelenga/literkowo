import * as THREE from 'three';
import { groundPlaneGeometry, shockwaveTexture } from '../../../effects/glowAssets';
import { Envelope } from '../../../effects/Envelope';

export interface WaveStyle {
  readonly color: number;
  readonly duration: number;
  readonly endDiameter: number;
  readonly opacity: number;
  readonly blending: THREE.Blending;
}

const START_DIAMETER = 1;
const GROUND_LIFT = 0.07;

export class GroundWave {
  readonly mesh: THREE.Mesh<THREE.BufferGeometry, THREE.MeshBasicMaterial>;
  private readonly life = new Envelope();

  constructor(private readonly style: WaveStyle) {
    const material = new THREE.MeshBasicMaterial({
      color: style.color,
      map: shockwaveTexture(),
      transparent: true,
      depthWrite: false,
      blending: style.blending,
    });
    this.mesh = new THREE.Mesh(groundPlaneGeometry(), material);
    this.mesh.visible = false;
  }

  play(center: THREE.Vector3): void {
    this.mesh.position.set(center.x, GROUND_LIFT, center.z);
    this.life.trigger(this.style.duration);
    this.mesh.visible = true;
    this.shape();
  }

  update(delta: number): void {
    if (!this.mesh.visible) return;
    this.life.update(delta);
    if (this.life.level <= 0) this.mesh.visible = false;
    else this.shape();
  }

  private shape(): void {
    const progress = 1 - this.life.level;
    const eased = 1 - (1 - progress) ** 3;
    const diameter = THREE.MathUtils.lerp(START_DIAMETER, this.style.endDiameter, eased);
    this.mesh.scale.setScalar(diameter);
    this.mesh.material.opacity = this.life.level ** 2 * this.style.opacity;
  }
}
