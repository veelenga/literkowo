import type { PetPower, PetPowerKind } from '../../../course/powers';
import { petSpec } from '../../../course/shop';
import type { Mechanic, MechanicContext } from '../Mechanic';
import { Pet } from './Pet';
import { CatchPrey } from './pet/CatchPrey';
import { DoubleChest } from './pet/DoubleChest';
import { FreezeBoard } from './pet/FreezeBoard';
import type { PreyKind } from './pet/preys';
import { RestoreHeart } from './pet/RestoreHeart';
import { StopNear } from './pet/StopNear';
import { ZapNearest } from './pet/ZapNearest';
import { TroubleWatch } from './TroubleWatch';

type PetPowerFactory = (
  power: PetPower,
  pet: Pet,
  context: MechanicContext,
  trouble: TroubleWatch,
) => Partial<Mechanic>;

function hunt(prey: PreyKind): PetPowerFactory {
  return (power, pet, context, trouble) => new CatchPrey(prey, power, pet, context, trouble);
}

const PET_POWERS: Readonly<Record<PetPowerKind, PetPowerFactory>> = {
  zap: (power, pet, context, trouble) => new ZapNearest(power, pet, context, trouble),
  doubleChest: (power, pet, context) => new DoubleChest(power, pet, context),
  popBalloon: hunt('popBalloon'),
  catchThief: hunt('catchThief'),
  catchGhost: hunt('catchGhost'),
  catchBat: hunt('catchBat'),
  catchBomber: hunt('catchBomber'),
  freezeBoard: (power, pet, context, trouble) => new FreezeBoard(power, pet, context, trouble),
  restoreHeart: (power, pet, context, trouble) => new RestoreHeart(power, pet, context, trouble),
  stopNear: (power, pet, context, trouble) => new StopNear(power, pet, context, trouble),
};

export function petPowers(context: MechanicContext): Partial<Mechanic>[] {
  const spec = petSpec(context.equipped.pet);
  if (!spec) return [];
  const pet = new Pet(spec, context);
  const trouble = new TroubleWatch(context);
  return [pet, trouble, PET_POWERS[spec.power.kind](spec.power, pet, context, trouble)];
}
