import * as THREE from 'three';
import { createAssetCache } from './assetCache';
import type { Triple } from './chunkyGeometry';
import { Envelope } from './Envelope';
import { withLuminance } from './luminance';

export interface MouthSpec {
  size: Triple;
  height: number;
}

export interface FaceSpec {
  color: number;
  eyeSize: Triple;
  eyeSpacing: number;
  eyeHeight: number;
  depth: number;
  slant: number;
  blinks: boolean;
  mouth?: MouthSpec;
}

const FEATURE_LUMINANCE = 4;
const SIDES = [-1, 1] as const;
const THROB_SPEED = 2.6;
const THROB_AMOUNT = 0.1;
const FLARE_DURATION = 0.4;
const FLARE_GROWTH = 0.8;
const BLINK_DURATION = 0.16;
const BLINK_DEPTH = 0.9;
const MIN_BLINK_DELAY = 1.8;
const MAX_BLINK_DELAY = 4.5;

const geometries = createAssetCache<THREE.BufferGeometry>();
const materials = createAssetCache<THREE.MeshBasicMaterial>();

function featureGeometry(): THREE.BufferGeometry {
  return geometries('face-feature', () => new THREE.BoxGeometry(1, 1, 1));
}

function featureMaterial(color: number): THREE.MeshBasicMaterial {
  return materials(
    color.toString(16),
    () =>
      new THREE.MeshBasicMaterial({
        color: withLuminance(new THREE.Color(color), FEATURE_LUMINANCE),
      }),
  );
}

function nextBlinkDelay(): number {
  return THREE.MathUtils.randFloat(MIN_BLINK_DELAY, MAX_BLINK_DELAY);
}

export class GlowingFace {
  readonly group = new THREE.Group();
  private readonly eyes: THREE.Mesh[] = [];
  private readonly flareEnvelope = new Envelope();
  private readonly blinkEnvelope = new Envelope();
  private untilBlink = nextBlinkDelay();
  private time = 0;

  constructor(private readonly spec: FaceSpec) {
    const material = featureMaterial(spec.color);
    for (const side of SIDES) this.eyes.push(this.createEye(side, material));
    this.group.add(...this.eyes);
    if (spec.mouth) this.group.add(this.createMouth(spec.mouth, material));
  }

  update(delta: number): void {
    this.time += delta;
    this.flareEnvelope.update(delta);
    this.blinkEnvelope.update(delta);
    if (this.spec.blinks) this.scheduleBlink(delta);
    const glow =
      1 +
      Math.sin(this.time * THROB_SPEED) * THROB_AMOUNT +
      this.flareEnvelope.level * FLARE_GROWTH;
    const openness = 1 - Math.sin(Math.PI * this.blinkEnvelope.level) * BLINK_DEPTH;
    const [width, height, depth] = this.spec.eyeSize;
    for (const eye of this.eyes) eye.scale.set(width * glow, height * glow * openness, depth);
  }

  flare(): void {
    this.flareEnvelope.trigger(FLARE_DURATION);
  }

  private scheduleBlink(delta: number): void {
    this.untilBlink -= delta;
    if (this.untilBlink > 0) return;
    this.untilBlink = nextBlinkDelay();
    this.blinkEnvelope.trigger(BLINK_DURATION);
  }

  private createEye(side: number, material: THREE.Material): THREE.Mesh {
    const eye = new THREE.Mesh(featureGeometry(), material);
    eye.position.set(side * this.spec.eyeSpacing, this.spec.eyeHeight, this.spec.depth);
    eye.rotation.z = side * this.spec.slant;
    eye.scale.set(...this.spec.eyeSize);
    return eye;
  }

  private createMouth(mouth: MouthSpec, material: THREE.Material): THREE.Mesh {
    const mesh = new THREE.Mesh(featureGeometry(), material);
    mesh.position.set(0, mouth.height, this.spec.depth);
    mesh.scale.set(...mouth.size);
    return mesh;
  }
}
