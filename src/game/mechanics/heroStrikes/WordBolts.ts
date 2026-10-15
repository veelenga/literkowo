import * as THREE from 'three';
import { traceJaggedPath } from '../../effects/jaggedPath';
import { withLuminance } from '../../effects/luminance';
import type { GlowBursts, GlowStyle } from './GlowBursts';
import { RibbonBatch, type RibbonLook } from './RibbonBatch';

export const MAX_WORD_BOLTS = 4;

const MIDPOINT = 0.5;
const HALF_CHANCE = 0.5;
const MAIN_POINTS = 12;
const BRANCH_POINTS = 5;
const MAX_BRANCHES = 3;
const MIN_BRANCHES = 2;
const ARC_POINTS = MAIN_POINTS;
const MAIN_STRIP = 0;
const FIRST_BRANCH_STRIP = MAIN_STRIP + 1;
const ARC_STRIP = FIRST_BRANCH_STRIP + MAX_BRANCHES;
const STRIPS_PER_BOLT = ARC_STRIP + 1;
const BRANCH_EDGE_POINTS = 2;
const FIRST_BRANCH_POINT = BRANCH_EDGE_POINTS;
const LAST_BRANCH_POINT = MAIN_POINTS - 1 - BRANCH_EDGE_POINTS;
const FLICKER_TIME = 0.15;
const FADE_TIME = 0.12;
const RETRACE_INTERVAL = 0.035;
const FLICKER_SPEED = 70;
const FLICKER_DEPTH = 0.4;
const MAIN_JITTER = 0.3;
const BRANCH_JITTER = 0.14;
const BRANCH_REACH = { min: 0.8, max: 1.6 };
const BRANCH_SPREAD = 0.8;
const SKY_HEIGHT = 4;
const SKY_LEAN = 1.6;
const ARC_BOW = 1.1;
const ARC_JITTER = 0.32;
const RIBBON_LUMINANCE = 1.6;
const GOLD_SPARK_COLOR = new THREE.Color(0xffd36b);

const MAIN_LOOK = { startWidth: 0.4, endWidth: 0.24, startAlpha: 1, endAlpha: 1, core: 1.5 };
const BRANCH_LOOK = { startWidth: 0.2, endWidth: 0.02, startAlpha: 1, endAlpha: 0.4, core: 0.9 };
const ARC_LOOK = { startWidth: 0.14, endWidth: 0.16, startAlpha: 0.6, endAlpha: 1, core: 1.1 };

const MUZZLE: GlowStyle = {
  shape: 'glow',
  duration: 0.2,
  startSize: 1.5,
  endSize: 0.4,
  opacity: 1,
  whiteness: 0.55,
  luminance: 3.2,
  drag: 0,
};

const FLASH: GlowStyle = {
  shape: 'star',
  duration: 0.28,
  startSize: 2.1,
  endSize: 1,
  opacity: 1,
  whiteness: 0.3,
  luminance: 2.2,
  drag: 0,
};

const SHOCK_RING: GlowStyle = {
  shape: 'ring',
  duration: 0.32,
  startSize: 0.5,
  endSize: 3.4,
  opacity: 1,
  whiteness: 0.35,
  luminance: 2.4,
  drag: 0,
};

const SPARK: GlowStyle = {
  shape: 'glow',
  duration: 0.3,
  startSize: 0.22,
  endSize: 0.05,
  opacity: 1,
  whiteness: 0.5,
  luminance: 3,
  drag: 5,
};

const GOLD_SPARK: GlowStyle = { ...SPARK, shape: 'star', duration: 0.45, startSize: 0.42 };

const SPARKS = { count: 6, speed: 5 };
const GOLD_SPARKS = { count: 10, speed: 6.5 };

type Look = Omit<RibbonLook, 'color'>;

interface WordBolt {
  readonly from: THREE.Vector3;
  readonly to: THREE.Vector3;
  readonly sky: THREE.Vector3;
  readonly bow: THREE.Vector3;
  readonly main: THREE.Vector3[];
  readonly branches: THREE.Vector3[][];
  readonly arc: THREE.Vector3[];
  readonly color: THREE.Color;
  readonly mainLook: RibbonLook;
  readonly branchLook: RibbonLook;
  readonly arcLook: RibbonLook;
  branchCount: number;
  fever: boolean;
  age: number;
  retraceIn: number;
  active: boolean;
}

const along = new THREE.Vector3();
const branchEnd = new THREE.Vector3();
const lean = new THREE.Vector3();

export class WordBolts {
  private readonly ribbons = new RibbonBatch(MAX_WORD_BOLTS * STRIPS_PER_BOLT, MAIN_POINTS);
  private readonly bolts = Array.from({ length: MAX_WORD_BOLTS }, createBolt);
  private cursor = 0;

  constructor(private readonly glows: GlowBursts) {}

  get object(): THREE.Object3D {
    return this.ribbons.mesh;
  }

  get inFlight(): number {
    return this.bolts.filter((bolt) => bolt.active).length;
  }

  fire(from: THREE.Vector3, to: THREE.Vector3, color: THREE.Color, fever: boolean): void {
    const index = this.cursor;
    this.cursor = (index + 1) % this.bolts.length;
    const bolt = this.bolts[index];
    aim(bolt, from, to);
    paint(bolt, color);
    bolt.fever = fever;
    bolt.age = 0;
    bolt.retraceIn = RETRACE_INTERVAL;
    bolt.active = true;
    retrace(bolt);
    this.burst(bolt);
    this.draw(index, bolt, 1);
  }

  update(delta: number): void {
    for (let index = 0; index < this.bolts.length; index += 1) {
      const bolt = this.bolts[index];
      if (bolt.active) this.advance(index, bolt, delta);
    }
    this.ribbons.flush();
  }

  private advance(index: number, bolt: WordBolt, delta: number): void {
    bolt.age += delta;
    if (bolt.age >= FLICKER_TIME + FADE_TIME) return this.retire(index, bolt);
    bolt.retraceIn -= delta;
    if (bolt.age < FLICKER_TIME && bolt.retraceIn <= 0) {
      bolt.retraceIn += RETRACE_INTERVAL;
      retrace(bolt);
    }
    this.draw(index, bolt, brightness(bolt.age));
  }

  private burst(bolt: WordBolt): void {
    this.glows.emit(bolt.from, bolt.color, MUZZLE);
    this.glows.emit(bolt.to, bolt.color, FLASH);
    this.glows.emit(bolt.to, bolt.color, SHOCK_RING);
    this.glows.scatter(bolt.to, bolt.color, SPARK, SPARKS.count, SPARKS.speed);
    if (!bolt.fever) return;
    this.glows.scatter(bolt.to, GOLD_SPARK_COLOR, GOLD_SPARK, GOLD_SPARKS.count, GOLD_SPARKS.speed);
  }

  private draw(index: number, bolt: WordBolt, light: number): void {
    const first = index * STRIPS_PER_BOLT;
    const mainLook = lit(bolt.mainLook, MAIN_LOOK, light);
    this.ribbons.draw(first + MAIN_STRIP, bolt.main, MAIN_POINTS, mainLook);
    this.drawBranches(first, bolt, lit(bolt.branchLook, BRANCH_LOOK, light));
    this.drawArc(first + ARC_STRIP, bolt, lit(bolt.arcLook, ARC_LOOK, light));
  }

  private drawBranches(first: number, bolt: WordBolt, look: RibbonLook): void {
    for (let branch = 0; branch < MAX_BRANCHES; branch += 1) {
      const strip = first + FIRST_BRANCH_STRIP + branch;
      if (branch >= bolt.branchCount) this.ribbons.hide(strip);
      else this.ribbons.draw(strip, bolt.branches[branch], BRANCH_POINTS, look);
    }
  }

  private drawArc(strip: number, bolt: WordBolt, look: RibbonLook): void {
    if (bolt.fever) this.ribbons.draw(strip, bolt.arc, ARC_POINTS, look);
    else this.ribbons.hide(strip);
  }

  private retire(index: number, bolt: WordBolt): void {
    bolt.active = false;
    const first = index * STRIPS_PER_BOLT;
    for (let strip = first; strip < first + STRIPS_PER_BOLT; strip += 1) this.ribbons.hide(strip);
  }
}

function aim(bolt: WordBolt, from: THREE.Vector3, to: THREE.Vector3): void {
  bolt.from.copy(from);
  bolt.to.copy(to);
  lean.set(from.z - to.z, 0, to.x - from.x).normalize();
  const side = Math.random() < HALF_CHANCE ? -1 : 1;
  bolt.sky.lerpVectors(from, to, MIDPOINT).addScaledVector(lean, SKY_LEAN * side);
  bolt.sky.y += SKY_HEIGHT;
  bolt.bow.copy(lean).multiplyScalar(ARC_BOW * side);
}

function paint(bolt: WordBolt, color: THREE.Color): void {
  bolt.color.copy(color);
  withLuminance(bolt.mainLook.color.copy(color), RIBBON_LUMINANCE);
  bolt.branchLook.color.copy(bolt.mainLook.color);
  bolt.arcLook.color.copy(bolt.mainLook.color);
}

function retrace(bolt: WordBolt): void {
  traceJaggedPath(bolt.main, bolt.from, bolt.to, MAIN_JITTER);
  bolt.branchCount = THREE.MathUtils.randInt(MIN_BRANCHES, MAX_BRANCHES);
  along.subVectors(bolt.to, bolt.from).normalize();
  for (let branch = 0; branch < bolt.branchCount; branch += 1) traceBranch(bolt, branch);
  if (bolt.fever) traceJaggedPath(bolt.arc, bolt.sky, bolt.to, ARC_JITTER, bolt.bow);
}

function traceBranch(bolt: WordBolt, branch: number): void {
  const start = bolt.main[THREE.MathUtils.randInt(FIRST_BRANCH_POINT, LAST_BRANCH_POINT)];
  const reach = THREE.MathUtils.randFloat(BRANCH_REACH.min, BRANCH_REACH.max);
  branchEnd.randomDirection().multiplyScalar(BRANCH_SPREAD).add(along).multiplyScalar(reach);
  branchEnd.add(start);
  traceJaggedPath(bolt.branches[branch], start, branchEnd, BRANCH_JITTER);
}

function brightness(age: number): number {
  const wave = (Math.sin(age * FLICKER_SPEED) + 1) / 2;
  const flicker = 1 - FLICKER_DEPTH * wave;
  if (age < FLICKER_TIME) return flicker;
  const fade = 1 - (age - FLICKER_TIME) / FADE_TIME;
  return flicker * fade * fade;
}

function lit(target: RibbonLook, base: Look, light: number): RibbonLook {
  target.startWidth = base.startWidth;
  target.endWidth = base.endWidth;
  target.startAlpha = base.startAlpha * light;
  target.endAlpha = base.endAlpha * light;
  target.core = base.core * light;
  return target;
}

function points(count: number): THREE.Vector3[] {
  return Array.from({ length: count }, () => new THREE.Vector3());
}

function ribbonLook(base: Look): RibbonLook {
  return { ...base, color: new THREE.Color() };
}

function createBolt(): WordBolt {
  return {
    from: new THREE.Vector3(),
    to: new THREE.Vector3(),
    sky: new THREE.Vector3(),
    bow: new THREE.Vector3(),
    main: points(MAIN_POINTS),
    branches: Array.from({ length: MAX_BRANCHES }, () => points(BRANCH_POINTS)),
    arc: points(ARC_POINTS),
    color: new THREE.Color(),
    mainLook: ribbonLook(MAIN_LOOK),
    branchLook: ribbonLook(BRANCH_LOOK),
    arcLook: ribbonLook(ARC_LOOK),
    branchCount: MIN_BRANCHES,
    fever: false,
    age: 0,
    retraceIn: 0,
    active: false,
  };
}
