import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import type { WordLanguage } from '../profiles/Profile';
import { WordSource } from '../course/WordSource';
import { Enemy } from './Enemy';
import { Particles } from './Particles';
import { Player } from './Player';
import { SessionStats } from './SessionStats';
import { buildWorld } from './World';

const CAMERA_FOV = 42;
const CAMERA_POSITION = new THREE.Vector3(0, 17, 14);
const SKY_COLOR = 0xbfe8ff;
const FOG_NEAR = 26;
const FOG_FAR = 52;
const BLOOM = { strength: 0.45, radius: 0.6, threshold: 0.8 };
const SPAWN_RADIUS = 11;
const REACH_DISTANCE = 1.6;
const INITIAL_SPAWN_INTERVAL = 4;
const MIN_SPAWN_INTERVAL = 1.1;
const SPAWN_ACCELERATION = 0.025;
const INITIAL_SPEED = 0.8;
const SPEED_GROWTH = 0.012;
const MAX_ENEMIES = 6;
const INITIAL_LIVES = 3;
const LABEL_HEIGHT = 2.1;
const SHAKE_DURATION = 0.25;
const SHAKE_AMPLITUDE = 0.18;

export interface GameConfig {
  lessonId: number;
  language: WordLanguage;
}

export interface GameResult {
  score: number;
  accuracy: number;
  wpm: number;
}

export interface GameEvents {
  onStats(stats: SessionStats, lives: number): void;
  onNextKey(char: string | undefined): void;
  onPause(paused: boolean): void;
  onGameOver(result: GameResult): void;
}

export class Game {
  private readonly renderer = new THREE.WebGLRenderer({ antialias: true });
  private readonly scene = new THREE.Scene();
  private readonly camera = new THREE.PerspectiveCamera(CAMERA_FOV, 1, 0.1, 100);
  private readonly composer: EffectComposer;
  private readonly clock = new THREE.Clock();
  private readonly player = new Player();
  private readonly particles = new Particles(this.scene);
  private readonly words: WordSource;
  private readonly stats = new SessionStats();
  private readonly labelLayer = document.createElement('div');
  private readonly enemies: Enemy[] = [];
  private target: Enemy | undefined;
  private lives = INITIAL_LIVES;
  private elapsed = 0;
  private sinceSpawn = INITIAL_SPAWN_INTERVAL;
  private shake = 0;
  private paused = false;
  private finished = false;
  private running = false;
  private frame = 0;

  constructor(
    private readonly container: HTMLElement,
    config: GameConfig,
    private readonly events: GameEvents,
  ) {
    this.words = new WordSource(config.lessonId, config.language);
    this.composer = this.setupRendering();
    buildWorld(this.scene);
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

  private setupRendering(): EffectComposer {
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.scene.background = new THREE.Color(SKY_COLOR);
    this.scene.fog = new THREE.Fog(SKY_COLOR, FOG_NEAR, FOG_FAR);
    this.camera.position.copy(CAMERA_POSITION);
    this.camera.lookAt(0, 0, 0);
    const composer = new EffectComposer(this.renderer);
    composer.addPass(new RenderPass(this.scene, this.camera));
    composer.addPass(
      new UnrealBloomPass(new THREE.Vector2(1, 1), BLOOM.strength, BLOOM.radius, BLOOM.threshold),
    );
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
    if (!this.paused && !this.finished) this.tick(delta);
    this.positionLabels();
    this.composer.render();
  };

  private tick(delta: number): void {
    this.elapsed += delta;
    this.spawnIfDue(delta);
    this.player.update(this.elapsed);
    this.particles.update(delta);
    this.applyShake(delta);
    for (const enemy of [...this.enemies]) {
      enemy.update(delta, this.elapsed);
      if (enemy.distanceToCenter < REACH_DISTANCE) this.enemyReached(enemy);
    }
    if (this.target) this.player.lookAt(this.target.object.position);
    this.events.onNextKey(this.nextExpectedChar());
  }

  private spawnIfDue(delta: number): void {
    this.sinceSpawn += delta;
    const interval = Math.max(
      MIN_SPAWN_INTERVAL,
      INITIAL_SPAWN_INTERVAL - this.elapsed * SPAWN_ACCELERATION,
    );
    if (this.sinceSpawn < interval || this.enemies.length >= MAX_ENEMIES) return;
    this.sinceSpawn = 0;
    this.spawn();
  }

  private spawn(): void {
    const label = document.createElement('div');
    label.className = 'word-label';
    this.labelLayer.append(label);
    const speed = INITIAL_SPEED + this.elapsed * SPEED_GROWTH;
    const enemy = new Enemy(this.words.next(), label, speed);
    const angle = Math.random() * Math.PI * 2;
    enemy.object.position.set(Math.cos(angle) * SPAWN_RADIUS, 0, Math.sin(angle) * SPAWN_RADIUS);
    this.scene.add(enemy.object);
    this.enemies.push(enemy);
  }

  private enemyReached(enemy: Enemy): void {
    this.remove(enemy);
    this.lives -= 1;
    this.shake = SHAKE_DURATION;
    this.stats.recordMistake();
    this.events.onStats(this.stats, this.lives);
    if (this.lives <= 0) this.finish();
  }

  private finish(): void {
    this.finished = true;
    this.events.onGameOver({
      score: this.stats.score,
      accuracy: this.stats.accuracy,
      wpm: this.stats.wpm,
    });
  }

  private readonly onKeyDown = (event: KeyboardEvent): void => {
    if (this.finished) return;
    if (event.key === 'Escape') return this.togglePause();
    if (this.paused || event.ctrlKey || event.metaKey || event.key.length !== 1) return;
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
    if (this.target.isComplete) this.destroyTarget();
    this.events.onStats(this.stats, this.lives);
  }

  private acquireTarget(char: string): void {
    const candidates = this.enemies.filter((enemy) => enemy.expectedChar === char);
    this.target = this.nearest(candidates);
    this.target?.setTargeted(true);
  }

  private nearest(candidates: Enemy[]): Enemy | undefined {
    return candidates.sort((a, b) => a.distanceToCenter - b.distanceToCenter)[0];
  }

  private mistake(): void {
    this.stats.recordMistake();
    this.target?.flashMistake();
    this.events.onStats(this.stats, this.lives);
  }

  private destroyTarget(): void {
    const enemy = this.target!;
    this.stats.recordWord(enemy.word);
    const burstAt = enemy.object.position.clone().setY(1.1);
    this.particles.burst(burstAt, enemy.color);
    this.remove(enemy);
  }

  private remove(enemy: Enemy): void {
    if (this.target === enemy) this.target = undefined;
    this.scene.remove(enemy.object);
    enemy.dispose();
    this.enemies.splice(this.enemies.indexOf(enemy), 1);
  }

  private nextExpectedChar(): string | undefined {
    return (this.target ?? this.nearest([...this.enemies]))?.expectedChar;
  }

  private applyShake(delta: number): void {
    if (this.shake <= 0) return;
    this.shake -= delta;
    const strength = (this.shake / SHAKE_DURATION) * SHAKE_AMPLITUDE;
    this.camera.position.set(
      CAMERA_POSITION.x + (Math.random() - 0.5) * strength,
      CAMERA_POSITION.y + (Math.random() - 0.5) * strength,
      CAMERA_POSITION.z,
    );
    if (this.shake <= 0) this.camera.position.copy(CAMERA_POSITION);
  }

  private positionLabels(): void {
    const { clientWidth: width, clientHeight: height } = this.container;
    const projected = new THREE.Vector3();
    for (const enemy of this.enemies) {
      projected.copy(enemy.object.position).setY(LABEL_HEIGHT).project(this.camera);
      const x = ((projected.x + 1) / 2) * width;
      const y = ((1 - projected.y) / 2) * height;
      enemy.label.style.transform = `translate(-50%, -100%) translate(${x}px, ${y}px)`;
    }
  }
}
