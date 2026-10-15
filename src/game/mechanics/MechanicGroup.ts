import type { Enemy } from '../Enemy';
import type { Phase } from '../RunPlan';
import type { Mechanic } from './Mechanic';

export class MechanicGroup implements Required<Mechanic> {
  private readonly mechanics: Partial<Mechanic>[] = [];

  register(mechanics: readonly Partial<Mechanic>[]): void {
    this.mechanics.push(...mechanics);
  }

  update(delta: number, elapsed: number): void {
    this.each((mechanic) => mechanic.update?.(delta, elapsed));
  }

  onSpawn(enemy: Enemy): void {
    this.each((mechanic) => mechanic.onSpawn?.(enemy));
  }

  onHit(): void {
    this.each((mechanic) => mechanic.onHit?.());
  }

  onMistake(): void {
    this.each((mechanic) => mechanic.onMistake?.());
  }

  onWordComplete(enemy: Enemy): void {
    this.each((mechanic) => mechanic.onWordComplete?.(enemy));
  }

  onEnemyReached(enemy: Enemy): void {
    this.each((mechanic) => mechanic.onEnemyReached?.(enemy));
  }

  onPhaseChange(phase: Phase): void {
    this.each((mechanic) => mechanic.onPhaseChange?.(phase));
  }

  dispose(): void {
    this.each((mechanic) => mechanic.dispose?.());
    this.mechanics.length = 0;
  }

  private each(visit: (mechanic: Partial<Mechanic>) => void): void {
    for (const mechanic of this.mechanics) visit(mechanic);
  }
}
