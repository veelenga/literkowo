import * as THREE from 'three';
import type { PetPower } from '../../../../course/powers';
import type { Enemy } from '../../../Enemy';
import type { Phase } from '../../../RunPlan';
import type { Mechanic, MechanicContext } from '../../Mechanic';
import { CAST_SOUNDS } from '../../powerWords/sounds';
import { powerCallout } from '../callouts';
import { Charges } from '../Charges';
import type { Pet } from '../Pet';
import { DANGER_DISTANCE, enemiesWithin, isResting, isThreat } from '../targets';

const FREEZES_PER_LEVEL = 1;
const FROST_COLOR = new THREE.Color(0xc8f1ff);

export class FreezeBoard implements Partial<Mechanic> {
  private readonly charges = new Charges(FREEZES_PER_LEVEL);

  constructor(
    private readonly power: PetPower,
    private readonly pet: Pet,
    private readonly context: MechanicContext,
  ) {}

  update(): void {
    const { playing, phase, enemies } = this.context;
    if (this.charges.isEmpty || !playing || isResting(phase)) return;
    const danger = enemiesWithin(enemies, DANGER_DISTANCE).find(isThreat);
    if (danger && this.charges.use()) this.freeze(danger);
  }

  onPhaseChange(phase: Phase): void {
    this.charges.refillFor(phase);
  }

  private freeze(danger: Enemy): void {
    const { enemies, particles, sfx } = this.context;
    for (const enemy of enemies) {
      enemy.freeze(this.power.strength);
      particles.burst(enemy.burstPosition, FROST_COLOR);
    }
    this.pet.zapAt(danger.burstPosition);
    CAST_SOUNDS.freeze(sfx);
    this.pet.cheer(powerCallout('freezeBoard'));
  }
}
