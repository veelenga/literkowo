export interface PhaseRecord {
  readonly hits: number;
  readonly mistakes: number;
  readonly reached: number;
  readonly typingSeconds: number;
}

export const EMPTY_PHASE_RECORD: PhaseRecord = {
  hits: 0,
  mistakes: 0,
  reached: 0,
  typingSeconds: 0,
};

export class PhaseMeter {
  private record: PhaseRecord = EMPTY_PHASE_RECORD;
  private readySince: number | undefined;

  wordReady(now: number, boardWasEmpty: boolean): void {
    if (boardWasEmpty || this.readySince === undefined) this.readySince = now;
  }

  hit(now: number): void {
    const waited = this.readySince === undefined ? 0 : Math.max(0, now - this.readySince);
    this.readySince = now;
    this.record = {
      ...this.record,
      hits: this.record.hits + 1,
      typingSeconds: this.record.typingSeconds + waited,
    };
  }

  mistake(): void {
    this.record = { ...this.record, mistakes: this.record.mistakes + 1 };
  }

  reach(): void {
    this.record = { ...this.record, reached: this.record.reached + 1 };
  }

  close(): PhaseRecord {
    const closed = this.record;
    this.record = EMPTY_PHASE_RECORD;
    return closed;
  }
}
