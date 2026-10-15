import '../../../ui/waveEvents.css';
import type * as THREE from 'three';
import { Enemy, themedBody, type EnemyBody, type EnemyLook } from '../../Enemy';

export const WAVE_EVENT_TAG = 'wave-event';

export interface EventHost {
  dismiss(enemy: Enemy): void;
  land(position: THREE.Vector3, color: THREE.Color): void;
}

export class EventEnemy extends Enemy {
  constructor(
    word: string,
    label: HTMLElement,
    speed: number,
    look: EnemyLook,
    labelClass: string,
    body: EnemyBody = themedBody(look.shape),
  ) {
    super(word, label, speed, look, body);
    this.tags.add(WAVE_EVENT_TAG);
    this.label.classList.add(labelClass);
  }
}
