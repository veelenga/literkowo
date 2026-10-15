import * as THREE from 'three';
import { groundGlowTexture, groundPlaneGeometry } from './glowAssets';

const GLOW_HEIGHT = 0.04;
const FAR_SCALE = 0.75;
const NEAR_SCALE = 1.55;
const FAR_OPACITY = 0.2;
const NEAR_OPACITY = 0.7;
const FOCUS_OPACITY_BOOST = 0.2;
const FOCUS_PULSE_SPEED = 8;
const FOCUS_PULSE_SCALE = 0.12;
const FOCUS_PULSE_OPACITY = 0.15;
const WARNING_COLOR = new THREE.Color(0xff3b3b);
const WARNING_BLEND = 0.6;

export class GroundGlow {
  readonly mesh: THREE.Mesh<THREE.BufferGeometry, THREE.MeshBasicMaterial>;

  constructor(
    private readonly baseColor: THREE.Color,
    private readonly diameter: number,
  ) {
    const material = new THREE.MeshBasicMaterial({
      color: baseColor,
      map: groundGlowTexture(),
      transparent: true,
      depthWrite: false,
    });
    this.mesh = new THREE.Mesh(groundPlaneGeometry(), material);
    this.mesh.position.y = GLOW_HEIGHT;
  }

  update(threat: number, focus: number, elapsed: number): void {
    const wave = Math.sin(elapsed * FOCUS_PULSE_SPEED) * focus;
    const reach = THREE.MathUtils.lerp(FAR_SCALE, NEAR_SCALE, threat);
    this.mesh.scale.setScalar(this.diameter * (reach + wave * FOCUS_PULSE_SCALE));
    const opacity = THREE.MathUtils.lerp(FAR_OPACITY, NEAR_OPACITY, threat);
    const material = this.mesh.material;
    material.opacity = Math.min(
      1,
      opacity + focus * FOCUS_OPACITY_BOOST + wave * FOCUS_PULSE_OPACITY,
    );
    material.color.copy(this.baseColor).lerp(WARNING_COLOR, threat * threat * WARNING_BLEND);
  }

  dispose(): void {
    this.mesh.material.dispose();
  }
}
