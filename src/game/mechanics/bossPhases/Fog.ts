import type { Enemy, LabelMode } from '../../Enemy';
import type { MechanicContext } from '../Mechanic';
import { LingeringAttack } from './BossAttack';

export const FOG_SECONDS = 8;
const FOGGY: LabelMode = 'firstLetter';
const CLEAR: LabelMode = 'full';

export class Fog extends LingeringAttack {
  constructor(private readonly context: Pick<MechanicContext, 'enemies'>) {
    super(FOG_SECONDS);
  }

  onSpawn(enemy: Enemy): void {
    if (this.isActive) enemy.setLabelMode(FOGGY);
  }

  protected begin(): void {
    this.context.enemies.forEach((enemy) => enemy.setLabelMode(FOGGY));
  }

  protected end(): void {
    this.context.enemies.forEach((enemy) => enemy.setLabelMode(CLEAR));
  }
}
