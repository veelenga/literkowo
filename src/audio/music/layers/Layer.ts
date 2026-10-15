import type { Harmony } from '../harmony';
import { DRUMS, INSTRUMENTS, type DrumId, type InstrumentId } from '../instruments';
import type { RandomSource } from '../random';
import type { VoiceBudget, VoiceRole } from '../VoiceBudget';

export const STEPS_PER_BAR = 16;
export const STEPS_PER_BEAT = 4;
export const BARS_PER_PHRASE = 8;
export const PHRASES_PER_CYCLE = 4;
export const BARS_PER_CYCLE = BARS_PER_PHRASE * PHRASES_PER_CYCLE;

export interface StepInfo {
  time: number;
  step: number;
  bar: number;
  chordRoot: number;
  stepSeconds: number;
  intensity: number;
}

export interface LayerContext {
  context: BaseAudioContext;
  destination: AudioNode;
  harmony: Harmony;
  budget: VoiceBudget;
  random: RandomSource;
  beatSeconds: number;
}

export interface NoteEvent {
  time: number;
  degree: number;
  velocity: number;
  role?: VoiceRole;
}

export interface Layer {
  onStep(step: StepInfo): void;
  release?(time: number): void;
  dispose?(): void;
}

export abstract class SteppedLayer implements Layer {
  constructor(
    protected readonly layer: LayerContext,
    private readonly sections?: readonly number[],
  ) {}

  onStep(step: StepInfo): void {
    if (this.isInSection(step.bar)) this.play(step);
  }

  protected abstract play(step: StepInfo): void;

  protected playNote(instrument: InstrumentId, note: NoteEvent): void {
    const { context, destination, budget, harmony } = this.layer;
    const { time, velocity } = note;
    const frequency = harmony.frequency(note.degree);
    budget.play(
      time,
      () => INSTRUMENTS[instrument]({ context, destination, time, velocity }, frequency),
      note.role,
    );
  }

  protected playDrum(drum: DrumId, time: number, velocity: number): void {
    const { context, destination, budget } = this.layer;
    budget.play(time, () => DRUMS[drum]({ context, destination, time, velocity }));
  }

  private isInSection(bar: number): boolean {
    if (!this.sections) return true;
    const phrase = Math.floor(bar / BARS_PER_PHRASE) % PHRASES_PER_CYCLE;
    return this.sections.includes(phrase);
  }
}
