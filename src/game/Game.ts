import * as THREE from 'three';
import { sfx } from '../audio/Sfx';
import { practiceDay, type KeyStats } from '../course/keyStats';
import { keyWeight } from '../course/mastery';
import type { Level } from '../course/catalog';
import { allowedKeysFor } from '../course/course';
import { hatSpec } from '../course/shop';
import { EVEN_WEIGHTS, WordSource, type KeyWeights } from '../course/WordSource';
import type { Equipped, WordLanguage } from '../profiles/Profile';
import { seededRandom, systemRandom, type RandomSource } from '../random';
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
import { BOSS_SCALE, Boss, MINI_BOSS_SCALE } from './Boss';
import { CameraShake } from './CameraShake';
import { PageClasses } from './claims/PageClasses';
import { TimeScale } from './claims/TimeScale';
import { Enemy, type EnemyLook } from './Enemy';
import { HeroHealth, type HitOutcome } from './HeroHealth';
import type { Tally } from '../course/counters';
import { KeyTracker, type KeyReport } from './KeyTracker';
import { LabelLayer } from './LabelLayer';
import { createMechanics } from './mechanics';
import type { AnnounceStyle, MechanicContext } from './mechanics/Mechanic';
import { MechanicGroup } from './mechanics/MechanicGroup';
import { Particles } from './Particles';
import { PhaseMeter, type PhaseRecord } from './PhaseMeter';
import { Player } from './Player';
import { currentQuality } from './quality';
import { renderHost, type Viewport } from './RenderHost';
import {
  tempoAt,
  type Phase,
  type PhaseKind,
  type RunPhase,
  type RunPlan,
  type StageMark,
} from './RunPlan';
import type { RewardBoost } from '../course/powers';
import { RunRewards, type Rewards } from './RunRewards';
import { RunTally } from './RunTally';
import { SessionStats } from './SessionStats';
import { SpawnGroups } from './SpawnGroups';
import { SpawnScript, spawnAngle } from './SpawnScript';
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
const MAX_FRAME_DELTA = 0.1;
const FIRST_PHASE = 0;
const SHAKE_DURATION = 0.25;
const SHAKE_AMPLITUDE = 0.18;
const SHIELD_IMPACT = 0.5;
const FINISH_DELAY_MS = 1100;
const NO_CALM = 0;
const PROGRESS_STEPS_PER_SECOND = 10;
const WORDS_STREAM = 'words';
const PLACEMENT_STREAM = 'placement';

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
  coinBoost: number;
  keys: KeyReport;
  phasesCleared: number;
  phases: readonly PhaseRecord[];
  tally: Tally;
  seconds: number;
}

export interface Progress {
  kind: PhaseKind;
  done: number;
  total: number;
  timed: boolean;
  wave?: number;
  stage?: StageMark;
}

interface ProgressClock {
  readonly limit: number;
  readonly spent: number;
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
  private readonly random: RandomSource;
  private readonly placement: RandomSource;
  private readonly words: WordSource;
  private readonly script: SpawnScript;
  private readonly stats = new SessionStats();
  private readonly rewards: RunRewards;
  private readonly tally = new RunTally();
  private readonly meter = new PhaseMeter();
  private readonly records: PhaseRecord[] = [];
  private readonly keys: KeyTracker;
  private readonly labels: LabelLayer;
  private readonly enemies: Enemy[] = [];
  private readonly mechanics = new MechanicGroup();
  private readonly timeScale = new TimeScale();
  private readonly pageClasses = new PageClasses(document.body.classList);
  private readonly spawnGroups = new SpawnGroups<Enemy>();
  private readonly shake = new CameraShake();
  private readonly targeting = new Targeting<Enemy>((enemy, isCandidate) =>
    enemy.setTargeted(isCandidate),
  );
  private insets: StageInsets = NO_INSETS;
  private plannedPhase: RunPhase;
  private phase: RunPhase;
  private phaseIndex = FIRST_PHASE;
  private spawned = 0;
  private scriptSpawn: number | undefined;
  private phaseSeconds = 0;
  private runSeconds = 0;
  private calm: number;
  private boss: Boss | undefined;
  private readonly health: HeroHealth;
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
    this.random = runRandom(config.plan.seed);
    this.placement = this.random.stream(PLACEMENT_STREAM);
    this.player = new Player(config.character);
    this.player.setHat(hatSpec(config.equipped.hat));
    this.keys = new KeyTracker(
      config.keyStats,
      allowedKeysFor(config.level, config.language),
      practiceDay(new Date()),
    );
    this.plannedPhase = firstPhase(config.plan);
    this.phase = this.plannedPhase;
    this.calm = this.phase.calmSeconds ?? NO_CALM;
    this.health = new HeroHealth(config.plan);
    this.rewards = new RunRewards(config.plan);
    const seeded = config.plan.seed !== undefined;
    const weights = seeded ? EVEN_WEIGHTS : this.adaptiveWeights();
    const { language } = config;
    this.words = new WordSource(
      language,
      this.phase.words,
      weights,
      this.random.stream(WORDS_STREAM),
    );
    this.script = new SpawnScript(
      { language, random: this.random, weights, seeded },
      this.phase.words,
    );
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
    this.reportStats();
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

  pause(): void {
    if (!this.paused) this.togglePause();
  }

  endRun(): void {
    if (this.finished) return;
    if (this.paused) this.togglePause();
    this.conclude(false);
  }

  destroy(): void {
    this.running = false;
    cancelAnimationFrame(this.frame);
    window.removeEventListener('keydown', this.onKeyDown);
    this.mechanics.dispose();
    this.pageClasses.releaseAll();
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
    const health = this.health;
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
      random: this.random,
      get phase() {
        return phase();
      },
      get playing() {
        return playing();
      },
      get shields() {
        return health.shields;
      },
      get guards() {
        return health.guards;
      },
      createLabel: () => this.labels.createLabel(),
      addEnemy: (enemy, radius) => this.addEnemy(enemy, radius),
      removeEnemy: (enemy) => this.clearEnemy(enemy),
      spawnWord: (word) => this.spawnWord(word),
      claimTimeScale: (scale) => this.timeScale.claim(scale),
      claimPageClass: (name) => this.pageClasses.claim(name),
      shakeCamera: (strength, seconds) => this.shake.start(strength, seconds),
      announce: (text, style, accent) => this.events.onAnnounce(text, style, accent),
      loseLife: () => this.hitHero(),
      absorbNextHit: () => this.health.addShield(),
      guardNextHit: () => this.health.addGuard(),
      restoreLife: () => this.restoreLife(),
      addCoins: (amount) => this.addCoins(amount),
      boostRewards: (boost) => this.boostRewards(boost),
    };
  }

  private adaptiveWeights(): KeyWeights {
    return { weightOf: (key) => keyWeight(key, this.keys.statOf(key)) };
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
    const worldDelta = delta * this.timeScale.value;
    if (!this.inIntro) this.spawnIfDue(worldDelta);
    if (!this.inIntro) this.countPhaseTime(delta);
    if (!this.inIntro) this.countRunTime(delta);
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
    const word = this.script.word(this.phase, this.spawned, this.liveStarts());
    const angle = this.script.angle();
    this.spawned += 1;
    this.spawnScripted(() => this.spawnGroups.spawn(() => this.spawnWord(word, angle)));
    this.retime();
  }

  private spawnScripted(spawn: () => void): void {
    this.scriptSpawn = this.script.nextIndex();
    spawn();
    this.scriptSpawn = undefined;
  }

  private retime(): void {
    this.phase = { ...this.plannedPhase, ...tempoAt(this.plannedPhase, this.spawned) };
  }

  private countPhaseTime(delta: number): void {
    const limit = this.phase.seconds;
    if (limit === undefined) return;
    const step = progressStep(this.phaseSeconds);
    this.phaseSeconds += delta;
    if (this.phaseSeconds >= limit) return this.advancePhase();
    if (!this.isTimedRun && progressStep(this.phaseSeconds) !== step) this.reportProgress();
  }

  private countRunTime(delta: number): void {
    if (this.finished) return;
    const step = progressStep(this.runSeconds);
    this.runSeconds += delta;
    const limit = this.config.plan.seconds;
    if (limit === undefined) return;
    if (this.runSeconds >= limit) return this.finish(true);
    if (progressStep(this.runSeconds) !== step) this.reportProgress();
  }

  private get isTimedRun(): boolean {
    return this.config.plan.seconds !== undefined;
  }

  private progressClock(): ProgressClock | undefined {
    const runLimit = this.config.plan.seconds;
    if (runLimit !== undefined) return { limit: runLimit, spent: this.runSeconds };
    const phaseLimit = this.phase.seconds;
    if (phaseLimit === undefined) return undefined;
    return { limit: phaseLimit, spent: this.phaseSeconds };
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
      this.enemies.length < Math.min(MAX_ENEMIES, this.phase.boardSize ?? MAX_ENEMIES)
    );
  }

  private refillBoard(): void {
    if (this.phase.boardSize === undefined) return;
    this.sinceSpawn = Math.max(this.sinceSpawn, this.phase.spawnInterval);
  }

  private nextWord(): string {
    return this.words.next(this.liveStarts());
  }

  private liveStarts(): Set<string> {
    return new Set(this.enemies.map((enemy) => enemy.expectedChar));
  }

  private spawnWord(word = this.nextWord(), angle?: number): Enemy {
    const enemy = new Enemy(word, this.labels.createLabel(), this.phase.speed, this.look());
    this.addEnemy(enemy, SPAWN_RADIUS, angle);
    return enemy;
  }

  private spawnBossOnce(): void {
    if (this.boss) return;
    const isMini = this.phase.miniBoss === true;
    const boss = new Boss(
      this.labels.createLabel(),
      this.phase.speed,
      this.look(),
      isMini ? () => this.words.next() : () => this.words.bossWord(),
      this.phase.count,
      isMini ? MINI_BOSS_SCALE : BOSS_SCALE,
    );
    this.boss = boss;
    this.spawnScripted(() => this.addEnemy(boss, BOSS_SPAWN_RADIUS, this.script.angle()));
  }

  private look(): EnemyLook {
    return { shape: this.config.theme.enemyShape, colors: this.config.theme.enemyColors };
  }

  private addEnemy(enemy: Enemy, radius?: number, angle?: number): void {
    this.meter.wordReady(this.elapsed, this.enemies.length === 0);
    if (radius !== undefined) placeOnSpawnArc(enemy, radius, angle ?? spawnAngle(this.placement));
    if (this.scriptSpawn !== undefined) enemy.spawnIndex = this.scriptSpawn;
    this.scene.add(enemy.object);
    this.enemies.push(enemy);
    this.spawnGroups.join(enemy);
    this.mechanics.onSpawn(enemy);
  }

  private enemyReached(enemy: Enemy): void {
    this.mechanics.onEnemyReached(enemy);
    if (!this.enemies.includes(enemy)) return;
    if (this.phase.kind === 'warmup') return this.clearEnemy(enemy);
    this.meter.reach();
    if (enemy instanceof Boss) this.resetBoss(enemy);
    else this.clearEnemy(enemy);
    this.hitHero();
  }

  private hitHero(): void {
    if (this.finished) return;
    this.hitReactions[this.health.hit()]();
  }

  private readonly hitReactions: Readonly<Record<HitOutcome, () => void>> = {
    comboBroken: () => this.breakComboOnHit(),
    guarded: () => this.guardHit(),
    shielded: () => sfx.impact(SHIELD_IMPACT),
    lifeLost: () => this.loseLife(),
  };

  private hurtHero(): void {
    this.shake.start(SHAKE_AMPLITUDE, SHAKE_DURATION);
    this.player.hurt();
  }

  private breakComboOnHit(): void {
    this.hurtHero();
    this.stats.breakCombo();
    this.reportStats();
  }

  private resetBoss(boss: Boss): void {
    this.targeting.forget(boss);
    boss.reset();
  }

  private loseLife(): void {
    this.hurtHero();
    this.recordMistake();
    sfx.lifeLost();
    this.reportStats();
    if (this.health.isLost) this.finish(false);
  }

  private guardHit(): void {
    sfx.impact(SHIELD_IMPACT);
    this.recordMistake();
    this.reportStats();
  }

  private restoreLife(): boolean {
    if (this.finished || !this.health.restoreLife()) return false;
    this.reportStats();
    return true;
  }

  private reportStats(): void {
    this.events.onStats(this.stats, this.health.lives);
  }

  private addCoins(amount: number): void {
    this.rewards.addCoins(amount);
    this.events.onRewards(this.rewards);
  }

  private boostRewards(boost: RewardBoost): void {
    this.rewards.boost(boost);
    this.events.onRewards(this.rewards);
  }

  private clearEnemy(enemy: Enemy): void {
    if (!this.remove(enemy)) return;
    this.refillBoard();
    this.reportProgress();
    if (this.isPhaseCleared()) this.advancePhase();
  }

  private isPhaseCleared(): boolean {
    if (this.phase.kind === 'boss' || this.phase.seconds !== undefined) return false;
    return this.spawned >= this.phase.count && this.enemies.length === 0;
  }

  private advancePhase(): void {
    this.records.push(this.meter.close());
    this.phaseIndex += 1;
    this.spawned = 0;
    this.phaseSeconds = 0;
    this.sinceSpawn = Number.POSITIVE_INFINITY;
    const next = this.planGoesOn() ? this.config.plan.phaseAt(this.phaseIndex) : undefined;
    if (!next) return this.finish(true);
    this.plannedPhase = next;
    this.retime();
    this.calm = next.calmSeconds ?? NO_CALM;
    this.words.use(next.words);
    this.script.startPhase(this.phaseIndex, next.words);
    this.reportProgress();
    this.mechanics.onPhaseChange(next);
  }

  private planGoesOn(): boolean {
    return this.config.plan.continuesAfter?.(this.records) ?? true;
  }

  private reportProgress(): void {
    const { kind, wave, stage } = this.phase;
    const clock = this.progressClock();
    if (clock) {
      const done = Math.min(clock.limit, progressStep(clock.spent) / PROGRESS_STEPS_PER_SECOND);
      return this.events.onProgress({ kind, done, total: clock.limit, timed: true, wave, stage });
    }
    const total = this.phase.count;
    const done = this.boss
      ? total - Math.round(this.boss.health * total)
      : THREE.MathUtils.clamp(this.spawned - this.spawnGroups.pending, 0, total);
    this.events.onProgress({ kind, done, total, timed: false, wave, stage });
  }

  private finish(won: boolean): void {
    if (this.finished) return;
    if (won) sfx.levelComplete();
    else sfx.levelFailed();
    this.conclude(won);
  }

  private conclude(won: boolean): void {
    this.finished = true;
    this.stats.freeze();
    this.events.onNextKey(undefined);
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
      coinBoost: this.rewards.coinBoost,
      keys: this.keys.report(),
      phasesCleared: this.phaseIndex,
      phases: [...this.records],
      tally: this.tally.snapshot(),
      seconds: this.runSeconds,
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
    this.meter.hit(this.elapsed);
    this.stats.recordHit();
    sfx.hit(this.stats.combo);
    this.mechanics.onHit();
    if (keystroke.kind === 'complete') keystroke.items.forEach((enemy) => this.completeWord(enemy));
    this.reportStats();
  }

  private mistake(char: string): void {
    this.keys.miss(char, this.nextExpectedChar());
    this.meter.mistake();
    this.recordMistake();
    this.targeting.candidates.forEach((enemy) => enemy.flashMistake());
    sfx.mistake();
    this.reportStats();
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
    if (xp > 0) this.labels.float(enemy.label, xpPop(xp));
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

function runRandom(seed: number | undefined): RandomSource {
  return seed === undefined ? systemRandom() : seededRandom(seed);
}

function progressStep(seconds: number): number {
  return Math.floor(seconds * PROGRESS_STEPS_PER_SECOND);
}

function placeOnSpawnArc(enemy: Enemy, radius: number, angle: number): void {
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
