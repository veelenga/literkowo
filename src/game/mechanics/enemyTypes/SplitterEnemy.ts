import * as THREE from 'three';
import type { EnemyBody, EnemyLook } from '../../Enemy';
import { blockAssembly, chunkyBlock, type Block } from '../../effects/chunkyGeometry';
import type { BobMotion } from '../../effects/enemyStyles';
import type { FaceSpec } from '../../effects/GlowingFace';
import { cachedGeometry } from './bodies';
import { SpecialEnemy, type SpecialSpec } from './SpecialEnemy';

export const SPLIT_HALF_TAG = 'split-half';
export const WHOLE_SCALE = 1.45;
export const HALF_SCALE = 0.85;
export const HALF_SPEED_BOOST = 1.35;

export type WordHalves = readonly [string, string];
export type SplitterPiece =
  | { readonly part: 'whole'; readonly halves: WordHalves }
  | { readonly part: 'half'; readonly color: number };

const COLORS = [0x5b8bd6, 0x3fb5a3, 0x8a6fe0];
const HALF_SPREAD = 0.9;
const HALF_CLASS = 'is-half';
const SIDES = [-1, 1] as const;
const HOVER = 0.5;
const LABEL_GAP = { whole: 1.6, half: 1.25 };
const BOB: BobMotion = { speed: 2.2, height: 0.06, ripple: 0.2 };

const WHOLE_SHELL: readonly Block[] = [
  { size: [0.46, 0.8, 0.7], position: [-0.27, 0, 0], rotation: [0, 0, 0.06] },
  { size: [0.46, 0.74, 0.66], position: [0.27, -0.02, 0], rotation: [0, 0, -0.08] },
  { size: [0.3, 0.22, 0.4], position: [-0.22, 0.46, 0] },
  { size: [0.26, 0.2, 0.36], position: [0.24, 0.42, 0] },
];

const HALF_SHELL: readonly Block[] = [
  { size: [0.52, 0.76, 0.66] },
  { size: [0.3, 0.22, 0.4], position: [0, 0.44, 0] },
];

const FACE: FaceSpec = {
  color: 0xe8f6ff,
  eyeSize: [0.11, 0.13, 0.04],
  eyeSpacing: 0.2,
  eyeHeight: 0.1,
  depth: 0.37,
  slant: -0.2,
  blinks: true,
};

function bodyOf(shell: readonly Block[], seam: THREE.BufferGeometry, key: string): EnemyBody {
  return {
    shell: cachedGeometry(`${key}-shell`, () => blockAssembly(shell)),
    core: seam,
    shellShade: 0.85,
    shellOpacity: 0.9,
    motion: { hoverHeight: HOVER, bob: BOB, facesViewer: true },
    sparkCount: 0,
    hasTrail: false,
    face: FACE,
  };
}

function wholeBody(): EnemyBody {
  const seam = cachedGeometry('splitter-seam', () => chunkyBlock(0.1, 0.9, 0.6));
  return bodyOf(WHOLE_SHELL, seam, 'splitter');
}

function halfBody(): EnemyBody {
  const seam = cachedGeometry('splitter-half-seam', () => chunkyBlock(0.16, 0.5, 0.3));
  return bodyOf(HALF_SHELL, seam, 'splitter-half');
}

function lookOf(piece: SplitterPiece): EnemyLook {
  if (piece.part === 'whole') return { shape: 'orb', colors: COLORS, scale: WHOLE_SCALE };
  return { shape: 'orb', colors: [piece.color], scale: HALF_SCALE };
}

export class SplitterEnemy extends SpecialEnemy {
  private readonly offset = new THREE.Vector3();

  constructor(
    private readonly spec: SpecialSpec,
    private readonly piece: SplitterPiece,
  ) {
    super(spec, lookOf(piece), piece.part === 'whole' ? wholeBody() : halfBody());
    if (piece.part === 'whole') return;
    this.tags.add(SPLIT_HALF_TAG);
    this.label.classList.add(HALF_CLASS);
  }

  get isHalf(): boolean {
    return this.piece.part === 'half';
  }

  override get labelHeight(): number {
    return HOVER + LABEL_GAP[this.piece.part];
  }

  celebrate(): void {
    this.host.pop(this.burstPosition, this.color);
    if (this.piece.part === 'half') return this.host.play('halfPop');
    this.piece.halves.forEach((word, index) => this.host.spawn(this.half(word, SIDES[index])));
    this.host.play('splitterSplit');
  }

  private half(word: string, side: number): SplitterEnemy {
    const half = new SplitterEnemy(
      {
        ...this.spec,
        word,
        label: this.host.createLabel(),
        speed: this.spec.speed * HALF_SPEED_BOOST,
      },
      { part: 'half', color: this.color.getHex() },
    );
    this.refreshOutward();
    this.offset.set(-this.outward.z, 0, this.outward.x).multiplyScalar(side * HALF_SPREAD);
    half.object.position.copy(this.object.position).add(this.offset);
    return half;
  }
}
