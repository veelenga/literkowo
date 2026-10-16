import type { Enemy, LabelMode } from '../Enemy';
import { hasModifier } from '../modifiers';
import type { Phase } from '../RunPlan';
import { DARKNESS_CLASS } from './bossPhases/Darkness';
import type { Mechanic, MechanicContext } from './Mechanic';

const FOGGY: LabelMode = 'firstLetter';

export class Modifiers implements Mechanic {
  private fog = false;
  private darkness = false;

  constructor(
    private readonly context: Pick<MechanicContext, 'enemies'>,
    private readonly page: DOMTokenList = document.body.classList,
  ) {}

  update(): void {
    if (this.darkness && !this.page.contains(DARKNESS_CLASS)) this.page.add(DARKNESS_CLASS);
  }

  onSpawn(enemy: Enemy): void {
    if (this.fog) enemy.setLabelMode(FOGGY);
  }

  onPhaseChange(phase: Phase): void {
    this.fog = hasModifier(phase, 'fog');
    if (this.fog) this.context.enemies.forEach((enemy) => enemy.setLabelMode(FOGGY));
    this.setDarkness(hasModifier(phase, 'darkness'));
  }

  dispose(): void {
    this.setDarkness(false);
  }

  private setDarkness(dark: boolean): void {
    if (dark === this.darkness) return;
    this.darkness = dark;
    this.page.toggle(DARKNESS_CLASS, dark);
  }
}
