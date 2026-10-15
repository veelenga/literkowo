import { describe, expect, it } from 'vitest';
import { JOURNEY_SPACING, gatePoint, journeyLayout, journeyPath } from './journeyLayout';

const POLISH_COURSE = [5, 4, 4, 5, 4];
const PRECISION = 6;

describe('journeyLayout', () => {
  it('stacks one band per region without gaps', () => {
    const layout = journeyLayout(POLISH_COURSE);
    layout.bands.forEach((band, index) => {
      const previous = layout.bands[index - 1];
      expect(band.top).toBe(previous ? previous.top + previous.height : 0);
    });
    const last = layout.bands[layout.bands.length - 1];
    expect(layout.height).toBe(last.top + last.height);
  });

  it('places every stop in order from top to bottom', () => {
    const { stops } = journeyLayout(POLISH_COURSE);
    expect(stops).toHaveLength(22);
    stops.slice(1).forEach((stop, index) => expect(stop.y).toBeGreaterThan(stops[index].y));
  });

  it('puts the gate in the footer of a band, across from its last stop', () => {
    const [band, next] = journeyLayout(POLISH_COURSE).bands;
    const last = band.stops[band.stops.length - 1];
    const gate = gatePoint(band);
    expect(gate.x).toBeCloseTo(100 - last.x, PRECISION);
    expect(gate.y).toBeGreaterThan(last.y);
    expect(gate.y).toBeLessThan(next.top);
  });

  it('alternates the side of the region headers', () => {
    const sides = journeyLayout(POLISH_COURSE).bands.map((band) => band.headerSide);
    expect(sides).toEqual(['start', 'end', 'start', 'end', 'start']);
  });

  it('starts each band on the side away from its header', () => {
    const { bands } = journeyLayout(POLISH_COURSE);
    bands.forEach((band) => {
      const first = band.stops[0];
      if (band.headerSide === 'start') expect(first.x).toBeGreaterThan(50);
      else expect(first.x).toBeLessThan(50);
    });
  });

  it('enters the next band on the same side the previous band left', () => {
    const { bands } = journeyLayout(POLISH_COURSE);
    bands.slice(1).forEach((band, index) => {
      const exit = bands[index].stops[bands[index].stops.length - 1];
      expect(band.stops[0].x).toBeCloseTo(exit.x, PRECISION);
    });
  });

  it('keeps room for the header above the first stop of a band', () => {
    const [band] = journeyLayout(POLISH_COURSE).bands;
    expect(band.stops[0].y - band.top).toBe(JOURNEY_SPACING.header);
  });

  it('keeps every stop inside the track', () => {
    journeyLayout(POLISH_COURSE).stops.forEach((stop) => {
      expect(stop.x).toBeGreaterThan(0);
      expect(stop.x).toBeLessThan(100);
    });
  });
});

describe('journeyPath', () => {
  it('leaves and enters each stop vertically', () => {
    const points = [
      { x: 20, y: 100 },
      { x: 80, y: 300 },
      { x: 40, y: 400 },
    ];
    expect(journeyPath(points)).toBe('M20 100C20 200 80 200 80 300C80 350 40 350 40 400');
  });

  it('is empty without stops', () => {
    expect(journeyPath([])).toBe('');
  });
});
