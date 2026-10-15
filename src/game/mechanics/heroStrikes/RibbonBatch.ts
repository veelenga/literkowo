import * as THREE from 'three';
import { createEffectMesh, dynamicAttribute } from './effectMesh';

export interface RibbonLook {
  readonly color: THREE.Color;
  startWidth: number;
  endWidth: number;
  startAlpha: number;
  endAlpha: number;
  core: number;
}

const SIDES = [-1, 1] as const;
const VECTOR_SIZE = 3;
const TINT_SIZE = 4;

const VERTEX = `
attribute vec3 aTangent;
attribute float aSide;
attribute float aWidth;
attribute vec4 aTint;
attribute float aCore;
varying float vAcross;
varying vec4 vTint;
varying float vCore;

void main() {
  vec4 view = modelViewMatrix * vec4(position, 1.0);
  vec3 tangent = (modelViewMatrix * vec4(aTangent, 0.0)).xyz;
  vec3 across = cross(tangent, view.xyz);
  float span = length(across);
  if (span > 0.00001) view.xyz += across / span * aSide * aWidth * 0.5;
  gl_Position = projectionMatrix * view;
  vAcross = aSide;
  vTint = aTint;
  vCore = aCore;
}
`;

const FRAGMENT = `
varying float vAcross;
varying vec4 vTint;
varying float vCore;

void main() {
  float edge = min(abs(vAcross), 1.0);
  float halo = pow(1.0 - edge, 1.5);
  float core = 1.0 - smoothstep(0.0, 0.25, edge);
  float coverage = halo * vTint.a;
  vec3 light = (vTint.rgb * halo + vec3(core * vCore)) * vTint.a;
  gl_FragColor = vec4(light, coverage * OCCLUSION);
}
`;

const tangent = new THREE.Vector3();

export class RibbonBatch {
  readonly mesh: THREE.Mesh<THREE.BufferGeometry, THREE.ShaderMaterial>;
  private readonly position: THREE.BufferAttribute;
  private readonly tangent: THREE.BufferAttribute;
  private readonly width: THREE.BufferAttribute;
  private readonly tint: THREE.BufferAttribute;
  private readonly core: THREE.BufferAttribute;
  private readonly changing: readonly THREE.BufferAttribute[];
  private readonly shown: Uint8Array;
  private shownCount = 0;
  private dirty = false;

  constructor(
    private readonly strips: number,
    private readonly pointsPerStrip: number,
  ) {
    const vertices = strips * pointsPerStrip * SIDES.length;
    this.position = vertexAttribute(vertices, VECTOR_SIZE);
    this.tangent = vertexAttribute(vertices, VECTOR_SIZE);
    this.width = vertexAttribute(vertices, 1);
    this.tint = vertexAttribute(vertices, TINT_SIZE);
    this.core = vertexAttribute(vertices, 1);
    this.changing = [this.position, this.tangent, this.width, this.tint, this.core];
    this.shown = new Uint8Array(strips);
    this.mesh = createEffectMesh(this.createGeometry(vertices), VERTEX, FRAGMENT);
  }

  draw(strip: number, points: readonly THREE.Vector3[], count: number, look: RibbonLook): void {
    const last = Math.min(count, this.pointsPerStrip) - 1;
    for (let index = 0; index <= last; index += 1) {
      const along = last > 0 ? index / last : 0;
      tangent.subVectors(points[Math.min(index + 1, last)], points[Math.max(index - 1, 0)]);
      this.writePoint(this.firstVertex(strip, index), points[index], look, along);
    }
    this.collapseAfter(strip, last, points[last]);
    this.mark(strip, true);
  }

  hide(strip: number): void {
    if (!this.shown[strip]) return;
    const first = this.firstVertex(strip, 0);
    const end = this.firstVertex(strip + 1, 0);
    for (let vertex = first; vertex < end; vertex += 1) this.width.setX(vertex, 0);
    this.mark(strip, false);
  }

  flush(): void {
    this.mesh.visible = this.shownCount > 0;
    if (!this.dirty) return;
    this.dirty = false;
    for (const attribute of this.changing) attribute.needsUpdate = true;
  }

  private writePoint(first: number, point: THREE.Vector3, look: RibbonLook, along: number): void {
    const width = THREE.MathUtils.lerp(look.startWidth, look.endWidth, along);
    const alpha = THREE.MathUtils.lerp(look.startAlpha, look.endAlpha, along);
    const { r, g, b } = look.color;
    for (let vertex = first; vertex < first + SIDES.length; vertex += 1) {
      this.position.setXYZ(vertex, point.x, point.y, point.z);
      this.tangent.setXYZ(vertex, tangent.x, tangent.y, tangent.z);
      this.width.setX(vertex, width);
      this.tint.setXYZW(vertex, r, g, b, alpha);
      this.core.setX(vertex, look.core);
    }
  }

  private collapseAfter(strip: number, last: number, point: THREE.Vector3): void {
    const end = this.firstVertex(strip + 1, 0);
    for (let vertex = this.firstVertex(strip, last + 1); vertex < end; vertex += 1) {
      this.position.setXYZ(vertex, point.x, point.y, point.z);
      this.width.setX(vertex, 0);
      this.tint.setW(vertex, 0);
    }
  }

  private firstVertex(strip: number, index: number): number {
    return (strip * this.pointsPerStrip + index) * SIDES.length;
  }

  private mark(strip: number, visible: boolean): void {
    this.dirty = true;
    if (Boolean(this.shown[strip]) === visible) return;
    this.shown[strip] = visible ? 1 : 0;
    this.shownCount += visible ? 1 : -1;
  }

  private createGeometry(vertices: number): THREE.BufferGeometry {
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', this.position);
    geometry.setAttribute('aTangent', this.tangent);
    geometry.setAttribute('aWidth', this.width);
    geometry.setAttribute('aTint', this.tint);
    geometry.setAttribute('aCore', this.core);
    geometry.setAttribute('aSide', sideAttribute(vertices));
    geometry.setIndex(this.stripTriangles());
    return geometry;
  }

  private stripTriangles(): number[] {
    const triangles: number[] = [];
    for (let strip = 0; strip < this.strips; strip += 1) {
      for (let index = 0; index < this.pointsPerStrip - 1; index += 1) {
        const left = this.firstVertex(strip, index);
        const nextLeft = this.firstVertex(strip, index + 1);
        triangles.push(left, left + 1, nextLeft, left + 1, nextLeft + 1, nextLeft);
      }
    }
    return triangles;
  }
}

function vertexAttribute(vertices: number, itemSize: number): THREE.BufferAttribute {
  return dynamicAttribute(
    new THREE.BufferAttribute(new Float32Array(vertices * itemSize), itemSize),
  );
}

function sideAttribute(vertices: number): THREE.BufferAttribute {
  const sides = Float32Array.from(
    { length: vertices },
    (_, vertex) => SIDES[vertex % SIDES.length],
  );
  return new THREE.BufferAttribute(sides, 1);
}
