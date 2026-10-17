import { describe, expect, it } from 'vitest';
import { REGIONS, type ThemeId } from '../../course/catalog';
import { MAX_ECHO_FEEDBACK, assertReverbSettings } from './effects';
import { Harmony } from './harmony';
import { STEPS_PER_BAR } from './layers/Layer';
import type { LayerSpec, MusicMood } from './specs';
import { arrangementFor } from './themes';

const THEME_IDS: readonly ThemeId[] = ['meadow', 'forest', 'mountains', 'cave', 'island'];
const MOODS: readonly MusicMood[] = ['calm', 'boss'];
const CASES = THEME_IDS.flatMap((theme) => MOODS.map((mood) => [theme, mood] as const));

function patternOf(spec: LayerSpec): string | undefined {
  return spec.kind === 'drum' || spec.kind === 'bass' ? spec.pattern : undefined;
}

describe('arrangementFor', () => {
  it('covers every theme used by a region', () => {
    REGIONS.forEach((region) => expect(THEME_IDS).toContain(region.theme));
  });

  describe.each(CASES)('%s in %s mood', (theme, mood) => {
    const arrangement = arrangementFor(theme, mood);
    const specs = arrangement.layers.map(({ spec }) => spec);

    it('only keeps layers for the mood', () => {
      expect(specs.length).toBeGreaterThan(0);
      specs.forEach((spec) => expect(spec.mood ?? mood).toBe(mood));
    });

    it('puts bass first and intensity layers last', () => {
      expect(specs[0].kind).toBe('bass');
      const followsIntensity = specs.map(
        (spec) => spec.kind === 'motif' && !!spec.followsIntensity,
      );
      expect(followsIntensity.at(-1)).toBe(true);
      expect(followsIntensity.indexOf(true)).toBe(followsIntensity.length - 1);
    });

    it('gives every layer a stable, unique seed', () => {
      const seeds = arrangement.layers.map(({ seed }) => seed);
      expect(new Set(seeds).size).toBe(seeds.length);
      expect(arrangementFor(theme, mood)).toEqual(arrangement);
    });

    it('builds a valid harmony and space', () => {
      const { tonicMidi, mode, melodyDegrees, space } = arrangement;
      expect(() => new Harmony(tonicMidi, mode, melodyDegrees)).not.toThrow();
      expect(() =>
        assertReverbSettings({ decaySeconds: space.reverbSeconds, damping: space.damping }),
      ).not.toThrow();
      expect(space.echoFeedback).toBeLessThanOrEqual(MAX_ECHO_FEEDBACK);
    });

    it('uses one bar long patterns and grids that fit a bar', () => {
      specs.forEach((spec) => {
        const pattern = patternOf(spec);
        if (pattern !== undefined) expect(pattern).toHaveLength(STEPS_PER_BAR);
        if (spec.kind === 'motif') expect(STEPS_PER_BAR % spec.grid).toBe(0);
      });
    });
  });

  it('speeds up the boss mood', () => {
    THEME_IDS.forEach((theme) => {
      expect(arrangementFor(theme, 'boss').tempo).toBeGreaterThan(
        arrangementFor(theme, 'calm').tempo,
      );
    });
  });
});
