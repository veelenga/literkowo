import type { LevelKind } from '../../course/catalog';

export type Side = 'start' | 'end';
export type StopRole = 'satellite' | 'stop' | 'boss';
type Column = -1 | 1;
type Shift = Column | 0;

export interface JourneyPoint {
  readonly x: number;
  readonly y: number;
}

export interface JourneyStop extends JourneyPoint {
  readonly role: StopRole;
  readonly shift: Shift;
}

export interface BandSpec {
  readonly roles: readonly StopRole[];
}

export interface BandLayout {
  readonly top: number;
  readonly height: number;
  readonly headerSide: Side;
  readonly stops: readonly JourneyStop[];
  readonly road: readonly JourneyPoint[];
  readonly roadIndex: readonly number[];
}

export interface JourneyLayout {
  readonly height: number;
  readonly bands: readonly BandLayout[];
  readonly road: readonly JourneyPoint[];
  readonly roadIndex: readonly number[];
}

export const JOURNEY_SPACING = {
  header: 148,
  row: 112,
  footer: 40,
  heroRoom: 72,
} as const;

export const NO_FOCUS = -1;

const CENTER = 50;
const SWING = 20;
const TURN_BULGE = 14;
const ROAD_WAVE = 14;
const THIRD = 3;
const SLOTS_PER_ROW = 2;
const FIRST_COLUMN: Column = 1;

interface Slot {
  readonly main: number;
  readonly satellites: readonly number[];
}

interface Placement {
  readonly point: JourneyPoint;
  readonly lead: Column;
}

export function stopRoles(kinds: readonly LevelKind[]): StopRole[] {
  return kinds.map((kind, index) => {
    if (kind === 'boss') return 'boss';
    return kind === 'learn' && kinds[index + 1] === 'practice' ? 'satellite' : 'stop';
  });
}

export function journeyLayout(specs: readonly BandSpec[], focus = NO_FOCUS): JourneyLayout {
  let top = 0;
  let entry = FIRST_COLUMN;
  let first = 0;
  const roadIndex: number[] = [];
  const road: JourneyPoint[] = [];
  const bands = specs.map((spec) => {
    const band = bandLayout(spec, top, entry, focus - first);
    const roadStart = road.length;
    roadIndex.push(...band.roadIndex.map((slot) => roadStart + slot));
    road.push(...band.road);
    top += band.height;
    entry = columnOf(band.road.at(-1)?.x ?? CENTER);
    first += spec.roles.length;
    return band;
  });
  return { height: top, bands, road, roadIndex };
}

export function journeyPath(points: readonly JourneyPoint[]): string {
  const [first, ...rest] = points;
  if (!first) return '';
  const curves = rest.map((point, index) => curveTo(points[index], point));
  return `M${first.x} ${first.y}${curves.join('')}`;
}

function curveTo(from: JourneyPoint, to: JourneyPoint): string {
  if (from.x === to.x) {
    const bulge = from.x + columnOf(from.x) * TURN_BULGE;
    return `C${bulge} ${from.y} ${bulge} ${to.y} ${to.x} ${to.y}`;
  }
  const step = (to.x - from.x) / THIRD;
  return `C${from.x + step} ${from.y + ROAD_WAVE} ${to.x - step} ${to.y - ROAD_WAVE} ${to.x} ${to.y}`;
}

function bandLayout(spec: BandSpec, top: number, entry: Column, focus: number): BandLayout {
  const slots = slotsOf(spec.roles);
  const placements = placeSlots(slots, top, entry, focus);
  const road = placements.map((placement) => placement.point);
  const roadIndex = slotIndexes(slots, spec.roles.length);
  const stops = spec.roles.map((role, index) => stopOf(role, placements[roadIndex[index]]));
  const last = road.at(-1)?.y ?? top + JOURNEY_SPACING.header;
  return {
    top,
    height: last - top + JOURNEY_SPACING.footer,
    headerSide: entry === FIRST_COLUMN ? 'start' : 'end',
    stops,
    road,
    roadIndex,
  };
}

function placeSlots(
  slots: readonly Slot[],
  top: number,
  entry: Column,
  focus: number,
): Placement[] {
  const placements: Placement[] = [];
  let y = top + JOURNEY_SPACING.header;
  let column = entry;
  for (let start = 0; start < slots.length; start += SLOTS_PER_ROW) {
    const row = slots.slice(start, start + SLOTS_PER_ROW);
    if (row.some((slot) => holds(slot, focus))) y += JOURNEY_SPACING.heroRoom;
    const lead = column;
    row.forEach((_, index) => {
      const side = index === 0 ? column : opposite(column);
      placements.push({ point: { x: columnX(side), y }, lead });
    });
    column = row.length === SLOTS_PER_ROW ? opposite(column) : column;
    y += JOURNEY_SPACING.row;
  }
  return placements;
}

function stopOf(role: StopRole, { point, lead }: Placement): JourneyStop {
  return { ...point, role, shift: role === 'satellite' ? lead : 0 };
}

function slotsOf(roles: readonly StopRole[]): Slot[] {
  const slots: Slot[] = [];
  let satellites: number[] = [];
  roles.forEach((role, index) => {
    if (role === 'satellite' && index < roles.length - 1) {
      satellites.push(index);
      return;
    }
    slots.push({ main: index, satellites });
    satellites = [];
  });
  return slots;
}

function slotIndexes(slots: readonly Slot[], stopCount: number): number[] {
  return Array.from({ length: stopCount }, (_, index) =>
    slots.findIndex((slot) => holds(slot, index)),
  );
}

function holds(slot: Slot, level: number): boolean {
  return slot.main === level || slot.satellites.includes(level);
}

function columnX(column: Column): number {
  return CENTER + column * SWING;
}

function columnOf(x: number): Column {
  return x < CENTER ? -1 : 1;
}

function opposite(column: Column): Column {
  return column === 1 ? -1 : 1;
}
