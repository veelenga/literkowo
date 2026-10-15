import * as THREE from 'three';
import type { EnemyShape } from './themes';
import { Envelope } from './effects/Envelope';
import { GlowingFace, type FaceSpec } from './effects/GlowingFace';
import { GroundGlow } from './effects/GroundGlow';
import { OrbitingSparks } from './effects/OrbitingSparks';
import { WispTrail } from './effects/WispTrail';
import {
  SHAPE_STYLES,
  bobOffset,
  coreGeometry,
  createShellGeometry,
  shellGeometry,
  type BobMotion,
  type ShapeStyle,
} from './effects/enemyStyles';
import { setEmissiveLuminance } from './effects/luminance';

const HOVER_HEIGHT = 1.1;
const LABEL_GAP = 1.0;
const REACH_DISTANCE = 1.6;
const THREAT_START_DISTANCE = 11;
const GLOW_DIAMETER = 1.8;
const CORE_IDLE_GLOW = 1.6;
const CORE_FOCUS_GLOW = 3.6;
const CORE_FLASH_GLOW = 2;
const SHELL_IDLE_GLOW = 0.1;
const SHELL_FOCUS_GLOW = 0.28;
const SHELL_FLASH_GLOW = 0.9;
const PULSE_GLOW = 3;
const FOCUS_SCALE_BOOST = 0.12;
const PULSE_SCALE_BOOST = 0.22;
const PULSE_DURATION = 0.18;
const MISTAKE_DURATION = 0.2;
const MISTAKE_COLOR = new THREE.Color(0xff2a3a);
const SHAKE_AMPLITUDE = 0.09;
const SHAKE_FREQUENCY = 70;
const FOCUS_RATE = 12;
const CORE_SPIN = 1.4;
const CORE_TUMBLE = 0.6;
const SPARK_FOCUS_BOOST = 0.8;
const VIEWER_GROUND_Z = 15.5;
const SWAY_SPEED = 1.3;
const SWAY_ANGLE = 0.25;
const SHELL_ROUGHNESS = 0.2;
const SHELL_METALNESS = 0.1;
const CORE_ROUGHNESS = 0.35;
const FULL_TURN = Math.PI * 2;

export interface EnemyLook {
  shape: EnemyShape;
  colors: number[];
  scale?: number;
}

export interface EnemyMotion {
  hoverHeight: number;
  bob: BobMotion;
  facesViewer: boolean;
}

type GlowingMesh = THREE.Mesh<THREE.BufferGeometry, THREE.MeshStandardMaterial>;

export function enemyGeometry(shape: EnemyShape): THREE.BufferGeometry {
  return createShellGeometry(shape);
}

function pickRandom(values: number[]): number {
  return values[Math.floor(Math.random() * values.length)];
}

export class Enemy {
  readonly object = new THREE.Group();
  readonly color: THREE.Color;
  typed = 0;
  protected readonly rig = new THREE.Group();
  protected readonly body: GlowingMesh;
  protected readonly outward = new THREE.Vector3();
  protected motion: EnemyMotion;
  protected face: GlowingFace | undefined;
  private readonly style: ShapeStyle;
  private readonly core: GlowingMesh;
  private readonly sparks: OrbitingSparks;
  private readonly glow: GroundGlow;
  private readonly trail: WispTrail | undefined;
  private readonly bodyScale: number;
  private readonly phase = Math.random() * FULL_TURN;
  private readonly pulse = new Envelope();
  private readonly flash = new Envelope();
  private readonly shake = new Envelope();
  private readonly flashColor = new THREE.Color();
  private shellGlowScale: number;
  private isTargeted = false;
  private focus = 0;
  private readonly heightAt = (time: number): number =>
    this.motion.hoverHeight + bobOffset(this.motion.bob, time + this.phase);

  constructor(
    readonly word: string,
    readonly label: HTMLElement,
    protected speed: number,
    look: EnemyLook,
  ) {
    this.style = SHAPE_STYLES[look.shape];
    this.color = new THREE.Color(pickRandom(look.colors));
    this.bodyScale = look.scale ?? 1;
    this.shellGlowScale = this.style.shellShade;
    this.motion = {
      hoverHeight: HOVER_HEIGHT,
      bob: this.style.bob,
      facesViewer: this.style.face !== undefined,
    };
    this.body = this.createBody(look.shape);
    this.core = this.createCore(look.shape);
    this.sparks = new OrbitingSparks(this.style.sparkCount, this.color);
    this.glow = new GroundGlow(this.color, GLOW_DIAMETER * this.bodyScale);
    this.trail = this.style.hasTrail
      ? new WispTrail(this.color, this.bodyScale, this.heightAt)
      : undefined;
    if (this.style.face) this.setFace(this.style.face);
    this.assemble();
    this.renderLabel();
  }

  get isComplete(): boolean {
    return this.typed >= this.word.length;
  }

  get expectedChar(): string {
    return this.word[this.typed];
  }

  get distanceToCenter(): number {
    return Math.hypot(this.object.position.x, this.object.position.z);
  }

  get labelHeight(): number {
    return HOVER_HEIGHT + LABEL_GAP;
  }

  update(delta: number, elapsed: number): void {
    this.approachCenter(delta);
    this.advanceTimers(delta);
    this.animateBody(delta, elapsed);
    this.animateSurroundings(delta, elapsed);
  }

  setTargeted(targeted: boolean): void {
    this.isTargeted = targeted;
    this.label.classList.toggle('is-target', targeted);
  }

  advance(): void {
    this.typed += 1;
    this.pulse.trigger(PULSE_DURATION);
    this.renderLabel();
  }

  flashMistake(): void {
    this.label.classList.remove('is-mistake');
    void this.label.offsetWidth;
    this.label.classList.add('is-mistake');
    this.startFlash(MISTAKE_COLOR, MISTAKE_DURATION);
    this.shake.trigger(MISTAKE_DURATION);
  }

  dispose(): void {
    this.label.remove();
    this.body.material.dispose();
    this.core.material.dispose();
    this.glow.dispose();
  }

  protected renderLabel(): void {
    const done = this.word.slice(0, this.typed);
    const rest = this.word.slice(this.typed);
    this.label.innerHTML = `<span class="done">${done}</span><span class="rest">${rest}</span>`;
  }

  protected startFlash(color: THREE.Color, duration: number): void {
    this.flashColor.copy(color);
    this.flash.trigger(duration);
  }

  protected reshape(bodyShape: THREE.BufferGeometry, coreShape: THREE.BufferGeometry): void {
    this.body.geometry = bodyShape;
    this.core.geometry = coreShape;
  }

  protected darkenShell(shade: number, opacity: number): void {
    this.body.material.color.multiplyScalar(shade);
    this.body.material.opacity = opacity;
    this.shellGlowScale *= shade;
  }

  protected setFace(spec: FaceSpec): void {
    if (this.face) this.body.remove(this.face.group);
    this.face = new GlowingFace(spec);
    this.body.add(this.face.group);
  }

  protected refreshOutward(): void {
    this.outward.set(this.object.position.x, 0, this.object.position.z).normalize();
  }

  private get threat(): number {
    const span = THREAT_START_DISTANCE - REACH_DISTANCE;
    return 1 - THREE.MathUtils.clamp((this.distanceToCenter - REACH_DISTANCE) / span, 0, 1);
  }

  private approachCenter(delta: number): void {
    this.refreshOutward();
    this.object.position.addScaledVector(this.outward, -this.speed * delta);
  }

  private advanceTimers(delta: number): void {
    this.pulse.update(delta);
    this.flash.update(delta);
    this.shake.update(delta);
    this.focus = THREE.MathUtils.damp(this.focus, this.isTargeted ? 1 : 0, FOCUS_RATE, delta);
  }

  private animateBody(delta: number, elapsed: number): void {
    const shake = Math.sin(elapsed * SHAKE_FREQUENCY) * SHAKE_AMPLITUDE * this.shake.level;
    this.rig.position.set(shake, this.heightAt(elapsed), 0);
    const pulse = Math.sin(Math.PI * this.pulse.level) * PULSE_SCALE_BOOST;
    this.rig.scale.setScalar(this.bodyScale * (1 + this.focus * FOCUS_SCALE_BOOST + pulse));
    this.turnBody(delta, elapsed);
    this.applyGlow();
  }

  private turnBody(delta: number, elapsed: number): void {
    if (this.motion.facesViewer) this.faceTheViewer(elapsed);
    else this.spinBody(delta);
    this.core.rotation.y -= CORE_SPIN * delta;
    this.core.rotation.x += CORE_SPIN * CORE_TUMBLE * delta;
  }

  private faceTheViewer(elapsed: number): void {
    const { x, z } = this.object.position;
    const facing = Math.atan2(-x, VIEWER_GROUND_Z - z);
    this.body.rotation.y = facing + Math.sin((elapsed + this.phase) * SWAY_SPEED) * SWAY_ANGLE;
  }

  private spinBody(delta: number): void {
    const { spin } = this.style;
    this.body.rotation.x += spin.x * delta;
    this.body.rotation.y += spin.y * delta;
    this.body.rotation.z += spin.z * delta;
  }

  private applyGlow(): void {
    const flash = this.flash.level;
    const focusedCore = THREE.MathUtils.lerp(CORE_IDLE_GLOW, CORE_FOCUS_GLOW, this.focus);
    const coreGlow =
      focusedCore * this.style.coreBoost + this.pulse.level * PULSE_GLOW + flash * CORE_FLASH_GLOW;
    const focusedShell = THREE.MathUtils.lerp(SHELL_IDLE_GLOW, SHELL_FOCUS_GLOW, this.focus);
    const shellGlow = focusedShell * this.shellGlowScale + flash * SHELL_FLASH_GLOW;
    this.tint(this.core.material, coreGlow, flash);
    this.tint(this.body.material, shellGlow, flash);
  }

  private tint(material: THREE.MeshStandardMaterial, luminance: number, flash: number): void {
    material.emissive.copy(this.color).lerp(this.flashColor, flash);
    setEmissiveLuminance(material, luminance);
  }

  private animateSurroundings(delta: number, elapsed: number): void {
    this.sparks.update(delta, 1 + this.focus * SPARK_FOCUS_BOOST);
    this.glow.update(this.threat, this.focus, elapsed);
    this.trail?.update(this.outward, this.speed, elapsed);
    this.face?.update(delta);
  }

  private createBody(shape: EnemyShape): GlowingMesh {
    const material = new THREE.MeshStandardMaterial({
      color: this.color.clone().multiplyScalar(this.style.shellShade),
      emissive: this.color,
      transparent: true,
      opacity: this.style.shellOpacity,
      roughness: SHELL_ROUGHNESS,
      metalness: SHELL_METALNESS,
      flatShading: true,
    });
    const mesh = new THREE.Mesh(shellGeometry(shape), material);
    mesh.castShadow = true;
    return mesh;
  }

  private createCore(shape: EnemyShape): GlowingMesh {
    const material = new THREE.MeshStandardMaterial({
      color: this.color,
      emissive: this.color,
      roughness: CORE_ROUGHNESS,
      flatShading: true,
    });
    return new THREE.Mesh(coreGeometry(shape), material);
  }

  private assemble(): void {
    this.rig.position.y = this.motion.hoverHeight;
    this.rig.scale.setScalar(this.bodyScale);
    this.rig.add(this.body, this.core, this.sparks.group);
    this.object.add(this.rig, this.glow.mesh);
    if (this.trail) this.object.add(this.trail.group);
  }
}
