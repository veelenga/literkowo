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

type PetPowerFactory = (power: PetPower, pet: Pet, context: MechanicContext) => Partial<Mechanic>;

function hunt(prey: PreyKind): PetPowerFactory {
  return (power, pet, context) => new CatchPrey(prey, power, pet, context);
}

const PET_POWERS: Readonly<Record<PetPowerKind, PetPowerFactory>> = {
  zap: (power, pet, context) => new ZapNearest(power, pet, context),
  doubleChest: (power, pet, context) => new DoubleChest(power, pet, context),
  popBalloon: hunt('popBalloon'),
  catchThief: hunt('catchThief'),
  catchGhost: hunt('catchGhost'),
  catchBat: hunt('catchBat'),
  catchBomber: hunt('catchBomber'),
  freezeBoard: (power, pet, context) => new FreezeBoard(power, pet, context),
  restoreHeart: (power, pet, context) => new RestoreHeart(power, pet, context),
  stopNear: (power, pet, context) => new StopNear(power, pet, context),
};

export function petPowers(context: MechanicContext): Partial<Mechanic>[] {
  const spec = petSpec(context.equipped.pet);
  if (!spec) return [];
  const pet = new Pet(spec, context);
  return [pet, PET_POWERS[spec.power.kind](spec.power, pet, context)];
}
