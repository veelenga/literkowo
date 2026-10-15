import * as THREE from 'three';
import type { EnemyBody, EnemyLook } from '../../Enemy';
import { blockAssembly, chunkyBlock, type Block } from '../../effects/chunkyGeometry';
import type { BobMotion } from '../../effects/enemyStyles';
import type { FaceSpec } from '../../effects/GlowingFace';
import { cachedGeometry } from './bodies';
import { FadingMaterials } from './fading';
import { SpecialEnemy, type SpecialSpec } from './SpecialEnemy';

export const FADE_CYCLE_SECONDS = 3;

const LOOK: EnemyLook = { shape: 'wisp', colors: [0xe8f4ff, 0xb8f0ff, 0xd8c8ff] };
const SOLID_EDGES = { gone: -0.6, solid: 0 };
const BODY_FLOOR = 0.06;
const OPACITY_DIGITS = 2;
const DRIFT = { speed: 1.4, reach: 0.9 };
const HOVER = 1.1;
const LABEL_GAP = 1.05;
const FULL_TURN = Math.PI * 2;
const BOB: BobMotion = { speed: 1.8, height: 0.18, ripple: 0.3 };

const SHEET: readonly Block[] = [
  { size: [0.62, 0.62, 0.56], position: [0, 0.12, 0] },
  { size: [0.46, 0.22, 0.42], position: [0, 0.5, 0] },
  { size: [0.18, 0.22, 0.18], position: [-0.2, -0.28, 0], rotation: [0, 0, 0.2] },
  { size: [0.18, 0.26, 0.18], position: [0.02, -0.3, 0] },
  { size: [0.18, 0.22, 0.18], position: [0.22, -0.27, 0], rotation: [0, 0, -0.2] },
];

const FACE: FaceSpec = {
  color: 0x6a8cff,
  eyeSize: [0.1, 0.14, 0.04],
  eyeSpacing: 0.14,
  eyeHeight: 0.2,
  depth: 0.29,
  slant: 0,
  blinks: true,
  mouth: { size: [0.1, 0.12, 0.04], height: 0.0 },
};

function ghostBody(): EnemyBody {
  return {
    shell: cachedGeometry('ghost-shell', () => blockAssembly(SHEET)),
    core: cachedGeometry('ghost-core', () => chunkyBlock(0.22, 0.22, 0.22)),
    shellShade: 1,
    shellOpacity: 0.7,
    motion: { hoverHeight: HOVER, bob: BOB, facesViewer: true },
    sparkCount: 0,
    hasTrail: false,
    face: FACE,
  };
}

export function solidityAt(time: number): number {
  const wave = Math.cos((time / FADE_CYCLE_SECONDS) * FULL_TURN);
  return THREE.MathUtils.smoothstep(wave, SOLID_EDGES.gone, SOLID_EDGES.solid);
}

export class GhostEnemy extends SpecialEnemy {
  private readonly fading: FadingMaterials;
  private readonly sideways = new THREE.Vector3();
  private time = 0;
  private solid = false;

  constructor(
    spec: SpecialSpec,
    private readonly side: number,
  ) {
    super(spec, LOOK, ghostBody());
    this.fading = new FadingMaterials(this.rig);
  }

  get solidity(): number {
    return this.solid ? 1 : solidityAt(this.time);
  }

  holdSolid(): void {
    this.solid = true;
  }

  override get labelHeight(): number {
    return HOVER + LABEL_GAP;
  }

  override update(delta: number, elapsed: number, viewer: THREE.Vector3Like): void {
    super.update(delta, elapsed, viewer);
    if (!this.isFrozen) this.haunt(delta);
    this.showSolidity();
  }

  celebrate(): void {
    this.host.pop(this.burstPosition, this.color);
    this.host.play('ghostPop');
  }

  private haunt(delta: number): void {
    this.time += delta;
    this.refreshOutward();
    this.sideways.set(-this.outward.z, 0, this.outward.x);
    const sway = Math.cos(this.time * DRIFT.speed) * DRIFT.reach * this.side;
    this.object.position.addScaledVector(this.sideways, sway * delta);
  }

  private showSolidity(): void {
    const solidity = this.solidity;
    this.fading.apply(Math.max(BODY_FLOOR, solidity));
    this.label.style.opacity = solidity.toFixed(OPACITY_DIGITS);
  }
}
