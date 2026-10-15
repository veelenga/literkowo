import * as THREE from 'three';
import { withLuminance } from './luminance';

export interface PulseSettings {
  poolSize: number;
  duration: number;
  startScale: number;
  endScale: number;
  luminance: number;
  whiteBlend: number;
}

export interface PulseVisual {
  object: THREE.Object3D;
  material: THREE.MeshBasicMaterial | THREE.SpriteMaterial;
}

interface Pulse extends PulseVisual {
  age: number;
}

const WHITE = new THREE.Color(0xffffff);

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
    pulse.object.position.copy(position);
    pulse.object.visible = true;
    const tint = pulse.material.color.copy(color).lerp(WHITE, this.settings.whiteBlend);
    withLuminance(tint, this.settings.luminance);
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

  private shape(pulse: Pulse, progress: number): void {
    const eased = 1 - (1 - progress) ** 3;
    const { startScale, endScale } = this.settings;
    pulse.object.scale.setScalar(THREE.MathUtils.lerp(startScale, endScale, eased));
    pulse.material.opacity = (1 - progress) ** 2;
  }
}
