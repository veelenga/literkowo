import * as THREE from 'three';
import { el } from '../../../ui/dom';
import { typedParts, type EnemyBody, type EnemyLook, type LabelMode } from '../../Enemy';
import { blockAssembly, chunkyBlock, type Block } from '../../effects/chunkyGeometry';
import type { BobMotion } from '../../effects/enemyStyles';
import type { FaceSpec } from '../../effects/GlowingFace';
import { cachedGeometry } from './bodies';
import { SpecialEnemy, type SpecialSpec } from './SpecialEnemy';

export const KEY_LENGTH = 2;
export const SHIELDED_CLASS = 'is-shielded';
export const BROKEN_CLASS = 'is-broken';

const LOOK: EnemyLook = { shape: 'orb', colors: [0xffb347, 0xff8a5c, 0xffd36e] };
const SHIELD_COLOR = new THREE.Color(0xb8cce0);
const SHIELD = { distance: 0.5, metalness: 0.6, roughness: 0.35, emissive: 0x2a4a6a, glow: 0.5 };
const HOVER = 0.6;
const LABEL_GAP = 1.4;
const MASK_CHAR = '•';
const KEY_CLASS = 'shield-key';
const MASK_CLASS = 'shield-mask';
const BOB: BobMotion = { speed: 3, height: 0.05, ripple: 0.3 };

const KNIGHT: readonly Block[] = [
  { size: [0.72, 0.66, 0.6] },
  { size: [0.56, 0.24, 0.52], position: [0, 0.44, 0] },
  { size: [0.1, 0.26, 0.34], position: [0, 0.66, -0.04] },
];

const SHIELD_PLATE: readonly Block[] = [
  { size: [0.82, 0.92, 0.12] },
  { size: [0.32, 0.32, 0.06], position: [0, 0.06, 0.08], rotation: [0, 0, Math.PI / 4] },
];

const VISOR: FaceSpec = {
  color: 0xfff0c0,
  eyeSize: [0.15, 0.05, 0.04],
  eyeSpacing: 0.14,
  eyeHeight: 0.42,
  depth: 0.27,
  slant: 0.15,
  blinks: false,
};

function knightBody(): EnemyBody {
  return {
    shell: cachedGeometry('shield-knight', () => blockAssembly(KNIGHT)),
    core: cachedGeometry('shield-core', () => chunkyBlock(0.24, 0.24, 0.24)),
    shellShade: 0.9,
    shellOpacity: 0.95,
    motion: { hoverHeight: HOVER, bob: BOB, facesViewer: true },
    sparkCount: 0,
    hasTrail: false,
    face: VISOR,
  };
}

function createShield(): THREE.Mesh {
  const material = new THREE.MeshStandardMaterial({
    color: SHIELD_COLOR,
    metalness: SHIELD.metalness,
    roughness: SHIELD.roughness,
    emissive: SHIELD.emissive,
    emissiveIntensity: SHIELD.glow,
    flatShading: true,
  });
  return new THREE.Mesh(
    cachedGeometry('shield-plate', () => blockAssembly(SHIELD_PLATE)),
    material,
  );
}

export class ShieldEnemy extends SpecialEnemy {
  private readonly key: string;
  private readonly hiddenWord: string;
  private readonly shield = createShield();
  private keyTyped = 0;
  private shielded = true;
  private mode: LabelMode = 'full';

  constructor(spec: SpecialSpec) {
    super(spec, LOOK, knightBody());
    this.key = spec.word.slice(0, KEY_LENGTH);
    this.hiddenWord = spec.word.slice(KEY_LENGTH);
    this.rig.add(this.shield);
    this.label.classList.add(SHIELDED_CLASS);
    this.renderShield();
  }

  get isShielded(): boolean {
    return this.shielded;
  }

  override get labelHeight(): number {
    return HOVER + LABEL_GAP;
  }

  override update(delta: number, elapsed: number, viewer: THREE.Vector3Like): void {
    super.update(delta, elapsed, viewer);
    if (this.shielded) this.holdShield(viewer);
  }

  override advance(): void {
    super.advance();
    if (!this.shielded) return;
    this.keyTyped += 1;
    if (this.keyTyped < this.key.length) return this.renderShield();
    this.breakShield();
  }

  override resetTyped(): void {
    super.resetTyped();
    if (!this.shielded) return;
    this.keyTyped = 0;
    this.renderShield();
  }

  override setLabelMode(mode: LabelMode): void {
    super.setLabelMode(mode);
    this.mode = mode;
    if (this.shielded) this.renderShield();
  }

  celebrate(): void {
    this.host.pop(this.burstPosition, this.color);
    this.host.play('shieldDown');
  }

  private holdShield(viewer: THREE.Vector3Like): void {
    const { x, z } = this.object.position;
    const facing = Math.atan2(viewer.x - x, viewer.z - z);
    this.shield.position.set(
      Math.sin(facing) * SHIELD.distance,
      0,
      Math.cos(facing) * SHIELD.distance,
    );
    this.shield.rotation.set(0, facing, 0);
  }

  private breakShield(): void {
    this.shielded = false;
    this.label.classList.replace(SHIELDED_CLASS, BROKEN_CLASS);
    this.host.pop(this.burstPosition, SHIELD_COLOR);
    this.host.tumble(this.shield, SHIELD_COLOR);
    this.host.play('shieldBreak');
    this.setWord(this.hiddenWord);
  }

  private renderShield(): void {
    if (this.mode === 'hidden') return;
    const typed = this.key.slice(0, this.keyTyped);
    const rest = this.key.slice(this.keyTyped);
    const mask = MASK_CHAR.repeat(this.hiddenWord.length);
    this.label.replaceChildren(
      el('span', { class: KEY_CLASS }, ...typedParts(typed, rest)),
      el('span', { class: MASK_CLASS, text: mask }),
    );
  }
}
