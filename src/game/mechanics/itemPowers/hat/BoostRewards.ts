import { NO_BOOST, type HatPower, type RewardBoost } from '../../../../course/powers';
import type { HatSpec } from '../../../../course/shop';
import type { Mechanic, MechanicContext } from '../../Mechanic';
import { boostCallout } from '../callouts';

export class BoostRewards implements Partial<Mechanic> {
  private announced = false;

  constructor(
    private readonly power: HatPower,
    private readonly spec: HatSpec,
    private readonly context: MechanicContext,
  ) {
    context.boostRewards(boostOf(power));
  }

  update(): void {
    if (this.announced || !this.context.playing) return;
    this.announced = true;
    this.context.sfx.sparkle();
    this.context.announce(boostCallout(this.power), 'callout', this.spec.color);
  }
}

export function boostOf({ kind, strength }: HatPower): RewardBoost {
  if (kind === 'coins') return { ...NO_BOOST, coins: NO_BOOST.coins + strength };
  if (kind === 'xp') return { ...NO_BOOST, xp: NO_BOOST.xp + strength };
  return NO_BOOST;
}
