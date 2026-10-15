import { i18n } from '../../../i18n/i18n';
import type { Boss } from '../../Boss';
import type { MechanicContext } from '../Mechanic';
import type { Fight } from './Fight';

export const MINI_BOSS_ACCENT = '#ffcf3f';
const LAST_HIT = 1;
const FANFARE = { midis: [72, 76, 79, 84], spacing: 0.08, decay: 0.5 } as const;

export type MiniBossContext = Pick<MechanicContext, 'announce' | 'sfx'>;

export class MiniBossFight implements Fight {
  constructor(
    private readonly context: MiniBossContext,
    readonly boss: Boss,
  ) {
    context.announce(i18n.t.features.bossPhases.miniBoss.banner, 'banner', MINI_BOSS_ACCENT);
  }

  update(): void {}

  beforeHit(): void {
    if (this.boss.hitsLeft > LAST_HIT) return;
    const { midis, spacing, decay } = FANFARE;
    this.context.sfx.chimes(midis, spacing, decay);
    this.context.announce(i18n.t.features.bossPhases.miniBoss.victory, 'callout', MINI_BOSS_ACCENT);
  }

  onSpawn(): void {}

  end(): void {}
}
