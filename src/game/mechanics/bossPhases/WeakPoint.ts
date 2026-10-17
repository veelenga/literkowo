import { HeldClaim } from '../../claims/HeldClaim';
import type { Enemy } from '../../Enemy';
import type { MechanicContext } from '../Mechanic';

export const STUN_SECONDS = 2.5;
export const SLOW_MOTION = 0.4;
const RISING_SWEEP = { fromMidi: 62, toMidi: 86, seconds: 0.5 };

export type WeakPointContext = Pick<MechanicContext, 'claimTimeScale' | 'sfx' | 'words'>;

export class WeakPoint {
  private readonly slowMotion = new HeldClaim(() => this.context.claimTimeScale(SLOW_MOTION));
  private stunLeft = 0;

  constructor(private readonly context: WeakPointContext) {}

  get isOpen(): boolean {
    return this.slowMotion.isHeld;
  }

  prepareShortWord(): void {
    const { words } = this.context;
    words.queueBossWord(words.shortWord());
  }

  expose(boss: Pick<Enemy, 'freeze'>): void {
    boss.freeze(STUN_SECONDS * SLOW_MOTION);
    this.stunLeft = STUN_SECONDS;
    this.slowMotion.hold();
    const { fromMidi, toMidi, seconds } = RISING_SWEEP;
    this.context.sfx.sweep(fromMidi, toMidi, seconds);
  }

  update(delta: number): void {
    if (!this.isOpen) return;
    this.stunLeft -= delta;
    if (this.stunLeft <= 0) this.close();
  }

  close(): void {
    this.stunLeft = 0;
    this.slowMotion.release();
  }
}
