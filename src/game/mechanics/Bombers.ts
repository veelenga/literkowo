import * as THREE from 'three';
import { allowedKeysFor } from '../../course/regions';
import { SPAWN_RADIUS } from '../arena';
import type { Enemy } from '../Enemy';
import type { PhaseKind } from '../LevelPlan';
import { isForestOrLater } from './actionEvents/regions';
import { BomberEnemy, EMBER_COLOR } from './bombers/BomberEnemy';
import { bomberWord, type Random } from './bombers/bomberWord';
import { BLAST_RADIUS, Detonations } from './bombers/Detonations';
import { Knockback } from './bombers/Knockback';
import { Shockwaves } from './bombers/Shockwaves';
import { playBlowback, playLit, playTick } from './bombers/sounds';
import type { Mechanic, MechanicContext } from './Mechanic';
import type { WaveStyle } from './powerWords/effects/GroundWave';

export const BOMBER_INTERVAL = { min: 40, max: 50 };
export const BOMBER_SPEED_SHARE = 0.55;
export const BLOWBACK_DISTANCE = 4;

const BOMBER_PHASES: ReadonlySet<PhaseKind> = new Set(['words', 'boss']);
const BLOWBACK_SHAKE = { strength: 0.45, seconds: 0.6 };
const WAVE_MARGIN = 1.5;
const WAVE: WaveStyle = {
  color: EMBER_COLOR,
  duration: 0.75,
  endDiameter: (BLAST_RADIUS + WAVE_MARGIN) * 2,
  opacity: 1,
  blending: THREE.AdditiveBlending,
};

export class Bombers implements Mechanic {
  private readonly waves = new Shockwaves(WAVE);
  private readonly knockback: Knockback;
  private readonly detonations: Detonations;
  private readonly enabled: boolean;
  private readonly allowedKeys: string;
  private countdown: number;

  constructor(
    private readonly context: MechanicContext,
    private readonly random: Random = Math.random,
  ) {
    this.enabled = isForestOrLater(context.level);
    this.allowedKeys = allowedKeysFor(context.level, context.language);
    this.knockback = new Knockback((enemy) => context.enemies.includes(enemy));
    this.detonations = new Detonations(context, this.waves);
    this.countdown = this.nextInterval();
    context.scene.add(this.waves.group);
  }

  get bombers(): BomberEnemy[] {
    return this.context.enemies.filter((enemy) => enemy instanceof BomberEnemy);
  }

  update(delta: number): void {
    this.waves.update(delta);
    this.knockback.update(delta);
    this.detonations.update(delta);
    this.tickFuses(delta);
    if (this.isSpawnDue(delta)) this.spawn();
  }

  onWordComplete(enemy: Enemy): void {
    if (enemy instanceof BomberEnemy) this.detonations.detonate(enemy);
  }

  onEnemyReached(enemy: Enemy): void {
    if (enemy instanceof BomberEnemy) this.blowBack(enemy);
  }

  dispose(): void {
    this.detonations.stop();
    this.waves.dispose();
  }

  private isSpawnDue(delta: number): boolean {
    const { playing, phase, enemies } = this.context;
    if (!this.enabled || !playing || !BOMBER_PHASES.has(phase.kind)) return false;
    if (this.bombers.length > 0 || enemies.length === 0) return false;
    this.countdown -= delta;
    return this.countdown <= 0;
  }

  private spawn(): void {
    const { context } = this;
    const word = bomberWord(context.words, this.allowedKeys, this.random);
    const speed = context.phase.speed * BOMBER_SPEED_SHARE;
    const bomber = new BomberEnemy(word, context.createLabel(), speed, context.theme.enemyShape);
    context.addEnemy(bomber, SPAWN_RADIUS);
    playLit(context.sfx);
    this.countdown = this.nextInterval();
  }

  private tickFuses(delta: number): void {
    if (!this.context.playing) return;
    for (const bomber of this.bombers) {
      if (bomber.ticker.update(delta, bomber.distanceToCenter)) {
        playTick(this.context.sfx, bomber.urgency);
      }
    }
  }

  private blowBack(bomber: BomberEnemy): void {
    const { context } = this;
    const others = context.enemies.filter((enemy) => enemy !== bomber);
    this.knockback.push(others, BLOWBACK_DISTANCE);
    this.waves.play(bomber.object.position);
    context.particles.burst(bomber.burstPosition, bomber.color);
    context.shakeCamera(BLOWBACK_SHAKE.strength, BLOWBACK_SHAKE.seconds);
    playBlowback(context.sfx);
  }

  private nextInterval(): number {
    const { min, max } = BOMBER_INTERVAL;
    return min + this.random() * (max - min);
  }
}
