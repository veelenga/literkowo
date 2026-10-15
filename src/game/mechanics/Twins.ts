import type * as THREE from 'three';
import { format } from '../../i18n/format';
import { i18n } from '../../i18n/i18n';
import { Enemy } from '../Enemy';
import type { PhaseKind } from '../RunPlan';
import { hasForestMechanics } from './actionEvents/regions';
import type { Mechanic, MechanicContext } from './Mechanic';
import { wordPoints } from './mergeEnemies/scoring';
import {
  formationSlots,
  slotAim,
  slotPosition,
  type FormationShape,
  type FormationSlot,
} from './twins/formation';
import { SparkArc } from './twins/SparkArc';
import { TwinEnemy, type TwinGroup } from './twins/TwinEnemy';

export type Random = () => number;

export const TWIN_CHANCE = 1 / 8;
export const TWIN_COUNT = { min: 2, max: 4 };
export const CHAIN_MIN_TWINS = 2;

const TWIN_PHASE: PhaseKind = 'words';
const SHAPES: readonly FormationShape[] = ['line', 'vee'];
const FULL_TURN = Math.PI * 2;
const CHAIN_NOTES = [72, 76, 79, 84, 88, 91, 96] as const;
const CHAIN_BASE_NOTES = 2;
const CHAIN_SPACING = 0.07;
const CHAIN_DECAY = 0.5;
const CHAIN_ACCENT = '#5ef2e0';

export class Twins implements Mechanic {
  private readonly arc = new SparkArc();
  private readonly enabled: boolean;
  private readonly paid = new WeakSet<Enemy>();
  private readonly hurtBy = new WeakSet<TwinGroup>();

  constructor(
    private readonly context: MechanicContext,
    private readonly random: Random = Math.random,
  ) {
    this.enabled = hasForestMechanics(context);
    context.scene.add(this.arc.group);
  }

  update(delta: number): void {
    this.arc.update(delta);
  }

  onSpawn(enemy: Enemy): void {
    if (!this.canReplace(enemy) || this.random() >= TWIN_CHANCE) return;
    this.replace(enemy);
  }

  onWordComplete(enemy: Enemy): void {
    if (!(enemy instanceof TwinEnemy) || this.paid.has(enemy)) return;
    const chain = this.completingWith(enemy);
    chain.forEach((twin) => this.paid.add(twin));
    if (chain.length >= CHAIN_MIN_TWINS) this.reward(chain);
  }

  onEnemyReached(enemy: Enemy): void {
    if (!(enemy instanceof TwinEnemy)) return;
    const { group } = enemy.placement;
    if (this.hurtBy.has(group)) this.context.removeEnemy(enemy);
    else this.hurtBy.add(group);
  }

  dispose(): void {
    this.arc.dispose();
  }

  private canReplace(enemy: Enemy): boolean {
    const { playing, phase, enemies } = this.context;
    return (
      this.enabled &&
      playing &&
      phase.kind === TWIN_PHASE &&
      isPlainEnemy(enemy) &&
      enemy.tags.size === 0 &&
      enemies.includes(enemy)
    );
  }

  private replace(enemy: Enemy): void {
    const { context } = this;
    const anchor = enemy.object.position.clone();
    const group: TwinGroup = { bobPhase: this.random() * FULL_TURN };
    for (const slot of formationSlots(this.twinCount(), this.shape())) {
      const twin = this.createTwin(enemy.word, anchor, slot, group);
      twin.object.position.copy(slotPosition(anchor, slot));
      context.addEnemy(twin);
    }
    context.removeEnemy(enemy);
  }

  private createTwin(
    word: string,
    anchor: THREE.Vector3,
    slot: FormationSlot,
    group: TwinGroup,
  ): TwinEnemy {
    const { theme, phase } = this.context;
    const look = { shape: theme.enemyShape, colors: theme.enemyColors };
    const placement = { lateral: slot.lateral, aim: slotAim(anchor, slot), group };
    return new TwinEnemy(word, this.context.createLabel(), phase.speed, look, placement);
  }

  private twinCount(): number {
    const { min, max } = TWIN_COUNT;
    return min + Math.floor(this.random() * (max - min + 1));
  }

  private shape(): FormationShape {
    return SHAPES[Math.floor(this.random() * SHAPES.length)];
  }

  private completingWith(enemy: TwinEnemy): TwinEnemy[] {
    const others = this.context.enemies.filter(
      (other): other is TwinEnemy =>
        other instanceof TwinEnemy &&
        other !== enemy &&
        other.isComplete &&
        other.word === enemy.word,
    );
    return [enemy, ...others];
  }

  private reward(chain: readonly TwinEnemy[]): void {
    const { stats, sfx } = this.context;
    const count = chain.length;
    stats.score += (count - 1) * wordPoints(chain[0].word, stats);
    sfx.chimes(CHAIN_NOTES.slice(0, CHAIN_BASE_NOTES + count), CHAIN_SPACING, CHAIN_DECAY);
    this.arc.show(byLateral(chain).map((twin) => twin.burstPosition));
    this.context.announce(format(i18n.t.features.twins.chain, { count }), 'callout', CHAIN_ACCENT);
  }
}

function isPlainEnemy(enemy: Enemy): boolean {
  return Object.getPrototypeOf(enemy) === Enemy.prototype;
}

function byLateral(chain: readonly TwinEnemy[]): TwinEnemy[] {
  return [...chain].sort((first, second) => first.placement.lateral - second.placement.lateral);
}
