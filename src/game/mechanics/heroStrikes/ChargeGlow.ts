import * as THREE from 'three';
import { Envelope } from '../../effects/Envelope';
import { groundGlowTexture, groundPlaneGeometry } from '../../effects/glowAssets';
import { withLuminance } from '../../effects/luminance';

const DIAMETER = 1.9;
const GROUND_LIFT = 0.03;
const MAX_OPACITY = 0.45;
const LUMINANCE = 1;
const CHARGE_RATE = 6;
const PULSE_SPEED = 3.2;
const PULSE_SCALE = 0.05;
const DIM_DURATION = 0.18;
const DIM_DEPTH = 0.85;
const MIN_VISIBLE = 0.01;

export class ChargeGlow {
  readonly mesh: THREE.Mesh<THREE.BufferGeometry, THREE.MeshBasicMaterial>;
  private readonly dimming = new Envelope();
  private level = 0;

  constructor() {
    const material = new THREE.MeshBasicMaterial({
      map: groundGlowTexture(),
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });
    this.mesh = new THREE.Mesh(groundPlaneGeometry(), material);
    this.mesh.visible = false;
  }

  get brightness(): number {
    return this.level * (1 - this.dimming.level * DIM_DEPTH);
  }

  dim(): void {
    this.dimming.trigger(DIM_DURATION);
  }

  update(delta: number, elapsed: number, charge: number, color: THREE.Color): void {
    this.level = THREE.MathUtils.damp(this.level, charge, CHARGE_RATE, delta);
    this.dimming.update(delta);
    const brightness = this.brightness;
    this.mesh.visible = brightness > MIN_VISIBLE;
    if (!this.mesh.visible) return;
    const pulse = 1 + Math.sin(elapsed * PULSE_SPEED) * PULSE_SCALE * this.level;
    this.mesh.scale.setScalar(DIAMETER * pulse);
    this.mesh.material.opacity = brightness * MAX_OPACITY;
    withLuminance(this.mesh.material.color.copy(color), LUMINANCE);
  }

  follow(anchor: THREE.Vector3): void {
    this.mesh.position.set(anchor.x, anchor.y + GROUND_LIFT, anchor.z);
  }
}
