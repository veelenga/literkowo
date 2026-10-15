import * as THREE from 'three';
import type { EnemyShape } from './themes';

const HOVER_HEIGHT = 1.1;
const BOB_SPEED = 2.5;
const BOB_HEIGHT = 0.15;
const SPIN_SPEED = 1.2;
const TARGET_EMISSIVE = 1.2;
const IDLE_EMISSIVE = 0.4;

export interface EnemyLook {
  shape: EnemyShape;
  colors: number[];
  scale?: number;
}

export function enemyGeometry(shape: EnemyShape): THREE.BufferGeometry {
  switch (shape) {
    case 'wisp':
      return new THREE.IcosahedronGeometry(0.5, 0);
    case 'shard':
      return new THREE.TetrahedronGeometry(0.7, 0);
    case 'orb':
      return new THREE.DodecahedronGeometry(0.55, 0);
    case 'shell':
      return new THREE.TorusKnotGeometry(0.32, 0.12, 48, 8);
    default:
      return new THREE.OctahedronGeometry(0.55, 0);
  }
}

export class Enemy {
  readonly object = new THREE.Group();
  typed = 0;
  protected readonly body: THREE.Mesh<THREE.BufferGeometry, THREE.MeshStandardMaterial>;
  private readonly phase = Math.random() * Math.PI * 2;

  constructor(
    readonly word: string,
    readonly label: HTMLElement,
    protected speed: number,
    look: EnemyLook,
  ) {
    const color = look.colors[Math.floor(Math.random() * look.colors.length)];
    this.body = new THREE.Mesh(
      enemyGeometry(look.shape),
      new THREE.MeshStandardMaterial({
        color,
        emissive: color,
        emissiveIntensity: IDLE_EMISSIVE,
        flatShading: true,
      }),
    );
    this.body.castShadow = true;
    this.body.position.y = HOVER_HEIGHT;
    this.body.scale.setScalar(look.scale ?? 1);
    this.object.add(this.body);
    this.renderLabel();
  }

  get color(): THREE.Color {
    return this.body.material.color;
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
    return HOVER_HEIGHT + 1.0;
  }

  update(delta: number, elapsed: number): void {
    const direction = this.object.position.clone().setY(0).normalize();
    this.object.position.addScaledVector(direction, -this.speed * delta);
    this.body.position.y = HOVER_HEIGHT + Math.sin(elapsed * BOB_SPEED + this.phase) * BOB_HEIGHT;
    this.body.rotation.y += SPIN_SPEED * delta;
  }

  setTargeted(targeted: boolean): void {
    this.body.material.emissiveIntensity = targeted ? TARGET_EMISSIVE : IDLE_EMISSIVE;
    this.label.classList.toggle('is-target', targeted);
  }

  advance(): void {
    this.typed += 1;
    this.renderLabel();
  }

  flashMistake(): void {
    this.label.classList.remove('is-mistake');
    void this.label.offsetWidth;
    this.label.classList.add('is-mistake');
  }

  dispose(): void {
    this.label.remove();
    this.body.geometry.dispose();
    this.body.material.dispose();
  }

  protected renderLabel(): void {
    const done = this.word.slice(0, this.typed);
    const rest = this.word.slice(this.typed);
    this.label.innerHTML = `<span class="done">${done}</span><span class="rest">${rest}</span>`;
  }
}
