import * as THREE from 'three';
import { i18n } from '../../i18n/i18n';
import { calloutFor, type CalloutKind } from '../combo';
import { disposeObject } from '../disposal';
import type { Enemy } from '../Enemy';
import type { Mechanic, MechanicContext } from './Mechanic';

const RING = { inner: 1.1, outer: 1.5, segments: 48, color: 0xffb020, opacity: 0.75 };
const RING_HEIGHT = 0.04;
const RING_SPIN = 1.6;
const RING_PULSE = { speed: 6, amount: 0.08 };
const BURST_LIFT = 0.6;

const CALLOUT_ACCENTS: Record<CalloutKind, string | undefined> = {
  super: undefined,
  mega: '#7cf5a8',
  ultra: '#60a5fa',
  legend: '#c084fc',
  master: '#fbbf24',
};

export type FeverContext = Pick<
  MechanicContext,
  'scene' | 'particles' | 'stats' | 'sfx' | 'announce'
>;
type Shattered = Pick<Enemy, 'burstPosition' | 'color'>;

export class Fever implements Mechanic {
  private readonly ring = createRing();
  private active = false;

  constructor(private readonly context: FeverContext) {
    context.scene.add(this.ring);
  }

  update(delta: number, elapsed: number): void {
    if (!this.active) return;
    this.ring.rotation.y += RING_SPIN * delta;
    this.ring.scale.setScalar(1 + Math.sin(elapsed * RING_PULSE.speed) * RING_PULSE.amount);
  }

  onHit(): void {
    this.announceCombo();
    this.sync();
  }

  onMistake(): void {
    this.sync();
  }

  onWordComplete(enemy: Shattered): void {
    if (!this.active) return;
    const lifted = enemy.burstPosition;
    lifted.y += BURST_LIFT;
    this.context.particles.burst(lifted, enemy.color);
  }

  dispose(): void {
    this.ring.removeFromParent();
    disposeObject(this.ring);
  }

  private announceCombo(): void {
    const { combo } = this.context.stats;
    const kind = calloutFor(combo);
    if (!kind) return;
    this.context.sfx.callout(combo);
    this.context.announce(i18n.t.features.fever.callouts[kind], 'callout', CALLOUT_ACCENTS[kind]);
  }

  private sync(): void {
    const { fever } = this.context.stats;
    if (fever === this.active) return;
    this.active = fever;
    this.ring.visible = fever;
    if (fever) this.celebrate();
  }

  private celebrate(): void {
    this.context.sfx.fever();
    this.context.announce(i18n.t.features.fever.banner, 'banner');
  }
}

function createRing(): THREE.Mesh {
  const geometry = new THREE.RingGeometry(RING.inner, RING.outer, RING.segments);
  geometry.rotateX(-Math.PI / 2);
  const material = new THREE.MeshBasicMaterial({
    color: RING.color,
    transparent: true,
    opacity: RING.opacity,
    depthWrite: false,
  });
  const ring = new THREE.Mesh(geometry, material);
  ring.position.y = RING_HEIGHT;
  ring.visible = false;
  return ring;
}
