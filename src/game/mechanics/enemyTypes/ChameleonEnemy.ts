import type * as THREE from 'three';
import type { EnemyBody, EnemyLook } from '../../Enemy';
import { blockAssembly, chunkyBlock, type Block } from '../../effects/chunkyGeometry';
import type { BobMotion } from '../../effects/enemyStyles';
import type { FaceSpec } from '../../effects/GlowingFace';
import { cachedGeometry } from './bodies';
import { SpecialEnemy, type SpecialSpec } from './SpecialEnemy';

export const CHANGE_SECONDS = 2.5;
export const LOCKED_CLASS = 'is-locked';

export type WordSwap = (current: string) => string;

const PALETTE = [0x5cf28a, 0x3da5ff, 0xffd23f, 0xff7ad9, 0xff8a3d, 0xb98cff];
const LOOK: EnemyLook = { shape: 'orb', colors: [PALETTE[0]] };
const COLOR_VARIABLE = '--chameleon-color';
const HOVER = 0.45;
const LABEL_GAP = 1.35;
const BOB: BobMotion = { speed: 2.4, height: 0.05, ripple: 0.2 };

const LIZARD: readonly Block[] = [
  { size: [0.6, 0.4, 0.7] },
  { size: [0.44, 0.36, 0.36], position: [0, 0.1, 0.42] },
  { size: [0.16, 0.16, 0.4], position: [0, 0.05, -0.5] },
  { size: [0.16, 0.3, 0.16], position: [0, 0.22, -0.66] },
  { size: [0.08, 0.14, 0.12], position: [0, 0.27, 0.1] },
  { size: [0.08, 0.14, 0.12], position: [0, 0.27, -0.12] },
  { size: [0.12, 0.2, 0.12], position: [-0.3, -0.25, 0.2] },
  { size: [0.12, 0.2, 0.12], position: [0.3, -0.25, 0.2] },
  { size: [0.12, 0.2, 0.12], position: [-0.3, -0.25, -0.2] },
  { size: [0.12, 0.2, 0.12], position: [0.3, -0.25, -0.2] },
];

const FACE: FaceSpec = {
  color: 0xfff3a0,
  eyeSize: [0.14, 0.14, 0.06],
  eyeSpacing: 0.2,
  eyeHeight: 0.2,
  depth: 0.6,
  slant: 0,
  blinks: true,
};

function lizardBody(): EnemyBody {
  return {
    shell: cachedGeometry('chameleon-shell', () => blockAssembly(LIZARD)),
    core: cachedGeometry('chameleon-core', () => chunkyBlock(0.24, 0.2, 0.3)),
    shellShade: 0.9,
    shellOpacity: 0.92,
    motion: { hoverHeight: HOVER, bob: BOB, facesViewer: true },
    sparkCount: 0,
    hasTrail: false,
    face: FACE,
  };
}

export class ChameleonEnemy extends SpecialEnemy {
  private sinceChange = 0;
  private shade = 0;
  private locked = false;

  constructor(
    spec: SpecialSpec,
    private readonly swapWord: WordSwap,
  ) {
    super(spec, LOOK, lizardBody());
    this.paintLabel();
  }

  get isLocked(): boolean {
    return this.locked;
  }

  override get labelHeight(): number {
    return HOVER + LABEL_GAP;
  }

  override update(delta: number, elapsed: number, viewer: THREE.Vector3Like): void {
    super.update(delta, elapsed, viewer);
    if (this.locked || this.isFrozen) return;
    this.sinceChange += delta;
    if (this.sinceChange >= CHANGE_SECONDS) this.change();
  }

  override advance(): void {
    super.advance();
    if (this.locked) return;
    this.locked = true;
    this.label.classList.add(LOCKED_CLASS);
  }

  celebrate(): void {
    this.host.pop(this.burstPosition, this.color);
    this.host.play('chameleonPop');
  }

  private change(): void {
    this.sinceChange = 0;
    this.setWord(this.swapWord(this.word));
    this.shade = (this.shade + 1) % PALETTE.length;
    this.recolor(PALETTE[this.shade]);
    this.paintLabel();
    this.host.play('chameleonShift');
  }

  private paintLabel(): void {
    this.label.style.setProperty(COLOR_VARIABLE, `#${this.color.getHexString()}`);
  }
}
