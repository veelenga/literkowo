import type { ThemeId } from '../../course/catalog';

export type ArtLayerName = 'ceiling' | 'sky' | 'far' | 'mid' | 'near';
export type ArtAnchor = 'top' | 'bottom';

export interface ArtLayer {
  readonly name: ArtLayerName;
  readonly anchor: ArtAnchor;
  readonly markup: string;
}

export const ART_WIDTH = 1600;
export const ART_HEIGHT = 680;
export const CEILING_HEIGHT = 260;

type Point = readonly [x: number, y: number];
type Dot = readonly [x: number, y: number, radius: number];
type Pine = readonly [x: number, base: number, height: number];
type Stalactite = readonly [x: number, width: number, length: number];
type Crystal = readonly [x: number, base: number, height: number, half: number];
type Cloud = readonly [x: number, y: number, scale: number];
type Cap = readonly [x: number, y: number, size: number];

const PINE_HALF_WIDTH = 0.36;
const PINE_TIER = 0.5;
const PINE_FOOT = 0.1;
const PINE_INNER = 0.45;
const PINE_SHOULDER = 0.7;
const CRYSTAL_SHOULDER = 0.6;
const WAVE_LENGTH = 200;
const SPARK_HALO = 3.2;
const SNOW_NOTCH_X = 0.4;
const SNOW_NOTCH_Y = 0.72;
const SNOW_TIP_Y = 1.05;

function shape(className: string, paths: readonly string[]): string {
  return `<path class="${className}" d="${paths.join('')}"/>`;
}

function dots(className: string, points: readonly Dot[]): string {
  return points
    .map(([x, y, radius]) => `<circle class="${className}" cx="${x}" cy="${y}" r="${radius}"/>`)
    .join('');
}

function ridge(points: readonly Point[]): string {
  const [first, ...rest] = points;
  const curves = rest.slice(0, -1).map(([x, y], index) => {
    const [nextX, nextY] = rest[index + 1];
    return `Q${x} ${y} ${(x + nextX) / 2} ${(y + nextY) / 2}`;
  });
  const [lastX, lastY] = points[points.length - 1];
  return `M${first[0]} ${ART_HEIGHT}V${first[1]}${curves.join('')}L${lastX} ${lastY}V${ART_HEIGHT}Z`;
}

function peaks(points: readonly Point[]): string {
  const outline = points.map(([x, y]) => `L${x} ${y}`).join('');
  return `M${points[0][0]} ${ART_HEIGHT}${outline}V${ART_HEIGHT}Z`;
}

function wave(level: number, height: number): string {
  const quarter = WAVE_LENGTH / 4;
  const crests = Array.from(
    { length: ART_WIDTH / WAVE_LENGTH },
    (_, index) => `T${(index + 1) * WAVE_LENGTH} ${level}`,
  );
  return `M0 ${level}Q${quarter} ${level - height} ${WAVE_LENGTH / 2} ${level}${crests.join('')}V${ART_HEIGHT}H0Z`;
}

function pine([x, base, height]: Pine): string {
  const half = Math.round(height * PINE_HALF_WIDTH);
  const tier = Math.round(base - height * PINE_TIER);
  const foot = Math.round(base - height * PINE_FOOT);
  const inner = Math.round(half * PINE_INNER);
  const shoulder = Math.round(half * PINE_SHOULDER);
  return `M${x} ${base - height}L${x + shoulder} ${tier}H${x + inner}L${x + half} ${foot}V${base}H${x - half}V${foot}L${x - inner} ${tier}H${x - shoulder}Z`;
}

function stalactite([x, width, length]: Stalactite): string {
  return `M${x - width / 2} 0L${x} ${length}L${x + width / 2} 0Z`;
}

function crystal([x, base, height, half]: Crystal): string {
  const shoulder = Math.round(base - height * CRYSTAL_SHOULDER);
  return `M${x - half} ${base}V${shoulder}L${x} ${base - height}L${x + half} ${shoulder}V${base}Z`;
}

function snowCap([x, y, size]: Cap): string {
  const notchX = size * SNOW_NOTCH_X;
  const notchY = y + size * SNOW_NOTCH_Y;
  const tip = y + size * SNOW_TIP_Y;
  return `M${x} ${y}L${x + size} ${y + size}L${x + notchX} ${notchY}L${x} ${tip}L${x - notchX} ${notchY}L${x - size} ${y + size}Z`;
}

function clouds(points: readonly Cloud[]): string {
  return points
    .map(
      ([x, y, scale]) =>
        `<g class="art-cloud" transform="translate(${x} ${y}) scale(${scale})"><ellipse cx="0" cy="0" rx="90" ry="26"/><circle cx="-34" cy="-14" r="30"/><circle cx="12" cy="-26" r="38"/><circle cx="52" cy="-8" r="24"/></g>`,
    )
    .join('');
}

function sun(theme: ThemeId, [x, y, radius]: Dot, haloRadius: number): string {
  const halo = `art-halo-${theme}`;
  const gradient = `<defs><radialGradient id="${halo}"><stop offset="0" class="art-halo-core"/><stop offset="1" class="art-halo-edge"/></radialGradient></defs>`;
  const glow = `<circle cx="${x}" cy="${y}" r="${haloRadius}" fill="url(#${halo})"/>`;
  return gradient + glow + dots('art-sun', [[x, y, radius]]);
}

function sparks(points: readonly Dot[]): string {
  const halos = points.map(([x, y, radius]): Dot => [x, y, radius * SPARK_HALO]);
  return dots('art-spark-halo', halos) + dots('art-spark', points);
}

const MEADOW_FLOWERS: Dot[] = [
  [170, 478, 4],
  [250, 470, 3],
  [330, 482, 4],
  [560, 494, 3],
  [820, 458, 4],
  [900, 466, 3],
  [1120, 490, 4],
  [1360, 462, 3],
  [1450, 470, 4],
  [700, 470, 3],
  [1010, 476, 4],
];

const MEADOW: ArtLayer[] = [
  {
    name: 'sky',
    anchor: 'bottom',
    markup:
      sun('meadow', [1180, 250, 62], 230) +
      clouds([
        [330, 190, 1],
        [960, 150, 0.8],
        [1420, 220, 0.7],
      ]),
  },
  {
    name: 'far',
    anchor: 'bottom',
    markup: shape('art-far', [
      ridge([
        [0, 440],
        [200, 392],
        [430, 430],
        [690, 372],
        [960, 420],
        [1230, 360],
        [1460, 408],
        [1600, 388],
      ]),
    ]),
  },
  {
    name: 'mid',
    anchor: 'bottom',
    markup:
      shape('art-mid', [
        ridge([
          [0, 505],
          [240, 458],
          [520, 498],
          [800, 446],
          [1090, 492],
          [1350, 452],
          [1600, 488],
        ]),
      ]) + dots('art-accent', MEADOW_FLOWERS),
  },
  {
    name: 'near',
    anchor: 'bottom',
    markup: shape('art-near', [
      ridge([
        [0, 575],
        [280, 540],
        [600, 572],
        [900, 536],
        [1220, 566],
        [1460, 542],
        [1600, 556],
      ]),
    ]),
  },
];

const FAR_PINE_HEIGHTS = [150, 190, 130, 170, 210, 140, 180];
const FAR_PINE_SPOTS = [
  30, 95, 150, 230, 300, 360, 450, 520, 600, 660, 750, 830, 900, 980, 1060, 1130, 1200, 1290, 1350,
  1430, 1500, 1570,
];
const MID_PINE_HEIGHTS = [220, 260, 200, 240, 280, 210];
const MID_PINE_SPOTS = [60, 170, 290, 420, 560, 700, 840, 980, 1110, 1250, 1380, 1510];

function pineRow(spots: readonly number[], heights: readonly number[], base: number): Pine[] {
  return spots.map((x, index) => [x, base, heights[index % heights.length]]);
}

const FOREST: ArtLayer[] = [
  {
    name: 'sky',
    anchor: 'bottom',
    markup:
      sun('forest', [420, 190, 38], 150) +
      sparks([
        [260, 330, 4],
        [520, 260, 3],
        [760, 380, 4],
        [1010, 300, 3],
        [1240, 350, 4],
        [1400, 270, 3],
        [640, 440, 3],
        [1120, 430, 3],
      ]),
  },
  {
    name: 'far',
    anchor: 'bottom',
    markup: shape('art-far', [
      ridge([
        [0, 470],
        [400, 455],
        [800, 472],
        [1200, 458],
        [1600, 470],
      ]),
      ...pineRow(FAR_PINE_SPOTS, FAR_PINE_HEIGHTS, 480).map(pine),
    ]),
  },
  {
    name: 'mid',
    anchor: 'bottom',
    markup: shape('art-mid', [
      ridge([
        [0, 548],
        [500, 530],
        [1000, 550],
        [1600, 535],
      ]),
      ...pineRow(MID_PINE_SPOTS, MID_PINE_HEIGHTS, 560).map(pine),
    ]),
  },
  {
    name: 'near',
    anchor: 'bottom',
    markup: shape('art-near', [
      ridge([
        [0, 610],
        [420, 585],
        [820, 606],
        [1240, 588],
        [1600, 604],
      ]),
      ...(
        [
          [40, 650, 330],
          [150, 650, 280],
          [1460, 650, 300],
          [1570, 650, 350],
        ] satisfies Pine[]
      ).map(pine),
    ]),
  },
];

const MOUNTAINS: ArtLayer[] = [
  {
    name: 'sky',
    anchor: 'bottom',
    markup:
      sun('mountains', [1120, 190, 44], 170) +
      clouds([
        [300, 260, 0.7],
        [1360, 330, 0.6],
      ]),
  },
  {
    name: 'far',
    anchor: 'bottom',
    markup:
      shape('art-far', [
        peaks([
          [0, 430],
          [140, 320],
          [260, 372],
          [420, 212],
          [560, 340],
          [700, 262],
          [860, 350],
          [1000, 190],
          [1160, 330],
          [1300, 246],
          [1460, 342],
          [1600, 290],
        ]),
      ]) +
      shape(
        'art-snow',
        (
          [
            [420, 212, 34],
            [700, 262, 24],
            [1000, 190, 40],
            [1300, 246, 30],
          ] satisfies Cap[]
        ).map(snowCap),
      ),
  },
  {
    name: 'mid',
    anchor: 'bottom',
    markup:
      shape('art-mid', [
        peaks([
          [0, 505],
          [180, 410],
          [330, 476],
          [520, 380],
          [700, 482],
          [880, 396],
          [1060, 474],
          [1240, 388],
          [1420, 474],
          [1600, 416],
        ]),
      ]) +
      shape(
        'art-snow art-snow-soft',
        (
          [
            [520, 380, 24],
            [1240, 388, 24],
          ] satisfies Cap[]
        ).map(snowCap),
      ),
  },
  {
    name: 'near',
    anchor: 'bottom',
    markup: shape('art-near', [
      ridge([
        [0, 585],
        [240, 528],
        [470, 574],
        [720, 520],
        [960, 578],
        [1210, 530],
        [1430, 572],
        [1600, 546],
      ]),
    ]),
  },
];

const STALACTITES: Stalactite[] = [
  [60, 70, 150],
  [170, 44, 90],
  [290, 90, 190],
  [420, 50, 110],
  [560, 64, 140],
  [700, 40, 80],
  [860, 80, 170],
  [1000, 46, 100],
  [1130, 70, 160],
  [1260, 40, 90],
  [1380, 84, 200],
  [1500, 50, 120],
  [1580, 40, 70],
];

const CAVE_CRYSTALS: Crystal[] = [
  [210, 500, 90, 18],
  [178, 500, 48, 10],
  [980, 505, 110, 20],
  [945, 505, 54, 11],
  [1420, 500, 80, 16],
  [560, 512, 64, 13],
];

const CAVE_GEMS: Crystal[] = [
  [250, 500, 56, 12],
  [1025, 505, 70, 14],
  [1455, 500, 50, 10],
  [590, 512, 40, 9],
  [760, 515, 46, 10],
];

const CAVE_FLOOR_CRYSTALS: Crystal[] = [
  [620, 585, 60, 12],
  [120, 600, 74, 15],
  [1290, 594, 66, 13],
];

const CAVE_FLOOR_GEMS: Crystal[] = [
  [650, 585, 38, 8],
  [152, 600, 44, 9],
  [1320, 594, 40, 8],
];

const CAVE: ArtLayer[] = [
  {
    name: 'ceiling',
    anchor: 'top',
    markup: shape('art-ceiling', [
      'M0 0H1600V40Q1200 70 800 45T0 52Z',
      ...STALACTITES.map(stalactite),
    ]),
  },
  {
    name: 'sky',
    anchor: 'bottom',
    markup: sparks([
      [220, 300, 3],
      [480, 240, 2],
      [780, 330, 3],
      [1040, 270, 2],
      [1320, 320, 3],
      [1460, 250, 2],
      [640, 400, 2],
    ]),
  },
  {
    name: 'far',
    anchor: 'bottom',
    markup: shape('art-far', [
      ridge([
        [0, 420],
        [180, 380],
        [400, 440],
        [620, 370],
        [880, 430],
        [1120, 372],
        [1360, 436],
        [1600, 392],
      ]),
    ]),
  },
  {
    name: 'mid',
    anchor: 'bottom',
    markup:
      shape('art-mid', [
        ridge([
          [0, 520],
          [300, 486],
          [600, 520],
          [900, 490],
          [1200, 526],
          [1600, 496],
        ]),
      ]) +
      shape('art-crystal', CAVE_CRYSTALS.map(crystal)) +
      shape('art-gem', CAVE_GEMS.map(crystal)),
  },
  {
    name: 'near',
    anchor: 'bottom',
    markup:
      shape('art-near', [
        ridge([
          [0, 590],
          [400, 560],
          [800, 592],
          [1200, 566],
          [1600, 586],
        ]),
      ]) +
      shape('art-crystal', CAVE_FLOOR_CRYSTALS.map(crystal)) +
      shape('art-gem', CAVE_FLOOR_GEMS.map(crystal)),
  },
];

const PALM_LEAVES = [
  'M400 330Q350 292 296 320Q352 310 400 330Z',
  'M400 330Q426 282 484 294Q436 302 400 330Z',
  'M400 330Q460 322 494 362Q446 334 400 330Z',
  'M400 330Q364 328 330 370Q366 336 400 330Z',
  'M400 330Q392 288 414 256Q406 292 400 330Z',
];

const ISLAND: ArtLayer[] = [
  {
    name: 'sky',
    anchor: 'bottom',
    markup:
      sun('island', [1130, 470, 110], 340) +
      sparks([
        [120, 140, 2],
        [300, 80, 3],
        [520, 170, 2],
        [760, 110, 2],
        [980, 60, 3],
        [1300, 130, 2],
        [1500, 90, 3],
      ]),
  },
  {
    name: 'far',
    anchor: 'bottom',
    markup:
      shape('art-far', [wave(470, 8)]) +
      shape('art-glint', ['M1050 492h160v5h-160z', 'M1080 512h100v5h-100z', 'M1105 532h50v5h-50z']),
  },
  {
    name: 'mid',
    anchor: 'bottom',
    markup:
      shape('art-mid', [wave(540, 12)]) +
      shape('art-sand', ['M170 566Q360 470 590 566Z', 'M1250 548Q1370 500 1500 548Z']) +
      '<path class="art-trunk" d="M372 520Q352 420 400 330"/>' +
      shape('art-leaf', PALM_LEAVES),
  },
  {
    name: 'near',
    anchor: 'bottom',
    markup: shape('art-near', [wave(610, 14)]),
  },
];

const REGION_ART: Record<ThemeId, readonly ArtLayer[]> = {
  meadow: MEADOW,
  forest: FOREST,
  mountains: MOUNTAINS,
  cave: CAVE,
  island: ISLAND,
};

export function regionArt(theme: ThemeId): readonly ArtLayer[] {
  return REGION_ART[theme];
}
