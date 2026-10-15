import * as THREE from 'three';
import type { HatSpec } from '../../../../course/shop';
import type { Enemy } from '../../../Enemy';
import { GhostEnemy } from '../../enemyTypes/GhostEnemy';
import type { Mechanic, MechanicContext } from '../../Mechanic';
import { powerCallout } from '../callouts';

export class SolidGhosts implements Partial<Mechanic> {
  private readonly color: THREE.Color;
  private announced = false;

  constructor(
    private readonly spec: HatSpec,
    private readonly context: MechanicContext,
  ) {
    this.color = new THREE.Color(spec.color);
  }

  onSpawn(enemy: Enemy): void {
    if (!(enemy instanceof GhostEnemy)) return;
    enemy.holdSolid();
    this.context.particles.burst(enemy.burstPosition, this.color);
    if (this.announced) return;
    this.announced = true;
    this.context.announce(powerCallout('solidGhosts'), 'callout', this.spec.color);
  }
}
