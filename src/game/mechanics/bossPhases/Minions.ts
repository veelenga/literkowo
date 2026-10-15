import type { MechanicContext } from '../Mechanic';

export const MINION_TAG = 'minion';
export const MINION_INTERVAL = 5;
export const MAX_MINIONS = 2;

export type MinionsContext = Pick<MechanicContext, 'enemies' | 'spawnWord'>;

export class Minions {
  private sinceSpawn = MINION_INTERVAL;

  constructor(private readonly context: MinionsContext) {}

  update(delta: number): void {
    this.sinceSpawn += delta;
    if (this.sinceSpawn < MINION_INTERVAL) return;
    this.sinceSpawn = 0;
    if (this.alive < MAX_MINIONS) this.context.spawnWord().tags.add(MINION_TAG);
  }

  private get alive(): number {
    return this.context.enemies.filter((enemy) => enemy.tags.has(MINION_TAG)).length;
  }
}
