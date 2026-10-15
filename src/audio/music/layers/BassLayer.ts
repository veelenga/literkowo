import { degreesInOctaves } from '../harmony';
import { between, chance } from '../random';
import type { BassSpec } from '../specs';
import { SteppedLayer, type LayerContext, type StepInfo } from './Layer';

const NOTE_OFFSETS: Partial<Record<string, number>> = { x: 0, f: 4, o: 7 };
const VELOCITY_SPREAD = 0.1;

export class BassLayer extends SteppedLayer {
  constructor(
    layer: LayerContext,
    private readonly spec: BassSpec,
  ) {
    super(layer, spec.sections);
  }

  protected play(step: StepInfo): void {
    const offset = NOTE_OFFSETS[this.spec.pattern[step.step]];
    if (offset === undefined) return;
    if (step.step !== 0 && chance(this.spec.restChance)) return;
    const degree = step.chordRoot + offset + degreesInOctaves(this.spec.octave);
    const velocity = this.spec.velocity * (1 - between(0, VELOCITY_SPREAD));
    this.playNote(this.spec.instrument, { time: step.time, degree, velocity });
  }
}
