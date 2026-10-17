import { HeldClaim } from '../claims/HeldClaim';
import type { Enemy, LabelMode } from '../Enemy';
import { hasModifier } from '../modifiers';
import type { Phase } from '../RunPlan';
import { DARKNESS_CLASS } from './bossPhases/Darkness';
import type { Mechanic, MechanicContext } from './Mechanic';

const FOGGY: LabelMode = 'firstLetter';

export type ModifiersContext = Pick<MechanicContext, 'enemies' | 'claimPageClass'>;

export class Modifiers implements Mechanic {
  private readonly darkness = new HeldClaim(() => this.context.claimPageClass(DARKNESS_CLASS));
  private fog = false;

  constructor(private readonly context: ModifiersContext) {}

  onSpawn(enemy: Enemy): void {
    if (this.fog) enemy.setLabelMode(FOGGY);
  }

  onPhaseChange(phase: Phase): void {
    this.fog = hasModifier(phase, 'fog');
    if (this.fog) this.context.enemies.forEach((enemy) => enemy.setLabelMode(FOGGY));
    this.setDarkness(hasModifier(phase, 'darkness'));
  }

  dispose(): void {
    this.darkness.release();
  }

  private setDarkness(dark: boolean): void {
    if (dark) this.darkness.hold();
    else this.darkness.release();
  }
}
