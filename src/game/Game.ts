import * as THREE from 'three';
import { sfx } from '../audio/Sfx';
import type { Level } from '../course/regions';
import { WordSource } from '../course/WordSource';
import type { WordLanguage } from '../profiles/Profile';
import {
  BOSS_SPAWN_RADIUS,
  CAMERA_POSITION,
  CAMERA_TARGET,
  REACH_DISTANCE,
  SPAWN_RADIUS,
} from './arena';
import { Boss } from './Boss';
import { calloutFor, type CalloutKind } from './combo';
import { disposeObject } from './disposal';
import { Enemy, type EnemyLook } from './Enemy';
import { LabelLayer } from './LabelLayer';
import { planFor, type Phase, type PhaseKind } from './LevelPlan';
import { Particles } from './Particles';
import { Player } from './Player';
import { renderHost } from './RenderHost';
import { SessionStats } from './SessionStats';
import type { Theme } from './themes';
import { World } from './World';

export { themeFor } from './themes';

const CAMERA_FOV = 42;
const CAMERA_NEAR = 0.1;
const CAMERA_FAR = 120;
const CAMERA_INTRO_SCALE = 2.2;
const CAMERA_INTRO_DURATION = 1.8;
const CAMERA_SWAY = 0.35;
const CAMERA_SWAY_SPEED = 0.25;
const SPAWN_ARC_MARGIN = 0.35;
const MAX_FRAME_DELTA = 0.1;
const MAX_ENEMIES = 6;
const INITIAL_LIVES = 3;
const SHAKE_DURATION = 0.25;
const SHAKE_AMPLITUDE = 0.18;
const BURST_DROP = 0.8;
const FINISH_DELAY_MS = 1100;

export interface GameConfig {
  character: string;
  level: Level;
  language: WordLanguage;
  theme: Theme;
}

export interface GameResult {
  won: boolean;
  score: number;
  accuracy: number;
  wpm: number;
  lettersFreed: number;
}

export interface Progress {
  kind: PhaseKind;
  done: number;
  total: number;
}

export interface GameEvents {
  onStats(stats: SessionStats, lives: number): void;
  onNextKey(char: string | undefined): void;
  onPause(paused: boolean): void;
  onProgress(progress: Progress): void;
  onCallout(kind: CalloutKind): void;
  onFever(active: boolean): void;
  onFinished(result: GameResult): void;
}

const FEVER_RING = { inner: 1.1, outer: 1.5, segments: 48, color: 0xffb020, opacity: 0.75 };
const FEVER_RING_HEIGHT = 0.04;
const FEVER_RING_SPIN = 1.6;
const FEVER_RING_PULSE = { speed: 6, amount: 0.08 };
const FEVER_BURST_LIFT = 0.6;

export class Game {
  private readonly scene = new THREE.Scene();
  private readonly camera = new THREE.PerspectiveCamera(CAMERA_FOV, 1, CAMERA_NEAR, CAMERA_FAR);
  private readonly cameraTarget = new THREE.Vector3().copy(CAMERA_TARGET);
  private readonly clock = new THREE.Clock();
  private readonly player: Player;
  private readonly particles = new Particles(this.scene);
  private readonly world: World;
  private readonly words: WordSource;
  private readonly stats = new SessionStats();
  private readonly labels: LabelLayer;
  private readonly phases: Phase[];
  private readonly enemies: Enemy[] = [];
  private phaseIndex = 0;
  private spawned = 0;
  private cleared = 0;
  private boss: Boss | undefined;
  private target: Enemy | undefined;
  private lives = INITIAL_LIVES;
  private lettersFreed = 0;
  private elapsed = 0;
  private sinceSpawn = Number.POSITIVE_INFINITY;
  private shake = 0;
  private readonly feverRing = createFeverRing();
  private feverActive = false;
  private paused = false;
  private finished = false;
  private running = false;
  private frame = 0;

  constructor(
    container: HTMLElement,
    private readonly config: GameConfig,
    private readonly events: GameEvents,
  ) {
    this.player = new Player(config.character);
    this.words = new WordSource(config.level, config.language);
    this.phases = planFor(config.level);
    this.world = new World(this.scene, config.theme);
    this.scene.add(this.player.object, this.feverRing);
    this.placeCameraForIntro();
    renderHost.attach(container, this.scene, this.camera);
    this.labels = new LabelLayer(container);
  }

  start(): void {
    this.running = true;
    window.addEventListener('keydown', this.onKeyDown);
    this.events.onStats(this.stats, this.lives);
    this.reportProgress();
    this.loop();
  }

  destroy(): void {
    this.running = false;
    cancelAnimationFrame(this.frame);
    window.removeEventListener('keydown', this.onKeyDown);
    this.releaseEnemies();
    this.world.dispose();
    this.particles.dispose();
    disposeObject(this.feverRing);
    this.player.dispose();
    this.scene.clear();
    renderHost.detach();
    this.labels.remove();
  }

  private get phase(): Phase {
    return this.phases[this.phaseIndex];
  }

  private get inIntro(): boolean {
    return this.elapsed < CAMERA_INTRO_DURATION;
  }

  private placeCameraForIntro(): void {
    this.camera.position.copy(CAMERA_POSITION).multiplyScalar(CAMERA_INTRO_SCALE);
    this.camera.lookAt(this.cameraTarget);
  }

  private releaseEnemies(): void {
    this.enemies.forEach((enemy) => enemy.dispose());
    this.enemies.length = 0;
    this.target = undefined;
    this.boss = undefined;
  }

  private readonly loop = (): void => {
    if (!this.running) return;
    this.frame = requestAnimationFrame(this.loop);
    const delta = Math.min(this.clock.getDelta(), MAX_FRAME_DELTA);
    if (this.paused) return;
    this.tick(delta);
    this.labels.position(this.enemies, this.camera, renderHost.viewport);
    renderHost.render();
  };

  private tick(delta: number): void {
    this.elapsed += delta;
    this.world.update(delta, this.elapsed);
    this.player.update(delta, this.elapsed);
    this.particles.update(delta);
    this.animateFeverRing(delta);
    this.updateCamera(delta);
    if (this.finished) return;
    if (!this.inIntro) this.spawnIfDue(delta);
    this.updateEnemies(delta);
    this.stats.addActiveTime(delta);
    if (this.target) this.player.lookAt(this.target.object.position);
    this.events.onNextKey(this.nextExpectedChar());
  }

  private updateEnemies(delta: number): void {
    for (let index = this.enemies.length - 1; index >= 0 && !this.finished; index -= 1) {
      const enemy = this.enemies[index];
      enemy.update(delta, this.elapsed, this.camera.position);
      if (enemy.distanceToCenter < REACH_DISTANCE) this.enemyReached(enemy);
    }
  }

  private updateCamera(delta: number): void {
    const introProgress = Math.min(1, this.elapsed / CAMERA_INTRO_DURATION);
    const eased = 1 - Math.pow(1 - introProgress, 3);
    const scale = CAMERA_INTRO_SCALE - (CAMERA_INTRO_SCALE - 1) * eased;
    const sway = Math.sin(this.elapsed * CAMERA_SWAY_SPEED) * CAMERA_SWAY;
    this.camera.position.copy(CAMERA_POSITION).multiplyScalar(scale);
    this.camera.position.x += sway;
    this.applyShake(delta);
    this.camera.lookAt(this.cameraTarget);
  }

  private spawnIfDue(delta: number): void {
    if (this.phase.kind === 'boss') return this.spawnBossOnce();
    this.sinceSpawn += delta;
    const remaining = this.spawned < this.phase.count;
    if (
      !remaining ||
      this.sinceSpawn < this.phase.spawnInterval ||
      this.enemies.length >= MAX_ENEMIES
    ) {
      return;
    }
    this.sinceSpawn = 0;
    this.spawned += 1;
    const word = this.phase.kind === 'warmup' ? this.words.singleLetter() : this.words.next();
    const enemy = new Enemy(word, this.labels.createLabel(), this.phase.speed, this.look());
    this.addEnemy(enemy, SPAWN_RADIUS);
  }

  private spawnBossOnce(): void {
    if (this.boss) return;
    this.boss = new Boss(
      this.labels.createLabel(),
      this.phase.speed,
      this.look(),
      () => this.words.bossWord(),
      this.phase.count,
    );
    this.addEnemy(this.boss, BOSS_SPAWN_RADIUS);
  }

  private look(): EnemyLook {
    return { shape: this.config.theme.enemyShape, colors: this.config.theme.enemyColors };
  }

  private addEnemy(enemy: Enemy, radius: number): void {
    const angle = Math.PI - SPAWN_ARC_MARGIN + Math.random() * (Math.PI + SPAWN_ARC_MARGIN * 2);
    enemy.object.position.set(Math.cos(angle) * radius, 0, Math.sin(angle) * radius);
    this.scene.add(enemy.object);
    this.enemies.push(enemy);
  }

  private enemyReached(enemy: Enemy): void {
    if (this.phase.kind === 'warmup') return this.clearEnemy(enemy);
    if (enemy instanceof Boss) enemy.reset();
    else this.clearEnemy(enemy);
    this.loseLife();
  }

  private loseLife(): void {
    this.lives -= 1;
    this.shake = SHAKE_DURATION;
    this.player.hurt();
    this.stats.recordMistake();
    this.syncFever();
    sfx.lifeLost();
    this.events.onStats(this.stats, this.lives);
    if (this.lives <= 0) this.finish(false);
  }

  private clearEnemy(enemy: Enemy): void {
    this.remove(enemy);
    this.cleared += 1;
    this.reportProgress();
    if (this.cleared >= this.phase.count) this.advancePhase();
  }

  private advancePhase(): void {
    this.phaseIndex += 1;
    this.spawned = 0;
    this.cleared = 0;
    this.sinceSpawn = Number.POSITIVE_INFINITY;
    if (this.phaseIndex >= this.phases.length) return this.finish(true);
    this.reportProgress();
  }

  private reportProgress(): void {
    const total = this.phase.count;
    const done = this.boss ? total - Math.round(this.boss.health * total) : this.cleared;
    this.events.onProgress({ kind: this.phase.kind, done, total });
  }

  private finish(won: boolean): void {
    if (this.finished) return;
    this.finished = true;
    this.stats.freeze();
    this.events.onNextKey(undefined);
    if (won) sfx.levelComplete();
    else sfx.levelFailed();
    window.setTimeout(() => this.reportResult(won), FINISH_DELAY_MS);
  }

  private reportResult(won: boolean): void {
    if (!this.running) return;
    this.events.onFinished({
      won,
      score: this.stats.score,
      accuracy: this.stats.accuracy,
      wpm: this.stats.wpm,
      lettersFreed: this.lettersFreed,
    });
  }

  private readonly onKeyDown = (event: KeyboardEvent): void => {
    if (this.finished) return;
    if (event.key === 'Escape') return this.togglePause();
    if (this.paused || this.inIntro || isShortcut(event) || event.key.length !== 1) return;
    event.preventDefault();
    this.handleChar(event.key.toLowerCase());
  };

  private togglePause(): void {
    this.paused = !this.paused;
    this.clock.getDelta();
    this.events.onPause(this.paused);
  }

  private handleChar(char: string): void {
    if (!this.target) this.acquireTarget(char);
    if (!this.target || this.target.expectedChar !== char) return this.mistake();
    this.target.advance();
    this.stats.recordHit();
    sfx.hit(this.stats.combo);
    this.announceCombo();
    if (this.target.isComplete) this.completeWord(this.target);
    this.events.onStats(this.stats, this.lives);
  }

  private announceCombo(): void {
    const kind = calloutFor(this.stats.combo);
    if (kind) {
      sfx.callout(this.stats.combo);
      this.events.onCallout(kind);
    }
    this.syncFever();
  }

  private syncFever(): void {
    if (this.stats.fever === this.feverActive) return;
    this.feverActive = this.stats.fever;
    this.feverRing.visible = this.feverActive;
    if (this.feverActive) sfx.fever();
    this.events.onFever(this.feverActive);
  }

  private animateFeverRing(delta: number): void {
    if (!this.feverActive) return;
    this.feverRing.rotation.z += FEVER_RING_SPIN * delta;
    const pulse = 1 + Math.sin(this.elapsed * FEVER_RING_PULSE.speed) * FEVER_RING_PULSE.amount;
    this.feverRing.scale.setScalar(pulse);
  }

  private acquireTarget(char: string): void {
    this.target = nearestEnemy(this.enemies, (enemy) => enemy.expectedChar === char);
    this.target?.setTargeted(true);
  }

  private mistake(): void {
    this.stats.recordMistake();
    this.syncFever();
    this.target?.flashMistake();
    sfx.mistake();
    this.events.onStats(this.stats, this.lives);
  }

  private completeWord(enemy: Enemy): void {
    this.stats.recordWord(enemy.word);
    this.lettersFreed += enemy.word.length;
    this.player.jump();
    const burstAt = enemy.object.position.clone().setY(enemy.labelHeight - BURST_DROP);
    this.particles.burst(burstAt, enemy.color);
    if (this.feverActive)
      this.particles.burst(burstAt.clone().setY(burstAt.y + FEVER_BURST_LIFT), enemy.color);
    if (enemy instanceof Boss) return this.hitBoss(enemy);
    sfx.word();
    this.clearEnemy(enemy);
  }

  private hitBoss(boss: Boss): void {
    sfx.bossHit();
    boss.takeHit();
    boss.setTargeted(false);
    this.target = undefined;
    this.reportProgress();
    if (!boss.isDefeated) return;
    this.remove(boss);
    this.boss = undefined;
    this.advancePhase();
  }

  private remove(enemy: Enemy): void {
    if (this.target === enemy) this.target = undefined;
    this.scene.remove(enemy.object);
    enemy.dispose();
    this.enemies.splice(this.enemies.indexOf(enemy), 1);
  }

  private nextExpectedChar(): string | undefined {
    return (this.target ?? nearestEnemy(this.enemies))?.expectedChar;
  }

  private applyShake(delta: number): void {
    if (this.shake <= 0) return;
    this.shake -= delta;
    const strength = (this.shake / SHAKE_DURATION) * SHAKE_AMPLITUDE;
    this.camera.position.x += (Math.random() - 0.5) * strength;
    this.camera.position.y += (Math.random() - 0.5) * strength;
  }
}

function nearestEnemy(
  enemies: readonly Enemy[],
  matches: (enemy: Enemy) => boolean = () => true,
): Enemy | undefined {
  let nearest: Enemy | undefined;
  for (const enemy of enemies) {
    if (!matches(enemy)) continue;
    if (!nearest || enemy.distanceToCenter < nearest.distanceToCenter) nearest = enemy;
  }
  return nearest;
}

function isShortcut(event: KeyboardEvent): boolean {
  const altGraph = event.getModifierState('AltGraph') || (event.ctrlKey && event.altKey);
  return event.metaKey || (event.ctrlKey && !altGraph);
}

function createFeverRing(): THREE.Mesh {
  const geometry = new THREE.RingGeometry(FEVER_RING.inner, FEVER_RING.outer, FEVER_RING.segments);
  geometry.rotateX(-Math.PI / 2);
  const material = new THREE.MeshBasicMaterial({
    color: FEVER_RING.color,
    transparent: true,
    opacity: FEVER_RING.opacity,
    depthWrite: false,
  });
  const ring = new THREE.Mesh(geometry, material);
  ring.position.y = FEVER_RING_HEIGHT;
  ring.visible = false;
  return ring;
}
