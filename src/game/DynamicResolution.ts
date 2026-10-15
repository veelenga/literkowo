const WINDOW_MS = 2000;
const SLOW_FRAME_MS = 20;
const FAST_FRAME_MS = 12;
const RECOVERY_MS = 10000;
export const MIN_PIXEL_RATIO = 0.75;
export const PIXEL_RATIO_STEP = 0.25;

export class DynamicResolution {
  private ratio: number;
  private readonly min: number;
  private windowMs = 0;
  private windowFrames = 0;
  private fastMs = 0;

  constructor(
    private readonly max: number,
    min = MIN_PIXEL_RATIO,
    private readonly step = PIXEL_RATIO_STEP,
  ) {
    this.ratio = max;
    this.min = Math.min(min, max);
  }

  get pixelRatio(): number {
    return this.ratio;
  }

  record(frameMs: number): boolean {
    this.windowMs += frameMs;
    this.windowFrames += 1;
    if (this.windowMs < WINDOW_MS) return false;
    const span = this.windowMs;
    const average = span / this.windowFrames;
    this.windowMs = 0;
    this.windowFrames = 0;
    return this.judge(average, span);
  }

  private judge(average: number, span: number): boolean {
    if (average > SLOW_FRAME_MS) {
      this.fastMs = 0;
      return this.shift(-this.step);
    }
    this.fastMs = average < FAST_FRAME_MS ? this.fastMs + span : 0;
    if (this.fastMs < RECOVERY_MS) return false;
    this.fastMs = 0;
    return this.shift(this.step);
  }

  private shift(by: number): boolean {
    const next = Math.min(this.max, Math.max(this.min, this.ratio + by));
    if (next === this.ratio) return false;
    this.ratio = next;
    return true;
  }
}
