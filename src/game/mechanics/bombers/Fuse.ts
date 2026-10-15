import * as THREE from 'three';
import { createAssetCache } from '../../assetCache';
import { softGlowTexture } from '../../effects/glowAssets';
import { withLuminance } from '../../effects/luminance';
import { Motes, type MoteStyle } from '../powerWords/effects/Motes';

const ROPE = {
  radius: 0.05,
  length: 0.34,
  segments: 6,
  color: 0x3a2a1c,
  roughness: 0.9,
  tilt: 0.4,
};
const SPARK = {
  color: 0xffc23d,
  size: 0.6,
  luminance: 2.4,
  flickerSpeed: 41,
  flickerAmount: 0.3,
  urgentGrowth: 0.9,
};
const EMBER_STYLE: MoteStyle = {
  color: 0xffb347,
  size: 0.2,
  lifetime: 0.5,
  gravity: -3.5,
  drag: 1.4,
  opacity: 1,
};
const EMBER_CAPACITY = 32;
const EMBER_RATE = { calm: 10, urgent: 42 };
const EMBER_SPEED = { spread: 1.6, rise: { min: 0.8, max: 2.2 } };
const SLOW_FLICKER_RATIO = 0.37;

const geometries = createAssetCache<THREE.BufferGeometry>();
const materials = createAssetCache<THREE.MeshStandardMaterial>();

function ropeGeometry(): THREE.BufferGeometry {
  return geometries.get('fuse-rope', () =>
    new THREE.CylinderGeometry(ROPE.radius, ROPE.radius, ROPE.length, ROPE.segments).translate(
      0,
      ROPE.length / 2,
      0,
    ),
  );
}

function ropeMaterial(): THREE.MeshStandardMaterial {
  return materials.get(
    'fuse-rope',
    () => new THREE.MeshStandardMaterial({ color: ROPE.color, roughness: ROPE.roughness }),
  );
}

function createSpark(): THREE.Sprite {
  const material = new THREE.SpriteMaterial({
    map: softGlowTexture(),
    color: withLuminance(new THREE.Color(SPARK.color), SPARK.luminance),
    blending: THREE.AdditiveBlending,
    transparent: true,
    depthWrite: false,
  });
  const sprite = new THREE.Sprite(material);
  sprite.scale.setScalar(SPARK.size);
  return sprite;
}

export class Fuse {
  readonly group = new THREE.Group();
  private readonly spark = createSpark();
  private readonly embers = new Motes(EMBER_CAPACITY, EMBER_STYLE);
  private readonly tip = new THREE.Vector3();
  private readonly velocity = new THREE.Vector3();
  private time = 0;
  private emberDebt = 0;

  constructor(top: number) {
    const rope = new THREE.Mesh(ropeGeometry(), ropeMaterial());
    rope.rotation.z = -ROPE.tilt;
    this.tip.set(Math.sin(ROPE.tilt) * ROPE.length, Math.cos(ROPE.tilt) * ROPE.length, 0);
    this.spark.position.copy(this.tip);
    this.group.position.y = top;
    this.group.add(rope, this.spark, this.embers.points);
  }

  update(delta: number, urgency: number): void {
    this.time += delta;
    const flicker =
      Math.sin(this.time * SPARK.flickerSpeed) *
      Math.sin(this.time * SPARK.flickerSpeed * SLOW_FLICKER_RATIO);
    const growth = 1 + urgency * SPARK.urgentGrowth;
    this.spark.scale.setScalar(SPARK.size * growth * (1 + flicker * SPARK.flickerAmount));
    this.throwEmbers(delta, urgency);
    this.embers.update(delta);
  }

  private throwEmbers(delta: number, urgency: number): void {
    this.emberDebt += delta * THREE.MathUtils.lerp(EMBER_RATE.calm, EMBER_RATE.urgent, urgency);
    while (this.emberDebt >= 1) {
      this.emberDebt -= 1;
      this.velocity.set(
        THREE.MathUtils.randFloatSpread(EMBER_SPEED.spread),
        THREE.MathUtils.randFloat(EMBER_SPEED.rise.min, EMBER_SPEED.rise.max),
        THREE.MathUtils.randFloatSpread(EMBER_SPEED.spread),
      );
      this.embers.spawn(this.tip, this.velocity);
    }
  }
}
