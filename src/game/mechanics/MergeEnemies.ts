import { i18n } from '../../i18n/i18n';
import '../../ui/mergeEnemies.css';
import type { Enemy } from '../Enemy';
import type { PhaseKind } from '../RunPlan';
import type { Mechanic, MechanicContext } from './Mechanic';
import { Fusion } from './mergeEnemies/Fusion';
import { huddle } from './mergeEnemies/huddle';
import { MergedEnemy } from './mergeEnemies/MergedEnemy';
import {
  MERGED_TAG,
  findTouchingPair,
  isClearOfHero,
  isFusible,
  joinedWord,
} from './mergeEnemies/rules';
import { wordPoints } from './mergeEnemies/scoring';

const MERGING_PHASE: PhaseKind = 'words';
const MERGED_SPEED_SHARE = 0.6;
const MERGED_BONUS_WORDS = 2;
const IMPACT_STRENGTH = 0.85;

export class MergeEnemies implements Mechanic {
  private fusions: Fusion[] = [];

  constructor(private readonly context: MechanicContext) {}

  update(delta: number): void {
    if (!this.isMerging) return this.releaseAll();
    this.advanceFusions(delta);
    const candidates = this.candidates();
    huddle(candidates, delta);
    this.startFusion(candidates);
  }

  onWordComplete(enemy: Enemy): void {
    if (!enemy.tags.has(MERGED_TAG)) return;
    const { stats } = this.context;
    stats.score += wordPoints(enemy.word, stats) * MERGED_BONUS_WORDS;
  }

  dispose(): void {
    this.releaseAll();
  }

  private get isMerging(): boolean {
    return this.context.playing && this.context.phase.kind === MERGING_PHASE;
  }

  private candidates(): Enemy[] {
    return this.context.enemies.filter(
      (enemy) => isFusible(enemy) && isClearOfHero(enemy) && !this.isFusing(enemy),
    );
  }

  private isFusing(enemy: Enemy): boolean {
    return this.fusions.some((fusion) => fusion.includes(enemy));
  }

  private startFusion(candidates: readonly Enemy[]): void {
    const pair = findTouchingPair(candidates);
    if (pair) this.fusions.push(new Fusion(...pair));
  }

  private advanceFusions(delta: number): void {
    for (const fusion of [...this.fusions]) this.advance(fusion, delta);
  }

  private advance(fusion: Fusion, delta: number): void {
    if (!this.isIntact(fusion)) return this.drop(fusion);
    fusion.update(delta);
    if (!fusion.isComplete) return;
    this.drop(fusion);
    this.fuse(fusion);
  }

  private isIntact(fusion: Fusion): boolean {
    return fusion.members.every(
      (enemy) => this.context.enemies.includes(enemy) && isFusible(enemy),
    );
  }

  private drop(fusion: Fusion): void {
    fusion.release();
    this.fusions = this.fusions.filter((other) => other !== fusion);
  }

  private releaseAll(): void {
    this.fusions.forEach((fusion) => fusion.release());
    this.fusions = [];
  }

  private fuse(fusion: Fusion): void {
    const merged = this.createMerged(joinedWord(fusion.first, fusion.second));
    merged.object.position.copy(fusion.midpoint);
    this.context.addEnemy(merged);
    fusion.members.forEach((enemy) => this.context.removeEnemy(enemy));
    this.celebrate(merged, fusion);
  }

  private createMerged(word: string): MergedEnemy {
    const { theme, phase } = this.context;
    const look = { shape: theme.enemyShape, colors: theme.enemyColors };
    const speed = phase.speed * MERGED_SPEED_SHARE;
    return new MergedEnemy(word, this.context.createLabel(), speed, look);
  }

  private celebrate(merged: MergedEnemy, fusion: Fusion): void {
    merged.ignite();
    for (const enemy of fusion.members) {
      this.context.particles.burst(merged.burstPosition, enemy.color);
    }
    this.context.announce(i18n.t.features.mergeEnemies.warning, 'warning');
    this.context.sfx.impact(IMPACT_STRENGTH);
  }
}
