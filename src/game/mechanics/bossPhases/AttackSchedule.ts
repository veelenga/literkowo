export const FIRST_STRIKE = 8;
export const STRIKE_INTERVAL = 14;
export const TELEGRAPH_LEAD = 1.5;

export interface AttackCues {
  telegraph(): void;
  strike(): void;
}

export class AttackSchedule {
  private clock = 0;
  private nextStrike = FIRST_STRIKE;
  private telegraphed = false;

  constructor(private readonly cues: AttackCues) {}

  update(delta: number): void {
    this.clock += delta;
    if (!this.telegraphed && this.clock >= this.nextStrike - TELEGRAPH_LEAD) this.telegraph();
    if (this.clock >= this.nextStrike) this.strike();
  }

  private telegraph(): void {
    this.telegraphed = true;
    this.cues.telegraph();
  }

  private strike(): void {
    this.telegraphed = false;
    this.nextStrike += STRIKE_INTERVAL;
    this.cues.strike();
  }
}
