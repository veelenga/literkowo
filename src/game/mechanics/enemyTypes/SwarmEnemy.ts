import * as THREE from 'three';
import type { EnemyLook, LabelMode } from '../../Enemy';
import { bugGeometry, swarmBody } from './bodies';
import { SpecialEnemy, type SpecialSpec } from './SpecialEnemy';
import { glyphElements, scatterGlyphs, type GlyphSpot } from './swarmGlyphs';

const LOOK: EnemyLook = { shape: 'wisp', colors: [0xffd400, 0xff9f1a, 0xc6ff3d] };
const LABEL_HEIGHT = 2.2;
const ORBIT = { minRadius: 0.42, maxRadius: 0.8, minSpeed: 2.4, maxSpeed: 4.6, lift: 0.3 };
const BUZZ = { speed: 31, amount: 0.05, spin: 9 };
const JITTER = { speed: 17, amount: 0.07, depthRatio: 1.3 };
const BUG_GLOW = 1.6;
const FULL_TURN = Math.PI * 2;
const HALF = 0.5;

interface Bug {
  readonly mesh: THREE.Mesh;
  readonly radius: number;
  readonly speed: number;
  readonly lift: number;
  angle: number;
}

export class SwarmEnemy extends SpecialEnemy {
  private readonly bugs: Bug[];
  private readonly spots: readonly GlyphSpot[];
  private readonly jitterPhase = Math.random() * FULL_TURN;
  private readonly bugPosition = new THREE.Vector3();
  private glyphMode: LabelMode = 'full';
  private popped = 0;

  constructor(spec: SpecialSpec) {
    super(spec, LOOK, swarmBody());
    this.bugs = createBugs(this.word.length, this.color);
    this.rig.add(...this.bugs.map((bug) => bug.mesh));
    this.spots = scatterGlyphs(this.word.length);
    this.renderGlyphs();
  }

  get bugsLeft(): number {
    return this.bugs.filter((bug) => bug.mesh.visible).length;
  }

  override get labelHeight(): number {
    return LABEL_HEIGHT;
  }

  override update(delta: number, elapsed: number, viewer: THREE.Vector3Like): void {
    super.update(delta, elapsed, viewer);
    this.rig.position.x += Math.sin(elapsed * JITTER.speed + this.jitterPhase) * JITTER.amount;
    this.rig.position.z +=
      Math.cos(elapsed * JITTER.speed * JITTER.depthRatio + this.jitterPhase) * JITTER.amount;
    this.bugs.forEach((bug) => buzz(bug, delta, elapsed));
  }

  override advance(): void {
    super.advance();
    this.popBug(this.bugs[this.popped]);
    this.popped += 1;
    this.renderGlyphs();
  }

  override setLabelMode(mode: LabelMode): void {
    super.setLabelMode(mode);
    this.glyphMode = mode;
    this.renderGlyphs();
  }

  celebrate(): void {
    this.host.play('swarmCleared');
  }

  private popBug(bug: Bug | undefined): void {
    if (!bug) return;
    bug.mesh.getWorldPosition(this.bugPosition);
    bug.mesh.visible = false;
    this.host.pop(this.bugPosition, this.color);
    this.host.play('bugPop');
  }

  private renderGlyphs(): void {
    if (this.glyphMode === 'hidden') return;
    this.label.replaceChildren(
      ...glyphElements(this.word, this.popped, this.spots, this.glyphMode),
    );
  }
}

function createBugs(count: number, color: THREE.Color): Bug[] {
  const material = new THREE.MeshStandardMaterial({
    color,
    emissive: color,
    emissiveIntensity: BUG_GLOW,
    flatShading: true,
  });
  return Array.from({ length: count }, () => ({
    mesh: new THREE.Mesh(bugGeometry(), material),
    radius: THREE.MathUtils.randFloat(ORBIT.minRadius, ORBIT.maxRadius),
    speed: THREE.MathUtils.randFloat(ORBIT.minSpeed, ORBIT.maxSpeed) * randomSign(),
    lift: THREE.MathUtils.randFloatSpread(ORBIT.lift * 2),
    angle: Math.random() * FULL_TURN,
  }));
}

function buzz(bug: Bug, delta: number, elapsed: number): void {
  bug.angle += bug.speed * delta;
  const wobble = Math.sin(elapsed * BUZZ.speed + bug.angle) * BUZZ.amount;
  bug.mesh.position.set(
    Math.cos(bug.angle) * bug.radius + wobble,
    bug.lift + Math.sin(bug.angle * 2) * BUZZ.amount,
    Math.sin(bug.angle) * bug.radius - wobble,
  );
  bug.mesh.rotation.set(elapsed * BUZZ.spin, elapsed * BUZZ.spin, 0);
}

function randomSign(): number {
  return Math.random() < HALF ? -1 : 1;
}
