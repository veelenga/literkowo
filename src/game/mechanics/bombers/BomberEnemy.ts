import '../../../ui/actionEvents.css';
import * as THREE from 'three';
import { REACH_DISTANCE, SPAWN_RADIUS } from '../../arena';
import { Enemy, themedBody, type EnemyBody } from '../../Enemy';
import type { EnemyShape } from '../../themes';
import { Fuse } from './Fuse';
import { FuseTicker } from './FuseTicker';

export const BOMBER_TAG = 'bomber';
export const BOMBER_SCALE = 1.7;
export const EMBER_COLOR = 0xff6a2a;

const SHELL_DARKEN = 0.3;
const SHELL_OPACITY = 0.9;
const EXTRA_SPARKS = 2;
const LABEL_LIFT = 0.85;
const LABEL_CLASS = 'is-bomber';
const THREAT_SPAN = SPAWN_RADIUS - REACH_DISTANCE;

function bomberBody(shape: EnemyShape): EnemyBody {
  const body = themedBody(shape);
  return {
    ...body,
    shellShade: body.shellShade * SHELL_DARKEN,
    shellOpacity: Math.max(body.shellOpacity, SHELL_OPACITY),
    sparkCount: body.sparkCount + EXTRA_SPARKS,
  };
}

function topOf(geometry: THREE.BufferGeometry): number {
  geometry.computeBoundingBox();
  return geometry.boundingBox?.max.y ?? 0;
}

export class BomberEnemy extends Enemy {
  readonly ticker = new FuseTicker();
  private readonly fuse: Fuse;

  constructor(word: string, label: HTMLElement, speed: number, shape: EnemyShape) {
    const body = bomberBody(shape);
    super(word, label, speed, { shape, colors: [EMBER_COLOR], scale: BOMBER_SCALE }, body);
    this.tags.add(BOMBER_TAG);
    this.label.classList.add(LABEL_CLASS);
    this.fuse = new Fuse(topOf(body.shell));
    this.rig.add(this.fuse.group);
  }

  get urgency(): number {
    return 1 - THREE.MathUtils.clamp((this.distanceToCenter - REACH_DISTANCE) / THREAT_SPAN, 0, 1);
  }

  override get labelHeight(): number {
    return super.labelHeight + LABEL_LIFT;
  }

  override update(delta: number, elapsed: number, viewer: THREE.Vector3Like): void {
    super.update(delta, elapsed, viewer);
    this.fuse.update(delta, this.urgency);
  }
}
