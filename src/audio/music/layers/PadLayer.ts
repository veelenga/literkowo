import { HALF, SEMITONES_PER_OCTAVE, midiToFrequency } from '../../synthesis';
import { degreesInOctaves } from '../harmony';
import type { PadSpec } from '../specs';
import type { LayerContext, StepInfo } from './Layer';
import { SustainedLayer } from './SustainedLayer';

const TONIC_DEGREE = 0;
const CENTER_OFFSET_SEMITONES = 7;
const OPEN_VOICING_STEPS = [0, 4, 7] as const;
const VOICE_COUNT = OPEN_VOICING_STEPS.length;
const DETUNE_DIRECTIONS = [-1, 1] as const;
const RETUNE_SECONDS = 0.25;
const FILTER_RESONANCE_DB = 2;
const CHORUS_DELAY_SECONDS = 0.014;
const CHORUS_DEPTH_SECONDS = 0.004;
const CHORUS_RATE = 0.27;
const CHORUS_MIX = 0.7;

export class PadLayer extends SustainedLayer {
  private readonly oscillators: OscillatorNode[][] = [];
  private currentRoot: number | undefined;
  private frequencies: number[] = [];

  constructor(
    layer: LayerContext,
    private readonly spec: PadSpec,
  ) {
    super(layer);
  }

  protected build(time: number): void {
    const filter = this.buildFilter();
    const tremolo = this.createTremolo();
    const amp = this.gain(0);
    amp.gain.setValueAtTime(0, time);
    amp.gain.linearRampToValueAtTime(1, time + this.spec.attack);
    filter.connect(tremolo).connect(amp);
    this.connectOutput(amp);
    const mix = this.gain(1 / (VOICE_COUNT * DETUNE_DIRECTIONS.length));
    mix.connect(filter);
    for (let voice = 0; voice < VOICE_COUNT; voice += 1) {
      this.oscillators.push(
        DETUNE_DIRECTIONS.map((direction) => this.createOscillator(direction, mix)),
      );
    }
  }

  protected update(step: StepInfo): void {
    const root = this.spec.followsChords ? step.chordRoot : TONIC_DEGREE;
    if (root === this.currentRoot) return;
    this.currentRoot = root;
    const frequencies = this.chordMidis(root).map(midiToFrequency);
    frequencies.forEach((frequency, voice) => this.retune(voice, frequency, step.time));
    this.frequencies = frequencies;
  }

  private retune(voice: number, frequency: number, time: number): void {
    const previous = this.frequencies.at(voice) ?? frequency;
    this.oscillators[voice].forEach((oscillator) => {
      oscillator.frequency.setValueAtTime(previous, time);
      oscillator.frequency.exponentialRampToValueAtTime(frequency, time + RETUNE_SECONDS);
    });
  }

  private createOscillator(direction: number, destination: AudioNode): OscillatorNode {
    const oscillator = this.source(this.layer.context.createOscillator());
    oscillator.type = this.spec.wave;
    oscillator.detune.value = direction * this.spec.detuneCents;
    oscillator.connect(destination);
    return oscillator;
  }

  private chordMidis(root: number): number[] {
    const { harmony } = this.layer;
    const octaveDegrees = degreesInOctaves(this.spec.octave);
    if (this.spec.voicing === 'open') {
      return OPEN_VOICING_STEPS.map((step) => harmony.midi(root + step + octaveDegrees));
    }
    const center =
      harmony.tonicMidi + this.spec.octave * SEMITONES_PER_OCTAVE + CENTER_OFFSET_SEMITONES;
    return harmony
      .triad(root)
      .map((midi) => nearestOctave(midi, center))
      .sort((low, high) => low - high);
  }

  private buildFilter(): BiquadFilterNode {
    const filter = this.filter('lowpass', this.spec.cutoff, FILTER_RESONANCE_DB);
    this.lfo({ rate: this.spec.sweepRate, depth: this.spec.sweepDepth, target: filter.frequency });
    return filter;
  }

  private createTremolo(): GainNode {
    const depth = this.spec.tremoloDepth ?? 0;
    const tremolo = this.gain(1 - depth * HALF);
    if (depth && this.spec.tremoloPerBeat) {
      const rate = this.spec.tremoloPerBeat / this.layer.beatSeconds;
      this.lfo({ rate, depth: depth * HALF, target: tremolo.gain });
    }
    return tremolo;
  }

  private connectOutput(amp: GainNode): void {
    const { context, destination } = this.layer;
    amp.connect(destination);
    if (!this.spec.chorus) return;
    const chorus = this.track(context.createDelay());
    chorus.delayTime.value = CHORUS_DELAY_SECONDS;
    this.lfo({ rate: CHORUS_RATE, depth: CHORUS_DEPTH_SECONDS, target: chorus.delayTime });
    amp.connect(chorus).connect(this.gain(CHORUS_MIX)).connect(destination);
  }
}

function nearestOctave(midi: number, center: number): number {
  const octaves = Math.round((center - midi) / SEMITONES_PER_OCTAVE);
  return midi + octaves * SEMITONES_PER_OCTAVE;
}
