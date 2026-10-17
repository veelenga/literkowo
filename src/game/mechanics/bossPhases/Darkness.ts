import '../../../ui/bossPhases.css';
import { HeldClaim } from '../../claims/HeldClaim';
import type { MechanicContext } from '../Mechanic';
import { LingeringAttack } from './BossAttack';

export const DARKNESS_CLASS = 'is-darkness';
export const DARKNESS_SECONDS = 8;

export type DarknessContext = Pick<MechanicContext, 'claimPageClass'>;

export class Darkness extends LingeringAttack {
  private readonly shade: HeldClaim;

  constructor(context: DarknessContext) {
    super(DARKNESS_SECONDS);
    this.shade = new HeldClaim(() => context.claimPageClass(DARKNESS_CLASS));
  }

  protected begin(): void {
    this.shade.hold();
  }

  protected end(): void {
    this.shade.release();
  }
}
