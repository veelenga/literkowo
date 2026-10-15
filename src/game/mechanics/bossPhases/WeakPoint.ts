import type { Enemy } from '../../Enemy';
import type { MechanicContext } from '../Mechanic';

export const STUN_SECONDS = 2.5;
export const SLOW_MOTION = 0.4;
const NORMAL_TIME = 1;
const RISING_SWEEP = { fromMidi: 62, toMidi: 86, seconds: 0.5 };

export type WeakPointContext = Pick<MechanicContext, 'setTimeScale' | 'sfx' | 'words'>;

export class WeakPoint {
  private stunLeft = 0;
  private open = false;

  constructor(private readonly context: WeakPointContext) {}

  get isOpen(): boolean {
    return this.open;
  }

  prepareShortWord(): void {
    const { words } = this.context;
    words.queueBossWord(words.shortWord());
  }

  expose(boss: Pick<Enemy, 'freeze'>): void {
    boss.freeze(STUN_SECONDS * SLOW_MOTION);
    this.open = true;
    this.stunLeft = STUN_SECONDS;
    this.context.setTimeScale(SLOW_MOTION);
    const { fromMidi, toMidi, seconds } = RISING_SWEEP;
    this.context.sfx.sweep(fromMidi, toMidi, seconds);
  }

  update(delta: number): void {
    if (!this.open) return;
    this.stunLeft -= delta;
    if (this.stunLeft <= 0) this.close();
  }

  close(): void {
    if (!this.open) return;
    this.open = false;
    this.stunLeft = 0;
    this.context.setTimeScale(NORMAL_TIME);
  }
}
