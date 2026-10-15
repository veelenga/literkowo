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
  private readonly nodes: AudioNode[] = [];

  constructor(
    private readonly context: BaseAudioContext,
    spec: ChannelSpec,
    targets: ChannelTargets,
  ) {
    this.input = this.gain(spec.volume);
    const panner = context.createStereoPanner();
    panner.pan.value = spec.pan ?? 0;
    this.nodes.push(panner);
    this.input.connect(panner).connect(targets.dry);
    this.send(panner, spec.reverb, targets.reverb);
    this.send(panner, spec.delay, targets.echo);
  }

  dispose(): void {
    this.nodes.forEach((node) => node.disconnect());
  }

  private send(source: AudioNode, amount: number | undefined, target: AudioNode): void {
    if (!amount) return;
    source.connect(this.gain(amount)).connect(target);
  }

  private gain(value: number): GainNode {
    const node = this.context.createGain();
    node.gain.value = value;
    this.nodes.push(node);
    return node;
  }
}
