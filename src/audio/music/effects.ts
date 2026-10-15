import { NodeGroup, createFilter, createGain } from '../synthesis';

const STEREO_CHANNELS = 2;
const LEFT = 0;
const RIGHT = 1;
const REVERB_LINE_SECONDS = [
  0.0297, 0.0371, 0.0411, 0.0437, 0.0533, 0.0617, 0.0719, 0.0827,
] as const;
const REVERB_OUTPUT_GAIN = 0.35;
const RT60_EXPONENT = -3;
const HOUSEHOLDER_SCALE = -2 / REVERB_LINE_SECONDS.length;
const DEFAULT_MAX_DELAY_SECONDS = 1;
const MAX_ECHO_SECONDS = 3;
const MIN_ECHO_FEEDBACK = 0;

export const MAX_ECHO_FEEDBACK = 0.89;

export interface ReverbSettings {
  decaySeconds: number;
  damping: number;
}

export interface EchoSettings {
  seconds: number;
  feedback: number;
  tone: number;
}

export function clampEchoFeedback(feedback: number): number {
  return Math.min(MAX_ECHO_FEEDBACK, Math.max(MIN_ECHO_FEEDBACK, feedback));
}

export function assertReverbSettings(settings: ReverbSettings): void {
  if (!(settings.decaySeconds > 0)) {
    throw new Error(`Reverb decaySeconds must be greater than 0, got ${settings.decaySeconds}`);
  }
}

abstract class Effect {
  readonly input: GainNode;
  readonly output: GainNode;
  private readonly nodes = new NodeGroup();

  constructor(protected readonly context: BaseAudioContext) {
    this.input = this.gain(1);
    this.output = this.gain(1);
  }

  dispose(): void {
    this.nodes.dispose();
  }

  protected track<T extends AudioNode>(node: T): T {
    return this.nodes.track(node);
  }

  protected lowpass(frequency: number): BiquadFilterNode {
    return this.track(createFilter(this.context, 'lowpass', frequency));
  }

  protected gain(value: number): GainNode {
    return this.track(createGain(this.context, value));
  }

  protected delay(seconds: number, maxSeconds = DEFAULT_MAX_DELAY_SECONDS): DelayNode {
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
    assertReverbSettings(settings);
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
    const feedback = clampEchoFeedback(settings.feedback);
    const tone = this.lowpass(settings.tone);
    const left = this.delay(settings.seconds, MAX_ECHO_SECONDS);
    const right = this.delay(settings.seconds, MAX_ECHO_SECONDS);
    const toRight = this.gain(feedback);
    const toLeft = this.gain(feedback);
    const merger = this.track(context.createChannelMerger(STEREO_CHANNELS));
    this.input.connect(tone).connect(left);
    left.connect(merger, 0, LEFT);
    left.connect(toRight).connect(right);
    right.connect(merger, 0, RIGHT);
    right.connect(toLeft).connect(tone);
    merger.connect(this.output);
  }
}
