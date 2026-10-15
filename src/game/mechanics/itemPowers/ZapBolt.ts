import * as THREE from 'three';
import { softGlowTexture } from '../../effects/glowAssets';
import { withLuminance } from '../../effects/luminance';

type Strand = THREE.Line<THREE.BufferGeometry, THREE.LineBasicMaterial>;

const STRANDS = 2;
const SEGMENTS = 8;
const JITTER = 0.18;
const LIFETIME = 0.3;
const CORE_LUMINANCE = 3.5;
const STRAND_LUMINANCE = 2;
const CORE_WHITENESS = 0.6;
const FLASH_SIZE = 1.6;
const FLASH_LUMINANCE = 2.5;
const WHITE = new THREE.Color(0xffffff);
const POSITION_COMPONENTS = 3;

export class ZapBolt {
  readonly object = new THREE.Group();
  private readonly strands: Strand[];
  private readonly flash: THREE.Sprite;
  private age = LIFETIME;

  constructor(color: THREE.ColorRepresentation) {
    const base = new THREE.Color(color);
    this.strands = Array.from({ length: STRANDS }, (_, index) =>
      createStrand(index === 0 ? coreColor(base) : withLuminance(base.clone(), STRAND_LUMINANCE)),
    );
    this.flash = createFlash(base);
    this.object.add(...this.strands, this.flash);
    this.object.visible = false;
  }

  strike(from: THREE.Vector3, to: THREE.Vector3): void {
    this.strands.forEach((strand, index) =>
      traceStrand(strand, from, to, index === 0 ? JITTER / 2 : JITTER),
    );
    this.flash.position.copy(to);
    this.age = 0;
    this.object.visible = true;
    this.fade();
  }

  update(delta: number): void {
    if (!this.object.visible) return;
    this.age += delta;
    if (this.age >= LIFETIME) {
      this.object.visible = false;
      return;
    }
    this.fade();
  }

  private fade(): void {
    const remaining = 1 - this.age / LIFETIME;
    this.strands.forEach((strand) => (strand.material.opacity = remaining));
    this.flash.material.opacity = remaining * remaining;
    this.flash.scale.setScalar(FLASH_SIZE * (2 - remaining));
  }
}

function createStrand(color: THREE.Color): Strand {
  const positions = new Float32Array((SEGMENTS + 1) * POSITION_COMPONENTS);
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, POSITION_COMPONENTS));
  const material = new THREE.LineBasicMaterial({
    color,
    transparent: true,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  });
  return new THREE.Line(geometry, material);
}

function createFlash(color: THREE.Color): THREE.Sprite {
  const material = new THREE.SpriteMaterial({
    map: softGlowTexture(),
    color: withLuminance(color.clone().lerp(WHITE, CORE_WHITENESS), FLASH_LUMINANCE),
    blending: THREE.AdditiveBlending,
    transparent: true,
    depthWrite: false,
  });
  return new THREE.Sprite(material);
}

function traceStrand(strand: Strand, from: THREE.Vector3, to: THREE.Vector3, jitter: number): void {
  const positions = strand.geometry.getAttribute('position');
  const point = new THREE.Vector3();
  for (let index = 0; index <= SEGMENTS; index += 1) {
    const progress = index / SEGMENTS;
    const sway = Math.sin(progress * Math.PI) * jitter;
    point.lerpVectors(from, to, progress);
    point.x += THREE.MathUtils.randFloatSpread(sway * 2);
    point.y += THREE.MathUtils.randFloatSpread(sway * 2);
    point.z += THREE.MathUtils.randFloatSpread(sway * 2);
    positions.setXYZ(index, point.x, point.y, point.z);
  }
  positions.needsUpdate = true;
  strand.geometry.computeBoundingSphere();
}

function coreColor(color: THREE.Color): THREE.Color {
  return withLuminance(color.clone().lerp(WHITE, CORE_WHITENESS), CORE_LUMINANCE);
}
