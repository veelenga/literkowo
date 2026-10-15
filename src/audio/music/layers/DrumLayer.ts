import { between, chance } from '../random';
import type { DrumSpec } from '../specs';
import { SteppedLayer, type LayerContext, type StepInfo } from './Layer';

interface DrumHit {
  velocity: number;
  probability: number;
}

const HITS: Partial<Record<string, DrumHit>> = {
  X: { velocity: 1, probability: 1 },
  x: { velocity: 0.7, probability: 1 },
  '?': { velocity: 0.45, probability: 0.5 },
};
const VELOCITY_SPREAD = 0.2;

export class DrumLayer extends SteppedLayer {
  constructor(
    layer: LayerContext,
    private readonly spec: DrumSpec,
  ) {
    super(layer, spec.sections);
  }

  protected play(step: StepInfo): void {
    const hit = HITS[this.spec.pattern[step.step]];
    if (!hit || !chance(hit.probability)) return;
    const velocity = this.spec.velocity * hit.velocity * (1 - between(0, VELOCITY_SPREAD));
    this.playDrum(this.spec.instrument, step.time, velocity);
  }
}
