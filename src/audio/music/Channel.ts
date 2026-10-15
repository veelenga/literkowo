import { NodeGroup, createGain } from '../synthesis';

const CENTER_PAN = 0;

export interface ChannelSpec {
  volume: number;
  pan?: number;
  reverb?: number;
  delay?: number;
}

export interface ChannelTargets {
  dry: AudioNode;
  reverb: AudioNode;
  echo: AudioNode;
}

export class Channel {
  readonly input: GainNode;
  private readonly nodes = new NodeGroup();

  constructor(
    private readonly context: BaseAudioContext,
    spec: ChannelSpec,
    targets: ChannelTargets,
  ) {
    this.input = this.gain(spec.volume);
    const panner = this.nodes.track(context.createStereoPanner());
    panner.pan.value = spec.pan ?? CENTER_PAN;
    this.input.connect(panner).connect(targets.dry);
    this.send(panner, spec.reverb, targets.reverb);
    this.send(panner, spec.delay, targets.echo);
  }

  dispose(): void {
    this.nodes.dispose();
  }

  private send(source: AudioNode, amount: number | undefined, target: AudioNode): void {
    if (!amount) return;
    source.connect(this.gain(amount)).connect(target);
  }

  private gain(value: number): GainNode {
    return this.nodes.track(createGain(this.context, value));
  }
}
