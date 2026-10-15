import type { LayerSpec } from '../specs';
import { BassLayer } from './BassLayer';
import { DrumLayer } from './DrumLayer';
import type { Layer, LayerContext } from './Layer';
import { MotifLayer } from './MotifLayer';
import { NoiseBedLayer } from './NoiseBedLayer';
import { PadLayer } from './PadLayer';
import { SporadicLayer } from './SporadicLayer';

export function createLayer(spec: LayerSpec, context: LayerContext): Layer {
  switch (spec.kind) {
    case 'pad':
      return new PadLayer(context, spec);
    case 'bed':
      return new NoiseBedLayer(context, spec);
    case 'motif':
      return new MotifLayer(context, spec);
    case 'bass':
      return new BassLayer(context, spec);
    case 'drum':
      return new DrumLayer(context, spec);
    case 'sporadic':
      return new SporadicLayer(context, spec);
  }
}
