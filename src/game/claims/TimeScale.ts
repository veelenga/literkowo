import { Claims, type Release } from './Claims';

export const NORMAL_TIME_SCALE = 1;

const STOPPED = 0;

export class TimeScale {
  private readonly claims = new Claims<number>();

  get value(): number {
    const scales = this.claims.values;
    return scales.length > 0 ? Math.min(...scales) : NORMAL_TIME_SCALE;
  }

  claim(scale: number): Release {
    return this.claims.claim(Math.max(STOPPED, scale));
  }
}
