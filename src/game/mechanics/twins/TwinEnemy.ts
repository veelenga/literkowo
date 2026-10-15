import '../../../ui/actionEvents.css';
import type * as THREE from 'three';
import { Enemy, themedBody, type EnemyBody, type EnemyLook } from '../../Enemy';
import { bobOffset, type BobMotion } from '../../effects/enemyStyles';
import type { EnemyShape } from '../../themes';

export const TWIN_TAG = 'twin';
export const TWIN_SCALE = 0.85;

const TWIN_BOB: BobMotion = { speed: 3.2, height: 0.22, ripple: 0 };
const STILL: BobMotion = { speed: 0, height: 0, ripple: 0 };
const LABEL_CLASS = 'is-twin';

export interface TwinGroup {
  readonly bobPhase: number;
}

export interface TwinPlacement {
  readonly lateral: number;
  readonly aim: THREE.Vector3;
  readonly group: TwinGroup;
}

function twinBody(shape: EnemyShape): EnemyBody {
  const body = themedBody(shape);
  return { ...body, motion: { ...body.motion, bob: STILL } };
}

export class TwinEnemy extends Enemy {
  constructor(
    word: string,
    label: HTMLElement,
    speed: number,
    look: EnemyLook,
    readonly placement: TwinPlacement,
  ) {
    super(word, label, speed, { ...look, scale: TWIN_SCALE }, twinBody(look.shape));
    this.tags.add(TWIN_TAG);
    this.label.classList.add(LABEL_CLASS);
  }

  override update(delta: number, elapsed: number, viewer: THREE.Vector3Like): void {
    super.update(delta, elapsed, viewer);
    this.rig.position.y += bobOffset(TWIN_BOB, elapsed + this.placement.group.bobPhase);
  }

  protected override refreshOutward(): void {
    const { aim } = this.placement;
    this.outward.set(this.object.position.x - aim.x, 0, this.object.position.z - aim.z).normalize();
  }
}
