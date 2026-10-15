import * as THREE from 'three';
import type { EnemyLook } from '../../Enemy';
import { BAT_HEIGHT, BAT_SHOULDER, batBody, batWingGeometry, bombGeometry } from './bodies';
import { SpecialEnemy, type SpecialSpec } from './SpecialEnemy';

const BOMB_FALL_SECONDS = 1.1;
const LEAVE_SECONDS = 0.8;
const ENTRY_X = 13;
const EXIT_X = 9.5;

const LOOK: EnemyLook = { shape: 'orb', colors: [0x8b5cff, 0xb05cff, 0x6a4dff] };
const PATH = { entryZ: -3, apexZ: -11, exitZ: -2 };
const HERO_TARGET = new THREE.Vector3(0, 0.6, 0);
const LABEL_GAP = 0.75;
const WING = { color: 0x2b1650, emissive: 0x5a2fb0, glow: 0.35, roughness: 0.6 };
const FLAP = { speed: 14, angle: 0.75, hoverSpeed: 20 };
const BOMB = { size: 0.34, color: 0x1d1a24, arc: 1.6, spin: 7, dropDepth: 0.25 };
const LEAVE = { rise: 3, outward: 2.5 };
const SIDES = [-1, 1] as const;

type Flight = 'flying' | 'bombing' | 'leaving' | 'gone';

export class BatEnemy extends SpecialEnemy {
  private readonly path: THREE.QuadraticBezierCurve3;
  private readonly pathLength: number;
  private readonly flightSpeed: number;
  private readonly wings: THREE.Mesh[];
  private readonly bomb = createBomb();
  private readonly bombStart = new THREE.Vector3(0, BAT_HEIGHT - BOMB.dropDepth, 0);
  private readonly bombTarget = new THREE.Vector3();
  private readonly leaveDirection = new THREE.Vector3();
  private flight: Flight = 'flying';
  private progress = 0;
  private stateTime = 0;
  private flapTime = 0;

  constructor(spec: SpecialSpec, side: number) {
    super({ ...spec, speed: 0 }, LOOK, batBody());
    this.flightSpeed = spec.speed;
    this.path = flightPath(side);
    this.pathLength = this.path.getLength();
    this.wings = createWings();
    this.rig.add(...this.wings);
    this.object.add(this.bomb);
    this.arriveAt();
  }

  get hasDroppedBomb(): boolean {
    return this.flight === 'leaving' || this.flight === 'gone';
  }

  override arriveAt(): void {
    this.path.getPointAt(0, this.object.position);
  }

  override get labelHeight(): number {
    return BAT_HEIGHT + LABEL_GAP;
  }

  override update(delta: number, elapsed: number, viewer: THREE.Vector3Like): void {
    super.update(delta, elapsed, viewer);
    this.flap(delta);
    if (this.isFrozen) return;
    this.stateTime += delta;
    if (this.flight === 'flying') this.fly(delta);
    else if (this.flight === 'bombing') this.dropBomb();
    else if (this.flight === 'leaving') this.leave();
  }

  celebrate(): void {
    this.host.tumble(this.rig, this.color);
    this.host.play('batTumble');
  }

  private flap(delta: number): void {
    this.flapTime += delta * (this.flight === 'bombing' ? FLAP.hoverSpeed : FLAP.speed);
    const angle = Math.sin(this.flapTime) * FLAP.angle;
    for (const wing of this.wings) wing.rotation.z = angle;
  }

  private fly(delta: number): void {
    this.progress = Math.min(1, this.progress + (delta * this.flightSpeed) / this.pathLength);
    this.path.getPointAt(this.progress, this.object.position);
    if (this.progress >= 1) this.enter('bombing');
  }

  private dropBomb(): void {
    if (!this.bomb.visible) this.releaseBomb();
    const fall = Math.min(1, this.stateTime / BOMB_FALL_SECONDS);
    this.bomb.position.lerpVectors(this.bombStart, this.bombTarget, fall);
    this.bomb.position.y += Math.sin(Math.PI * fall) * BOMB.arc;
    this.bomb.rotation.set(fall * BOMB.spin, fall * BOMB.spin, 0);
    if (fall >= 1) this.explode();
  }

  private releaseBomb(): void {
    this.bombTarget.copy(HERO_TARGET).sub(this.object.position);
    this.bomb.visible = true;
    this.host.play('bombDrop');
  }

  private explode(): void {
    this.bomb.visible = false;
    this.setLabelMode('hidden');
    this.host.bomb(HERO_TARGET.clone());
    this.leaveDirection.set(this.object.position.x, 0, this.object.position.z).normalize();
    this.enter('leaving');
  }

  private leave(): void {
    const progress = Math.min(1, this.stateTime / LEAVE_SECONDS);
    this.rig.position.y += progress * progress * LEAVE.rise;
    this.rig.position.addScaledVector(this.leaveDirection, progress * LEAVE.outward);
    this.rig.scale.multiplyScalar(1 - progress);
    if (progress < 1) return;
    this.enter('gone');
    this.host.dismiss(this);
  }

  private enter(flight: Flight): void {
    this.flight = flight;
    this.stateTime = 0;
  }
}

function flightPath(side: number): THREE.QuadraticBezierCurve3 {
  return new THREE.QuadraticBezierCurve3(
    new THREE.Vector3(-side * ENTRY_X, 0, PATH.entryZ),
    new THREE.Vector3(0, 0, PATH.apexZ),
    new THREE.Vector3(side * EXIT_X, 0, PATH.exitZ),
  );
}

function createWings(): THREE.Mesh[] {
  const material = new THREE.MeshStandardMaterial({
    color: WING.color,
    emissive: WING.emissive,
    emissiveIntensity: WING.glow,
    roughness: WING.roughness,
    flatShading: true,
  });
  return SIDES.map((side) => {
    const wing = new THREE.Mesh(batWingGeometry(), material);
    wing.position.x = side * BAT_SHOULDER;
    wing.rotation.y = side < 0 ? Math.PI : 0;
    return wing;
  });
}

function createBomb(): THREE.Mesh {
  const material = new THREE.MeshStandardMaterial({ color: BOMB.color, flatShading: true });
  const bomb = new THREE.Mesh(bombGeometry(BOMB.size), material);
  bomb.visible = false;
  return bomb;
}
