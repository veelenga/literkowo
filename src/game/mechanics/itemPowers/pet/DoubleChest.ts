import * as THREE from 'three';
import type { PetPower } from '../../../../course/powers';
import type { Enemy } from '../../../Enemy';
import type { Phase } from '../../../RunPlan';
import type { Mechanic, MechanicContext } from '../../Mechanic';
import { ChestEnemy } from '../../waveEvents/ChestEnemy';
import { CHEST_COINS } from '../../WaveEvents';
import { powerCallout } from '../callouts';
import { Charges } from '../Charges';
import type { Pet } from '../Pet';

export const CHEST_FACTOR = 2;

const GOLD = new THREE.Color(0xffd23f);
const TREASURE_CHIMES = { midis: [88, 91, 96, 100, 103], spacing: 0.05, decay: 0.6 } as const;

export class DoubleChest implements Partial<Mechanic> {
  private readonly charges: Charges;

  constructor(
    power: PetPower,
    private readonly pet: Pet,
    private readonly context: MechanicContext,
  ) {
    this.charges = new Charges(power.strength);
  }

  onWordComplete(enemy: Enemy): void {
    if (!(enemy instanceof ChestEnemy) || !this.charges.use()) return;
    this.context.addCoins(CHEST_COINS * (CHEST_FACTOR - 1));
    this.celebrate(enemy.burstPosition);
  }

  onPhaseChange(phase: Phase): void {
    this.charges.refillFor(phase);
  }

  private celebrate(point: THREE.Vector3): void {
    const { particles, sfx } = this.context;
    this.pet.zapAt(point);
    particles.burst(point, GOLD);
    sfx.chimes(TREASURE_CHIMES.midis, TREASURE_CHIMES.spacing, TREASURE_CHIMES.decay);
    this.pet.cheer(powerCallout('doubleChest'));
  }
}
