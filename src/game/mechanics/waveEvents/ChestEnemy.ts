import type * as THREE from 'three';
import type { EnemyBody, EnemyLook } from '../../Enemy';
import { blockAssembly, chunkyBlock, type Block } from '../../effects/chunkyGeometry';
import type { BobMotion } from '../../effects/enemyStyles';
import type { FaceSpec } from '../../effects/GlowingFace';
import { cachedGeometry } from '../enemyTypes/bodies';
import { EventEnemy, type EventHost } from './EventEnemy';

export const CHEST_DEPTH = 5.5;
export const CHEST_REACH = 10;
export const CHEST_SPEED = 1.4;

const LABEL_CLASS = 'is-chest';
const LOOK: EnemyLook = { shape: 'orb', colors: [0xffc63a, 0xffb52a] };
const WADDLE = { speed: 10, angle: 0.12 };
const HOVER = 0.4;
const LABEL_GAP = 1.2;
const STILL: BobMotion = { speed: 0, height: 0, ripple: 0 };

const CHEST: readonly Block[] = [
  { size: [0.9, 0.5, 0.6] },
  { size: [0.94, 0.2, 0.64], position: [0, 0.34, 0] },
  { size: [0.14, 0.18, 0.14], position: [-0.3, -0.32, 0.16] },
  { size: [0.14, 0.18, 0.14], position: [0.3, -0.32, 0.16] },
  { size: [0.14, 0.18, 0.14], position: [-0.3, -0.32, -0.16] },
  { size: [0.14, 0.18, 0.14], position: [0.3, -0.32, -0.16] },
];

const FACE: FaceSpec = {
  color: 0xfff3a0,
  eyeSize: [0.1, 0.1, 0.04],
  eyeSpacing: 0.18,
  eyeHeight: 0.08,
  depth: 0.31,
  slant: 0,
  blinks: true,
};

function chestBody(): EnemyBody {
  return {
    shell: cachedGeometry('chest-shell', () => blockAssembly(CHEST)),
    core: cachedGeometry('chest-core', () => chunkyBlock(0.2, 0.2, 0.2)),
    shellShade: 0.6,
    shellOpacity: 0.98,
    motion: { hoverHeight: HOVER, bob: STILL, facesViewer: true },
    sparkCount: 2,
    hasTrail: false,
    face: FACE,
  };
}

export class ChestEnemy extends EventEnemy {
  private walked = 0;

  constructor(
    word: string,
    label: HTMLElement,
    private readonly side: number,
    private readonly host: EventHost,
  ) {
    super(word, label, 0, LOOK, LABEL_CLASS, chestBody());
    this.object.position.set(-side * CHEST_REACH, 0, -CHEST_DEPTH);
  }

  override get labelHeight(): number {
    return HOVER + LABEL_GAP;
  }

  override update(delta: number, elapsed: number, viewer: THREE.Vector3Like): void {
    super.update(delta, elapsed, viewer);
    this.rig.rotation.z = Math.sin(elapsed * WADDLE.speed) * WADDLE.angle;
    if (this.isFrozen) return;
    this.walked += CHEST_SPEED * delta;
    this.object.position.x = this.side * (this.walked - CHEST_REACH);
    if (this.walked >= CHEST_REACH * 2) this.host.dismiss(this);
  }
}
