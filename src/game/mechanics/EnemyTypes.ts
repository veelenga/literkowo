import { i18n } from '../../i18n/i18n';
import { Boss } from '../Boss';
import type { Enemy } from '../Enemy';
import type { PhaseKind } from '../LevelPlan';
import { MINION_TAG } from './bossPhases/Minions';
import { createSpecial } from './enemyTypes/factory';
import {
  BONUS_WORDS,
  ENEMY_TYPE_TAG,
  boardCap,
  rollKind,
  unlockedKinds,
  type EnemyKind,
  type Random,
} from './enemyTypes/kinds';
import { SpecialEnemy } from './enemyTypes/SpecialEnemy';
import { Stage } from './enemyTypes/Stage';
import type { Mechanic, MechanicContext } from './Mechanic';
import { MERGED_TAG } from './mergeEnemies/rules';
import { wordPoints } from './mergeEnemies/scoring';
import { POWER_TAG } from './powerWords/PowerEnemy';

const REPLACING_PHASE: PhaseKind = 'words';
const KEPT_TAGS = [POWER_TAG, MERGED_TAG, MINION_TAG, ENEMY_TYPE_TAG];
const ACCENTS: Readonly<Record<EnemyKind, string>> = {
  jumper: '#7dff4f',
  balloon: '#ff7ad9',
  bat: '#b98cff',
  swarm: '#ffd400',
};

export class EnemyTypes implements Mechanic {
  private readonly kinds: readonly EnemyKind[];
  private readonly cap: number;
  private readonly stage: Stage;
  private readonly introduced = new Set<EnemyKind>();

  constructor(
    private readonly context: MechanicContext,
    private readonly random: Random = Math.random,
  ) {
    this.kinds = unlockedKinds(context.level);
    this.cap = boardCap(context.level);
    this.stage = new Stage(context);
  }

  update(delta: number): void {
    this.stage.update(delta);
  }

  onSpawn(enemy: Enemy): void {
    if (!this.canReplace(enemy)) return;
    const kind = rollKind(this.kinds, this.random);
    if (kind) this.replace(enemy, kind);
  }

  onWordComplete(enemy: Enemy): void {
    if (!(enemy instanceof SpecialEnemy)) return;
    this.payBonus(enemy);
    enemy.celebrate();
  }

  dispose(): void {
    this.stage.dispose();
  }

  private canReplace(enemy: Enemy): boolean {
    return (
      this.context.phase.kind === REPLACING_PHASE &&
      isReplaceable(enemy) &&
      this.specialsOnBoard() < this.cap
    );
  }

  private specialsOnBoard(): number {
    return this.context.enemies.filter((enemy) => enemy.tags.has(ENEMY_TYPE_TAG)).length;
  }

  private replace(enemy: Enemy, kind: EnemyKind): void {
    const special = createSpecial(kind, this.context, this.stage, this.random);
    special.arriveAt(enemy.object.position);
    this.context.addEnemy(special);
    this.context.removeEnemy(enemy);
    this.introduce(kind);
  }

  private introduce(kind: EnemyKind): void {
    this.stage.play(kind);
    if (this.introduced.has(kind)) return;
    this.introduced.add(kind);
    this.context.announce(i18n.t.features.enemyTypes.names[kind], 'callout', ACCENTS[kind]);
  }

  private payBonus(enemy: SpecialEnemy): void {
    const { stats } = this.context;
    stats.score += wordPoints(enemy.word, stats) * BONUS_WORDS[enemy.kind];
  }
}

function isReplaceable(enemy: Enemy): boolean {
  return !(enemy instanceof Boss) && !KEPT_TAGS.some((tag) => enemy.tags.has(tag));
}
