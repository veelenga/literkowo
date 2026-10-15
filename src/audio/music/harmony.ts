import { SEMITONES_PER_OCTAVE, midiToFrequency } from '../synthesis';

export const DEGREES_PER_OCTAVE = 7;

const TRIAD_STEPS = [0, 2, 4] as const;
const SNAP_STEPS = Array.from({ length: DEGREES_PER_OCTAVE }, (_, step) => step);

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
    if (melodyDegrees) assertMelodyDegrees(melodyDegrees);
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
    const allowed = this.melodyDegrees;
    if (!allowed) return degree;
    const snap = SNAP_STEPS.find((step) =>
      allowed.includes(positiveModulo(degree + step, DEGREES_PER_OCTAVE)),
    );
    return degree + (snap ?? 0);
  }
}

export function degreesInOctaves(octaves: number): number {
  return octaves * DEGREES_PER_OCTAVE;
}

function assertMelodyDegrees(degrees: readonly number[]): void {
  if (degrees.length === 0) throw new Error('Harmony melodyDegrees must not be empty');
  const invalid = degrees.find((degree) => !isScaleDegree(degree));
  if (invalid === undefined) return;
  throw new Error(
    `Harmony melodyDegrees must be whole numbers from 0 to ${DEGREES_PER_OCTAVE - 1}, got ${invalid}`,
  );
}

function isScaleDegree(value: number): boolean {
  return Number.isInteger(value) && value >= 0 && value < DEGREES_PER_OCTAVE;
}

function positiveModulo(value: number, divisor: number): number {
  return ((value % divisor) + divisor) % divisor;
}
