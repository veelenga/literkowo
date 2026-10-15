import { BUTTERWORTH_Q_DB } from '../synthesis';

const STEREO_CHANNELS = 2;
const LEFT = 0;
const RIGHT = 1;
const REVERB_LINE_SECONDS = [
  0.0297, 0.0371, 0.0411, 0.0437, 0.0533, 0.0617, 0.0719, 0.0827,
] as const;
const REVERB_OUTPUT_GAIN = 0.35;
const RT60_EXPONENT = -3;
const HOUSEHOLDER_SCALE = -2 / REVERB_LINE_SECONDS.length;
const MAX_ECHO_SECONDS = 3;

export interface ReverbSettings {
  decaySeconds: number;
  damping: number;
}

export interface EchoSettings {
  seconds: number;
  feedback: number;
  tone: number;
}

abstract class Effect {
  readonly input: GainNode;
  readonly output: GainNode;
  private readonly nodes: AudioNode[] = [];

  constructor(protected readonly context: BaseAudioContext) {
    this.input = this.track(context.createGain());
    this.output = this.track(context.createGain());
  }

  dispose(): void {
    this.nodes.forEach((node) => node.disconnect());
  }

  protected track<T extends AudioNode>(node: T): T {
    this.nodes.push(node);
    return node;
  }

  protected lowpass(frequency: number): BiquadFilterNode {
    const filter = this.track(this.context.createBiquadFilter());
    filter.frequency.value = frequency;
    filter.Q.value = BUTTERWORTH_Q_DB;
    return filter;
  }

  protected gain(value: number): GainNode {
    const node = this.track(this.context.createGain());
    node.gain.value = value;
    return node;
  }

  protected delay(seconds: number, maxSeconds = 1): DelayNode {
    const node = this.track(this.context.createDelay(maxSeconds));
    node.delayTime.value = seconds;
    return node;
  }
}

export class FdnReverb extends Effect {
  private readonly mixing: GainNode;
  private readonly merger: ChannelMergerNode;

  constructor(
    context: BaseAudioContext,
    private readonly settings: ReverbSettings,
  ) {
    super(context);
    this.output.gain.value = REVERB_OUTPUT_GAIN;
    this.mixing = this.gain(HOUSEHOLDER_SCALE);
    this.merger = this.track(context.createChannelMerger(STEREO_CHANNELS));
    this.merger.connect(this.output);
    REVERB_LINE_SECONDS.forEach((seconds, index) => this.buildLine(seconds, index));
  }

  private buildLine(seconds: number, index: number): void {
    const line = this.delay(seconds);
    const damping = this.lowpass(this.settings.damping);
    const feedback = this.gain(10 ** ((RT60_EXPONENT * seconds) / this.settings.decaySeconds));
    this.input.connect(line);
    line.connect(damping).connect(feedback);
    feedback.connect(line);
    feedback.connect(this.mixing);
    this.mixing.connect(line);
    damping.connect(this.merger, 0, index % STEREO_CHANNELS);
  }
}

export class PingPongDelay extends Effect {
  constructor(context: BaseAudioContext, settings: EchoSettings) {
    super(context);
    const tone = this.lowpass(settings.tone);
    const left = this.delay(settings.seconds, MAX_ECHO_SECONDS);
    const right = this.delay(settings.seconds, MAX_ECHO_SECONDS);
    const toRight = this.gain(settings.feedback);
    const toLeft = this.gain(settings.feedback);
    const merger = this.track(context.createChannelMerger(STEREO_CHANNELS));
    this.input.connect(tone).connect(left);
    left.connect(merger, 0, LEFT);
    left.connect(toRight).connect(right);
    right.connect(merger, 0, RIGHT);
    right.connect(toLeft).connect(tone);
    merger.connect(this.output);
  }
}
