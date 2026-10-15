import * as THREE from 'three';
import { softGlowTexture } from '../../../effects/glowAssets';
import { withLuminance } from '../../../effects/luminance';

type BoltLine = THREE.Line<THREE.BufferGeometry, THREE.LineBasicMaterial>;

interface Bolt {
  readonly strands: BoltLine[];
  readonly flash: THREE.Sprite;
  age: number;
}

const POOL_SIZE = 6;
const STRANDS = 3;
const SEGMENTS = 14;
const SKY_HEIGHT = 16;
const SKY_DRIFT = 2.5;
const JITTER = 0.7;
const STRAND_JITTER = 0.22;
const LIFETIME = 0.45;
const FLICKER_SPEED = 48;
const FLICKER_DEPTH = 0.45;
const CORE_LUMINANCE = 4;
const STRAND_LUMINANCE = 2.4;
const FLASH_SIZE = 5.5;
const FLASH_START_SCALE = 0.4;
const FLASH_WHITENESS = 0.5;
const CORE_WHITENESS = 0.7;
const FLASH_LUMINANCE = 3;
const WHITE = new THREE.Color(0xffffff);

export class Lightning {
  readonly group = new THREE.Group();
  private readonly bolts: Bolt[];
  private readonly path: THREE.Vector3[] = Array.from(
    { length: SEGMENTS + 1 },
    () => new THREE.Vector3(),
  );
  private cursor = 0;

  constructor(color: THREE.Color) {
    this.bolts = Array.from({ length: POOL_SIZE }, () => this.createBolt(color));
  }

  get activeBolts(): number {
    return this.bolts.filter((bolt) => bolt.flash.visible).length;
  }

  strike(target: THREE.Vector3): void {
    const bolt = this.bolts[this.cursor];
    this.cursor = (this.cursor + 1) % this.bolts.length;
    this.tracePath(target);
    bolt.strands.forEach((strand, index) =>
      this.drawStrand(strand, index === 0 ? 0 : STRAND_JITTER),
    );
    bolt.flash.position.copy(target);
    bolt.age = 0;
    this.show(bolt, true);
  }

  update(delta: number): void {
    for (const bolt of this.bolts) {
      if (!bolt.flash.visible) continue;
      bolt.age += delta;
      if (bolt.age >= LIFETIME) this.show(bolt, false);
      else this.fade(bolt);
    }
  }

  private tracePath(target: THREE.Vector3): void {
    const top = new THREE.Vector3(
      target.x + THREE.MathUtils.randFloatSpread(SKY_DRIFT * 2),
      target.y + SKY_HEIGHT,
      target.z + THREE.MathUtils.randFloatSpread(SKY_DRIFT * 2),
    );
    this.path.forEach((point, index) => {
      const progress = index / SEGMENTS;
      point.lerpVectors(top, target, progress);
      jitter(point, JITTER * Math.sin(progress * Math.PI));
    });
  }

  private drawStrand(strand: BoltLine, spread: number): void {
    const positions = strand.geometry.getAttribute('position');
    this.path.forEach((point, index) => {
      const ends = index === 0 || index === SEGMENTS ? 0 : spread;
      positions.setXYZ(
        index,
        point.x + THREE.MathUtils.randFloatSpread(ends),
        point.y,
        point.z + THREE.MathUtils.randFloatSpread(ends),
      );
    });
    positions.needsUpdate = true;
    strand.geometry.computeBoundingSphere();
  }

  private fade(bolt: Bolt): void {
    const progress = bolt.age / LIFETIME;
    const wave = (Math.sin(bolt.age * FLICKER_SPEED) + 1) / 2;
    const flicker = 1 - FLICKER_DEPTH * wave;
    const opacity = (1 - progress) * flicker;
    bolt.strands.forEach((strand) => (strand.material.opacity = opacity));
    const flash = bolt.flash;
    flash.material.opacity = (1 - progress) ** 2;
    const growth = THREE.MathUtils.lerp(FLASH_START_SCALE, 1, Math.sqrt(progress));
    flash.scale.setScalar(FLASH_SIZE * growth);
  }

  private show(bolt: Bolt, visible: boolean): void {
    bolt.strands.forEach((strand) => (strand.visible = visible));
    bolt.flash.visible = visible;
    if (visible) this.fade(bolt);
  }

  private createBolt(color: THREE.Color): Bolt {
    const strands = Array.from({ length: STRANDS }, (_, index) =>
      createStrand(index === 0 ? coreColor(color) : strandColor(color)),
    );
    const flash = createFlash(color);
    this.group.add(...strands, flash);
    const bolt = { strands, flash, age: 0 };
    this.show(bolt, false);
    return bolt;
  }
}

function jitter(point: THREE.Vector3, amount: number): void {
  point.x += THREE.MathUtils.randFloatSpread(amount * 2);
  point.z += THREE.MathUtils.randFloatSpread(amount * 2);
}

function coreColor(color: THREE.Color): THREE.Color {
  return withLuminance(color.clone().lerp(WHITE, CORE_WHITENESS), CORE_LUMINANCE);
}

function strandColor(color: THREE.Color): THREE.Color {
  return withLuminance(color.clone(), STRAND_LUMINANCE);
}

function createStrand(color: THREE.Color): BoltLine {
  const geometry = new THREE.BufferGeometry();
  const positions = new THREE.BufferAttribute(new Float32Array((SEGMENTS + 1) * 3), 3);
  positions.setUsage(THREE.DynamicDrawUsage);
  geometry.setAttribute('position', positions);
  const material = new THREE.LineBasicMaterial({
    color,
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  });
  const line = new THREE.Line(geometry, material);
  line.frustumCulled = false;
  return line;
}

function createFlash(color: THREE.Color): THREE.Sprite {
  const material = new THREE.SpriteMaterial({
    map: softGlowTexture(),
    color: withLuminance(color.clone().lerp(WHITE, FLASH_WHITENESS), FLASH_LUMINANCE),
    blending: THREE.AdditiveBlending,
    transparent: true,
    depthWrite: false,
    depthTest: false,
  });
  return new THREE.Sprite(material);
}
