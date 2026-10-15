import { format } from '../../i18n/format';
import { i18n } from '../../i18n/i18n';
import type { Phase } from '../RunPlan';
import type { Mechanic, MechanicContext } from './Mechanic';
import { CAST_SOUNDS } from './powerWords/sounds';
import { ShieldSpell } from './powerWords/spells/Shield';

export const WAVE_ACCENT = '#ffcf3f';

const WAVE_CHIMES = { midis: [67, 74, 79], spacing: 0.09, decay: 0.45 } as const;
const SHIELD_ACCENT = '#7cf5a8';

export class ArenaWaves implements Mechanic {
  private readonly shield: ShieldSpell;
  private previous: Phase | undefined;

  constructor(private readonly context: MechanicContext) {
    this.shield = new ShieldSpell(context);
  }

  update(delta: number): void {
    this.shield.update(delta);
  }

  onPhaseChange(phase: Phase): void {
    if (isBeatenBossWave(this.previous)) this.grantShield();
    this.previous = phase;
    if (phase.wave !== undefined) this.announceWave(phase.wave);
  }

  dispose(): void {
    this.shield.dispose();
  }

  private announceWave(wave: number): void {
    const { midis, spacing, decay } = WAVE_CHIMES;
    this.context.sfx.chimes(midis, spacing, decay);
    this.context.announce(format(i18n.t.features.arena.wave, { wave }), 'banner', WAVE_ACCENT);
  }

  private grantShield(): void {
    this.shield.cast();
    CAST_SOUNDS.shield(this.context.sfx);
    this.context.announce(i18n.t.features.arena.bossShield, 'callout', SHIELD_ACCENT);
  }
}

function isBeatenBossWave(phase: Phase | undefined): boolean {
  return phase?.kind === 'boss' && phase.wave !== undefined;
}
