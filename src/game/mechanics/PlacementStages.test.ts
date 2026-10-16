// @vitest-environment jsdom
import { describe, expect, it, vi } from 'vitest';
import { fakeMechanicContext } from '../../testing/mechanicContext';
import type { Phase } from '../RunPlan';
import type { MechanicContext } from './Mechanic';
import { PlacementStages, STAGE_ACCENT } from './PlacementStages';

const STAGE: Phase = { kind: 'test', count: 4, speed: 0.5, spawnInterval: 3, seconds: 12 };

function setup() {
  const announce = vi.fn<MechanicContext['announce']>();
  return { stages: new PlacementStages(fakeMechanicContext({ announce })), announce };
}

describe('PlacementStages', () => {
  it('names the stage and its region as each stage starts', () => {
    const { stages, announce } = setup();
    stages.onPhaseChange({ ...STAGE, stage: { number: 1, count: 5, regionId: 'polana' } });
    stages.onPhaseChange({ ...STAGE, stage: { number: 5, count: 5, regionId: 'wyspa' } });
    expect(announce).toHaveBeenNthCalledWith(1, 'Etap 1: Polana', 'banner', STAGE_ACCENT);
    expect(announce).toHaveBeenNthCalledWith(2, 'Etap 5: Wyspa Ogonków', 'banner', STAGE_ACCENT);
  });

  it('stays quiet outside the placement test', () => {
    const { stages, announce } = setup();
    stages.onPhaseChange({ ...STAGE, kind: 'words', wave: 2 });
    expect(announce).not.toHaveBeenCalled();
  });
});
