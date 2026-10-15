import * as THREE from 'three';
import { SPAWN_RADIUS } from '../../board';
import type { EnemyBody, EnemyLook } from '../../Enemy';
import { blockAssembly, chunkyBlock, type Block } from '../../effects/chunkyGeometry';
import type { BobMotion } from '../../effects/enemyStyles';
import type { FaceSpec } from '../../effects/GlowingFace';
import { cachedGeometry } from './bodies';
import { SpecialEnemy, type SpecialSpec } from './SpecialEnemy';

export const STAMP_SECONDS = 1.5;
export const KNOCKBACK = 1.2;
export const STUN_SECONDS = 0.4;
export const CHARGING_CLASS = 'is-charging';

const KNOCK_SPEED = 8;
const STAMP_INTERVAL = 0.375;
const DUST_INTERVAL = 0.12;
const STAMP_HOP = 0.12;
const LEAN = { charge: 0.35, stun: -0.3 };
const HOVER = 0.5;
const LABEL_GAP = 1.3;
const STILL: BobMotion = { speed: 0, height: 0, ripple: 0 };
const LOOK: EnemyLook = { shape: 'orb', colors: [0xc0563a, 0xd8743a, 0xb04a4a] };

const BULL: readonly Block[] = [
  { size: [0.86, 0.56, 0.62] },
  { size: [0.46, 0.42, 0.4], position: [0, 0.12, 0.42] },
  { size: [0.3, 0.1, 0.1], position: [-0.3, 0.36, 0.42], rotation: [0, 0, 0.5] },
  { size: [0.3, 0.1, 0.1], position: [0.3, 0.36, 0.42], rotation: [0, 0, -0.5] },
  { size: [0.14, 0.24, 0.14], position: [-0.28, -0.36, 0.18] },
  { size: [0.14, 0.24, 0.14], position: [0.28, -0.36, 0.18] },
  { size: [0.14, 0.24, 0.14], position: [-0.28, -0.36, -0.18] },
  { size: [0.14, 0.24, 0.14], position: [0.28, -0.36, -0.18] },
];

const FACE: FaceSpec = {
  color: 0xff5a3a,
  eyeSize: [0.1, 0.08, 0.04],
  eyeSpacing: 0.12,
  eyeHeight: 0.2,
  depth: 0.63,
  slant: 0.35,
  blinks: false,
};

type Gait = 'stamping' | 'charging';

function bullBody(): EnemyBody {
  return {
    shell: cachedGeometry('bull-shell', () => blockAssembly(BULL)),
    core: cachedGeometry('bull-core', () => chunkyBlock(0.24, 0.2, 0.24)),
    shellShade: 0.85,
    shellOpacity: 0.96,
    motion: { hoverHeight: HOVER, bob: STILL, facesViewer: true },
    sparkCount: 0,
    hasTrail: false,
    face: FACE,
  };
}

export class BullEnemy extends SpecialEnemy {
  private readonly chargeSpeed: number;
  private readonly ground = new THREE.Vector3();
  private gait: Gait = 'stamping';
  private gaitTime = 0;
  private sinceDust = 0;
  private stunLeft = 0;
  private pushLeft = 0;

  constructor(spec: SpecialSpec) {
    super({ ...spec, speed: 0 }, LOOK, bullBody());
    this.chargeSpeed = spec.speed;
  }

  get isCharging(): boolean {
    return this.gait === 'charging' && !this.isStunned;
  }

  get isStunned(): boolean {
    return this.stunLeft > 0;
  }

  override get labelHeight(): number {
    return HOVER + LABEL_GAP;
  }

  override update(delta: number, elapsed: number, viewer: THREE.Vector3Like): void {
    super.update(delta, elapsed, viewer);
    if (!this.isFrozen) this.move(delta);
    this.pose();
    this.label.classList.toggle(CHARGING_CLASS, this.isCharging);
  }

  override advance(): void {
    super.advance();
    this.pushLeft += KNOCKBACK;
    this.stunLeft = STUN_SECONDS;
    this.host.play('bullKnock');
  }

  celebrate(): void {
    this.host.pop(this.burstPosition, this.color);
    this.host.dust(this.groundPoint());
    this.host.play('bullDown');
  }

  private move(delta: number): void {
    this.refreshOutward();
    this.knockBack(delta);
    if (this.isStunned) {
      this.stunLeft = Math.max(0, this.stunLeft - delta);
      return;
    }
    this.gaitTime += delta;
    if (this.gait === 'stamping') this.stamp(delta);
    else this.charge(delta);
  }

  private knockBack(delta: number): void {
    if (this.pushLeft <= 0) return;
    const step = Math.min(this.pushLeft, KNOCK_SPEED * delta);
    this.pushLeft -= step;
    this.object.position.addScaledVector(this.outward, step);
    if (this.distanceToCenter > SPAWN_RADIUS) this.object.position.setLength(SPAWN_RADIUS);
  }

  private stamp(delta: number): void {
    if (this.kickDust(delta, STAMP_INTERVAL)) this.host.play('bullStamp');
    if (this.gaitTime < STAMP_SECONDS) return;
    this.gait = 'charging';
    this.gaitTime = 0;
    this.host.play('bullCharge');
  }

  private charge(delta: number): void {
    this.object.position.addScaledVector(this.outward, -this.chargeSpeed * delta);
    this.kickDust(delta, DUST_INTERVAL);
  }

  private kickDust(delta: number, interval: number): boolean {
    this.sinceDust += delta;
    if (this.sinceDust < interval) return false;
    this.sinceDust = 0;
    this.host.dust(this.groundPoint());
    return true;
  }

  private groundPoint(): THREE.Vector3 {
    return this.ground.set(this.object.position.x, 0, this.object.position.z);
  }

  private pose(): void {
    if (this.isStunned) this.rig.rotation.x = LEAN.stun;
    else this.rig.rotation.x = this.gait === 'charging' ? LEAN.charge : 0;
    if (this.gait !== 'stamping') return;
    this.rig.position.y +=
      Math.abs(Math.sin((this.gaitTime * Math.PI) / STAMP_INTERVAL)) * STAMP_HOP;
  }
}
