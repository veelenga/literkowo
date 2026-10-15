export class Envelope {
  private duration = 1;
  private remaining = 0;

  get level(): number {
    return this.remaining / this.duration;
  }

  trigger(duration: number): void {
    this.duration = duration;
    this.remaining = duration;
  }

  update(delta: number): void {
    this.remaining = Math.max(0, this.remaining - delta);
  }
}
