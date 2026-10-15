import * as THREE from 'three';
import type { HatPower } from '../../../../course/powers';
import type { HatSpec } from '../../../../course/shop';
import type { Phase } from '../../../RunPlan';
import type { Mechanic, MechanicContext } from '../../Mechanic';
import { powerCallout } from '../callouts';

const GLOW_LIFT = 1.4;

export class FeverSlip implements Partial<Mechanic> {
  private readonly color: THREE.Color;
  private inFever = false;

  constructor(
    private readonly power: HatPower,
    private readonly spec: HatSpec,
    private readonly context: MechanicContext,
  ) {
    this.color = new THREE.Color(spec.color);
    context.stats.keepFeverOnSlips(power.strength);
  }

  onHit(): void {
    this.inFever = this.context.stats.fever;
  }

  onMistake(): void {
    const kept = this.inFever && this.context.stats.fever;
    this.inFever = this.context.stats.fever;
    if (kept) this.celebrate();
  }

  onPhaseChange(phase: Phase): void {
    if (phase.wave !== undefined) this.context.stats.keepFeverOnSlips(this.power.strength);
  }

  private celebrate(): void {
    const { player, particles, sfx } = this.context;
    const glow = player.object.position.clone();
    glow.y += GLOW_LIFT;
    particles.burst(glow, this.color);
    sfx.sparkle();
    this.context.announce(powerCallout('feverSlip'), 'callout', this.spec.color);
  }
}
