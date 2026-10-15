import type { HatPower, HatPowerKind } from '../../../course/powers';
import { hatSpec, type HatSpec } from '../../../course/shop';
import type { Mechanic, MechanicContext } from '../Mechanic';
import { BoostRewards } from './hat/BoostRewards';
import { BossGuard } from './hat/BossGuard';
import { Defuse } from './hat/Defuse';
import { FeverSlip } from './hat/FeverSlip';
import { LongFreeze } from './hat/LongFreeze';
import { SolidGhosts } from './hat/SolidGhosts';

type HatPowerFactory = (
  power: HatPower,
  spec: HatSpec,
  context: MechanicContext,
) => Partial<Mechanic>;

const boost: HatPowerFactory = (power, spec, context) => new BoostRewards(power, spec, context);

const HAT_POWERS: Readonly<Record<HatPowerKind, HatPowerFactory>> = {
  coins: boost,
  xp: boost,
  solidGhosts: (_power, spec, context) => new SolidGhosts(spec, context),
  bossGuard: (power, spec, context) => new BossGuard(power, spec, context),
  longFreeze: (power, spec, context) => new LongFreeze(power, spec, context),
  defuse: (_power, spec, context) => new Defuse(spec, context),
  feverSlip: (power, spec, context) => new FeverSlip(power, spec, context),
};

export function hatPowers(context: MechanicContext): Partial<Mechanic>[] {
  const spec = hatSpec(context.equipped.hat);
  return spec ? [HAT_POWERS[spec.power.kind](spec.power, spec, context)] : [];
}
