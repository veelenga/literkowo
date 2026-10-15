import { SPAWN_RADIUS } from '../../arena';
import type { Enemy } from '../../Enemy';

const PUSH_SPEED = 16;
const MAX_RADIUS = SPAWN_RADIUS + 1;

export class Knockback {
  private readonly pushes = new Map<Enemy, number>();

  constructor(private readonly isOnBoard: (enemy: Enemy) => boolean) {}

  push(enemies: readonly Enemy[], distance: number): void {
    for (const enemy of enemies) this.pushes.set(enemy, (this.pushes.get(enemy) ?? 0) + distance);
  }

  update(delta: number): void {
    for (const [enemy, left] of this.pushes) this.advance(enemy, left, delta);
  }

  private advance(enemy: Enemy, left: number, delta: number): void {
    if (!this.isOnBoard(enemy)) {
      this.pushes.delete(enemy);
      return;
    }
    const step = Math.min(left, PUSH_SPEED * delta);
    pushOutward(enemy, step);
    if (left > step) this.pushes.set(enemy, left - step);
    else this.pushes.delete(enemy);
  }
}

function pushOutward(enemy: Enemy, step: number): void {
  const { position } = enemy.object;
  const distance = enemy.distanceToCenter;
  if (distance === 0) return;
  const scale = Math.min(MAX_RADIUS, distance + step) / distance;
  position.x *= scale;
  position.z *= scale;
}
