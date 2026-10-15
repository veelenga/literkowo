import '../../../ui/enemyTypes.css';
import { Enemy, type EnemyBody, type EnemyLook } from '../../Enemy';
import { blockAssembly, chunkyBlock, type Block } from '../../effects/chunkyGeometry';
import type { BobMotion } from '../../effects/enemyStyles';
import type { FaceSpec } from '../../effects/GlowingFace';
import { cachedGeometry } from './bodies';

export const HATCHLING_TAG = 'hatchling';

const LABEL_CLASS = 'is-hatchling';
const LOOK: EnemyLook = { shape: 'orb', colors: [0xffe14d, 0xffd02a, 0xfff07a], scale: 0.6 };
const HOVER = 0.35;
const LABEL_GAP = 0.85;
const HOP: BobMotion = { speed: 6, height: 0.1, ripple: 0.2 };

const CHICK: readonly Block[] = [
  { size: [0.5, 0.46, 0.46] },
  { size: [0.14, 0.08, 0.14], position: [0, 0.02, 0.28] },
  { size: [0.1, 0.16, 0.1], position: [0, 0.3, 0] },
];

const FACE: FaceSpec = {
  color: 0x553311,
  eyeSize: [0.07, 0.09, 0.04],
  eyeSpacing: 0.12,
  eyeHeight: 0.1,
  depth: 0.24,
  slant: 0,
  blinks: true,
};

function chickBody(): EnemyBody {
  return {
    shell: cachedGeometry('hatchling-shell', () => blockAssembly(CHICK)),
    core: cachedGeometry('hatchling-core', () => chunkyBlock(0.16, 0.16, 0.16)),
    shellShade: 1,
    shellOpacity: 0.95,
    motion: { hoverHeight: HOVER, bob: HOP, facesViewer: true },
    sparkCount: 0,
    hasTrail: false,
    face: FACE,
  };
}

export class HatchlingEnemy extends Enemy {
  constructor(word: string, label: HTMLElement, speed: number) {
    super(word, label, speed, LOOK, chickBody());
    this.tags.add(HATCHLING_TAG);
    this.label.classList.add(LABEL_CLASS);
  }

  override get labelHeight(): number {
    return HOVER + LABEL_GAP;
  }
}
