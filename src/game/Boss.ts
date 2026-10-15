import * as THREE from 'three';
import { Enemy, type EnemyLook } from './Enemy';

const BOSS_SCALE = 3.2;
const BOSS_HEIGHT = 2.4;
const KNOCKBACK = 2.6;
const RESET_DISTANCE = 9;
const SPEED_GROWTH = 1.12;
const EYE_COLOR = 0xffe066;

export class Boss extends Enemy {
  private wordsLeft: number;
  private readonly hitsNeeded: number;

  constructor(
    label: HTMLElement,
    speed: number,
    look: EnemyLook,
    private readonly nextWord: () => string,
    hitsNeeded: number,
  ) {
    super(nextWord(), label, speed, { ...look, scale: BOSS_SCALE });
    this.hitsNeeded = hitsNeeded;
    this.wordsLeft = hitsNeeded;
    this.body.position.y = BOSS_HEIGHT;
    this.body.material.color.multiplyScalar(0.55);
    this.addEyes();
    this.label.classList.add('is-boss');
  }

  get health(): number {
    return this.wordsLeft / this.hitsNeeded;
  }

  get isDefeated(): boolean {
    return this.wordsLeft <= 0;
  }

  get labelHeight(): number {
    return BOSS_HEIGHT + 2.2;
  }

  override update(delta: number, elapsed: number): void {
    const direction = this.object.position.clone().setY(0).normalize();
    this.object.position.addScaledVector(direction, -this.speed * delta);
    this.body.position.y = BOSS_HEIGHT + Math.sin(elapsed * 1.4) * 0.2;
    this.body.rotation.y += 0.4 * delta;
  }

  takeHit(): void {
    this.wordsLeft -= 1;
    this.speed *= SPEED_GROWTH;
    this.pushBack(KNOCKBACK);
    this.startWord();
  }

  reset(): void {
    const direction = this.object.position.clone().setY(0).normalize();
    this.object.position.copy(direction.multiplyScalar(RESET_DISTANCE));
    this.startWord();
  }

  private startWord(): void {
    if (this.isDefeated) return;
    (this as { word: string }).word = this.nextWord();
    this.typed = 0;
    this.renderLabel();
  }

  private pushBack(amount: number): void {
    const direction = this.object.position.clone().setY(0).normalize();
    this.object.position.addScaledVector(direction, amount);
  }

  private addEyes(): void {
    const material = new THREE.MeshStandardMaterial({
      color: EYE_COLOR,
      emissive: EYE_COLOR,
      emissiveIntensity: 1.5,
    });
    for (const side of [-1, 1]) {
      const eye = new THREE.Mesh(new THREE.SphereGeometry(0.07, 6, 6), material);
      eye.position.set(side * 0.18, 0.1, 0.5);
      this.body.add(eye);
    }
  }
}
