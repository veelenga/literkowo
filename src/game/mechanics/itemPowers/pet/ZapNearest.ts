import { POWER_COMBOS, type PetPower } from '../../../../course/powers';
import type { Phase } from '../../../RunPlan';
import type { Mechanic, MechanicContext } from '../../Mechanic';
import { powerCallout } from '../callouts';
import { Charges } from '../Charges';
import type { Pet } from '../Pet';
import { isResting, nearestOpenEnemy } from '../targets';

export class ZapNearest implements Partial<Mechanic> {
  private readonly charges: Charges;

  constructor(
    power: PetPower,
    private readonly pet: Pet,
    private readonly context: MechanicContext,
  ) {
    this.charges = new Charges(power.strength);
  }

  update(): void {
    if (!this.isReady()) return;
    const enemy = nearestOpenEnemy(this.context.enemies);
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

  private isReady(): boolean {
    const { playing, stats, phase } = this.context;
    if (this.charges.isEmpty || this.pet.isBusy || !playing || isResting(phase)) return false;
    return stats.combo >= POWER_COMBOS.zap;
  }
}
