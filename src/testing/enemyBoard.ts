import { vi } from 'vitest';
import { Enemy, type EnemyLook } from '../game/Enemy';
import type { MechanicContext } from '../game/mechanics/Mechanic';
import { fakeMechanicContext } from './mechanicContext';

const ENEMY_SPEED = 1;
const ENEMY_LOOK: EnemyLook = { shape: 'crystal', colors: [0x00bbf9] };
const ENEMY_WORD = 'fjf';

export interface FakeBoard {
  readonly enemies: Enemy[];
  readonly context: MechanicContext;
  enemyAt(distance: number, word?: string): Enemy;
}

export function fakeBoard(overrides: Partial<MechanicContext> = {}): FakeBoard {
  skipCanvasPainting();
  const enemies: Enemy[] = [];
  const context = fakeMechanicContext({
    enemies,
    createLabel: () => document.createElement('div'),
    addEnemy: (enemy, radius) => {
      if (radius !== undefined) placeAt(enemy, radius);
      enemies.push(enemy);
    },
    removeEnemy: (enemy) => {
      const index = enemies.indexOf(enemy);
      if (index >= 0) enemies.splice(index, 1);
    },
    ...overrides,
  });
  const enemyAt = (distance: number, word = ENEMY_WORD): Enemy => {
    const enemy = new Enemy(word, context.createLabel(), ENEMY_SPEED, ENEMY_LOOK);
    placeAt(enemy, distance);
    enemies.push(enemy);
    return enemy;
  };
  return { enemies, context, enemyAt };
}

function placeAt(enemy: Enemy, distance: number): void {
  enemy.object.position.set(0, 0, -distance);
}

function skipCanvasPainting(): void {
  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(null);
}
