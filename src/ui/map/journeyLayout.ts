export type Side = 'start' | 'end';

export interface JourneyPoint {
  readonly x: number;
  readonly y: number;
}

export interface BandLayout {
  readonly top: number;
  readonly height: number;
  readonly headerSide: Side;
  readonly stops: readonly JourneyPoint[];
}

export interface JourneyLayout {
  readonly height: number;
  readonly bands: readonly BandLayout[];
  readonly stops: readonly JourneyPoint[];
}

export const JOURNEY_SPACING = {
  header: 210,
  stop: 150,
  footer: 190,
} as const;

const CENTER = 50;
const SWING = 25;
const GATE_DROP = 0.4;

export function journeyLayout(stopCounts: readonly number[]): JourneyLayout {
  let top = 0;
  const bands = stopCounts.map((count, index) => {
    const band = bandLayout(top, count, index % 2 === 0 ? 'start' : 'end');
    top += band.height;
    return band;
  });
  return { height: top, bands, stops: bands.flatMap((band) => band.stops) };
}

export function gatePoint(band: BandLayout): JourneyPoint {
  const last = band.stops.at(-1) ?? { x: CENTER, y: band.top + JOURNEY_SPACING.header };
  return { x: CENTER * 2 - last.x, y: last.y + JOURNEY_SPACING.footer * GATE_DROP };
}

export function journeyPath(points: readonly JourneyPoint[]): string {
  const [first, ...rest] = points;
  if (!first) return '';
  const curves = rest.map((point, index) => curveTo(points[index], point));
  return `M${first.x} ${first.y}${curves.join('')}`;
}

function curveTo(from: JourneyPoint, to: JourneyPoint): string {
  const middle = (from.y + to.y) / 2;
  return `C${from.x} ${middle} ${to.x} ${middle} ${to.x} ${to.y}`;
}

function bandLayout(top: number, count: number, headerSide: Side): BandLayout {
  const height =
    JOURNEY_SPACING.header + (count - 1) * JOURNEY_SPACING.stop + JOURNEY_SPACING.footer;
  const pathSide = headerSide === 'start' ? 1 : -1;
  const turns = oddTurns(count);
  const stops = Array.from({ length: count }, (_, index) => ({
    x: CENTER + pathSide * SWING * Math.cos((Math.PI * turns * index) / Math.max(1, count - 1)),
    y: top + JOURNEY_SPACING.header + index * JOURNEY_SPACING.stop,
  }));
  return { top, height, headerSide, stops };
}

function oddTurns(count: number): number {
  const steps = Math.max(1, count - 1);
  return steps % 2 === 1 ? steps : steps - 1;
}
