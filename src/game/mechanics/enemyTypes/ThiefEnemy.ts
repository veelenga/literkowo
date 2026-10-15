import * as THREE from 'three';
import { i18n } from '../../../i18n/i18n';
import { REACH_DISTANCE, SPAWN_RADIUS } from '../../board';
import type { EnemyBody, EnemyLook } from '../../Enemy';
import { blockAssembly, chunkyBlock, type Block } from '../../effects/chunkyGeometry';
import type { BobMotion } from '../../effects/enemyStyles';
import type { FaceSpec } from '../../effects/GlowingFace';
import { cachedGeometry } from './bodies';
import { SpecialEnemy, type SpecialSpec } from './SpecialEnemy';

export const LOOT_POINTS = 100;
export const RETURN_BONUS_COINS = 5;
export const FLEE_SHARE = 0.5;
export const GRAB_DISTANCE = REACH_DISTANCE + 0.6;
export const ESCAPE_RADIUS = SPAWN_RADIUS + 0.5;
export const FLEEING_CLASS = 'is-fleeing';

export type ThiefRun =
  | { readonly mode: 'running'; readonly lootWord: string }
  | { readonly mode: 'fleeing'; readonly loot: number };

const ACCENT = '#ffcf3f';
const LOOK: EnemyLook = { shape: 'orb', colors: [0x5a4a8a, 0x3a6a7a, 0x6a3a6a] };
const HOVER = 0.55;
const LABEL_GAP = 1.25;
const SPRINT: BobMotion = { speed: 12, height: 0.1, ripple: 0.3 };
const SACK = { color: 0x8a6a3a, glow: 0x664400, position: [0.22, 0.6, 0] as const };

const RUNNER: readonly Block[] = [
  { size: [0.5, 0.6, 0.4] },
  { size: [0.46, 0.36, 0.44], position: [0, 0.42, 0] },
  { size: [0.14, 0.26, 0.14], position: [-0.14, -0.4, 0.06], rotation: [0.4, 0, 0] },
  { size: [0.14, 0.26, 0.14], position: [0.14, -0.4, -0.06], rotation: [-0.4, 0, 0] },
];

const FACE: FaceSpec = {
  color: 0xfff7d0,
  eyeSize: [0.1, 0.06, 0.04],
  eyeSpacing: 0.1,
  eyeHeight: 0.42,
  depth: 0.23,
  slant: -0.2,
  blinks: true,
};

function runnerBody(): EnemyBody {
  return {
    shell: cachedGeometry('thief-shell', () => blockAssembly(RUNNER)),
    core: cachedGeometry('thief-core', () => chunkyBlock(0.2, 0.2, 0.2)),
    shellShade: 0.8,
    shellOpacity: 0.96,
    motion: { hoverHeight: HOVER, bob: SPRINT, facesViewer: true },
    sparkCount: 0,
    hasTrail: false,
    face: FACE,
  };
}

function createSack(): THREE.Mesh {
  const material = new THREE.MeshStandardMaterial({
    color: SACK.color,
    emissive: SACK.glow,
    flatShading: true,
  });
  const sack = new THREE.Mesh(
    cachedGeometry('thief-sack', () => chunkyBlock(0.44, 0.48, 0.4)),
    material,
  );
  sack.position.set(...SACK.position);
  return sack;
}

export class ThiefEnemy extends SpecialEnemy {
  private readonly sack = createSack();

  constructor(
    private readonly spec: SpecialSpec,
    private readonly run: ThiefRun,
  ) {
    super(run.mode === 'running' ? spec : { ...spec, speed: 0 }, LOOK, runnerBody());
    this.sack.visible = run.mode === 'fleeing';
    this.rig.add(this.sack);
    if (run.mode === 'fleeing') this.label.classList.add(FLEEING_CLASS);
  }

  get hasLoot(): boolean {
    return this.run.mode === 'fleeing';
  }

  override get isHarmless(): boolean {
    return true;
  }

  override get labelHeight(): number {
    return HOVER + LABEL_GAP;
  }

  override update(delta: number, elapsed: number, viewer: THREE.Vector3Like): void {
    super.update(delta, elapsed, viewer);
    if (this.isFrozen) return;
    if (this.run.mode === 'fleeing') this.flee(delta);
    else if (this.distanceToCenter <= GRAB_DISTANCE) this.grab(this.run.lootWord);
  }

  celebrate(): void {
    this.host.pop(this.burstPosition, this.color);
    if (this.run.mode === 'running') return this.host.play('thiefCaught');
    this.host.reward(this.run.loot, RETURN_BONUS_COINS);
    this.host.confetti(this.burstPosition);
    this.host.play('lootBack');
    this.host.announce(i18n.t.features.enemyTypes.thief.recovered, 'callout', ACCENT);
  }

  private grab(lootWord: string): void {
    const loot = this.host.takeScore(LOOT_POINTS);
    const fleeing = new ThiefEnemy(
      {
        ...this.spec,
        word: lootWord,
        label: this.host.createLabel(),
        speed: this.spec.speed * FLEE_SHARE,
      },
      { mode: 'fleeing', loot },
    );
    fleeing.object.position.copy(this.object.position);
    this.host.spawn(fleeing);
    this.host.dismiss(this);
    this.host.play('thiefSteal');
    this.host.announce(i18n.t.features.enemyTypes.thief.stolen, 'warning', ACCENT);
  }

  private flee(delta: number): void {
    this.refreshOutward();
    this.object.position.addScaledVector(this.outward, this.spec.speed * delta);
    if (this.distanceToCenter < ESCAPE_RADIUS) return;
    this.host.play('thiefEscape');
    this.host.dismiss(this);
  }
}
