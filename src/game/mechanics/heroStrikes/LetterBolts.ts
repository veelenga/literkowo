import * as THREE from 'three';
import { SPAWN_RADIUS } from '../../arena';
import { withLuminance } from '../../effects/luminance';
import type { GlowBatch } from './GlowBatch';
import type { GlowBursts, GlowStyle } from './GlowBursts';
import { RibbonBatch, type RibbonLook } from './RibbonBatch';

export const MAX_LETTER_BOLTS = 6;

const TRAIL_POINTS = 8;
const NEAR_TRAVEL = 0.09;
const FAR_TRAVEL = 0.12;
const TRAIL_LAG = 0.04;
const MIDPOINT = 0.5;
const ARC_LIFT = 0.07;
const ARC_SWAY = 0.08;
const HEAD_SIZE = 0.55;
const HEAD_WHITENESS = 0.3;
const HEAD_LUMINANCE = 2.2;
const TRAIL_WIDTH = 0.3;
const TRAIL_LUMINANCE = 1.5;
const TRAIL_CORE = 0.9;
const IMPACT_SPARKS = 3;
const IMPACT_SPARK_SPEED = 3.5;
const WHITE = new THREE.Color(0xffffff);

const MUZZLE: GlowStyle = {
  shape: 'glow',
  duration: 0.12,
  startSize: 0.9,
  endSize: 0.3,
  opacity: 0.9,
  whiteness: 0.3,
  luminance: 2,
  drag: 0,
};

const IMPACT: GlowStyle = {
  shape: 'star',
  duration: 0.16,
  startSize: 1.2,
  endSize: 0.5,
  opacity: 1,
  whiteness: 0.3,
  luminance: 2.4,
  drag: 0,
};

const IMPACT_RING: GlowStyle = {
  shape: 'ring',
  duration: 0.22,
  startSize: 0.3,
  endSize: 1.3,
  opacity: 0.9,
  whiteness: 0.3,
  luminance: 2,
  drag: 0,
};

const IMPACT_SPARK: GlowStyle = {
  shape: 'glow',
  duration: 0.22,
  startSize: 0.18,
  endSize: 0.05,
  opacity: 1,
  whiteness: 0.4,
  luminance: 2.4,
  drag: 6,
};

interface LetterBolt {
  readonly from: THREE.Vector3;
  readonly control: THREE.Vector3;
  readonly to: THREE.Vector3;
  readonly color: THREE.Color;
  readonly headColor: THREE.Color;
  readonly trail: RibbonLook;
  travel: number;
  age: number;
  active: boolean;
  landed: boolean;
}

const sway = new THREE.Vector3();

export class LetterBolts {
  private readonly ribbons = new RibbonBatch(MAX_LETTER_BOLTS, TRAIL_POINTS);
  private readonly bolts = Array.from({ length: MAX_LETTER_BOLTS }, createBolt);
  private readonly path = Array.from({ length: TRAIL_POINTS }, () => new THREE.Vector3());
  private readonly firstHead: number;
  private cursor = 0;

  constructor(
    private readonly glows: GlowBursts,
    private readonly heads: GlowBatch,
  ) {
    this.firstHead = heads.reserve(MAX_LETTER_BOLTS);
  }

  get object(): THREE.Object3D {
    return this.ribbons.mesh;
  }

  get inFlight(): number {
    return this.bolts.filter((bolt) => bolt.active).length;
  }

  fire(from: THREE.Vector3, to: THREE.Vector3, color: THREE.Color): void {
    const index = this.cursor;
    this.cursor = (index + 1) % this.bolts.length;
    const bolt = this.bolts[index];
    aim(bolt, from, to);
    paint(bolt, color);
    bolt.age = 0;
    bolt.active = true;
    bolt.landed = false;
    this.glows.emit(from, color, MUZZLE);
    this.draw(index, bolt);
  }

  update(delta: number): void {
    for (let index = 0; index < this.bolts.length; index += 1) {
      const bolt = this.bolts[index];
      if (!bolt.active) continue;
      bolt.age += delta;
      if (!bolt.landed && bolt.age >= bolt.travel) this.land(index, bolt);
      if (bolt.age >= bolt.travel + TRAIL_LAG) this.retire(index, bolt);
      else this.draw(index, bolt);
    }
    this.ribbons.flush();
  }

  private land(index: number, bolt: LetterBolt): void {
    bolt.landed = true;
    this.heads.hide(this.firstHead + index);
    this.glows.emit(bolt.to, bolt.color, IMPACT);
    this.glows.emit(bolt.to, bolt.color, IMPACT_RING);
    this.glows.scatter(bolt.to, bolt.color, IMPACT_SPARK, IMPACT_SPARKS, IMPACT_SPARK_SPEED);
  }

  private retire(index: number, bolt: LetterBolt): void {
    bolt.active = false;
    this.heads.hide(this.firstHead + index);
    this.ribbons.hide(index);
  }

  private draw(index: number, bolt: LetterBolt): void {
    const head = Math.min(bolt.age / bolt.travel, 1);
    const tail = THREE.MathUtils.clamp((bolt.age - TRAIL_LAG) / bolt.travel, 0, 1);
    for (let point = 0; point < TRAIL_POINTS; point += 1) {
      const progress = THREE.MathUtils.lerp(tail, head, point / (TRAIL_POINTS - 1));
      bezier(this.path[point], bolt, progress);
    }
    this.ribbons.draw(index, this.path, TRAIL_POINTS, bolt.trail);
    if (bolt.landed) return;
    const tip = this.path[TRAIL_POINTS - 1];
    this.heads.show(this.firstHead + index, tip, HEAD_SIZE, bolt.headColor, 1, 'glow');
  }
}

function aim(bolt: LetterBolt, from: THREE.Vector3, to: THREE.Vector3): void {
  const distance = from.distanceTo(to);
  bolt.from.copy(from);
  bolt.to.copy(to);
  sway.set(from.z - to.z, 0, to.x - from.x).normalize();
  sway.multiplyScalar(THREE.MathUtils.randFloatSpread(ARC_SWAY * 2) * distance);
  bolt.control.lerpVectors(from, to, MIDPOINT).add(sway);
  bolt.control.y += ARC_LIFT * distance;
  const reach = THREE.MathUtils.clamp(distance / SPAWN_RADIUS, 0, 1);
  bolt.travel = THREE.MathUtils.lerp(NEAR_TRAVEL, FAR_TRAVEL, reach);
}

function paint(bolt: LetterBolt, color: THREE.Color): void {
  bolt.color.copy(color);
  withLuminance(bolt.headColor.copy(color).lerp(WHITE, HEAD_WHITENESS), HEAD_LUMINANCE);
  withLuminance(bolt.trail.color.copy(color), TRAIL_LUMINANCE);
}

function bezier(target: THREE.Vector3, bolt: LetterBolt, progress: number): void {
  const rest = 1 - progress;
  target
    .copy(bolt.from)
    .multiplyScalar(rest * rest)
    .addScaledVector(bolt.control, 2 * rest * progress)
    .addScaledVector(bolt.to, progress * progress);
}

function createBolt(): LetterBolt {
  return {
    from: new THREE.Vector3(),
    control: new THREE.Vector3(),
    to: new THREE.Vector3(),
    color: new THREE.Color(),
    headColor: new THREE.Color(),
    trail: {
      color: new THREE.Color(),
      startWidth: 0,
      endWidth: TRAIL_WIDTH,
      startAlpha: 0,
      endAlpha: 1,
      core: TRAIL_CORE,
    },
    travel: NEAR_TRAVEL,
    age: 0,
    active: false,
    landed: false,
  };
}
