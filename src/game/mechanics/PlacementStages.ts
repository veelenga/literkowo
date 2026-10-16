import { REGIONS } from '../../course/catalog';
import { format } from '../../i18n/format';
import { i18n } from '../../i18n/i18n';
import type { Phase, StageMark } from '../RunPlan';
import type { Mechanic, MechanicContext } from './Mechanic';

export const STAGE_ACCENT = '#7cf5e0';

const STAGE_CHIMES = { midis: [64, 71, 76], spacing: 0.09, decay: 0.45 } as const;

export class PlacementStages implements Mechanic {
  constructor(private readonly context: MechanicContext) {}

  onPhaseChange(phase: Phase): void {
    if (phase.stage) this.announceStage(phase.stage);
  }

  dispose(): void {}

  private announceStage(stage: StageMark): void {
    const { midis, spacing, decay } = STAGE_CHIMES;
    this.context.sfx.chimes(midis, spacing, decay);
    const text = format(i18n.t.features.placement.stageBanner, {
      stage: stage.number,
      region: regionName(stage.regionId),
    });
    this.context.announce(text, 'banner', STAGE_ACCENT);
  }
}

function regionName(regionId: string): string {
  const region = REGIONS.find((candidate) => candidate.id === regionId);
  return region ? region.name[i18n.current] : regionId;
}
