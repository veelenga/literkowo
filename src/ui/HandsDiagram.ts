import { FINGER_COLORS, fingerFor, type Finger } from '../course/fingers';

const SVG_NS = 'http://www.w3.org/2000/svg';
const WIDTH = 360;
const HEIGHT = 150;

interface FingerShape {
  finger: Finger;
  x: number;
  height: number;
}

const LEFT_FINGERS: FingerShape[] = [
  { finger: 'leftPinky', x: 20, height: 52 },
  { finger: 'leftRing', x: 48, height: 74 },
  { finger: 'leftMiddle', x: 76, height: 84 },
  { finger: 'leftIndex', x: 104, height: 74 },
];

const RIGHT_FINGERS: FingerShape[] = LEFT_FINGERS.map((shape) => ({
  finger: shape.finger.replace('left', 'right') as Finger,
  x: WIDTH - shape.x - 22,
  height: shape.height,
}));

const PALM = { width: 118, height: 70, y: 78 };
const FINGER_WIDTH = 22;
const THUMB = { width: 20, height: 48 };

export function handsDiagram(highlightKeys: string): SVGSVGElement {
  const highlighted = new Set([...highlightKeys].map(fingerFor).filter(Boolean));
  const svg = document.createElementNS(SVG_NS, 'svg');
  svg.setAttribute('viewBox', `0 0 ${WIDTH} ${HEIGHT}`);
  svg.setAttribute('class', 'hands');
  svg.append(palm(14), palm(WIDTH - PALM.width - 14));
  svg.append(thumb(14 + PALM.width - 6, highlighted.has('thumb')));
  svg.append(thumb(WIDTH - PALM.width - 14 - THUMB.width + 6, highlighted.has('thumb')));
  [...LEFT_FINGERS, ...RIGHT_FINGERS].forEach((shape) => {
    svg.append(finger(shape, highlighted.has(shape.finger)));
  });
  return svg;
}

function palm(x: number): SVGRectElement {
  const rect = document.createElementNS(SVG_NS, 'rect');
  rect.setAttribute('x', String(x));
  rect.setAttribute('y', String(PALM.y));
  rect.setAttribute('width', String(PALM.width));
  rect.setAttribute('height', String(PALM.height));
  rect.setAttribute('rx', '22');
  rect.setAttribute('class', 'hand-palm');
  return rect;
}

function thumb(x: number, active: boolean): SVGRectElement {
  const rect = document.createElementNS(SVG_NS, 'rect');
  rect.setAttribute('x', String(x));
  rect.setAttribute('y', String(PALM.y + 10));
  rect.setAttribute('width', String(THUMB.width));
  rect.setAttribute('height', String(THUMB.height));
  rect.setAttribute('rx', '10');
  rect.setAttribute('class', active ? 'hand-finger is-active' : 'hand-finger');
  rect.style.setProperty('--finger', FINGER_COLORS.thumb);
  return rect;
}

function finger(shape: FingerShape, active: boolean): SVGRectElement {
  const rect = document.createElementNS(SVG_NS, 'rect');
  rect.setAttribute('x', String(shape.x));
  rect.setAttribute('y', String(PALM.y + 8 - shape.height));
  rect.setAttribute('width', String(FINGER_WIDTH));
  rect.setAttribute('height', String(shape.height + 8));
  rect.setAttribute('rx', '11');
  rect.setAttribute('class', active ? 'hand-finger is-active' : 'hand-finger');
  rect.style.setProperty('--finger', FINGER_COLORS[shape.finger]);
  return rect;
}
