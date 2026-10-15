import type * as THREE from 'three';
import type { PetSpec } from '../../../course/shop';
import { buildPet } from '../../cosmetics/pets';
import { disposeObject } from '../../disposal';
import type { Enemy } from '../../Enemy';
import type { Mechanic, MechanicContext } from '../Mechanic';
import { wordPoints } from '../mergeEnemies/scoring';
import { PetFollower } from './PetFollower';
import { ZapBolt } from './ZapBolt';

export const ZAP_DELAY = 0.14;

const ZAP_SWEEP = { from: 79, to: 98, seconds: 0.16 };
const ZAP_IMPACT = 0.45;

export type PetContext = Pick<
  MechanicContext,
  'player' | 'scene' | 'particles' | 'stats' | 'sfx' | 'enemies' | 'removeEnemy' | 'announce'
>;

export interface Catch {
  readonly enemy: Enemy;
  readonly callout: string;
  readonly onMissed: () => void;
  readonly onCaught?: (enemy: Enemy) => void;
}

interface Strike extends Catch {
  wait: number;
}

export class Pet implements Mechanic {
  private readonly follower: PetFollower;
  private readonly bolt: ZapBolt;
  private strike: Strike | undefined;

  constructor(
    readonly spec: PetSpec,
    private readonly context: PetContext,
  ) {
    this.follower = new PetFollower(buildPet(spec), context.player.object);
    this.bolt = new ZapBolt(spec.color);
    context.scene.add(this.follower.object, this.bolt.object);
  }

  get isBusy(): boolean {
    return this.strike !== undefined;
  }

  update(delta: number, elapsed: number): void {
    this.follower.update(delta, elapsed);
    this.bolt.update(delta);
    if (this.strike) this.advance(this.strike, delta);
  }

  catch(target: Catch): void {
    this.strike = { ...target, wait: ZAP_DELAY };
    target.enemy.freeze(ZAP_DELAY);
    this.zapAt(target.enemy.burstPosition);
  }

  zapAt(point: THREE.Vector3): void {
    this.follower.pounceAt(point);
    this.bolt.strike(this.follower.position, point);
    this.context.sfx.sweep(ZAP_SWEEP.from, ZAP_SWEEP.to, ZAP_SWEEP.seconds);
  }

  cheer(text: string): void {
    this.context.announce(text, 'callout', this.spec.color);
  }

  dispose(): void {
    for (const object of [this.follower.object, this.bolt.object]) {
      object.removeFromParent();
      disposeObject(object);
    }
  }

  private advance(strike: Strike, delta: number): void {
    strike.wait -= delta;
    if (strike.wait > 0) return;
    this.strike = undefined;
    if (!this.context.enemies.includes(strike.enemy)) return strike.onMissed();
    this.shatter(strike);
    this.cheer(strike.callout);
  }

  private shatter({ enemy, onCaught }: Strike): void {
    const { stats, particles, sfx } = this.context;
    particles.burst(enemy.burstPosition, enemy.color);
    stats.score += wordPoints(enemy.word, stats);
    sfx.impact(ZAP_IMPACT);
    onCaught?.(enemy);
    this.context.removeEnemy(enemy);
  }
}
