import '../../ui/actionEvents.css';
import { REGIONS, type Level } from '../../course/regions';
import { i18n } from '../../i18n/i18n';
import { Boss } from '../Boss';
import type { Enemy } from '../Enemy';
import type { PhaseKind } from '../LevelPlan';
import { regionIndexOf } from './actionEvents/regions';
import { phaseFor } from './bossPhases/phases';
import type { Mechanic, MechanicContext } from './Mechanic';
import { SurgeTrail } from './speedSurge/SurgeTrail';

export const SURGE_FIRST_DELAY = 20;
export const SURGE_TELEGRAPH = 1.5;
export const SURGE_DURATION = 7;
export const SURGE_SPEED_SCALE = 1.8;
export const SURGE_INTERVAL = { firstRegion: 40, lastRegion: 25 };
export const SURGE_CLASS = 'is-speed-surge';

const NORMAL_SPEED = 1;
const RAGE_PACE = 2;
const CALM_PACE = 1;
const TRAIL_EVERY = 0.08;
const WARNING_ACCENT = '#ff5a4f';
const WARNING_SWEEP = { fromMidi: 55, toMidi: 84, seconds: SURGE_TELEGRAPH };
const SURGE_PHASES: ReadonlySet<PhaseKind> = new Set(['words', 'boss']);

type SurgeStage = 'waiting' | 'telegraph' | 'surging';

export type SpeedSurgeContext = Pick<
  MechanicContext,
  'enemies' | 'scene' | 'phase' | 'playing' | 'level' | 'sfx' | 'announce'
>;

export class SpeedSurge implements Mechanic {
  private readonly trail = new SurgeTrail();
  private readonly interval: number;
  private stage: SurgeStage = 'waiting';
  private timer = SURGE_FIRST_DELAY;
  private sinceTrail = 0;

  constructor(private readonly context: SpeedSurgeContext) {
    this.interval = surgeIntervalFor(context.level);
    context.scene.add(this.trail.mesh);
  }

  get isSurging(): boolean {
    return this.stage === 'surging';
  }

  get isTelegraphing(): boolean {
    return this.stage === 'telegraph';
  }

  get trailCubes(): number {
    return this.trail.liveCount;
  }

  update(delta: number): void {
    this.trail.update(delta);
    if (!this.isRunning) return this.standDown();
    if (this.stage === 'surging') return this.surge(delta);
    if (this.stage === 'telegraph') return this.telegraph(delta);
    this.wait(delta);
  }

  onSpawn(enemy: Enemy): void {
    if (this.isSurging && isSurgeable(enemy)) enemy.setSpeedScale(SURGE_SPEED_SCALE);
  }

  onPhaseChange(): void {
    this.standDown();
    this.timer = SURGE_FIRST_DELAY;
  }

  dispose(): void {
    this.standDown();
    this.trail.dispose();
  }

  private get isRunning(): boolean {
    return this.context.playing && SURGE_PHASES.has(this.context.phase.kind);
  }

  private get pace(): number {
    const boss = this.context.enemies.find((enemy) => enemy instanceof Boss);
    return boss && phaseFor(boss.health) === 'rage' ? RAGE_PACE : CALM_PACE;
  }

  private get hasFrozenEnemies(): boolean {
    return this.context.enemies.some((enemy) => enemy.isFrozen);
  }

  private wait(delta: number): void {
    this.timer -= delta * this.pace;
    if (this.timer > 0) return;
    if (this.hasFrozenEnemies) return this.skip();
    this.stage = 'telegraph';
    this.timer = SURGE_TELEGRAPH;
    this.warn();
  }

  private telegraph(delta: number): void {
    this.timer -= delta;
    if (this.timer > 0) return;
    if (this.hasFrozenEnemies) return this.skip();
    this.begin();
  }

  private surge(delta: number): void {
    this.timer -= delta;
    if (this.timer <= 0 || this.hasFrozenEnemies) return this.end();
    this.leaveTrails(delta);
  }

  private warn(): void {
    const { fromMidi, toMidi, seconds } = WARNING_SWEEP;
    this.context.sfx.sweep(fromMidi, toMidi, seconds);
    this.context.announce(i18n.t.features.speedSurge.warning, 'warning', WARNING_ACCENT);
  }

  private begin(): void {
    this.stage = 'surging';
    this.timer = SURGE_DURATION;
    this.sinceTrail = TRAIL_EVERY;
    this.setScale(SURGE_SPEED_SCALE);
    document.body.classList.add(SURGE_CLASS);
  }

  private end(): void {
    this.setScale(NORMAL_SPEED);
    document.body.classList.remove(SURGE_CLASS);
    this.skip();
  }

  private skip(): void {
    this.stage = 'waiting';
    this.timer = this.interval;
  }

  private standDown(): void {
    if (this.isSurging) this.end();
    else if (this.isTelegraphing) this.skip();
  }

  private setScale(scale: number): void {
    this.surgeable().forEach((enemy) => enemy.setSpeedScale(scale));
  }

  private leaveTrails(delta: number): void {
    this.sinceTrail += delta;
    if (this.sinceTrail < TRAIL_EVERY) return;
    this.sinceTrail = 0;
    for (const enemy of this.surgeable()) this.trail.emit(enemy.burstPosition, enemy.color);
  }

  private surgeable(): Enemy[] {
    return this.context.enemies.filter(isSurgeable);
  }
}

export function surgeIntervalFor(level: Level): number {
  const { firstRegion, lastRegion } = SURGE_INTERVAL;
  const progress = regionIndexOf(level) / Math.max(1, REGIONS.length - 1);
  return firstRegion + (lastRegion - firstRegion) * progress;
}

function isSurgeable(enemy: Enemy): boolean {
  return !(enemy instanceof Boss);
}
