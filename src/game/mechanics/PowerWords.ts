import { SPAWN_RADIUS } from '../arena';
import { allowedKeysFor } from '../../course/regions';
import type { Enemy } from '../Enemy';
import type { PhaseKind } from '../LevelPlan';
import type { Mechanic, MechanicContext } from './Mechanic';
import { choosePower, choosePowerWord, type PowerWord, type Random } from './powerWords/choice';
import { bannerFor, decoratePowerLabel } from './powerWords/label';
import { PowerEnemy } from './powerWords/PowerEnemy';
import { powerAccent, powersFor, type Power } from './powerWords/powers';
import { CAST_SOUNDS, playSummon } from './powerWords/sounds';
import { createSpells } from './powerWords/spells';
import type { Spell } from './powerWords/spells/Spell';

export const SUMMON_INTERVAL = { min: 18, max: 28 };
export const POWER_SPEED_SCALE = 0.8;

const POWER_PHASES: ReadonlySet<PhaseKind> = new Set(['words', 'boss']);

interface Summoned {
  readonly enemy: PowerEnemy;
  readonly choice: PowerWord;
}

export class PowerWords implements Mechanic {
  private readonly spells: Record<Power, Spell>;
  private readonly allowedKeys: string;
  private summoned: Summoned | undefined;
  private lastPower: Power | undefined;
  private countdown: number;

  constructor(
    private readonly context: MechanicContext,
    private readonly random: Random = Math.random,
  ) {
    this.spells = createSpells(context);
    this.allowedKeys = allowedKeysFor(context.level, context.language);
    this.countdown = this.nextInterval();
  }

  get powerEnemy(): Enemy | undefined {
    return this.summoned?.enemy;
  }

  update(delta: number): void {
    this.forgetVanished();
    Object.values(this.spells).forEach((spell) => spell.update(delta));
    if (this.isSummonDue(delta)) this.summon();
  }

  onWordComplete(enemy: Enemy): void {
    if (!this.summoned || enemy !== this.summoned.enemy) return;
    this.cast(this.summoned.choice);
    this.summoned = undefined;
  }

  onEnemyReached(enemy: Enemy): void {
    if (!this.summoned || enemy !== this.summoned.enemy) return;
    this.summoned = undefined;
    this.context.removeEnemy(enemy);
  }

  dispose(): void {
    Object.values(this.spells).forEach((spell) => spell.dispose());
  }

  private isSummonDue(delta: number): boolean {
    const { playing, phase, enemies } = this.context;
    if (!playing || !POWER_PHASES.has(phase.kind) || this.summoned) return false;
    this.countdown -= delta;
    return this.countdown <= 0 && enemies.length > 0;
  }

  private summon(): void {
    const { context } = this;
    const power = choosePower(powersFor(context.phase.kind), this.lastPower, this.random);
    const choice = choosePowerWord(power, this.allowedKeys, context.language, this.random);
    const label = decoratePowerLabel(context.createLabel(), choice);
    const speed = context.phase.speed * POWER_SPEED_SCALE;
    const enemy = new PowerEnemy(choice.word, label, speed, context.theme.enemyShape);
    context.addEnemy(enemy, SPAWN_RADIUS);
    playSummon(context.sfx);
    this.summoned = { enemy, choice };
    this.lastPower = power;
    this.countdown = this.nextInterval();
  }

  private cast(choice: PowerWord): void {
    this.context.announce(bannerFor(choice), 'banner', powerAccent(choice.power));
    CAST_SOUNDS[choice.power](this.context.sfx);
    this.spells[choice.power].cast();
  }

  private forgetVanished(): void {
    if (this.summoned && !this.context.enemies.includes(this.summoned.enemy)) {
      this.summoned = undefined;
    }
  }

  private nextInterval(): number {
    const { min, max } = SUMMON_INTERVAL;
    return min + this.random() * (max - min);
  }
}
