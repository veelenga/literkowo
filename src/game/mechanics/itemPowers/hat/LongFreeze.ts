import * as THREE from 'three';
import type { HatPower } from '../../../../course/powers';
import type { HatSpec } from '../../../../course/shop';
import type { Enemy } from '../../../Enemy';
import type { Mechanic, MechanicContext } from '../../Mechanic';
import { PowerEnemy, isPowerEnemy } from '../../powerWords/PowerEnemy';
import { FREEZE_SECONDS } from '../../powerWords/spells/Freeze';
import { powerCallout } from '../callouts';

export class LongFreeze implements Partial<Mechanic> {
  private readonly color: THREE.Color;

  constructor(
    private readonly power: HatPower,
    private readonly spec: HatSpec,
    private readonly context: MechanicContext,
  ) {
    this.color = new THREE.Color(spec.color);
  }

  get seconds(): number {
    return FREEZE_SECONDS * (1 + this.power.strength);
  }

  onWordComplete(enemy: Enemy): void {
    if (!(enemy instanceof PowerEnemy) || enemy.power !== 'freeze') return;
    const { enemies, particles } = this.context;
    for (const other of enemies.filter((candidate) => !isPowerEnemy(candidate))) {
      other.freeze(this.seconds);
      particles.burst(other.burstPosition, this.color);
    }
    this.context.announce(powerCallout('longFreeze'), 'callout', this.spec.color);
  }
}
