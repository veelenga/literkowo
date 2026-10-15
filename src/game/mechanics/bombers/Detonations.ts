import * as THREE from 'three';
import { i18n } from '../../../i18n/i18n';
import { format } from '../../../i18n/format';
import { Boss } from '../../Boss';
import type { Enemy } from '../../Enemy';
import type { MechanicContext } from '../Mechanic';
import { BomberEnemy, EMBER_COLOR } from './BomberEnemy';
import type { Shockwaves } from './Shockwaves';
import { playBlast } from './sounds';

export const BLAST_RADIUS = 4.5;
export const CHAIN_DELAY = 0.25;
export const SLOW_MOTION = { scale: 0.3, seconds: 0.6 };
export const BLAST_SHAKE = { strength: 0.6, seconds: 0.8 };
export const BANNER_MIN_DOWNED = 3;

const NORMAL_TIME = 1;
const BANNER_ACCENT = '#ff8a3d';
const FLAME_COLOR = 0xffd166;
const FLASH_COLOR = 0xfff4d6;
const BURST_COLORS = [EMBER_COLOR, FLAME_COLOR, FLASH_COLOR].map((hex) => new THREE.Color(hex));

export type DetonationContext = Pick<
  MechanicContext,
  | 'enemies'
  | 'particles'
  | 'stats'
  | 'sfx'
  | 'removeEnemy'
  | 'setTimeScale'
  | 'shakeCamera'
  | 'announce'
>;

interface Fuse {
  readonly bomber: BomberEnemy;
  wait: number;
}

export class Detonations {
  private fuses: Fuse[] = [];
  private downed = 0;
  private slowLeft = 0;

  constructor(
    private readonly context: DetonationContext,
    private readonly waves: Shockwaves,
  ) {}

  get pendingCount(): number {
    return this.fuses.length;
  }

  detonate(bomber: BomberEnemy): void {
    this.blast(bomber);
    this.settle();
  }

  update(delta: number): void {
    this.easeTime(delta);
    if (this.fuses.length === 0) return;
    this.fuses.forEach((fuse) => (fuse.wait -= delta));
    const due = this.fuses.filter((fuse) => fuse.wait <= 0);
    this.fuses = this.fuses.filter((fuse) => fuse.wait > 0);
    due.forEach((fuse) => this.chain(fuse.bomber));
    this.settle();
  }

  stop(): void {
    this.fuses = [];
    this.downed = 0;
    if (this.slowLeft > 0) this.context.setTimeScale(NORMAL_TIME);
    this.slowLeft = 0;
  }

  private chain(bomber: BomberEnemy): void {
    if (!this.context.enemies.includes(bomber)) return;
    this.blast(bomber);
    this.takeDown(bomber);
  }

  private blast(bomber: BomberEnemy): void {
    const center = bomber.object.position.clone();
    this.showBlast(bomber, center);
    for (const enemy of this.caughtBy(bomber, center)) {
      if (enemy instanceof BomberEnemy) this.light(enemy);
      else this.takeDown(enemy);
    }
  }

  private showBlast(bomber: BomberEnemy, center: THREE.Vector3): void {
    const { context } = this;
    BURST_COLORS.forEach((color) => context.particles.burst(bomber.burstPosition, color));
    this.waves.play(center);
    context.shakeCamera(BLAST_SHAKE.strength, BLAST_SHAKE.seconds);
    context.setTimeScale(SLOW_MOTION.scale);
    this.slowLeft = SLOW_MOTION.seconds;
    playBlast(context.sfx);
  }

  private caughtBy(bomber: BomberEnemy, center: THREE.Vector3): Enemy[] {
    return this.context.enemies.filter(
      (enemy) =>
        enemy !== bomber &&
        !(enemy instanceof Boss) &&
        !enemy.isComplete &&
        !this.isLit(enemy) &&
        flatDistance(enemy.object.position, center) <= BLAST_RADIUS,
    );
  }

  private isLit(enemy: Enemy): boolean {
    return this.fuses.some((fuse) => fuse.bomber === enemy);
  }

  private light(bomber: BomberEnemy): void {
    this.fuses.push({ bomber, wait: CHAIN_DELAY });
  }

  private takeDown(enemy: Enemy): void {
    const { context } = this;
    this.downed += 1;
    context.particles.burst(enemy.burstPosition, enemy.color);
    context.stats.recordWord(enemy.word);
    context.removeEnemy(enemy);
  }

  private settle(): void {
    if (this.fuses.length > 0) return;
    if (this.downed >= BANNER_MIN_DOWNED) this.celebrate();
    this.downed = 0;
  }

  private celebrate(): void {
    const text = format(i18n.t.features.bombers.boom, { count: this.downed });
    this.context.announce(text, 'banner', BANNER_ACCENT);
  }

  private easeTime(delta: number): void {
    if (this.slowLeft <= 0) return;
    this.slowLeft -= delta;
    if (this.slowLeft <= 0) this.context.setTimeScale(NORMAL_TIME);
  }
}

function flatDistance(first: THREE.Vector3, second: THREE.Vector3): number {
  return Math.hypot(first.x - second.x, first.z - second.z);
}
