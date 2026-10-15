import * as THREE from 'three';
import { sfx } from '../audio/Sfx';
import { practiceDay, type KeyStats } from '../course/keyStats';
import { keyWeight } from '../course/mastery';
import { allowedKeysFor, type Level } from '../course/regions';
import { WordSource } from '../course/WordSource';
import type { WordLanguage } from '../profiles/Profile';
import { xpPop } from '../ui/progression';
import {
  BOSS_SPAWN_RADIUS,
  CAMERA_FOV,
  CAMERA_POSITION,
  CAMERA_TARGET,
  REACH_DISTANCE,
  SPAWN_RADIUS,
  cameraFovFor,
} from './arena';
import { Boss } from './Boss';
import { CameraShake } from './CameraShake';
import { Enemy, type EnemyLook } from './Enemy';
import { KeyTracker, type KeyReport } from './KeyTracker';
import { LabelLayer } from './LabelLayer';
import { planFor, type Phase, type PhaseKind } from './LevelPlan';
import { createMechanics } from './mechanics';
import type { AnnounceStyle, MechanicContext } from './mechanics/Mechanic';
import { MechanicGroup } from './mechanics/MechanicGroup';
import { Particles } from './Particles';
import { Player } from './Player';
import { currentQuality } from './quality';
import { renderHost } from './RenderHost';
import { RunRewards, type Rewards } from './RunRewards';
import { SessionStats } from './SessionStats';
import { SpawnGroups } from './SpawnGroups';
import { Targeting } from './Targeting';
import type { Theme } from './themes';
import { World } from './World';

export { themeFor } from './themes';

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
  keyStats: KeyStats;
}

export interface GameResult {
  won: boolean;
  score: number;
  accuracy: number;
  wpm: number;
  lettersFreed: number;
  xp: number;
  coins: number;
  keys: KeyReport;
}

export interface Progress {
  kind: PhaseKind;
  done: number;
  total: number;
}

export interface GameEvents {
  onStats(stats: SessionStats, lives: number): void;
  onRewards(rewards: Rewards): void;
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
  private readonly timer = new THREE.Timer();
  private readonly player: Player;
  private readonly particles = new Particles(this.scene);
  private readonly world: World;
  private readonly words: WordSource;
  private readonly stats = new SessionStats();
  private readonly rewards = new RunRewards();
  private readonly keys: KeyTracker;
  private readonly labels: LabelLayer;
  private readonly phases: Phase[];
  private readonly enemies: Enemy[] = [];
  private readonly mechanics = new MechanicGroup();
  private readonly spawnGroups = new SpawnGroups<Enemy>();
  private readonly shake = new CameraShake();
  private readonly targeting = new Targeting<Enemy>((enemy, isCandidate) =>
    enemy.setTargeted(isCandidate),
  );
  private phaseIndex = 0;
  private spawned = 0;
  private boss: Boss | undefined;
  private lives = INITIAL_LIVES;
  private shields = 0;
  private timeScale = 1;
  private lettersFreed = 0;
  private elapsed = 0;
  private sinceSpawn = Number.POSITIVE_INFINITY;
  private paused = false;
  private suspended = false;
  private finished = false;
  private running = false;
  private frame = 0;

  constructor(
    container: HTMLElement,
    private readonly config: GameConfig,
    private readonly events: GameEvents,
  ) {
    this.player = new Player(config.character);
    this.keys = new KeyTracker(
      config.keyStats,
      allowedKeysFor(config.level, config.language),
      practiceDay(new Date()),
    );
    this.words = new WordSource(config.level, config.language, {
      weightOf: (key) => keyWeight(key, this.keys.statOf(key)),
    });
    this.phases = planFor(config.level);
    const quality = currentQuality();
    this.world = new World(this.scene, config.theme, quality);
    this.scene.add(this.player.object);
    this.placeCameraForIntro();
    renderHost.attach(container, this.scene, this.camera, quality);
    this.labels = new LabelLayer(container);
    this.mechanics.register(createMechanics(this.createMechanicContext()));
  }

  start(): void {
    this.running = true;
    window.addEventListener('keydown', this.onKeyDown);
    this.events.onStats(this.stats, this.lives);
    this.reportProgress();
    this.mechanics.onPhaseChange(this.phase);
    this.timer.reset();
    this.syncFrames();
  }

  suspend(): void {
    this.suspended = true;
    if (!this.paused && !this.finished) this.togglePause();
    this.syncFrames();
  }

  wake(): void {
    this.suspended = false;
    this.syncFrames();
  }

  get keyStats(): KeyStats {
    return this.keys.stats;
  }

  typeCharacter(char: string): void {
    if (this.acceptsTyping) this.handleChar(char.toLowerCase());
  }

  togglePause(): void {
    if (this.finished) return;
    this.paused = !this.paused;
    this.timer.reset();
    this.syncFrames();
    this.events.onPause(this.paused);
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

  private get focus(): Enemy | undefined {
    return nearestEnemy(this.targeting.candidates);
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
      addCoins: (amount) => this.addCoins(amount),
    };
  }

  private placeCameraForIntro(): void {
    this.camera.position.copy(CAMERA_POSITION).multiplyScalar(CAMERA_INTRO_SCALE);
    this.camera.lookAt(this.cameraTarget);
  }

  private releaseEnemies(): void {
    this.enemies.forEach((enemy) => enemy.dispose());
    this.enemies.length = 0;
    this.boss = undefined;
  }

  private get isAnimating(): boolean {
    return this.running && !this.paused && !this.suspended;
  }

  private syncFrames(): void {
    if (!this.isAnimating) return this.stopFrames();
    if (this.frame) return;
    this.timer.reset();
    this.frame = requestAnimationFrame(this.loop);
  }

  private stopFrames(): void {
    cancelAnimationFrame(this.frame);
    this.frame = 0;
  }

  private readonly loop = (): void => {
    if (!this.running) return;
    this.frame = requestAnimationFrame(this.loop);
    this.timer.update();
    const delta = Math.min(this.timer.getDelta(), MAX_FRAME_DELTA);
    this.tick(delta);
    this.labels.position(this.enemies, this.camera, renderHost.viewport);
    renderHost.render();
    if (this.isPlaying) renderHost.recordFrame(delta);
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
    const focus = this.focus;
    if (focus) this.player.lookAt(focus.object.position);
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
    this.frameArena();
  }

  private frameArena(): void {
    const fov = cameraFovFor(this.camera.aspect);
    if (fov === this.camera.fov) return;
    this.camera.fov = fov;
    this.camera.updateProjectionMatrix();
  }

  private spawnIfDue(delta: number): void {
    if (this.phase.kind === 'boss') return this.spawnBossOnce();
    this.sinceSpawn += delta;
    if (!this.isSpawnDue()) return;
    this.sinceSpawn = 0;
    this.spawned += 1;
    const word = this.phase.kind === 'warmup' ? this.nextLetter() : this.nextWord();
    this.spawnGroups.spawn(() => this.spawnWord(word));
  }

  private isSpawnDue(): boolean {
    return (
      this.spawned < this.phase.count &&
      this.sinceSpawn >= this.phase.spawnInterval &&
      this.enemies.length < MAX_ENEMIES
    );
  }

  private nextLetter(): string {
    return this.words.singleLetter(this.liveStarts());
  }

  private nextWord(): string {
    return this.words.next(this.liveStarts());
  }

  private liveStarts(): Set<string> {
    return new Set(this.enemies.map((enemy) => enemy.expectedChar));
  }

  private spawnWord(word = this.nextWord()): Enemy {
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
    this.spawnGroups.join(enemy);
    this.mechanics.onSpawn(enemy);
  }

  private enemyReached(enemy: Enemy): void {
    this.mechanics.onEnemyReached(enemy);
    if (!this.enemies.includes(enemy)) return;
    if (this.phase.kind === 'warmup') return this.clearEnemy(enemy);
    if (enemy instanceof Boss) this.resetBoss(enemy);
    else this.clearEnemy(enemy);
    this.loseLife();
  }

  private resetBoss(boss: Boss): void {
    this.targeting.forget(boss);
    boss.reset();
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

  private addCoins(amount: number): void {
    this.rewards.addCoins(amount);
    this.events.onRewards(this.rewards);
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
      : THREE.MathUtils.clamp(this.spawned - this.spawnGroups.pending, 0, total);
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
      xp: this.rewards.xp,
      coins: this.rewards.coins,
      keys: this.keys.report(),
    });
  }

  private readonly onKeyDown = (event: KeyboardEvent): void => {
    if (event.key === 'Escape') return this.togglePause();
    if (!this.acceptsTyping || isShortcut(event) || event.key.length !== 1) return;
    event.preventDefault();
    this.typeCharacter(event.key);
  };

  private get acceptsTyping(): boolean {
    return !this.finished && !this.paused && !this.inIntro;
  }

  private handleChar(char: string): void {
    const keystroke = this.targeting.type(char, nearestFirst(this.enemies));
    if (keystroke.kind === 'miss') return this.mistake(char);
    this.keys.hit(char, performance.now());
    this.stats.recordHit();
    sfx.hit(this.stats.combo);
    this.mechanics.onHit();
    if (keystroke.kind === 'complete') keystroke.items.forEach((enemy) => this.completeWord(enemy));
    this.events.onStats(this.stats, this.lives);
  }

  private mistake(char: string): void {
    this.keys.miss(this.focus?.expectedChar ?? char);
    this.recordMistake();
    this.targeting.candidates.forEach((enemy) => enemy.flashMistake());
    sfx.mistake();
    this.events.onStats(this.stats, this.lives);
  }

  private completeWord(enemy: Enemy): void {
    this.stats.recordWord(enemy.word);
    this.rewardWord(enemy);
    this.lettersFreed += enemy.word.length;
    this.player.jump();
    this.particles.burst(enemy.burstPosition, enemy.color);
    this.mechanics.onWordComplete(enemy);
    if (enemy instanceof Boss) return this.hitBoss(enemy);
    sfx.word();
    this.clearEnemy(enemy);
  }

  private rewardWord(enemy: Enemy): void {
    const xp = this.rewards.recordWord({
      letters: enemy.word.length,
      tags: enemy.tags,
      bossHit: enemy instanceof Boss,
      fever: this.stats.fever,
      multiplier: this.stats.multiplier,
    });
    this.labels.float(enemy.label, xpPop(xp));
    this.events.onRewards(this.rewards);
  }

  private hitBoss(boss: Boss): void {
    sfx.bossHit();
    boss.takeHit();
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
    this.targeting.forget(enemy);
    this.scene.remove(enemy.object);
    enemy.dispose();
    this.enemies.splice(index, 1);
    this.spawnGroups.leave(enemy);
    return true;
  }

  private nextExpectedChar(): string | undefined {
    return (this.focus ?? nearestEnemy(this.enemies))?.expectedChar;
  }
}

function placeOnSpawnArc(enemy: Enemy, radius: number): void {
  const angle = Math.PI - SPAWN_ARC_MARGIN + Math.random() * (Math.PI + SPAWN_ARC_MARGIN * 2);
  enemy.object.position.set(Math.cos(angle) * radius, 0, Math.sin(angle) * radius);
}

function nearestFirst(enemies: readonly Enemy[]): Enemy[] {
  return [...enemies].sort((first, second) => first.distanceToCenter - second.distanceToCenter);
}

function nearestEnemy(enemies: readonly Enemy[]): Enemy | undefined {
  return nearestFirst(enemies).at(0);
}

function isShortcut(event: KeyboardEvent): boolean {
  const altGraph = event.getModifierState('AltGraph') || (event.ctrlKey && event.altKey);
  return event.metaKey || (event.ctrlKey && !altGraph);
}
