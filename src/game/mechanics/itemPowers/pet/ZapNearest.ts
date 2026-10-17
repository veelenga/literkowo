import type { PetPower } from '../../../../course/powers';
import type { Phase } from '../../../RunPlan';
import type { Mechanic, MechanicContext } from '../../Mechanic';
import { powerCallout } from '../callouts';
import { Charges } from '../Charges';
import type { Pet } from '../Pet';
import { isActiveThreat, nearestOpenEnemy } from '../targets';
import type { TroubleWatch } from '../TroubleWatch';

export class ZapNearest implements Partial<Mechanic> {
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
    if (this.charges.isEmpty || this.pet.isBusy || !this.trouble.isOn) return;
    const enemy = nearestOpenEnemy(this.context.enemies.filter(isActiveThreat));
    if (!enemy || !this.charges.use()) return;
    this.pet.catch({
      enemy,
      callout: powerCallout('zap'),
      onMissed: () => this.charges.refund(),
    });
  }

  onPhaseChange(phase: Phase): void {
    this.charges.refillFor(phase);
  }
}
