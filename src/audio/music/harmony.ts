import { midiToFrequency } from '../synthesis';

const DEGREES_PER_OCTAVE = 7;
const SEMITONES_PER_OCTAVE = 12;
const TRIAD_STEPS = [0, 2, 4] as const;

export const MODES = {
  lydian: [0, 2, 4, 6, 7, 9, 11],
  ionian: [0, 2, 4, 5, 7, 9, 11],
  mixolydian: [0, 2, 4, 5, 7, 9, 10],
  dorian: [0, 2, 3, 5, 7, 9, 10],
  aeolian: [0, 2, 3, 5, 7, 8, 10],
  phrygian: [0, 1, 3, 5, 7, 8, 10],
} as const;

export type ModeName = keyof typeof MODES;

export class Harmony {
  private readonly intervals: readonly number[];

  constructor(
    readonly tonicMidi: number,
    mode: ModeName,
    private readonly melodyDegrees?: readonly number[],
  ) {
    this.intervals = MODES[mode];
  }

  midi(degree: number): number {
    const octave = Math.floor(degree / DEGREES_PER_OCTAVE);
    const index = degree - octave * DEGREES_PER_OCTAVE;
    return this.tonicMidi + octave * SEMITONES_PER_OCTAVE + this.intervals[index];
  }

  frequency(degree: number): number {
    return midiToFrequency(this.midi(degree));
  }

  triad(root: number): number[] {
    return TRIAD_STEPS.map((step) => this.midi(root + step));
  }

  toMelody(degree: number): number {
    if (!this.melodyDegrees) return degree;
    let snapped = degree;
    while (!this.melodyDegrees.includes(positiveModulo(snapped, DEGREES_PER_OCTAVE))) snapped += 1;
    return snapped;
  }
}

export function degreesInOctaves(octaves: number): number {
  return octaves * DEGREES_PER_OCTAVE;
}

function positiveModulo(value: number, divisor: number): number {
  return ((value % divisor) + divisor) % divisor;
}
