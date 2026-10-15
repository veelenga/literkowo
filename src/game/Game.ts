import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { sfx } from '../audio/Sfx';
import type { Level } from '../course/regions';
import { WordSource } from '../course/WordSource';
import type { WordLanguage } from '../profiles/Profile';
import { Boss } from './Boss';
import { Enemy } from './Enemy';
import { planFor, type Phase, type PhaseKind } from './LevelPlan';
import { Particles } from './Particles';
import { Player } from './Player';
import { SessionStats } from './SessionStats';
import type { Theme } from './themes';
import { World } from './World';

const CAMERA_FOV = 42;
const CAMERA_POSITION = new THREE.Vector3(0, 15, 15.5);
const CAMERA_TARGET = new THREE.Vector3(0, 0.8, 0);
const SPAWN_ARC_MARGIN = 0.35;
const CAMERA_INTRO_SCALE = 2.2;
const CAMERA_INTRO_DURATION = 1.8;
const CAMERA_SWAY = 0.35;
const BLOOM = { strength: 0.5, radius: 0.7, threshold: 0.8 };
const MSAA_SAMPLES = 4;
const MAX_PIXEL_RATIO = 1.5;
const EXPOSURE = 1.05;
const SPAWN_RADIUS = 11;
const BOSS_SPAWN_RADIUS = 12;
const LABEL_SAFE_TOP = 120;
const LABEL_SAFE_SIDE = 80;
const REACH_DISTANCE = 1.6;
const MAX_ENEMIES = 6;
const INITIAL_LIVES = 3;
const SHAKE_DURATION = 0.25;
const SHAKE_AMPLITUDE = 0.18;
const FINISH_DELAY = 1.1;

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
  onFinished(result: GameResult): void;
}

export class Game {
  private readonly renderer = new THREE.WebGLRenderer({ antialias: true });
  private readonly scene = new THREE.Scene();
  private readonly camera = new THREE.PerspectiveCamera(CAMERA_FOV, 1, 0.1, 120);
  private readonly composer: EffectComposer;
  private readonly clock = new THREE.Clock();
  private readonly player: Player;
  private readonly particles = new Particles(this.scene);
  private readonly world: World;
  private readonly words: WordSource;
  private readonly stats = new SessionStats();
  private readonly labelLayer = document.createElement('div');
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
  private paused = false;
  private finished = false;
  private running = false;
  private frame = 0;

  constructor(
    private readonly container: HTMLElement,
    private readonly config: GameConfig,
    private readonly events: GameEvents,
  ) {
    this.player = new Player(config.character);
    this.words = new WordSource(config.level, config.language);
    this.phases = planFor(config.level);
    this.composer = this.setupRendering();
    this.world = new World(this.scene, config.theme);
    this.scene.add(this.player.object);
    this.labelLayer.className = 'label-layer';
    this.container.append(this.renderer.domElement, this.labelLayer);
  }

  start(): void {
    this.running = true;
    this.resize();
    window.addEventListener('resize', this.resize);
    window.addEventListener('keydown', this.onKeyDown);
    this.events.onStats(this.stats, this.lives);
    this.reportProgress();
    this.loop();
  }

  destroy(): void {
    this.running = false;
    cancelAnimationFrame(this.frame);
    window.removeEventListener('resize', this.resize);
    window.removeEventListener('keydown', this.onKeyDown);
    this.enemies.forEach((enemy) => enemy.dispose());
    this.renderer.dispose();
    this.renderer.domElement.remove();
    this.labelLayer.remove();
  }

  private get phase(): Phase {
    return this.phases[this.phaseIndex];
  }

  private get inIntro(): boolean {
    return this.elapsed < CAMERA_INTRO_DURATION;
  }

  private setupRendering(): EffectComposer {
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = EXPOSURE;
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, MAX_PIXEL_RATIO));
    this.camera.position.copy(CAMERA_POSITION).multiplyScalar(CAMERA_INTRO_SCALE);
    this.camera.lookAt(0, 0, 0);
    const target = new THREE.WebGLRenderTarget(1, 1, {
      samples: MSAA_SAMPLES,
      type: THREE.HalfFloatType,
    });
    const composer = new EffectComposer(this.renderer, target);
    composer.addPass(new RenderPass(this.scene, this.camera));
    composer.addPass(
      new UnrealBloomPass(new THREE.Vector2(1, 1), BLOOM.strength, BLOOM.radius, BLOOM.threshold),
    );
    composer.addPass(new OutputPass());
    return composer;
  }

  private readonly resize = (): void => {
    const { clientWidth: width, clientHeight: height } = this.container;
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(width, height);
    this.composer.setSize(width, height);
  };

  private readonly loop = (): void => {
    if (!this.running) return;
    this.frame = requestAnimationFrame(this.loop);
    const delta = Math.min(this.clock.getDelta(), 0.1);
    if (!this.paused) this.tick(delta);
    this.positionLabels();
    this.composer.render();
  };

  private tick(delta: number): void {
    this.elapsed += delta;
    this.world.update(delta, this.elapsed);
    this.player.update(delta, this.elapsed);
    this.particles.update(delta);
    this.updateCamera(delta);
    if (this.finished) return;
    if (!this.inIntro) this.spawnIfDue(delta);
    for (const enemy of [...this.enemies]) {
      enemy.update(delta, this.elapsed);
      if (enemy.distanceToCenter < REACH_DISTANCE) this.enemyReached(enemy);
    }
    if (this.target) this.player.lookAt(this.target.object.position);
    this.events.onNextKey(this.nextExpectedChar());
  }

  private updateCamera(delta: number): void {
    const introProgress = Math.min(1, this.elapsed / CAMERA_INTRO_DURATION);
    const eased = 1 - Math.pow(1 - introProgress, 3);
    const scale = CAMERA_INTRO_SCALE - (CAMERA_INTRO_SCALE - 1) * eased;
    const sway = Math.sin(this.elapsed * 0.25) * CAMERA_SWAY;
    this.camera.position.set(
      CAMERA_POSITION.x * scale + sway,
      CAMERA_POSITION.y * scale,
      CAMERA_POSITION.z * scale,
    );
    this.applyShake(delta);
    this.camera.lookAt(CAMERA_TARGET);
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
    this.addEnemy(new Enemy(word, this.createLabel(), this.phase.speed, this.look()), SPAWN_RADIUS);
  }

  private spawnBossOnce(): void {
    if (this.boss) return;
    this.boss = new Boss(
      this.createLabel(),
      this.phase.speed,
      this.look(),
      () => this.words.bossWord(),
      this.phase.count,
    );
    this.addEnemy(this.boss, BOSS_SPAWN_RADIUS);
  }

  private look() {
    return { shape: this.config.theme.enemyShape, colors: this.config.theme.enemyColors };
  }

  private createLabel(): HTMLElement {
    const label = document.createElement('div');
    label.className = 'word-label';
    this.labelLayer.append(label);
    return label;
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
    else this.remove(enemy);
    this.loseLife();
  }

  private loseLife(): void {
    this.lives -= 1;
    this.shake = SHAKE_DURATION;
    this.player.hurt();
    this.stats.recordMistake();
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
    this.finished = true;
    this.events.onNextKey(undefined);
    if (won) sfx.levelComplete();
    else sfx.levelFailed();
    window.setTimeout(() => {
      if (!this.running) return;
      this.events.onFinished({
        won,
        score: this.stats.score,
        accuracy: this.stats.accuracy,
        wpm: this.stats.wpm,
        lettersFreed: this.lettersFreed,
      });
    }, FINISH_DELAY * 1000);
  }

  private readonly onKeyDown = (event: KeyboardEvent): void => {
    if (this.finished) return;
    if (event.key === 'Escape') return this.togglePause();
    if (this.paused || this.inIntro || event.ctrlKey || event.metaKey || event.key.length !== 1)
      return;
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
    if (this.target.isComplete) this.completeWord(this.target);
    this.events.onStats(this.stats, this.lives);
  }

  private acquireTarget(char: string): void {
    const candidates = this.enemies.filter((enemy) => enemy.expectedChar === char);
    this.target = this.nearest(candidates);
    this.target?.setTargeted(true);
  }

  private nearest(candidates: Enemy[]): Enemy | undefined {
    return [...candidates].sort((a, b) => a.distanceToCenter - b.distanceToCenter)[0];
  }

  private mistake(): void {
    this.stats.recordMistake();
    this.target?.flashMistake();
    sfx.mistake();
    this.events.onStats(this.stats, this.lives);
  }

  private completeWord(enemy: Enemy): void {
    this.stats.recordWord(enemy.word);
    this.lettersFreed += enemy.word.length;
    this.player.jump();
    this.particles.burst(enemy.object.position.clone().setY(enemy.labelHeight - 0.8), enemy.color);
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
    return (this.target ?? this.nearest(this.enemies))?.expectedChar;
  }

  private applyShake(delta: number): void {
    if (this.shake <= 0) return;
    this.shake -= delta;
    const strength = (this.shake / SHAKE_DURATION) * SHAKE_AMPLITUDE;
    this.camera.position.x += (Math.random() - 0.5) * strength;
    this.camera.position.y += (Math.random() - 0.5) * strength;
  }

  private positionLabels(): void {
    const { clientWidth: width, clientHeight: height } = this.container;
    const projected = new THREE.Vector3();
    for (const enemy of this.enemies) {
      projected.copy(enemy.object.position).setY(enemy.labelHeight).project(this.camera);
      const x = clamp(((projected.x + 1) / 2) * width, LABEL_SAFE_SIDE, width - LABEL_SAFE_SIDE);
      const y = Math.max(((1 - projected.y) / 2) * height, LABEL_SAFE_TOP);
      enemy.label.style.transform = `translate(-50%, -100%) translate(${x}px, ${y}px)`;
    }
  }
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}
