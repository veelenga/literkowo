import type { Layer, LayerContext, StepInfo } from './Layer';

interface LfoSettings {
  rate: number;
  depth: number;
  target: AudioParam;
}

export abstract class SustainedLayer implements Layer {
  private readonly nodes: AudioNode[] = [];
  private readonly sources: AudioScheduledSourceNode[] = [];
  private state: 'idle' | 'sounding' | 'released' = 'idle';

  constructor(protected readonly layer: LayerContext) {}

  onStep(step: StepInfo): void {
    if (this.state === 'idle') this.begin(step.time);
    if (this.state !== 'released') this.update?.(step);
  }

  release(time: number): void {
    if (this.state !== 'sounding') return;
    this.state = 'released';
    this.layer.budget.releaseSustain();
    this.sources.forEach((source) => source.stop(time));
  }

  dispose(): void {
    this.release(this.layer.context.currentTime);
    this.nodes.forEach((node) => node.disconnect());
  }

  protected abstract build(time: number): void;

  protected update?(step: StepInfo): void;

  protected track<T extends AudioNode>(node: T): T {
    this.nodes.push(node);
    return node;
  }

  protected source<T extends AudioScheduledSourceNode>(node: T): T {
    this.sources.push(node);
    return this.track(node);
  }

  protected gain(value: number): GainNode {
    const node = this.track(this.layer.context.createGain());
    node.gain.value = value;
    return node;
  }

  protected lfo({ rate, depth, target }: LfoSettings): void {
    const oscillator = this.source(this.layer.context.createOscillator());
    oscillator.frequency.value = rate;
    oscillator.connect(this.gain(depth)).connect(target);
  }

  private begin(time: number): void {
    this.build(time);
    this.sources.forEach((source) => source.start(time));
    this.layer.budget.sustain();
    this.state = 'sounding';
  }
}
