import * as THREE from 'three';
import { POWER_COMBOS, type PetPower } from '../../../../course/powers';
import type { Enemy } from '../../../Enemy';
import type { Mechanic, MechanicContext } from '../../Mechanic';
import { powerCallout } from '../callouts';
import type { Pet } from '../Pet';
import { enemiesWithin, isActiveThreat, nearestOf } from '../targets';
import type { TroubleWatch } from '../TroubleWatch';

export const NEAR_RADIUS = 5;

const STOP_SWEEP = { from: 74, to: 55, seconds: 0.35 };

export class StopNear implements Partial<Mechanic> {
  private readonly color: THREE.Color;
  private ready = false;

  constructor(
    private readonly power: PetPower,
    private readonly pet: Pet,
    private readonly context: MechanicContext,
    private readonly trouble: TroubleWatch,
  ) {
    this.color = new THREE.Color(pet.spec.color);
  }

  onHit(): void {
    if (this.context.stats.combo === POWER_COMBOS.stopNear) this.ready = true;
  }

  update(): void {
    if (!this.ready || !this.trouble.isOn) return;
    const near = enemiesWithin(this.context.enemies, NEAR_RADIUS).filter(isActiveThreat);
    if (near.length === 0) return;
    this.ready = false;
    this.stop(near);
  }

  private stop(near: readonly Enemy[]): void {
    const { particles, sfx } = this.context;
    for (const enemy of near) {
      enemy.freeze(this.power.strength);
      particles.burst(enemy.burstPosition, this.color);
    }
    const target = nearestOf(near);
    if (target) this.pet.zapAt(target.burstPosition);
    sfx.sweep(STOP_SWEEP.from, STOP_SWEEP.to, STOP_SWEEP.seconds);
    this.pet.cheer(powerCallout('stopNear'));
  }
}
