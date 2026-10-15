import { hatPowers } from './itemPowers/hatPowers';
import { petPowers } from './itemPowers/petPowers';
import type { MechanicContext } from './Mechanic';
import { MechanicGroup } from './MechanicGroup';

export class ItemPowers extends MechanicGroup {
  constructor(context: MechanicContext) {
    super();
    this.register([...petPowers(context), ...hatPowers(context)]);
  }
}
