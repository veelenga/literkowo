import { petSpec, type PetSpec } from '../../course/shop';
import { i18n } from '../../i18n/i18n';
import { buildPet } from '../cosmetics/pets';
import { disposeObject } from '../disposal';
import type { Enemy } from '../Enemy';
import { PetFollower } from './companion/PetFollower';
import { ZapBolt } from './companion/ZapBolt';
import { zapTarget } from './companion/zapRules';
import type { Mechanic, MechanicContext } from './Mechanic';
import { wordPoints } from './mergeEnemies/scoring';

export const ZAP_DELAY = 0.14;

const ZAP_SWEEP = { from: 79, to: 98, seconds: 0.16 };
const ZAP_IMPACT = 0.45;

interface Zap {
  readonly enemy: Enemy;
  wait: number;
}

interface Companionship {
  readonly spec: PetSpec;
  readonly follower: PetFollower;
  readonly bolt: ZapBolt;
}

export class Companion implements Mechanic {
  private readonly companion: Companionship | undefined;
  private zap: Zap | undefined;
  private zapped = false;

  constructor(private readonly context: MechanicContext) {
    const spec = petSpec(context.equipped.pet);
    if (!spec) return;
    const follower = new PetFollower(buildPet(spec), context.player.object);
    const bolt = new ZapBolt(spec.color);
    context.scene.add(follower.object, bolt.object);
    this.companion = { spec, follower, bolt };
  }

  update(delta: number, elapsed: number): void {
    if (!this.companion) return;
    this.companion.follower.update(delta, elapsed);
    this.companion.bolt.update(delta);
    if (this.zap) this.advanceZap(this.zap, delta);
    else if (this.canZap()) this.startZap(this.companion);
  }

  dispose(): void {
    if (!this.companion) return;
    for (const object of [this.companion.follower.object, this.companion.bolt.object]) {
      object.removeFromParent();
      disposeObject(object);
    }
  }

  private canZap(): boolean {
    return !this.zapped && this.context.playing;
  }

  private startZap({ follower, bolt }: Companionship): void {
    const { enemies, stats, phase } = this.context;
    const enemy = zapTarget({ enemies, combo: stats.combo, phase });
    if (!enemy) return;
    this.zapped = true;
    this.zap = { enemy, wait: ZAP_DELAY };
    const target = enemy.burstPosition;
    enemy.freeze(ZAP_DELAY);
    follower.pounceAt(target);
    bolt.strike(follower.position, target);
    this.context.sfx.sweep(ZAP_SWEEP.from, ZAP_SWEEP.to, ZAP_SWEEP.seconds);
  }

  private advanceZap(zap: Zap, delta: number): void {
    zap.wait -= delta;
    if (zap.wait > 0) return;
    this.zap = undefined;
    if (!this.context.enemies.includes(zap.enemy)) {
      this.zapped = false;
      return;
    }
    this.shatter(zap.enemy);
  }

  private shatter(enemy: Enemy): void {
    const { stats, particles, sfx } = this.context;
    particles.burst(enemy.burstPosition, enemy.color);
    stats.score += wordPoints(enemy.word, stats);
    sfx.impact(ZAP_IMPACT);
    this.context.removeEnemy(enemy);
    this.context.announce(i18n.t.features.shop.helper, 'callout', this.companion?.spec.color);
  }
}
