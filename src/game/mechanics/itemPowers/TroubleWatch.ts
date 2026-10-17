import type { Mechanic, MechanicContext } from '../Mechanic';
import { isResting } from './targets';
import { MISS_WINDOW_SECONDS, isInTrouble } from './trouble';

export type TroubleContext = Pick<
  MechanicContext,
  'enemies' | 'phase' | 'playing' | 'lives' | 'maxLives'
>;

export class TroubleWatch implements Partial<Mechanic> {
  private readonly startingPace: number;
  private readonly misses: number[] = [];
  private clock = 0;

  constructor(private readonly context: TroubleContext) {
    this.startingPace = context.phase.speed;
  }

  get isOn(): boolean {
    const { playing, phase, enemies, lives, maxLives } = this.context;
    if (!playing || isResting(phase)) return false;
    const { startingPace } = this;
    return isInTrouble({
      enemies,
      startingPace,
      recentMisses: this.misses.length,
      lives,
      maxLives,
    });
  }

  update(delta: number): void {
    this.clock += delta;
    while (this.misses.length > 0 && this.clock - this.misses[0] > MISS_WINDOW_SECONDS) {
      this.misses.shift();
    }
  }

  onMistake(): void {
    this.misses.push(this.clock);
  }
}
