import * as THREE from 'three';
import type { Enemy, EnemyBody, EnemyLook } from '../../Enemy';
import { blockAssembly, chunkyBlock, type Block, type Triple } from '../../effects/chunkyGeometry';
import type { BobMotion } from '../../effects/enemyStyles';
import { Envelope } from '../../effects/Envelope';
import { cachedGeometry } from './bodies';
import { HatchlingEnemy } from './HatchlingEnemy';
import { NestEggs } from './NestEggs';
import { SpecialEnemy, type SpecialSpec } from './SpecialEnemy';

export const HATCH_SECONDS = 4;
export const MAX_BROOD = 3;
export const NEST_RADIUS = 9.6;

export type HatchWord = () => string;

interface TwigRow {
  readonly count: number;
  readonly radius: number;
  readonly height: number;
  readonly size: Triple;
  readonly offset: number;
  readonly tilt: number;
}

const LOOK: EnemyLook = { shape: 'orb', colors: [0x8a5a2e, 0x7d4f2a, 0x966238], scale: 1.3 };
const HATCH_STEP = 0.8;
const WARM_SECONDS = 1;
const WOBBLE = { seconds: 0.5, angle: 0.25, speed: 30 };
const HOVER = 0.33;
const LABEL_GAP = 1.45;
const STILL: BobMotion = { speed: 0, height: 0, ripple: 0 };
const QUARTER_TURN = Math.PI / 2;
const FULL_TURN = Math.PI * 2;
const CORE_SIZE = 0.16;

const FLOOR: Block = { size: [0.86, 0.14, 0.86], position: [0, -0.18, 0] };
const TWIG_ROWS: readonly TwigRow[] = [
  { count: 8, radius: 0.46, height: -0.06, size: [0.42, 0.2, 0.16], offset: 0, tilt: 0 },
  { count: 8, radius: 0.54, height: 0.12, size: [0.46, 0.2, 0.16], offset: 0.5, tilt: 0 },
  { count: 4, radius: 0.6, height: 0.24, size: [0.5, 0.08, 0.08], offset: 0.25, tilt: 0.35 },
];

function twigRing(row: TwigRow): Block[] {
  return Array.from({ length: row.count }, (_, index): Block => {
    const angle = ((index + row.offset) / row.count) * FULL_TURN;
    return {
      size: row.size,
      position: [Math.cos(angle) * row.radius, row.height, Math.sin(angle) * row.radius],
      rotation: [0, -(angle + QUARTER_TURN), row.tilt],
    };
  });
}

const NEST: readonly Block[] = [FLOOR, ...TWIG_ROWS.flatMap(twigRing)];

function nestBody(): EnemyBody {
  return {
    shell: cachedGeometry('nest-shell', () => blockAssembly(NEST)),
    core: cachedGeometry('nest-core', () => chunkyBlock(CORE_SIZE, CORE_SIZE, CORE_SIZE)),
    shellShade: 0.8,
    shellOpacity: 0.98,
    motion: { hoverHeight: HOVER, bob: STILL, facesViewer: false },
    sparkCount: 0,
    hasTrail: false,
  };
}

export class NestEnemy extends SpecialEnemy {
  private readonly chickSpeed: number;
  private readonly wobble = new Envelope();
  private readonly eggs = new NestEggs();
  private brood: Enemy[] = [];
  private sinceHatch = 0;

  constructor(
    spec: SpecialSpec,
    private readonly hatchWord: HatchWord,
  ) {
    super({ ...spec, speed: 0 }, LOOK, nestBody());
    this.chickSpeed = spec.speed;
    this.rig.add(this.eggs.mesh);
  }

  get chicksAlive(): number {
    return this.liveBrood().length;
  }

  override get labelHeight(): number {
    return HOVER + LABEL_GAP;
  }

  override arriveAt(spawn: THREE.Vector3): void {
    this.object.position.set(spawn.x, 0, spawn.z).setLength(NEST_RADIUS);
  }

  override update(delta: number, elapsed: number, viewer: THREE.Vector3Like): void {
    super.update(delta, elapsed, viewer);
    this.wobble.update(delta);
    if (!this.isFrozen) this.incubate(delta);
    this.rig.rotation.z = Math.sin(elapsed * WOBBLE.speed) * WOBBLE.angle * this.wobble.level;
    this.eggs.update(this.warmth, elapsed);
  }

  celebrate(): void {
    for (const chick of this.liveBrood()) {
      this.host.shatter(chick.burstPosition, chick.color);
      this.host.dismiss(chick);
    }
    this.host.pop(this.burstPosition, this.color);
    this.host.play('nestPopped');
  }

  private get warmth(): number {
    if (this.chicksAlive >= MAX_BROOD) return 0;
    return THREE.MathUtils.smoothstep(this.sinceHatch, HATCH_SECONDS - WARM_SECONDS, HATCH_SECONDS);
  }

  private incubate(delta: number): void {
    this.sinceHatch += delta;
    if (this.sinceHatch < HATCH_SECONDS) return;
    this.sinceHatch = 0;
    if (this.chicksAlive < MAX_BROOD) this.hatch();
  }

  private hatch(): void {
    const chick = new HatchlingEnemy(this.hatchWord(), this.host.createLabel(), this.chickSpeed);
    this.refreshOutward();
    chick.object.position.copy(this.object.position).addScaledVector(this.outward, -HATCH_STEP);
    this.brood.push(chick);
    this.host.spawn(chick);
    this.host.play('nestHatch');
    this.wobble.trigger(WOBBLE.seconds);
  }

  private liveBrood(): Enemy[] {
    this.brood = this.brood.filter((chick) => this.host.isOnBoard(chick));
    return this.brood;
  }
}
