import * as THREE from 'three';
import { Envelope } from '../../effects/Envelope';
import type { EnemyLook } from '../../Enemy';
import { jumperBody } from './bodies';
import { SpecialEnemy, type SpecialSpec } from './SpecialEnemy';

const HOP_DISTANCE = 1;

const LOOK: EnemyLook = { shape: 'orb', colors: [0x7dff4f, 0x3df2ff, 0xff5fd2, 0xffa62b] };
const CROUCH_END = 0.2;
const TAKEOFF_END = 0.75;
const HOP_HEIGHT = 0.6;
const CROUCH_SQUASH = 0.3;
const AIR_STRETCH = 0.18;
const LANDING_SQUASH = 0.38;
const LABEL_HEIGHT = 1.55;
const POUNCE = { seconds: 0.28, height: 0.45, stretch: 0.25 };
const SHRINK_PER_LETTER = 0.07;
const MIN_SIZE = 0.55;

export class JumperEnemy extends SpecialEnemy {
  private readonly hopSpeed: number;
  private readonly pounce = new Envelope();
  private readonly ground = new THREE.Vector3();
  private readonly stretchScale = new THREE.Vector3();
  private cycle = Math.random();
  private letters = 0;

  constructor(spec: SpecialSpec) {
    super({ ...spec, speed: 0 }, LOOK, jumperBody());
    this.hopSpeed = spec.speed;
  }

  override get labelHeight(): number {
    return LABEL_HEIGHT;
  }

  override update(delta: number, elapsed: number, viewer: THREE.Vector3Like): void {
    super.update(delta, elapsed, viewer);
    this.pounce.update(delta);
    if (!this.isFrozen) this.hop(delta);
    this.shapeBody();
  }

  override advance(): void {
    super.advance();
    this.letters += 1;
    this.pounce.trigger(POUNCE.seconds);
  }

  celebrate(): void {
    this.host.pop(this.burstPosition, this.color);
    this.host.play('jumperPop');
  }

  private get hopProgress(): number {
    return THREE.MathUtils.clamp((this.cycle - CROUCH_END) / (TAKEOFF_END - CROUCH_END), 0, 1);
  }

  private hop(delta: number): void {
    const start = this.cycle;
    const before = this.hopProgress;
    this.cycle += (delta * this.hopSpeed) / HOP_DISTANCE;
    const wrapped = this.cycle >= 1;
    if (wrapped) this.cycle %= 1;
    const travelled = (wrapped ? 1 : 0) + this.hopProgress - before;
    this.moveForward(travelled * HOP_DISTANCE);
    if (start < TAKEOFF_END && (wrapped || this.cycle >= TAKEOFF_END)) this.land();
  }

  private moveForward(distance: number): void {
    this.refreshOutward();
    this.object.position.addScaledVector(this.outward, -distance);
  }

  private land(): void {
    this.ground.set(this.object.position.x, 0, this.object.position.z);
    this.host.dust(this.ground);
  }

  private shapeBody(): void {
    const squash = this.squash();
    const size = Math.max(MIN_SIZE, 1 - this.letters * SHRINK_PER_LETTER);
    const pounce = Math.sin(Math.PI * this.pounce.level);
    const stretch = squash + pounce * POUNCE.stretch;
    this.stretchScale.set(1 - stretch / 2, 1 + stretch, 1 - stretch / 2);
    this.rig.scale.multiply(this.stretchScale);
    this.rig.scale.multiplyScalar(size);
    this.rig.position.y += this.hopLift() + pounce * POUNCE.height;
  }

  private squash(): number {
    if (this.cycle < CROUCH_END)
      return -CROUCH_SQUASH * Math.sin((Math.PI * this.cycle) / CROUCH_END);
    if (this.cycle < TAKEOFF_END) return AIR_STRETCH * Math.sin(Math.PI * this.hopProgress);
    const landing = (this.cycle - TAKEOFF_END) / (1 - TAKEOFF_END);
    return -LANDING_SQUASH * Math.sin(Math.PI * landing);
  }

  private hopLift(): number {
    if (this.cycle < CROUCH_END || this.cycle >= TAKEOFF_END) return 0;
    return Math.sin(Math.PI * this.hopProgress) * HOP_HEIGHT;
  }
}
