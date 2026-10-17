import * as THREE from 'three';
import { disposeObject } from '../disposal';
import { easeOutCubic } from './easing';
import { groundPlaneGeometry, shockwaveTexture } from './glowAssets';
import { withLuminance } from './luminance';

export interface PulseTint {
  luminance: number;
  whiteBlend: number;
}

export interface PulseSettings {
  poolSize: number;
  duration: number;
  startScale: number;
  endScale: number;
  opacity?: number;
  tint?: PulseTint;
  groundLift?: number;
}

export interface PulseVisual {
  object: THREE.Object3D;
  material: THREE.MeshBasicMaterial | THREE.SpriteMaterial;
}

interface Pulse extends PulseVisual {
  age: number;
}

export const GROUND_RING_LIFT = 0.07;

const WHITE = new THREE.Color(0xffffff);
const FULL_OPACITY = 1;

export function groundRing(): PulseVisual {
  const material = new THREE.MeshBasicMaterial({
    map: shockwaveTexture(),
    blending: THREE.AdditiveBlending,
    transparent: true,
    depthWrite: false,
  });
  return { object: new THREE.Mesh(groundPlaneGeometry(), material), material };
}

export class PulsePool {
  readonly group = new THREE.Group();
  private readonly pulses: Pulse[] = [];
  private cursor = 0;

  constructor(
    private readonly settings: PulseSettings,
    createVisual: () => PulseVisual,
  ) {
    for (let index = 0; index < settings.poolSize; index += 1) {
      const pulse = { ...createVisual(), age: 0 };
      pulse.object.visible = false;
      this.pulses.push(pulse);
      this.group.add(pulse.object);
    }
  }

  play(position: THREE.Vector3, color: THREE.Color): void {
    const pulse = this.pulses[this.cursor];
    this.cursor = (this.cursor + 1) % this.pulses.length;
    pulse.age = 0;
    this.place(pulse.object, position);
    pulse.object.visible = true;
    this.paint(pulse.material.color.copy(color));
    this.shape(pulse, 0);
  }

  update(delta: number): void {
    for (const pulse of this.pulses) {
      if (!pulse.object.visible) continue;
      pulse.age += delta;
      const progress = pulse.age / this.settings.duration;
      if (progress >= 1) pulse.object.visible = false;
      else this.shape(pulse, progress);
    }
  }

  dispose(): void {
    this.group.removeFromParent();
    disposeObject(this.group);
  }

  private place(object: THREE.Object3D, position: THREE.Vector3): void {
    object.position.copy(position);
    const { groundLift } = this.settings;
    if (groundLift !== undefined) object.position.y = groundLift;
  }

  private paint(color: THREE.Color): void {
    const { tint } = this.settings;
    if (!tint) return;
    withLuminance(color.lerp(WHITE, tint.whiteBlend), tint.luminance);
  }

  private shape(pulse: Pulse, progress: number): void {
    const { startScale, endScale, opacity = FULL_OPACITY } = this.settings;
    const scale = THREE.MathUtils.lerp(startScale, endScale, easeOutCubic(progress));
    pulse.object.scale.setScalar(scale);
    pulse.material.opacity = (1 - progress) ** 2 * opacity;
  }
}
