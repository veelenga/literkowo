export type VoiceRole = 'core' | 'ornament';

const ORNAMENT_HEADROOM = 2;

export class VoiceBudget {
  private endTimes: number[] = [];
  private sustained = 0;

  constructor(private readonly limit: number) {}

  sustain(): void {
    this.sustained += 1;
  }

  releaseSustain(): void {
    this.sustained = Math.max(0, this.sustained - 1);
  }

  play(time: number, strike: () => number, role: VoiceRole = 'core'): void {
    this.endTimes = this.endTimes.filter((end) => end > time);
    const limit = role === 'core' ? this.limit : this.limit - ORNAMENT_HEADROOM;
    if (this.endTimes.length + this.sustained >= limit) return;
    this.endTimes.push(strike());
  }
}
