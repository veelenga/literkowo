import * as THREE from 'three';
import type { PetPower } from '../../../../course/powers';
import type { Enemy } from '../../../Enemy';
import type { Phase } from '../../../RunPlan';
import type { Mechanic, MechanicContext } from '../../Mechanic';
import { CAST_SOUNDS } from '../../powerWords/sounds';
import { powerCallout } from '../callouts';
import { Charges } from '../Charges';
import type { Pet } from '../Pet';
import { isActiveThreat, nearestOf } from '../targets';
import type { TroubleWatch } from '../TroubleWatch';

const FREEZES_PER_LEVEL = 1;
const FROST_COLOR = new THREE.Color(0xc8f1ff);

export class FreezeBoard implements Partial<Mechanic> {
  private readonly charges = new Charges(FREEZES_PER_LEVEL);

  constructor(
    private readonly power: PetPower,
    private readonly pet: Pet,
    private readonly context: MechanicContext,
    private readonly trouble: TroubleWatch,
  ) {}

  update(): void {
    if (this.charges.isEmpty || !this.trouble.isOn) return;
    const target = nearestOf(this.context.enemies.filter(isActiveThreat));
    if (target && this.charges.use()) this.freeze(target);
  }

  onPhaseChange(phase: Phase): void {
    this.charges.refillFor(phase);
  }

  private freeze(target: Enemy): void {
    const { enemies, particles, sfx } = this.context;
    for (const enemy of enemies) {
      enemy.freeze(this.power.strength);
      particles.burst(enemy.burstPosition, FROST_COLOR);
    }
    this.pet.zapAt(target.burstPosition);
    CAST_SOUNDS.freeze(sfx);
    this.pet.cheer(powerCallout('freezeBoard'));
  }
}
