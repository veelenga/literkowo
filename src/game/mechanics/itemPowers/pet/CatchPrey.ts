import type { PetPower } from '../../../../course/powers';
import type { Enemy } from '../../../Enemy';
import type { Phase } from '../../../RunPlan';
import type { Mechanic, MechanicContext } from '../../Mechanic';
import { powerCallout } from '../callouts';
import { Charges } from '../Charges';
import type { Pet } from '../Pet';
import { isOpen } from '../targets';
import { PREYS, celebrateCatch, type PreyKind } from './preys';

export const NOTICE_SECONDS = 1;

export class CatchPrey implements Partial<Mechanic> {
  private readonly charges: Charges;
  private readonly sightings = new WeakMap<Enemy, number>();
  private clock = 0;

  constructor(
    private readonly prey: PreyKind,
    power: PetPower,
    private readonly pet: Pet,
    private readonly context: MechanicContext,
  ) {
    this.charges = new Charges(power.strength);
  }

  update(delta: number): void {
    this.clock += delta;
    this.context.enemies.forEach((enemy) => this.notice(enemy));
    if (this.charges.isEmpty || this.pet.isBusy || !this.context.playing) return;
    const enemy = this.context.enemies.find((candidate) => this.isCatchable(candidate));
    if (!enemy || !this.charges.use()) return;
    this.pet.catch({
      enemy,
      callout: powerCallout(this.prey),
      onMissed: () => this.charges.refund(),
      onCaught: celebrateCatch,
    });
  }

  onPhaseChange(phase: Phase): void {
    this.charges.refillFor(phase);
  }

  private notice(enemy: Enemy): void {
    if (!this.sightings.has(enemy)) this.sightings.set(enemy, this.clock);
  }

  private isCatchable(enemy: Enemy): boolean {
    const seenFor = this.clock - (this.sightings.get(enemy) ?? this.clock);
    return seenFor >= NOTICE_SECONDS && isOpen(enemy) && PREYS[this.prey](enemy);
  }
}
