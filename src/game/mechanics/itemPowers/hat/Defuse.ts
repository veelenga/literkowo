import * as THREE from 'three';
import type { HatSpec } from '../../../../course/shop';
import { REACH_DISTANCE } from '../../../board';
import { BomberEnemy } from '../../bombers/BomberEnemy';
import type { Mechanic, MechanicContext } from '../../Mechanic';
import { powerCallout } from '../callouts';

export const DEFUSE_DISTANCE = REACH_DISTANCE + 0.4;

const SMOKE = new THREE.Color(0x9aa3b5);
const FIZZLE_SWEEP = { from: 82, to: 46, seconds: 0.5 };

export class Defuse implements Partial<Mechanic> {
  constructor(
    private readonly spec: HatSpec,
    private readonly context: MechanicContext,
  ) {}

  update(): void {
    if (!this.context.playing) return;
    const bombers = this.context.enemies.filter((enemy) => enemy instanceof BomberEnemy);
    for (const bomber of bombers) {
      if (bomber.distanceToCenter <= DEFUSE_DISTANCE) this.defuse(bomber);
    }
  }

  private defuse(bomber: BomberEnemy): void {
    const { particles, sfx } = this.context;
    particles.burst(bomber.burstPosition, SMOKE);
    this.context.removeEnemy(bomber);
    sfx.sweep(FIZZLE_SWEEP.from, FIZZLE_SWEEP.to, FIZZLE_SWEEP.seconds);
    this.context.announce(powerCallout('defuse'), 'callout', this.spec.color);
    this.context.guardNextHit();
    this.context.loseLife();
  }
}
