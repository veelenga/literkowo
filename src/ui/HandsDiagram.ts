import { fingerFor, needsRightAlt, type Finger } from '../course/fingers';
import { fingerColor, svg } from './dom';

const WIDTH = 440;
const HEIGHT = 196;
const FINGER_WIDTH = 24;
const FINGER_OVERLAP = 22;
const PIVOT_DROP = 10;
const TIP_LABEL_OFFSET = 17;
const PALM = { x: 28, y: 104, width: 132, height: 86, radius: 30, waist: 0.56, wrist: 0.24 };
const THUMB = { inset: 16, drop: 46, length: 60, angle: 50 };

interface FingerSpec {
  finger: Finger;
  x: number;
  length: number;
  angle: number;
  home: string;
}

interface HandSpec {
  fingers: FingerSpec[];
  palmX: number;
  thumbX: number;
  thumbAngle: number;
  pressesAlt: boolean;
}

const LEFT_FINGERS: FingerSpec[] = [
  { finger: 'leftPinky', x: 44, length: 52, angle: -14, home: 'A' },
  { finger: 'leftRing', x: 74, length: 72, angle: -6, home: 'S' },
  { finger: 'leftMiddle', x: 104, length: 82, angle: 0, home: 'D' },
  { finger: 'leftIndex', x: 134, length: 72, angle: 7, home: 'F' },
];

const RIGHT_HOME: Partial<Record<Finger, string>> = {
  rightIndex: 'J',
  rightMiddle: 'K',
  rightRing: 'L',
  rightPinky: ';',
};

const LEFT_HAND: HandSpec = {
  fingers: LEFT_FINGERS,
  palmX: PALM.x,
  thumbX: PALM.x + PALM.width - THUMB.inset,
  thumbAngle: THUMB.angle,
  pressesAlt: false,
};

const RIGHT_HAND: HandSpec = {
  fingers: LEFT_FINGERS.map(mirrorFinger),
  palmX: WIDTH - PALM.x - PALM.width,
  thumbX: WIDTH - LEFT_HAND.thumbX,
  thumbAngle: -THUMB.angle,
  pressesAlt: true,
};

function mirrorFinger(spec: FingerSpec): FingerSpec {
  const finger = spec.finger.replace('left', 'right') as Finger;
  return {
    finger,
    x: WIDTH - spec.x,
    length: spec.length,
    angle: -spec.angle,
    home: RIGHT_HOME[finger] ?? '',
  };
}

export function handsDiagram(highlightKeys: string): SVGSVGElement {
  const keys = [...highlightKeys];
  const active = new Set(keys.map(fingerFor).filter(Boolean));
  const usesAlt = keys.some(needsRightAlt);
  return svg(
    'svg',
    { viewBox: `0 0 ${WIDTH} ${HEIGHT}`, class: 'hands', 'aria-hidden': 'true' },
    hand(LEFT_HAND, active, usesAlt),
    hand(RIGHT_HAND, active, usesAlt),
  );
}

function hand(spec: HandSpec, active: Set<Finger | undefined>, usesAlt: boolean): SVGGElement {
  const thumbActive = active.has('thumb') || (usesAlt && spec.pressesAlt);
  const thumbSpec: FingerSpec = {
    finger: 'thumb',
    x: spec.thumbX,
    length: THUMB.length,
    angle: spec.thumbAngle,
    home: '',
  };
  return svg(
    'g',
    { class: 'hand' },
    ...spec.fingers.map((shape) => finger(shape, PALM.y, active.has(shape.finger))),
    finger(thumbSpec, PALM.y + THUMB.drop, thumbActive),
    palm(spec.palmX),
  );
}

function palm(x: number): SVGPathElement {
  const { y, width, height, radius } = PALM;
  const right = x + width;
  const bottom = y + height;
  const waist = y + height * PALM.waist;
  const wristInset = width * PALM.wrist;
  const d = [
    `M${x + radius} ${y}H${right - radius}`,
    `Q${right} ${y} ${right} ${y + radius}V${waist}`,
    `Q${right} ${bottom} ${right - wristInset} ${bottom}H${x + wristInset}`,
    `Q${x} ${bottom} ${x} ${waist}V${y + radius}`,
    `Q${x} ${y} ${x + radius} ${y}Z`,
  ].join('');
  return svg('path', { d, class: 'hand-palm' });
}

function finger(shape: FingerSpec, rootY: number, isActive: boolean): SVGGElement {
  const top = rootY - shape.length;
  const group = svg(
    'g',
    {
      class: isActive ? 'hand-finger is-active' : 'hand-finger',
      transform: `rotate(${shape.angle} ${shape.x} ${rootY + PIVOT_DROP})`,
    },
    svg('rect', {
      x: shape.x - FINGER_WIDTH / 2,
      y: top,
      width: FINGER_WIDTH,
      height: shape.length + FINGER_OVERLAP,
      rx: FINGER_WIDTH / 2,
      class: 'hand-finger-body',
    }),
  );
  group.style.setProperty('--finger', fingerColor(shape.finger));
  if (shape.home) group.append(tipLabel(shape.x, top + TIP_LABEL_OFFSET, shape.home));
  return group;
}

function tipLabel(x: number, y: number, text: string): SVGTextElement {
  const label = svg('text', { x, y, class: 'hand-tip', 'text-anchor': 'middle' });
  label.textContent = text;
  return label;
}
