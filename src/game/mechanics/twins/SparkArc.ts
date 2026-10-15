import * as THREE from 'three';
import { disposeObject } from '../../disposal';
import { withLuminance } from '../../effects/luminance';

export const MAX_LINKS = 3;

const SEGMENTS_PER_LINK = 8;
const CAPACITY = MAX_LINKS * SEGMENTS_PER_LINK + 1;
const LIFETIME = 0.5;
const JITTER = 0.32;
const ARC_LIFT = 0.15;
const STRANDS = [
  { color: 0xffffff, luminance: 3, jitterShare: 0.6 },
  { color: 0x5ef2e0, luminance: 2.2, jitterShare: 1 },
] as const;

type ArcLine = THREE.Line<THREE.BufferGeometry, THREE.LineBasicMaterial>;

function createStrand(color: number, luminance: number): ArcLine {
  const geometry = new THREE.BufferGeometry();
  const positions = new THREE.BufferAttribute(new Float32Array(CAPACITY * 3), 3);
  positions.setUsage(THREE.DynamicDrawUsage);
  geometry.setAttribute('position', positions);
  const material = new THREE.LineBasicMaterial({
    color: withLuminance(new THREE.Color(color), luminance),
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  });
  const line = new THREE.Line(geometry, material);
  line.frustumCulled = false;
  line.visible = false;
  return line;
}

export class SparkArc {
  readonly group = new THREE.Group();
  private readonly strands = STRANDS.map(({ color, luminance }) => createStrand(color, luminance));
  private readonly anchors: THREE.Vector3[] = [];
  private readonly point = new THREE.Vector3();
  private age = LIFETIME;

  constructor() {
    this.group.add(...this.strands);
  }

  get isVisible(): boolean {
    return this.age < LIFETIME;
  }

  show(points: readonly THREE.Vector3[]): void {
    this.anchors.length = 0;
    points.slice(0, MAX_LINKS + 1).forEach((point) => this.anchors.push(point.clone()));
    if (this.anchors.length < 2) return;
    this.age = 0;
    this.draw();
  }

  update(delta: number): void {
    if (!this.isVisible) return;
    this.age += delta;
    if (this.isVisible) this.draw();
    else this.strands.forEach((strand) => (strand.visible = false));
  }

  dispose(): void {
    this.group.removeFromParent();
    disposeObject(this.group);
  }

  private draw(): void {
    const opacity = 1 - this.age / LIFETIME;
    this.strands.forEach((strand, index) => {
      this.trace(strand, STRANDS[index].jitterShare);
      strand.material.opacity = opacity;
      strand.visible = true;
    });
  }

  private trace(strand: ArcLine, jitterShare: number): void {
    const positions = strand.geometry.getAttribute('position');
    const links = this.anchors.length - 1;
    for (let link = 0; link < links; link += 1) {
      for (let step = 0; step < SEGMENTS_PER_LINK; step += 1) {
        this.place(link, step / SEGMENTS_PER_LINK, jitterShare);
        this.write(positions, link * SEGMENTS_PER_LINK + step);
      }
    }
    this.place(links - 1, 1, 0);
    this.write(positions, links * SEGMENTS_PER_LINK);
    positions.needsUpdate = true;
    strand.geometry.setDrawRange(0, links * SEGMENTS_PER_LINK + 1);
  }

  private write(
    positions: THREE.BufferAttribute | THREE.InterleavedBufferAttribute,
    index: number,
  ): void {
    positions.setXYZ(index, this.point.x, this.point.y, this.point.z);
  }

  private place(link: number, progress: number, jitterShare: number): void {
    this.point.lerpVectors(this.anchors[link], this.anchors[link + 1], progress);
    const sway = Math.sin(progress * Math.PI);
    const jitter = JITTER * jitterShare * sway;
    this.point.x += THREE.MathUtils.randFloatSpread(jitter);
    this.point.y += THREE.MathUtils.randFloatSpread(jitter) + ARC_LIFT * sway;
    this.point.z += THREE.MathUtils.randFloatSpread(jitter);
  }
}
