import { degreesInOctaves } from '../harmony';
import { between, chance } from '../random';
import type { SporadicSpec } from '../specs';
import { SteppedLayer, type LayerContext, type StepInfo } from './Layer';

const QUIETEST_VELOCITY = 0.45;

export class SporadicLayer extends SteppedLayer {
  constructor(
    layer: LayerContext,
    private readonly spec: SporadicSpec,
  ) {
    super(layer, spec.sections);
  }

  protected play(step: StepInfo): void {
    if (!chance(this.spec.chancePerStep)) return;
    const offset = Math.floor(between(0, this.spec.span + 1));
    const degree = step.chordRoot + degreesInOctaves(this.spec.octave) + offset;
    const time = step.time + between(0, step.stepSeconds);
    const velocity = this.spec.velocity * between(QUIETEST_VELOCITY, 1);
    this.playNote(this.spec.instrument, {
      time,
      degree: this.layer.harmony.toMelody(degree),
      velocity,
    });
  }
}
