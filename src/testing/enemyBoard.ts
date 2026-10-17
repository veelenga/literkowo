import { vi } from 'vitest';
import { Enemy, type EnemyLook } from '../game/Enemy';
import type { MechanicContext } from '../game/mechanics/Mechanic';
import { fakeMechanicContext } from './mechanicContext';

const ENEMY_SPEED = 1;
const ENEMY_LOOK: EnemyLook = { shape: 'crystal', colors: [0x00bbf9] };
const ENEMY_WORD = 'fjf';
const EXTRA_LETTER = 'j';

export interface FakeBoard {
  readonly enemies: Enemy[];
  readonly context: MechanicContext;
  readonly enemyAt: (distance: number, word?: string) => Enemy;
  readonly enemiesAt: (distance: number, count: number) => Enemy[];
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
  const enemiesAt = (distance: number, count: number): Enemy[] =>
    Array.from({ length: count }, (_, index) => enemyAt(distance, distinctWord(index)));
  return { enemies, context, enemyAt, enemiesAt };
}

function distinctWord(index: number): string {
  return ENEMY_WORD + EXTRA_LETTER.repeat(index);
}

function placeAt(enemy: Enemy, distance: number): void {
  enemy.object.position.set(0, 0, -distance);
}

function skipCanvasPainting(): void {
  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(null);
}
