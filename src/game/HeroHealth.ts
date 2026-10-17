import type { RunPlan } from './RunPlan';

export type HitOutcome = 'comboBroken' | 'guarded' | 'shielded' | 'lifeLost';

export type HealthRules = Pick<RunPlan, 'lives' | 'hitCost'>;

export class HeroHealth {
  private livesLeft: number;
  private shieldsLeft = 0;
  private guardsLeft = 0;

  constructor(private readonly rules: HealthRules) {
    this.livesLeft = rules.lives;
  }

  get lives(): number {
    return this.livesLeft;
  }

  get shields(): number {
    return this.shieldsLeft;
  }

  get guards(): number {
    return this.guardsLeft;
  }

  get isLost(): boolean {
    return this.livesLeft <= 0;
  }

  addShield(): void {
    this.shieldsLeft += 1;
  }

  addGuard(): void {
    this.guardsLeft += 1;
  }

  hit(): HitOutcome {
    if (this.rules.hitCost === 'combo') return 'comboBroken';
    if (this.useGuard()) return 'guarded';
    if (this.useShield()) return 'shielded';
    this.livesLeft -= 1;
    return 'lifeLost';
  }

  restoreLife(): boolean {
    if (this.livesLeft >= this.rules.lives) return false;
    this.livesLeft += 1;
    return true;
  }

  private useGuard(): boolean {
    if (this.guardsLeft <= 0) return false;
    this.guardsLeft -= 1;
    return true;
  }

  private useShield(): boolean {
    if (this.shieldsLeft <= 0) return false;
    this.shieldsLeft -= 1;
    return true;
  }
}
