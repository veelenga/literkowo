import * as THREE from 'three';
import type { PetPower } from '../../../../course/powers';
import type { Phase } from '../../../RunPlan';
import type { Mechanic, MechanicContext } from '../../Mechanic';
import { powerCallout } from '../callouts';
import { Charges } from '../Charges';
import type { Pet } from '../Pet';
import type { TroubleWatch } from '../TroubleWatch';

const HEART_COLOR = new THREE.Color(0xff6b8a);
const HEART_LIFT = 1.2;
const HEART_CHIMES = { midis: [72, 79, 84, 91], spacing: 0.08, decay: 0.5 } as const;

export class RestoreHeart implements Partial<Mechanic> {
  private readonly charges: Charges;

  constructor(
    power: PetPower,
    private readonly pet: Pet,
    private readonly context: MechanicContext,
    private readonly trouble: TroubleWatch,
  ) {
    this.charges = new Charges(power.strength);
  }

  update(): void {
    const { lives, maxLives } = this.context;
    if (this.charges.isEmpty || lives >= maxLives || !this.trouble.isOn) return;
    if (!this.context.restoreLife()) return;
    this.charges.use();
    this.celebrate();
  }

  onPhaseChange(phase: Phase): void {
    this.charges.refillFor(phase);
  }

  private celebrate(): void {
    const { player, particles, sfx } = this.context;
    const heart = player.object.position.clone();
    heart.y += HEART_LIFT;
    this.pet.zapAt(heart);
    particles.burst(heart, HEART_COLOR);
    sfx.chimes(HEART_CHIMES.midis, HEART_CHIMES.spacing, HEART_CHIMES.decay);
    this.pet.cheer(powerCallout('restoreHeart'));
  }
}
