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
import { CameraShake } from './CameraShake';
import { Enemy, type EnemyLook } from './Enemy';
import { LabelLayer } from './LabelLayer';
import { planFor, type Phase, type PhaseKind } from './LevelPlan';
import { createMechanics } from './mechanics';
import type { AnnounceStyle, MechanicContext } from './mechanics/Mechanic';
import { MechanicGroup } from './mechanics/MechanicGroup';
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
const SHIELD_IMPACT = 0.5;
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
  onAnnounce(text: string, style: AnnounceStyle, accent?: string): void;
  onFinished(result: GameResult): void;
}

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
  private readonly mechanics = new MechanicGroup();
  private readonly shake = new CameraShake();
  private phaseIndex = 0;
  private spawned = 0;
  private boss: Boss | undefined;
  private target: Enemy | undefined;
  private lives = INITIAL_LIVES;
  private shields = 0;
  private timeScale = 1;
  private lettersFreed = 0;
  private elapsed = 0;
  private sinceSpawn = Number.POSITIVE_INFINITY;
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
    this.scene.add(this.player.object);
    this.placeCameraForIntro();
    renderHost.attach(container, this.scene, this.camera);
    this.labels = new LabelLayer(container);
    this.mechanics.register(createMechanics(this.createMechanicContext()));
  }

  start(): void {
    this.running = true;
    window.addEventListener('keydown', this.onKeyDown);
    this.events.onStats(this.stats, this.lives);
    this.reportProgress();
    this.mechanics.onPhaseChange(this.phase);
    this.loop();
  }

  destroy(): void {
    this.running = false;
    cancelAnimationFrame(this.frame);
    window.removeEventListener('keydown', this.onKeyDown);
    this.mechanics.dispose();
    this.releaseEnemies();
    this.world.dispose();
    this.particles.dispose();
    this.player.dispose();
    this.scene.clear();
    renderHost.detach();
    this.labels.remove();
  }

  private get phase(): Phase {
    return this.phases[Math.min(this.phaseIndex, this.phases.length - 1)];
  }

  private get inIntro(): boolean {
    return this.elapsed < CAMERA_INTRO_DURATION;
  }

  private get isPlaying(): boolean {
    return !this.inIntro && !this.finished;
  }

  private createMechanicContext(): MechanicContext {
    const phase = (): Phase => this.phase;
    const playing = (): boolean => this.isPlaying;
    const shields = (): number => this.shields;
    return {
      enemies: this.enemies,
      player: this.player,
      scene: this.scene,
      particles: this.particles,
      stats: this.stats,
      theme: this.config.theme,
      sfx,
      words: this.words,
      level: this.config.level,
      language: this.config.language,
      get phase() {
        return phase();
      },
      get playing() {
        return playing();
      },
      get shields() {
        return shields();
      },
      createLabel: () => this.labels.createLabel(),
      addEnemy: (enemy, radius) => this.addEnemy(enemy, radius),
      removeEnemy: (enemy) => this.clearEnemy(enemy),
      spawnWord: (word) => this.spawnWord(word),
      setTimeScale: (scale) => this.setTimeScale(scale),
      shakeCamera: (strength, seconds) => this.shake.start(strength, seconds),
      announce: (text, style, accent) => this.events.onAnnounce(text, style, accent),
      loseLife: () => this.loseLife(),
      absorbNextHit: () => this.addShield(),
    };
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
    this.mechanics.update(delta, this.elapsed);
    this.updateCamera(delta);
    if (this.finished) return;
    const worldDelta = delta * this.timeScale;
    if (!this.inIntro) this.spawnIfDue(worldDelta);
    this.updateEnemies(worldDelta);
    this.stats.addActiveTime(delta);
    if (this.target) this.player.lookAt(this.target.object.position);
    this.events.onNextKey(this.nextExpectedChar());
  }

  private updateEnemies(delta: number): void {
    for (const enemy of [...this.enemies]) {
      if (this.finished) return;
      if (!this.enemies.includes(enemy)) continue;
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
    this.shake.apply(this.camera.position, delta);
    this.camera.lookAt(this.cameraTarget);
  }

  private spawnIfDue(delta: number): void {
    if (this.phase.kind === 'boss') return this.spawnBossOnce();
    this.sinceSpawn += delta;
    if (!this.isSpawnDue()) return;
    this.sinceSpawn = 0;
    this.spawned += 1;
    this.spawnWord(this.phase.kind === 'warmup' ? this.words.singleLetter() : this.words.next());
  }

  private isSpawnDue(): boolean {
    return (
      this.spawned < this.phase.count &&
      this.sinceSpawn >= this.phase.spawnInterval &&
      this.enemies.length < MAX_ENEMIES
    );
  }

  private spawnWord(word = this.words.next()): Enemy {
    const enemy = new Enemy(word, this.labels.createLabel(), this.phase.speed, this.look());
    this.addEnemy(enemy, SPAWN_RADIUS);
    return enemy;
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

  private addEnemy(enemy: Enemy, radius?: number): void {
    if (radius !== undefined) placeOnSpawnArc(enemy, radius);
    this.scene.add(enemy.object);
    this.enemies.push(enemy);
    this.mechanics.onSpawn(enemy);
  }

  private enemyReached(enemy: Enemy): void {
    this.mechanics.onEnemyReached(enemy);
    if (!this.enemies.includes(enemy)) return;
    if (this.phase.kind === 'warmup') return this.clearEnemy(enemy);
    if (enemy instanceof Boss) enemy.reset();
    else this.clearEnemy(enemy);
    this.loseLife();
  }

  private loseLife(): void {
    if (this.finished || this.absorbHit()) return;
    this.lives -= 1;
    this.shake.start(SHAKE_AMPLITUDE, SHAKE_DURATION);
    this.player.hurt();
    this.recordMistake();
    sfx.lifeLost();
    this.events.onStats(this.stats, this.lives);
    if (this.lives <= 0) this.finish(false);
  }

  private addShield(): void {
    this.shields += 1;
  }

  private absorbHit(): boolean {
    if (this.shields <= 0) return false;
    this.shields -= 1;
    sfx.impact(SHIELD_IMPACT);
    return true;
  }

  private setTimeScale(scale: number): void {
    this.timeScale = Math.max(0, scale);
  }

  private clearEnemy(enemy: Enemy): void {
    if (!this.remove(enemy)) return;
    this.reportProgress();
    if (this.isPhaseCleared()) this.advancePhase();
  }

  private isPhaseCleared(): boolean {
    return (
      this.phase.kind !== 'boss' && this.spawned >= this.phase.count && this.enemies.length === 0
    );
  }

  private advancePhase(): void {
    this.phaseIndex += 1;
    this.spawned = 0;
    this.sinceSpawn = Number.POSITIVE_INFINITY;
    if (this.phaseIndex >= this.phases.length) return this.finish(true);
    this.reportProgress();
    this.mechanics.onPhaseChange(this.phase);
  }

  private reportProgress(): void {
    const total = this.phase.count;
    const done = this.boss
      ? total - Math.round(this.boss.health * total)
      : THREE.MathUtils.clamp(this.spawned - this.enemies.length, 0, total);
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
    const target = this.target;
    target.advance();
    this.stats.recordHit();
    sfx.hit(this.stats.combo);
    this.mechanics.onHit();
    if (target.isComplete) this.completeWord(target);
    this.events.onStats(this.stats, this.lives);
  }

  private acquireTarget(char: string): void {
    this.target = nearestEnemy(this.enemies, (enemy) => enemy.expectedChar === char);
    this.target?.setTargeted(true);
  }

  private mistake(): void {
    this.recordMistake();
    this.target?.flashMistake();
    sfx.mistake();
    this.events.onStats(this.stats, this.lives);
  }

  private completeWord(enemy: Enemy): void {
    this.stats.recordWord(enemy.word);
    this.lettersFreed += enemy.word.length;
    this.player.jump();
    this.particles.burst(enemy.burstPosition, enemy.color);
    this.mechanics.onWordComplete(enemy);
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

  private recordMistake(): void {
    this.stats.recordMistake();
    this.mechanics.onMistake();
  }

  private remove(enemy: Enemy): boolean {
    const index = this.enemies.indexOf(enemy);
    if (index < 0) return false;
    if (this.target === enemy) this.target = undefined;
    this.scene.remove(enemy.object);
    enemy.dispose();
    this.enemies.splice(index, 1);
    return true;
  }

  private nextExpectedChar(): string | undefined {
    return (this.target ?? nearestEnemy(this.enemies))?.expectedChar;
  }
}

function placeOnSpawnArc(enemy: Enemy, radius: number): void {
  const angle = Math.PI - SPAWN_ARC_MARGIN + Math.random() * (Math.PI + SPAWN_ARC_MARGIN * 2);
  enemy.object.position.set(Math.cos(angle) * radius, 0, Math.sin(angle) * radius);
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
