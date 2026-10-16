import * as THREE from 'three';
import type { EnemyLook } from '../../Enemy';
import { BALLOON_HOVER, BALLOON_KNOT_DROP, balloonBody, stringGeometry } from './bodies';
import { SpecialEnemy, type SpecialSpec } from './SpecialEnemy';

export const ESCAPE_HEIGHT = 7;
const RISE_SPEED = 0.42;
const FADE_SECONDS = 0.6;
const LAUNCH_RADIUS = 6;

const LOOK: EnemyLook = {
  shape: 'orb',
  colors: [0xff3b5c, 0xffd23f, 0x3da5ff, 0xff7ad9, 0x5cf28a],
};
const STRING_LENGTH = 1.1;
const STRING_COLOR = 0xf4f1ea;
const LABEL_DROP = BALLOON_KNOT_DROP + STRING_LENGTH;
const DRIFT = { speed: 0.55, reach: 0.35 };
const LEAVING_CLASS = 'is-leaving';

export class BalloonEnemy extends SpecialEnemy {
  private readonly position = new THREE.Vector3();
  private rise = 0;
  private fading = 0;
  private time = 0;
  private leaving = false;

  constructor(
    spec: SpecialSpec,
    private readonly driftPhase: number,
  ) {
    super({ ...spec, speed: 0 }, LOOK, balloonBody());
    this.rig.add(createString());
  }

  get altitude(): number {
    return BALLOON_HOVER + this.rise;
  }

  get isLeaving(): boolean {
    return this.altitude > ESCAPE_HEIGHT;
  }

  override get labelHeight(): number {
    return this.altitude - LABEL_DROP;
  }

  override get burstPosition(): THREE.Vector3 {
    return this.position.copy(this.object.position).setY(this.altitude);
  }

  override arriveAt(spawn: THREE.Vector3): void {
    this.object.position.set(spawn.x, 0, spawn.z).setLength(LAUNCH_RADIUS);
  }

  override update(delta: number, elapsed: number, viewer: THREE.Vector3Like): void {
    super.update(delta, elapsed, viewer);
    if (!this.isFrozen) this.drift(delta);
    this.rig.position.y += this.rise;
    if (this.isLeaving) this.fadeAway(delta);
  }

  celebrate(): void {
    this.host.confetti(this.burstPosition);
    this.host.play('balloonPop');
  }

  private drift(delta: number): void {
    this.time += delta;
    this.rise += RISE_SPEED * delta;
    const sway = Math.sin(this.time * DRIFT.speed + this.driftPhase) * DRIFT.reach;
    this.object.position.x += sway * delta;
  }

  private fadeAway(delta: number): void {
    if (!this.leaving) this.startLeaving();
    this.fading += delta;
    const left = 1 - this.fading / FADE_SECONDS;
    this.rig.scale.multiplyScalar(Math.max(0, left));
    if (left <= 0) this.host.dismiss(this);
  }

  private startLeaving(): void {
    this.leaving = true;
    this.label.classList.add(LEAVING_CLASS);
    this.host.play('balloonAway');
  }
}

function createString(): THREE.Mesh {
  const material = new THREE.MeshBasicMaterial({ color: STRING_COLOR });
  const string = new THREE.Mesh(stringGeometry(STRING_LENGTH), material);
  string.position.y = -BALLOON_KNOT_DROP;
  return string;
}
