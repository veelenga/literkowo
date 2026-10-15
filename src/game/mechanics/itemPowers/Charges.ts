import type { Phase } from '../../RunPlan';

export class Charges {
  private left: number;

  constructor(private readonly full: number) {
    this.left = full;
  }

  get isEmpty(): boolean {
    return this.left <= 0;
  }

  use(): boolean {
    if (this.isEmpty) return false;
    this.left -= 1;
    return true;
  }

  refund(): void {
    this.left = Math.min(this.full, this.left + 1);
  }

  refillFor(phase: Phase): void {
    if (phase.wave !== undefined) this.left = this.full;
  }
}
