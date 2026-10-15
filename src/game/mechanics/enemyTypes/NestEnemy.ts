import * as THREE from 'three';
import type { Enemy, EnemyBody, EnemyLook } from '../../Enemy';
import { blockAssembly, chunkyBlock, type Block } from '../../effects/chunkyGeometry';
import type { BobMotion } from '../../effects/enemyStyles';
import { Envelope } from '../../effects/Envelope';
import { cachedGeometry } from './bodies';
import { HatchlingEnemy } from './HatchlingEnemy';
import { SpecialEnemy, type SpecialSpec } from './SpecialEnemy';

export const HATCH_SECONDS = 4;
export const MAX_BROOD = 3;
export const NEST_RADIUS = 9.6;

export type HatchWord = () => string;

const LOOK: EnemyLook = { shape: 'orb', colors: [0xd9a441, 0xe0b45a, 0xc8903a], scale: 1.3 };
const HATCH_STEP = 0.8;
const WOBBLE = { seconds: 0.5, angle: 0.25, speed: 30 };
const HOVER = 0.25;
const LABEL_GAP = 1.45;
const STILL: BobMotion = { speed: 0, height: 0, ripple: 0 };
const TWIGS = 6;
const RING_RADIUS = 0.42;
const QUARTER_TURN = Math.PI / 2;

const NEST: readonly Block[] = [
  { size: [0.8, 0.12, 0.8], position: [0, -0.12, 0] },
  ...Array.from({ length: TWIGS }, (_, index): Block => {
    const angle = (index / TWIGS) * Math.PI * 2;
    return {
      size: [0.46, 0.22, 0.16],
      position: [Math.cos(angle) * RING_RADIUS, 0, Math.sin(angle) * RING_RADIUS],
      rotation: [0, -(angle + QUARTER_TURN), 0],
    };
  }),
];

function nestBody(): EnemyBody {
  return {
    shell: cachedGeometry('nest-shell', () => blockAssembly(NEST)),
    core: cachedGeometry('nest-egg', () => chunkyBlock(0.3, 0.38, 0.3)),
    shellShade: 0.8,
    shellOpacity: 0.97,
    motion: { hoverHeight: HOVER, bob: STILL, facesViewer: true },
    sparkCount: 0,
    hasTrail: false,
  };
}

export class NestEnemy extends SpecialEnemy {
  private readonly chickSpeed: number;
  private readonly wobble = new Envelope();
  private brood: Enemy[] = [];
  private sinceHatch = 0;

  constructor(
    spec: SpecialSpec,
    private readonly hatchWord: HatchWord,
  ) {
    super({ ...spec, speed: 0 }, LOOK, nestBody());
    this.chickSpeed = spec.speed;
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
  }

  celebrate(): void {
    for (const chick of this.liveBrood()) {
      this.host.shatter(chick.burstPosition, chick.color);
      this.host.dismiss(chick);
    }
    this.host.pop(this.burstPosition, this.color);
    this.host.play('nestPopped');
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
