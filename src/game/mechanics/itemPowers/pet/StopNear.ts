import * as THREE from 'three';
import { POWER_COMBOS, type PetPower } from '../../../../course/powers';
import type { Enemy } from '../../../Enemy';
import type { Mechanic, MechanicContext } from '../../Mechanic';
import { powerCallout } from '../callouts';
import type { Pet } from '../Pet';
import { enemiesWithin, isResting, isThreat, nearestOf } from '../targets';

export const NEAR_RADIUS = 5;

const STOP_SWEEP = { from: 74, to: 55, seconds: 0.35 };

export class StopNear implements Partial<Mechanic> {
  private readonly color: THREE.Color;

  constructor(
    private readonly power: PetPower,
    private readonly pet: Pet,
    private readonly context: MechanicContext,
  ) {
    this.color = new THREE.Color(pet.spec.color);
  }

  onHit(): void {
    const { stats, phase, enemies } = this.context;
    if (stats.combo !== POWER_COMBOS.stopNear || isResting(phase)) return;
    const near = enemiesWithin(enemies, NEAR_RADIUS).filter(isThreat);
    if (near.length > 0) this.stop(near);
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
