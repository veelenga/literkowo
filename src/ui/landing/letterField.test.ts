import { describe, expect, it } from 'vitest';
import { LETTER_GLOWS, letterField } from './letterField';

const COUNT = 24;

describe('letterField', () => {
  it('builds the requested number of particles', () => {
    expect(letterField(COUNT)).toHaveLength(COUNT);
  });

  it('is the same on every visit', () => {
    expect(letterField(COUNT)).toEqual(letterField(COUNT));
  });

  it('keeps particles inside the screen and drifting upwards', () => {
    letterField(COUNT).forEach((particle) => {
      expect(particle.x).toBeGreaterThan(0);
      expect(particle.x).toBeLessThan(100);
      expect(particle.y).toBeGreaterThan(0);
      expect(particle.y).toBeLessThan(100);
      expect(particle.driftY).toBeLessThan(0);
      expect(particle.char).toHaveLength(1);
      expect(LETTER_GLOWS).toContain(particle.glow);
    });
  });
});
