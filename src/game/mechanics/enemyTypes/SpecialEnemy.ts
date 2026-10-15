import '../../../ui/enemyTypes.css';
import type * as THREE from 'three';
import { Enemy, type EnemyBody, type EnemyLook } from '../../Enemy';
import { ENEMY_TYPE_TAG, type EnemyKind } from './kinds';
import type { SoundCue } from './sounds';

export interface SpecialHost {
  dust(position: THREE.Vector3): void;
  pop(position: THREE.Vector3, color: THREE.Color): void;
  shatter(position: THREE.Vector3, color: THREE.Color): void;
  confetti(position: THREE.Vector3): void;
  tumble(body: THREE.Object3D, color: THREE.Color): void;
  bomb(position: THREE.Vector3): void;
  dismiss(enemy: Enemy): void;
  spawn(enemy: Enemy): void;
  isOnBoard(enemy: Enemy): boolean;
  createLabel(): HTMLElement;
  play(cue: SoundCue): void;
}

export interface SpecialSpec {
  readonly kind: EnemyKind;
  readonly word: string;
  readonly label: HTMLElement;
  readonly speed: number;
  readonly host: SpecialHost;
}

const LABEL_CLASS_PREFIX = 'is-';

export abstract class SpecialEnemy extends Enemy {
  readonly kind: EnemyKind;
  protected readonly host: SpecialHost;

  constructor(spec: SpecialSpec, look: EnemyLook, body: EnemyBody) {
    super(spec.word, spec.label, spec.speed, look, body);
    this.kind = spec.kind;
    this.host = spec.host;
    this.tags.add(ENEMY_TYPE_TAG);
    this.label.classList.add(`${LABEL_CLASS_PREFIX}${spec.kind}`);
  }

  arriveAt(spawn: THREE.Vector3): void {
    this.object.position.copy(spawn);
  }

  abstract celebrate(): void;
}
