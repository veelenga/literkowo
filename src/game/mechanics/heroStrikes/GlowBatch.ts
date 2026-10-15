import * as THREE from 'three';
import { createEffectMesh, dynamicAttribute } from './effectMesh';

const GLOW_SHAPES = { glow: 0, ring: 1, star: 2 } as const;
export type GlowShape = keyof typeof GLOW_SHAPES;

const QUAD_CORNERS = [-0.5, -0.5, 0, 0.5, -0.5, 0, 0.5, 0.5, 0, -0.5, 0.5, 0];
const QUAD_TRIANGLES = [0, 1, 2, 0, 2, 3];
const PLACE_SIZE = 4;
const TINT_SIZE = 4;

const VERTEX = `
attribute vec4 aPlace;
attribute vec4 aTint;
attribute float aShape;
varying vec2 vOffset;
varying vec4 vTint;
varying float vShape;

void main() {
  vec4 view = modelViewMatrix * vec4(aPlace.xyz, 1.0);
  view.xy += position.xy * aPlace.w;
  gl_Position = projectionMatrix * view;
  vOffset = position.xy * 2.0;
  vTint = aTint;
  vShape = aShape;
}
`;

const FRAGMENT = `
varying vec2 vOffset;
varying vec4 vTint;
varying float vShape;

float glow(float radius) {
  return exp(-radius * radius * 5.0);
}

float ring(float radius) {
  float band = (radius - 0.72) / 0.1;
  return exp(-band * band) + 0.12 * (1.0 - radius);
}

float star(vec2 offset, float radius) {
  float rays = exp(-abs(offset.x * offset.y) * 90.0) * (1.0 - radius);
  return max(rays, exp(-radius * radius * 16.0));
}

void main() {
  float radius = length(vOffset);
  if (radius > 1.0) discard;
  bool isRing = vShape > 0.5 && vShape < 1.5;
  float shape = vShape < 0.5 ? glow(radius) : isRing ? ring(radius) : star(vOffset, radius);
  float hot = isRing ? 0.0 : exp(-radius * radius * 28.0);
  vec3 peak = vec3(max(vTint.r, max(vTint.g, vTint.b)));
  float coverage = shape * vTint.a;
  gl_FragColor = vec4(mix(vTint.rgb, peak, hot) * coverage, coverage * OCCLUSION);
}
`;

export class GlowBatch {
  readonly mesh: THREE.Mesh<THREE.InstancedBufferGeometry, THREE.ShaderMaterial>;
  private readonly place: THREE.InstancedBufferAttribute;
  private readonly tint: THREE.InstancedBufferAttribute;
  private readonly shape: THREE.InstancedBufferAttribute;
  private readonly shown: Uint8Array;
  private shownCount = 0;
  private reserved = 0;
  private dirty = false;

  constructor(private readonly capacity: number) {
    this.place = instanced(capacity, PLACE_SIZE);
    this.tint = instanced(capacity, TINT_SIZE);
    this.shape = instanced(capacity, 1);
    this.shown = new Uint8Array(capacity);
    this.mesh = createEffectMesh(this.createGeometry(), VERTEX, FRAGMENT);
  }

  reserve(count: number): number {
    const first = this.reserved;
    if (first + count > this.capacity) throw new RangeError('Glow batch is full');
    this.reserved += count;
    return first;
  }

  show(
    slot: number,
    position: THREE.Vector3,
    size: number,
    color: THREE.Color,
    alpha: number,
    shape: GlowShape,
  ): void {
    this.place.setXYZW(slot, position.x, position.y, position.z, size);
    this.tint.setXYZW(slot, color.r, color.g, color.b, alpha);
    this.shape.setX(slot, GLOW_SHAPES[shape]);
    this.mark(slot, true);
  }

  hide(slot: number): void {
    if (!this.shown[slot]) return;
    this.place.setW(slot, 0);
    this.mark(slot, false);
  }

  flush(): void {
    this.mesh.visible = this.shownCount > 0;
    if (!this.dirty) return;
    this.dirty = false;
    this.place.needsUpdate = true;
    this.tint.needsUpdate = true;
    this.shape.needsUpdate = true;
  }

  private mark(slot: number, visible: boolean): void {
    this.dirty = true;
    if (Boolean(this.shown[slot]) === visible) return;
    this.shown[slot] = visible ? 1 : 0;
    this.shownCount += visible ? 1 : -1;
  }

  private createGeometry(): THREE.InstancedBufferGeometry {
    const geometry = new THREE.InstancedBufferGeometry();
    geometry.setIndex(QUAD_TRIANGLES);
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(QUAD_CORNERS, 3));
    geometry.setAttribute('aPlace', this.place);
    geometry.setAttribute('aTint', this.tint);
    geometry.setAttribute('aShape', this.shape);
    geometry.instanceCount = this.capacity;
    return geometry;
  }
}

function instanced(capacity: number, itemSize: number): THREE.InstancedBufferAttribute {
  const values = new Float32Array(capacity * itemSize);
  return dynamicAttribute(new THREE.InstancedBufferAttribute(values, itemSize));
}
