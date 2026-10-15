import { getNoiseBuffer } from '../../synthesis';
import type { BedSpec } from '../specs';
import type { LayerContext } from './Layer';
import { SustainedLayer } from './SustainedLayer';

const FADE_IN_SECONDS = 4;
const HALF = 0.5;

export class NoiseBedLayer extends SustainedLayer {
  constructor(
    layer: LayerContext,
    private readonly spec: BedSpec,
  ) {
    super(layer);
  }

  protected build(time: number): void {
    const { context, destination } = this.layer;
    const noise = this.source(context.createBufferSource());
    noise.buffer = getNoiseBuffer(context);
    noise.loop = true;
    const filter = this.track(context.createBiquadFilter());
    filter.type = this.spec.filter;
    filter.frequency.value = this.spec.frequency;
    filter.Q.value = this.spec.q;
    this.lfo({ rate: this.spec.sweepRate, depth: this.spec.sweepDepth, target: filter.frequency });
    const swell = this.gain(1 - this.spec.swellDepth * HALF);
    this.lfo({ rate: this.spec.swellRate, depth: this.spec.swellDepth * HALF, target: swell.gain });
    const amp = this.gain(0);
    amp.gain.setValueAtTime(0, time);
    amp.gain.linearRampToValueAtTime(1, time + FADE_IN_SECONDS);
    noise.connect(filter).connect(swell).connect(amp).connect(destination);
  }
}
