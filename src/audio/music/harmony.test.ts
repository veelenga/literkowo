import { describe, expect, it } from 'vitest';
import { DEGREES_PER_OCTAVE, Harmony, degreesInOctaves } from './harmony';

const TONIC = 60;
const PENTATONIC = [0, 1, 2, 4, 5] as const;

describe('Harmony', () => {
  it('maps scale degrees to midi notes across octaves', () => {
    const harmony = new Harmony(TONIC, 'ionian');
    expect(harmony.midi(0)).toBe(60);
    expect(harmony.midi(2)).toBe(64);
    expect(harmony.midi(DEGREES_PER_OCTAVE)).toBe(72);
    expect(harmony.midi(-1)).toBe(59);
  });

  it('builds triads from the mode', () => {
    expect(new Harmony(TONIC, 'aeolian').triad(0)).toEqual([60, 63, 67]);
    expect(new Harmony(TONIC, 'ionian').triad(4)).toEqual([67, 71, 74]);
  });

  it('converts degrees to frequency', () => {
    expect(new Harmony(57, 'aeolian').frequency(0)).toBeCloseTo(220);
  });

  it('leaves degrees unchanged without melody degrees', () => {
    expect(new Harmony(TONIC, 'dorian').toMelody(3)).toBe(3);
  });

  it('snaps up to the next melody degree', () => {
    const harmony = new Harmony(TONIC, 'ionian', PENTATONIC);
    expect(harmony.toMelody(2)).toBe(2);
    expect(harmony.toMelody(3)).toBe(4);
    expect(harmony.toMelody(6)).toBe(7);
    expect(harmony.toMelody(-1)).toBe(0);
  });

  it('counts degrees in whole octaves', () => {
    expect(degreesInOctaves(2)).toBe(14);
    expect(degreesInOctaves(-1)).toBe(-7);
  });

  it.each([
    ['empty', []],
    ['out of range', [7]],
    ['negative', [-1, 0]],
    ['fractional', [0.5]],
  ])('rejects %s melody degrees', (_, degrees) => {
    expect(() => new Harmony(TONIC, 'ionian', degrees)).toThrow(/melodyDegrees/);
  });
});
