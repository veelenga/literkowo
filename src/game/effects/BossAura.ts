import * as THREE from 'three';
import { softGlowTexture } from './glowAssets';

const MOTE_COUNT = 40;
const MIN_RADIUS = 1.3;
const MAX_RADIUS = 3.2;
const BOTTOM = 0.2;
const TOP = 5.6;
const MIN_RISE = 0.3;
const MAX_RISE = 0.75;
const SWIRL_SPEED = 0.35;
const TAPER = 0.35;
const MOTE_SIZE = 1.2;
const MAX_ALPHA = 0.6;
const SHADOW_COLOR = new THREE.Color(0x0d0614);
const COLOR_TINT = 0.2;
const FULL_TURN = Math.PI * 2;

interface Mote {
  angle: number;
  radius: number;
  height: number;
  rise: number;
}

function createMote(): Mote {
  return {
    angle: Math.random() * FULL_TURN,
    radius: THREE.MathUtils.randFloat(MIN_RADIUS, MAX_RADIUS),
    height: THREE.MathUtils.randFloat(BOTTOM, TOP),
    rise: THREE.MathUtils.randFloat(MIN_RISE, MAX_RISE),
  };
}

export class BossAura {
  readonly points: THREE.Points<THREE.BufferGeometry, THREE.PointsMaterial>;
  private readonly motes: Mote[] = Array.from({ length: MOTE_COUNT }, createMote);
  private readonly positions = new THREE.BufferAttribute(new Float32Array(MOTE_COUNT * 3), 3);
  private readonly colors = new THREE.BufferAttribute(new Float32Array(MOTE_COUNT * 4).fill(1), 4);

  constructor(color: THREE.Color) {
    this.positions.setUsage(THREE.DynamicDrawUsage);
    this.colors.setUsage(THREE.DynamicDrawUsage);
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', this.positions);
    geometry.setAttribute('color', this.colors);
    const material = new THREE.PointsMaterial({
      color: SHADOW_COLOR.clone().lerp(color, COLOR_TINT),
      size: MOTE_SIZE,
      map: softGlowTexture(),
      transparent: true,
      depthWrite: false,
      vertexColors: true,
    });
    this.points = new THREE.Points(geometry, material);
    this.points.frustumCulled = false;
    this.update(0);
  }

  update(delta: number): void {
    for (let index = 0; index < this.motes.length; index += 1) this.advanceMote(index, delta);
    this.positions.needsUpdate = true;
    this.colors.needsUpdate = true;
  }

  private advanceMote(index: number, delta: number): void {
    const mote = this.motes[index];
    mote.angle += SWIRL_SPEED * delta;
    mote.height += mote.rise * delta;
    if (mote.height > TOP) mote.height = BOTTOM;
    const progress = (mote.height - BOTTOM) / (TOP - BOTTOM);
    const radius = mote.radius * (1 - progress * TAPER);
    this.positions.setXYZ(
      index,
      Math.cos(mote.angle) * radius,
      mote.height,
      Math.sin(mote.angle) * radius,
    );
    this.colors.setW(index, Math.sin(progress * Math.PI) * MAX_ALPHA);
  }
}
