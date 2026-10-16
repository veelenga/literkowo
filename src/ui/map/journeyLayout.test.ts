import { describe, expect, it } from 'vitest';
import type { LevelKind } from '../../course/catalog';
import {
  JOURNEY_SPACING,
  journeyLayout,
  journeyPath,
  stopRoles,
  type BandSpec,
} from './journeyLayout';

const REGION_KINDS: readonly LevelKind[] = [
  'learn',
  'practice',
  'review',
  'learn',
  'practice',
  'learn',
  'practice',
  'review',
  'boss',
];
const PAIR_COUNT = 3;
const FIRST_BAND: BandSpec = { roles: stopRoles(REGION_KINDS) };
const NEXT_BAND: BandSpec = { roles: stopRoles(REGION_KINDS) };
const COURSE = [FIRST_BAND, NEXT_BAND, NEXT_BAND];
const PRECISION = 6;
const LEFT = 30;
const RIGHT = 70;

describe('stopRoles', () => {
  it('hangs a learn level on the practice level of the same key', () => {
    expect(stopRoles(REGION_KINDS)).toEqual([
      'satellite',
      'stop',
      'stop',
      'satellite',
      'stop',
      'satellite',
      'stop',
      'stop',
      'boss',
    ]);
  });

  it('keeps a learn level without practice as its own stop', () => {
    expect(stopRoles(['learn', 'review'])).toEqual(['stop', 'stop']);
  });
});

describe('journeyLayout', () => {
  it('stacks one band per region without gaps', () => {
    const layout = journeyLayout(COURSE);
    layout.bands.forEach((band, index) => {
      const previous = layout.bands[index - 1];
      expect(band.top).toBe(previous ? previous.top + previous.height : 0);
    });
    const last = layout.bands[layout.bands.length - 1];
    expect(layout.height).toBe(last.top + last.height);
  });

  it('runs the road through two stops per row in a snake', () => {
    const [band] = journeyLayout(COURSE).bands;
    expect(band.road).toHaveLength(REGION_KINDS.length - PAIR_COUNT);
    expect(band.road.map((point) => point.x)).toEqual([RIGHT, LEFT, LEFT, RIGHT, RIGHT, LEFT]);
    const rows = band.road.map((point) => point.y - band.top);
    const { header, row } = JOURNEY_SPACING;
    expect(rows).toEqual([
      header,
      header,
      header + row,
      header + row,
      header + 2 * row,
      header + 2 * row,
    ]);
  });

  it('hangs each learn satellite next to its practice stop, on the side the row comes from', () => {
    const [band] = journeyLayout(COURSE).bands;
    const [learn, practice] = band.stops;
    expect(learn).toMatchObject({ x: practice.x, y: practice.y, role: 'satellite', shift: 1 });
    expect(practice.shift).toBe(0);
    const secondRow = band.stops[3];
    expect(secondRow).toMatchObject({ role: 'satellite', shift: -1 });
  });

  it('maps every level to its place on the road', () => {
    const { roadIndex, road } = journeyLayout(COURSE);
    expect(roadIndex.slice(0, REGION_KINDS.length)).toEqual([0, 0, 1, 2, 2, 3, 3, 4, 5]);
    expect(roadIndex.at(-1)).toBe(road.length - 1);
  });

  it('enters the next band in the column the previous band left, with the header across', () => {
    const { bands } = journeyLayout(COURSE);
    bands.slice(1).forEach((band, index) => {
      const exit = bands[index].road.at(-1);
      expect(band.road[0].x).toBeCloseTo(exit?.x ?? 0, PRECISION);
      expect(band.headerSide).toBe(band.road[0].x > 50 ? 'start' : 'end');
    });
  });

  it('makes room for the hero above the row of the current level', () => {
    const plain = journeyLayout(COURSE).bands[1];
    const focused = journeyLayout(COURSE, REGION_KINDS.length + 3).bands[1];
    expect(focused.road[1].y).toBe(plain.road[1].y);
    expect(focused.road[2].y - plain.road[2].y).toBe(JOURNEY_SPACING.heroRoom);
    expect(focused.height - plain.height).toBe(JOURNEY_SPACING.heroRoom);
  });

  it('keeps every stop inside the track', () => {
    journeyLayout(COURSE).bands.forEach((band) =>
      band.stops.forEach((stop) => {
        expect(stop.x).toBeGreaterThan(0);
        expect(stop.x).toBeLessThan(100);
      }),
    );
  });
});

describe('journeyPath', () => {
  it('waves along a row and bulges out in the turns', () => {
    const points = [
      { x: 30, y: 100 },
      { x: 70, y: 100 },
      { x: 70, y: 200 },
    ];
    expect(journeyPath(points)).toBe(
      `M30 100C${30 + 40 / 3} 114 ${70 - 40 / 3} 86 70 100C84 100 84 200 70 200`,
    );
  });

  it('is empty without stops', () => {
    expect(journeyPath([])).toBe('');
  });
});
