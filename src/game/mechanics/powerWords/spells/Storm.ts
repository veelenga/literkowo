import { Boss } from '../../../Boss';
import type { Enemy } from '../../../Enemy';
import { Lightning } from '../effects/Lightning';
import { powerColor } from '../powers';
import { SceneSpell, type SpellContext } from './Spell';

export const STRIKE_COUNT = 3;

const STRIKE_STAGGER = 0.12;
const SHATTER_DELAY = 0.08;
const STRIKE_IMPACT = 0.6;

interface Strike {
  readonly enemy: Enemy;
  wait: number;
  landed: boolean;
}

export class StormSpell extends SceneSpell {
  private readonly lightning = new Lightning(powerColor('storm'));
  private strikes: Strike[] = [];

  constructor(context: SpellContext) {
    super(context);
    this.root.add(this.lightning.group);
  }

  get boltsInSky(): number {
    return this.lightning.activeBolts;
  }

  cast(): void {
    const targets = this.bystanders
      .filter((enemy) => !(enemy instanceof Boss))
      .sort((first, second) => first.distanceToCenter - second.distanceToCenter)
      .slice(0, STRIKE_COUNT);
    targets.forEach((enemy, index) =>
      this.strikes.push({ enemy, wait: index * STRIKE_STAGGER, landed: false }),
    );
  }

  update(delta: number): void {
    this.lightning.update(delta);
    this.strikes = this.strikes.filter((strike) => this.advance(strike, delta));
  }

  private advance(strike: Strike, delta: number): boolean {
    strike.wait -= delta;
    if (strike.wait > 0) return true;
    if (!this.isOnBoard(strike.enemy)) return false;
    if (strike.landed) {
      this.shatter(strike.enemy);
      return false;
    }
    this.land(strike);
    return true;
  }

  private land(strike: Strike): void {
    strike.landed = true;
    strike.wait = SHATTER_DELAY;
    this.lightning.strike(strike.enemy.burstPosition);
    this.context.sfx.impact(STRIKE_IMPACT);
  }

  private shatter(enemy: Enemy): void {
    this.context.particles.burst(enemy.burstPosition, enemy.color);
    this.context.stats.recordWord(enemy.word);
    this.context.removeEnemy(enemy);
  }
}
