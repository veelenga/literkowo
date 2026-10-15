import * as THREE from 'three';
import { sfx } from '../audio/Sfx';
import { practiceDay, type KeyStats } from '../course/keyStats';
import { keyWeight } from '../course/mastery';
import { allowedKeysFor, type Level } from '../course/regions';
import { hatSpec } from '../course/shop';
import { WordSource } from '../course/WordSource';
import type { Equipped, WordLanguage } from '../profiles/Profile';
import { xpPop } from '../ui/progression';
import {
  BOSS_SPAWN_RADIUS,
  CAMERA_FOV,
  CAMERA_POSITION,
  CAMERA_TARGET,
  MAX_ENEMIES,
  NO_INSETS,
  REACH_DISTANCE,
  SPAWN_RADIUS,
  frameBoard,
  type StageInsets,
} from './board';
import { Boss } from './Boss';
import { CameraShake } from './CameraShake';
import { Enemy, type EnemyLook } from './Enemy';
import type { Tally } from '../course/counters';
import { KeyTracker, type KeyReport } from './KeyTracker';
import { LabelLayer } from './LabelLayer';
import { createMechanics } from './mechanics';
import type { AnnounceStyle, MechanicContext } from './mechanics/Mechanic';
import { MechanicGroup } from './mechanics/MechanicGroup';
import { Particles } from './Particles';
import { Player } from './Player';
import { currentQuality } from './quality';
import { renderHost, type Viewport } from './RenderHost';
import type { Phase, PhaseKind, RunPhase, RunPlan } from './RunPlan';
import { RunRewards, type RewardBoost, type Rewards } from './RunRewards';
import { RunTally } from './RunTally';
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
const FIRST_PHASE = 0;
const SHAKE_DURATION = 0.25;
const SHAKE_AMPLITUDE = 0.18;
const SHIELD_IMPACT = 0.5;
const FINISH_DELAY_MS = 1100;
const NO_CALM = 0;

export interface GameConfig {
  character: string;
  plan: RunPlan;
  level: Level;
  language: WordLanguage;
  theme: Theme;
  keyStats: KeyStats;
  equipped: Readonly<Equipped>;
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
  phasesCleared: number;
  tally: Tally;
}

export interface Progress {
  kind: PhaseKind;
  done: number;
  total: number;
  wave?: number;
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
  private readonly rewards: RunRewards;
  private readonly tally = new RunTally();
  private readonly keys: KeyTracker;
  private readonly labels: LabelLayer;
  private readonly enemies: Enemy[] = [];
  private readonly mechanics = new MechanicGroup();
  private readonly spawnGroups = new SpawnGroups<Enemy>();
  private readonly shake = new CameraShake();
  private readonly targeting = new Targeting<Enemy>((enemy, isCandidate) =>
    enemy.setTargeted(isCandidate),
  );
  private insets: StageInsets = NO_INSETS;
  private phase: RunPhase;
  private phaseIndex = FIRST_PHASE;
  private spawned = 0;
  private calm: number;
  private boss: Boss | undefined;
  private lives: number;
  private shields = 0;
  private guards = 0;
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
    this.player.setHat(hatSpec(config.equipped.hat));
    this.keys = new KeyTracker(
      config.keyStats,
      allowedKeysFor(config.level, config.language),
      practiceDay(new Date()),
    );
    this.phase = firstPhase(config.plan);
    this.calm = this.phase.calmSeconds ?? NO_CALM;
    this.lives = config.plan.lives;
    this.rewards = new RunRewards(config.plan);
    this.words = new WordSource(config.language, this.phase.words, {
      weightOf: (key) => keyWeight(key, this.keys.statOf(key)),
    });
    const quality = currentQuality();
    this.world = new World(this.scene, config.theme, quality);
    this.scene.add(this.player.object);
    this.placeCameraForIntro();
    renderHost.attach(container, this.scene, this.camera, quality, (viewport) =>
      this.fitCamera(viewport),
    );
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

  setInsets(insets: StageInsets): void {
    this.insets = insets;
    this.fitCamera(renderHost.viewport);
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
    const guards = (): number => this.guards;
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
      allMechanicsUnlocked: this.config.plan.allMechanicsUnlocked,
      language: this.config.language,
      equipped: this.config.equipped,
      get phase() {
        return phase();
      },
      get playing() {
        return playing();
      },
      get shields() {
        return shields();
      },
      get guards() {
        return guards();
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
      guardNextHit: () => this.addGuard(),
      restoreLife: () => this.restoreLife(),
      addCoins: (amount) => this.addCoins(amount),
      boostRewards: (boost) => this.boostRewards(boost),
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
    this.labels.position(this.enemies, this.camera, renderHost.viewport, this.insets);
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
  }

  private fitCamera({ width, height }: Viewport): void {
    if (width <= 0 || height <= 0) return;
    const framing = frameBoard({ width, height, ...this.insets });
    this.camera.fov = framing.fov;
    this.camera.setViewOffset(width, framing.fullHeight, 0, framing.offsetY, width, height);
  }

  private spawnIfDue(delta: number): void {
    if (this.restsInCalm(delta)) return;
    if (this.phase.kind === 'boss') return this.spawnBossOnce();
    this.sinceSpawn += delta;
    if (!this.isSpawnDue()) return;
    this.sinceSpawn = 0;
    const word = this.nextSpawnWord();
    this.spawned += 1;
    this.spawnGroups.spawn(() => this.spawnWord(word));
  }

  private restsInCalm(delta: number): boolean {
    if (this.calm <= 0) return false;
    this.calm -= delta;
    return true;
  }

  private isSpawnDue(): boolean {
    return (
      this.spawned < this.phase.count &&
      this.sinceSpawn >= this.phase.spawnInterval &&
      this.enemies.length < MAX_ENEMIES
    );
  }

  private nextSpawnWord(): string {
    const taken = this.liveStarts();
    if (this.phase.kind === 'warmup') return this.words.singleLetter(taken);
    if (this.phase.kind === 'learn') {
      return this.words.learnWord(this.spawned / this.phase.count, taken);
    }
    return this.words.next(taken);
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
    if (this.finished || this.guardHit() || this.absorbHit()) return;
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

  private addGuard(): void {
    this.guards += 1;
  }

  private guardHit(): boolean {
    if (this.guards <= 0) return false;
    this.guards -= 1;
    sfx.impact(SHIELD_IMPACT);
    this.recordMistake();
    this.events.onStats(this.stats, this.lives);
    return true;
  }

  private restoreLife(): boolean {
    if (this.finished || this.lives >= this.config.plan.lives) return false;
    this.lives += 1;
    this.events.onStats(this.stats, this.lives);
    return true;
  }

  private addCoins(amount: number): void {
    this.rewards.addCoins(amount);
    this.events.onRewards(this.rewards);
  }

  private boostRewards(boost: RewardBoost): void {
    this.rewards.boost(boost);
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
    const next = this.config.plan.phaseAt(this.phaseIndex);
    if (!next) return this.finish(true);
    this.phase = next;
    this.calm = next.calmSeconds ?? NO_CALM;
    this.words.use(next.words);
    this.reportProgress();
    this.mechanics.onPhaseChange(next);
  }

  private reportProgress(): void {
    const total = this.phase.count;
    const done = this.boss
      ? total - Math.round(this.boss.health * total)
      : THREE.MathUtils.clamp(this.spawned - this.spawnGroups.pending, 0, total);
    this.events.onProgress({ kind: this.phase.kind, done, total, wave: this.phase.wave });
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
      phasesCleared: this.phaseIndex,
      tally: this.tally.snapshot(),
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
    this.keys.miss(char, this.nextExpectedChar());
    this.recordMistake();
    this.targeting.candidates.forEach((enemy) => enemy.flashMistake());
    sfx.mistake();
    this.events.onStats(this.stats, this.lives);
  }

  private completeWord(enemy: Enemy): void {
    this.stats.recordWord(enemy.word);
    this.tally.recordWord(enemy.tags);
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
    this.tally.recordBossBeaten();
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

function firstPhase(plan: RunPlan): RunPhase {
  const phase = plan.phaseAt(FIRST_PHASE);
  if (!phase) throw new Error('A run plan needs at least one phase');
  return phase;
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
