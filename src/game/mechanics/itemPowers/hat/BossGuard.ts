import * as THREE from 'three';
import type { HatPower } from '../../../../course/powers';
import type { HatSpec } from '../../../../course/shop';
import { disposeObject } from '../../../disposal';
import type { Phase } from '../../../RunPlan';
import type { Mechanic, MechanicContext } from '../../Mechanic';
import { ShieldBubble } from '../../powerWords/effects/ShieldBubble';
import { CAST_SOUNDS } from '../../powerWords/sounds';
import { powerCallout } from '../callouts';

const BOSS_PHASE: Phase['kind'] = 'boss';
const POP_LIFT = 1;

export class BossGuard implements Partial<Mechanic> {
  private readonly color: THREE.Color;
  private readonly bubble: ShieldBubble;

  constructor(
    private readonly power: HatPower,
    private readonly spec: HatSpec,
    private readonly context: MechanicContext,
  ) {
    this.color = new THREE.Color(spec.color);
    this.bubble = new ShieldBubble(this.color);
    context.scene.add(this.bubble.group);
  }

  update(delta: number): void {
    if (this.bubble.isRaised && this.context.guards <= 0) this.pop();
    this.bubble.update(delta, this.context.player.object.position);
  }

  onPhaseChange(phase: Phase): void {
    if (phase.kind !== BOSS_PHASE) return;
    const missing = this.power.strength - this.context.guards;
    for (let guard = 0; guard < missing; guard += 1) this.context.guardNextHit();
    this.bubble.raise();
    CAST_SOUNDS.shield(this.context.sfx);
    this.context.announce(powerCallout('bossGuard'), 'callout', this.spec.color);
  }

  dispose(): void {
    this.bubble.group.removeFromParent();
    disposeObject(this.bubble.group);
  }

  private pop(): void {
    this.bubble.lower();
    const center = this.context.player.object.position.clone();
    center.y += POP_LIFT;
    this.context.particles.burst(center, this.color);
  }
}
