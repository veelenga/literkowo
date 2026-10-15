import { degreesInOctaves } from '../harmony';
import { between, chance, pick, type RandomSource } from '../random';
import type { MotifSpec } from '../specs';
import {
  BARS_PER_CYCLE,
  BARS_PER_PHRASE,
  STEPS_PER_BAR,
  SteppedLayer,
  type LayerContext,
  type StepInfo,
} from './Layer';

type Motif = readonly (number | null)[];

const MOTIF_BARS = 2;
const PHRASE_FORM = [0, 0, 1, 0] as const;
const MOTIF_COUNT = 2;
const EVOLVING_MOTIF = 1;
const CHORD_TONE_DEGREES = [0, 2, 4, 7, 9, 11, 14] as const;
const ARPEGGIO_SHAPES = [
  [0, 1, 2, 3, 2, 1],
  [0, 2, 1, 3, 2, 4, 3, 1],
  [0, 1, 2, 3, 4, 3, 2, 1],
  [0, 2, 3, 1, 4, 2],
] as const;
const MELODY_STEPS = [-2, -1, -1, 0, 1, 1, 2] as const;
const MELODY_ANCHORS = [0, 2, 4, 7, 9] as const;
const OSTINATO_DEGREES = [0, 4, 7, 4, 1, 4, 7, 4] as const;
const VARIATION_STEPS = [-1, 1] as const;
const STRONG_STEP_INTERVAL = 8;
const DEFAULT_MELODY_SPAN = 7;
const HUMANIZE_SECONDS = 0.008;
const VELOCITY_SPREAD = 0.15;
const INTENSITY_VELOCITY_FLOOR = 0.4;
const HARMONY_VELOCITY = 0.7;

export class MotifLayer extends SteppedLayer {
  private readonly motifs: Motif[];
  private readonly slotCount: number;
  private cycle = 0;

  constructor(
    layer: LayerContext,
    private readonly spec: MotifSpec,
  ) {
    super(layer, spec.sections);
    this.slotCount = (MOTIF_BARS * STEPS_PER_BAR) / spec.grid;
    this.motifs = Array.from({ length: MOTIF_COUNT }, () => this.compose(layer.random));
  }

  protected play(step: StepInfo): void {
    this.evolve(step.bar);
    if (step.step % this.spec.grid !== 0) return;
    if (this.spec.followsIntensity && !chance(step.intensity)) return;
    if (chance(this.spec.restChance)) return;
    const value = this.motifValue(step.bar, step.step);
    if (value === null) return;
    const degree = this.resolve(step.chordRoot, this.vary(value));
    const time = step.time + between(0, HUMANIZE_SECONDS);
    const velocity = this.velocity(step.intensity);
    const role = this.spec.followsIntensity ? 'ornament' : 'core';
    this.playNote(this.spec.instrument, { time, degree, velocity, role });
    if (this.spec.harmonyAbove === undefined) return;
    this.playNote(this.spec.instrument, {
      time,
      degree: this.toScale(degree + this.spec.harmonyAbove),
      velocity: velocity * HARMONY_VELOCITY,
      role,
    });
  }

  private compose(random: RandomSource): Motif {
    switch (this.spec.notes) {
      case 'arpeggio':
        return composeArpeggio(this.slotCount, this.spec.fill, random);
      case 'melody':
        return composeMelody(this.slotCount, this.spec, random);
      case 'ostinato':
        return Array.from({ length: this.slotCount }, (_, slot) =>
          cycleThrough(OSTINATO_DEGREES, slot),
        );
    }
  }

  private evolve(bar: number): void {
    const cycle = Math.floor(bar / BARS_PER_CYCLE);
    if (cycle === this.cycle) return;
    this.cycle = cycle;
    this.motifs[EVOLVING_MOTIF] = this.compose(Math.random);
  }

  private motifValue(bar: number, step: number): number | null {
    const segment = Math.floor((bar % BARS_PER_PHRASE) / MOTIF_BARS);
    const motif = this.motifs[PHRASE_FORM[segment]];
    const slot = ((bar % MOTIF_BARS) * STEPS_PER_BAR + step) / this.spec.grid;
    return motif[slot];
  }

  private vary(value: number): number {
    if (this.spec.notes === 'ostinato' || !chance(this.spec.variationChance)) return value;
    return Math.max(0, value + pick(VARIATION_STEPS));
  }

  private resolve(chordRoot: number, value: number): number {
    const base = chordRoot + degreesInOctaves(this.spec.octave);
    if (this.spec.notes === 'arpeggio') {
      return base + CHORD_TONE_DEGREES[Math.min(value, CHORD_TONE_DEGREES.length - 1)];
    }
    return this.toScale(base + value);
  }

  private toScale(degree: number): number {
    return this.spec.notes === 'melody' ? this.layer.harmony.toMelody(degree) : degree;
  }

  private velocity(intensity: number): number {
    const humanized = this.spec.velocity * (1 - between(0, VELOCITY_SPREAD));
    if (!this.spec.followsIntensity) return humanized;
    return humanized * (INTENSITY_VELOCITY_FLOOR + (1 - INTENSITY_VELOCITY_FLOOR) * intensity);
  }
}

function composeArpeggio(slotCount: number, fill: number, random: RandomSource): Motif {
  const shape = pick(ARPEGGIO_SHAPES, random);
  return Array.from({ length: slotCount }, (_, slot) =>
    slot === 0 || chance(fill, random) ? cycleThrough(shape, slot) : null,
  );
}

function composeMelody(slotCount: number, spec: MotifSpec, random: RandomSource): Motif {
  const span = spec.span ?? DEFAULT_MELODY_SPAN;
  let degree: number = pick(MELODY_ANCHORS, random);
  return Array.from({ length: slotCount }, (_, slot) => {
    if (slot !== 0 && !chance(spec.fill, random)) return null;
    degree = clamp(degree + pick(MELODY_STEPS, random), 0, span);
    const isStrong = (slot * spec.grid) % STRONG_STEP_INTERVAL === 0;
    return isStrong ? nearestAnchor(degree) : degree;
  });
}

function nearestAnchor(degree: number): number {
  return MELODY_ANCHORS.reduce<number>(
    (best, anchor) => (Math.abs(anchor - degree) < Math.abs(best - degree) ? anchor : best),
    MELODY_ANCHORS[0],
  );
}

function cycleThrough(values: readonly number[], index: number): number {
  return values[index % values.length];
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}
