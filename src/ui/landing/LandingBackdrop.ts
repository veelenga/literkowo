import { el, svg } from '../dom';
import { letterField, type LetterParticle } from './letterField';

const PARTICLE_COUNT = 22;
const HILL_WIDTH = 1600;
const HILL_HEIGHT = 400;
const TILE_OFFSETS = [-1, 0, 1, 2, 3];
const HALF = 0.5;
const POINTER_X = '--pointer-x';
const POINTER_Y = '--pointer-y';
const STRETCH = 'none';
const FINE_POINTER_QUERY = '(hover: hover) and (pointer: fine)';

type Point = readonly [x: number, y: number];

const HILLS: readonly (readonly Point[])[] = [
  [
    [0, 150],
    [180, 90],
    [420, 160],
    [640, 70],
    [900, 150],
    [1120, 96],
    [1380, 170],
    [1600, 150],
  ],
  [
    [0, 210],
    [240, 150],
    [520, 220],
    [760, 160],
    [1040, 230],
    [1300, 150],
    [1600, 210],
  ],
  [
    [0, 270],
    [300, 220],
    [600, 280],
    [880, 214],
    [1200, 284],
    [1440, 240],
    [1600, 270],
  ],
  [
    [0, 330],
    [360, 290],
    [760, 340],
    [1120, 296],
    [1600, 330],
  ],
];

export class LandingBackdrop {
  readonly element: HTMLElement;
  private frame = 0;

  constructor(private readonly animated: boolean) {
    this.element = el(
      'div',
      {
        class: animated ? 'landing-backdrop is-animated' : 'landing-backdrop',
        'aria-hidden': 'true',
      },
      el('div', { class: 'backdrop-sky' }),
      el('div', { class: 'backdrop-sun' }),
      ...HILLS.map(hillLayer),
      animated ? particleLayer(letterField(PARTICLE_COUNT)) : null,
    );
  }

  followPointer(surface: HTMLElement): void {
    if (!this.animated || !window.matchMedia(FINE_POINTER_QUERY).matches) return;
    surface.addEventListener('pointermove', (event) => this.aim(event.clientX, event.clientY));
  }

  dispose(): void {
    cancelAnimationFrame(this.frame);
  }

  private aim(clientX: number, clientY: number): void {
    cancelAnimationFrame(this.frame);
    this.frame = requestAnimationFrame(() => {
      this.element.style.setProperty(POINTER_X, offsetFromCenter(clientX, window.innerWidth));
      this.element.style.setProperty(POINTER_Y, offsetFromCenter(clientY, window.innerHeight));
    });
  }
}

function offsetFromCenter(position: number, size: number): string {
  return (position / size - HALF).toFixed(3);
}

function hillLayer(points: readonly Point[], depth: number): HTMLElement {
  const period = points.slice(0, -1);
  const tiled = TILE_OFFSETS.flatMap((tile) =>
    period.map(([x, y]): Point => [x + tile * HILL_WIDTH, y]),
  );
  const hills = svg(
    'svg',
    { viewBox: `0 0 ${HILL_WIDTH * 2} ${HILL_HEIGHT}`, preserveAspectRatio: STRETCH },
    svg('path', { d: smoothRidge(tiled) }),
  );
  return el('div', { class: `backdrop-hills hills-${depth}` }, hills);
}

function smoothRidge(points: readonly Point[]): string {
  const [first, ...rest] = points;
  const curves = rest.slice(0, -1).map(([x, y], index) => {
    const [nextX, nextY] = rest[index + 1];
    return `Q${x} ${y} ${(x + nextX) / 2} ${(y + nextY) / 2}`;
  });
  const [lastX, lastY] = points[points.length - 1];
  return `M${first[0]} ${HILL_HEIGHT}V${first[1]}${curves.join('')}L${lastX} ${lastY}V${HILL_HEIGHT}Z`;
}

function particleLayer(particles: readonly LetterParticle[]): HTMLElement {
  return el('div', { class: 'letter-field' }, ...particles.map(particle));
}

function particle(letter: LetterParticle): HTMLElement {
  const style = [
    `--x: ${letter.x.toFixed(1)}%`,
    `--y: ${letter.y.toFixed(1)}%`,
    `--size: ${letter.size.toFixed(2)}rem`,
    `--drift-x: ${letter.driftX.toFixed(0)}px`,
    `--drift-y: ${letter.driftY.toFixed(0)}px`,
    `--drift: ${letter.driftSeconds.toFixed(1)}s`,
    `--twinkle: ${letter.twinkleSeconds.toFixed(1)}s`,
    `--delay: ${letter.delaySeconds.toFixed(1)}s`,
  ].join('; ');
  return el('span', { class: `letter-particle glow-${letter.glow}`, text: letter.char, style });
}
