import { createGain } from '../synthesis';
import { Channel } from './Channel';
import { FdnReverb, PingPongDelay } from './effects';
import { Harmony } from './harmony';
import { createLayer } from './layers/createLayer';
import { STEPS_PER_BAR, STEPS_PER_BEAT, type Layer, type StepInfo } from './layers/Layer';
import { createSeededRandom } from './random';
import type { Arrangement } from './specs';
import type { VoiceBudget } from './VoiceBudget';

const SCHEDULER_INTERVAL_MS = 25;
const LOOKAHEAD_SECONDS = 0.25;
const START_DELAY_SECONDS = 0.05;
const DISPOSE_MARGIN_SECONDS = 0.25;
const ECHO_TO_REVERB = 0.25;
const SECONDS_PER_MINUTE = 60;
const SILENT_OFFSET = 0;
const RUNNING: AudioContextState = 'running';
const SWING_STEP_PARITY = 2;

export interface SessionOptions {
  context: AudioContext;
  destination: AudioNode;
  arrangement: Arrangement;
  budget: VoiceBudget;
}

export class MusicSession {
  private readonly context: AudioContext;
  private readonly arrangement: Arrangement;
  private readonly output: GainNode;
  private readonly echoToReverb: GainNode;
  private readonly reverb: FdnReverb;
  private readonly echo: PingPongDelay;
  private readonly channels: Channel[] = [];
  private readonly layers: Layer[];
  private readonly beatSeconds: number;
  private readonly stepSeconds: number;
  private readonly onStateChange = (): void => this.syncScheduler();
  private timer: number | undefined;
  private nextStepTime = 0;
  private stepIndex = 0;
  private intensity = 0;

  constructor({ context, destination, arrangement, budget }: SessionOptions) {
    this.context = context;
    this.arrangement = arrangement;
    this.beatSeconds = SECONDS_PER_MINUTE / arrangement.tempo;
    this.stepSeconds = this.beatSeconds / STEPS_PER_BEAT;
    this.output = createGain(context, 0);
    this.output.connect(destination);
    const { space } = arrangement;
    this.reverb = new FdnReverb(context, {
      decaySeconds: space.reverbSeconds,
      damping: space.damping,
    });
    this.echo = new PingPongDelay(context, {
      seconds: space.echoBeats * this.beatSeconds,
      feedback: space.echoFeedback,
      tone: space.echoTone,
    });
    this.echoToReverb = createGain(context, ECHO_TO_REVERB);
    this.reverb.output.connect(this.output);
    this.echo.output.connect(this.output);
    this.echo.output.connect(this.echoToReverb).connect(this.reverb.input);
    this.layers = this.createLayers(budget);
  }

  start(fadeSeconds: number): void {
    const now = this.context.currentTime;
    this.output.gain.setValueAtTime(0, now);
    this.output.gain.linearRampToValueAtTime(1, now + fadeSeconds);
    this.nextStepTime = now + START_DELAY_SECONDS;
    this.context.addEventListener('statechange', this.onStateChange);
    this.syncScheduler();
  }

  fadeOut(fadeSeconds: number): void {
    this.context.removeEventListener('statechange', this.onStateChange);
    this.stopScheduler();
    const now = this.context.currentTime;
    const end = now + fadeSeconds;
    this.output.gain.cancelScheduledValues(now);
    this.output.gain.setValueAtTime(this.output.gain.value, now);
    this.output.gain.linearRampToValueAtTime(0, end);
    this.layers.forEach((layer) => layer.release?.(end));
    this.disposeAt(end + DISPOSE_MARGIN_SECONDS);
  }

  setIntensity(value: number): void {
    this.intensity = value;
  }

  private createLayers(budget: VoiceBudget): Layer[] {
    const { context, arrangement } = this;
    const harmony = new Harmony(arrangement.tonicMidi, arrangement.mode, arrangement.melodyDegrees);
    const targets = { dry: this.output, reverb: this.reverb.input, echo: this.echo.input };
    return arrangement.layers.map(({ spec, seed }) => {
      const channel = new Channel(context, spec.channel, targets);
      this.channels.push(channel);
      return createLayer(spec, {
        context,
        destination: channel.input,
        harmony,
        budget,
        random: createSeededRandom(seed),
        beatSeconds: this.beatSeconds,
      });
    });
  }

  private syncScheduler(): void {
    if (this.context.state === RUNNING) this.startScheduler();
    else this.stopScheduler();
  }

  private startScheduler(): void {
    if (this.timer !== undefined) return;
    this.timer = window.setInterval(() => this.schedule(), SCHEDULER_INTERVAL_MS);
    this.schedule();
  }

  private stopScheduler(): void {
    window.clearInterval(this.timer);
    this.timer = undefined;
  }

  private schedule(): void {
    const { currentTime } = this.context;
    if (this.nextStepTime < currentTime) this.nextStepTime = currentTime + START_DELAY_SECONDS;
    while (this.nextStepTime < currentTime + LOOKAHEAD_SECONDS) {
      this.playStep();
      this.nextStepTime += this.stepSeconds;
      this.stepIndex += 1;
    }
  }

  private playStep(): void {
    const step = this.stepIndex % STEPS_PER_BAR;
    const bar = Math.floor(this.stepIndex / STEPS_PER_BAR);
    const info: StepInfo = {
      time: this.nextStepTime + this.swingOffset(step),
      step,
      bar,
      chordRoot: this.chordRootAt(bar),
      stepSeconds: this.stepSeconds,
      intensity: this.intensity,
    };
    this.layers.forEach((layer) => layer.onStep(info));
  }

  private swingOffset(step: number): number {
    const isOffbeat = step % SWING_STEP_PARITY === 1;
    return isOffbeat ? this.arrangement.swing * this.stepSeconds : 0;
  }

  private chordRootAt(bar: number): number {
    const { progression, barsPerChord } = this.arrangement;
    return progression[Math.floor(bar / barsPerChord) % progression.length];
  }

  private disposeAt(time: number): void {
    const clock = this.context.createConstantSource();
    clock.offset.value = SILENT_OFFSET;
    clock.connect(this.output);
    clock.onended = () => {
      clock.disconnect();
      this.dispose();
    };
    clock.start();
    clock.stop(time);
  }

  private dispose(): void {
    this.layers.forEach((layer) => layer.dispose?.());
    this.channels.forEach((channel) => channel.dispose());
    this.reverb.dispose();
    this.echo.dispose();
    this.echoToReverb.disconnect();
    this.output.disconnect();
  }
}
