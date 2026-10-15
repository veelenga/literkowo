export type Child = Node | string | null | undefined | false;

const SVG_NS = 'http://www.w3.org/2000/svg';
const REDUCED_MOTION_QUERY = '(prefers-reduced-motion: reduce)';
const COUNT_DURATION_MS = 450;

export function present(...items: Child[]): Array<Node | string> {
  return items.filter((item): item is Node | string => Boolean(item));
}

type EventHandlers = {
  [K in keyof HTMLElementEventMap as `on${Capitalize<K>}`]?: (
    event: HTMLElementEventMap[K],
  ) => void;
};

type AttributeProps = {
  class?: string;
  text?: string;
  html?: string;
  title?: string;
  type?: string;
  placeholder?: string;
  style?: string;
  src?: string;
  alt?: string;
  draggable?: 'true' | 'false';
  disabled?: boolean;
  maxlength?: number;
  autocomplete?: string;
  [aria: `aria-${string}`]: string | undefined;
  [data: `data-${string}`]: string | undefined;
};

export type ElementProps = AttributeProps & EventHandlers;

type PropValue = ElementProps[keyof ElementProps];

const EVENT_PREFIX = 'on';

export function el<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  props: ElementProps = {},
  ...children: Child[]
): HTMLElementTagNameMap[K] {
  const element = document.createElement(tag);
  for (const [key, value] of Object.entries(props)) applyProp(element, key, value);
  element.append(...present(...children));
  return element;
}

function applyProp(element: HTMLElement, key: string, value: PropValue): void {
  if (value === undefined || value === false) return;
  if (typeof value === 'function') {
    element.addEventListener(key.slice(EVENT_PREFIX.length).toLowerCase(), { handleEvent: value });
  } else if (key === 'class') element.className = String(value);
  else if (key === 'text') element.textContent = String(value);
  else if (key === 'html') element.innerHTML = String(value);
  else element.setAttribute(key, value === true ? '' : String(value));
}

export function svg<K extends keyof SVGElementTagNameMap>(
  tag: K,
  attributes: Record<string, string | number> = {},
  ...children: SVGElement[]
): SVGElementTagNameMap[K] {
  const element = document.createElementNS(SVG_NS, tag);
  for (const [key, value] of Object.entries(attributes)) element.setAttribute(key, String(value));
  element.append(...children);
  return element;
}

export function releaseFocus(event: Event): void {
  if (event.currentTarget instanceof HTMLElement) event.currentTarget.blur();
}

export function prefersReducedMotion(): boolean {
  return window.matchMedia(REDUCED_MOTION_QUERY).matches;
}

export function restartAnimation(element: Element, className: string): void {
  element.classList.remove(className);
  element.getBoundingClientRect();
  element.classList.add(className);
}

function easeOutCubic(progress: number): number {
  return 1 - Math.pow(1 - progress, 3);
}

export class Counter {
  private shown = 0;
  private target = 0;
  private frame = 0;

  constructor(
    readonly element: HTMLElement,
    private readonly format: (value: number) => string = (value) => String(Math.round(value)),
    private readonly duration = COUNT_DURATION_MS,
  ) {
    this.render(0);
  }

  set(value: number): void {
    if (value === this.target) return;
    this.target = value;
    this.stop();
    if (prefersReducedMotion()) return this.render(value);
    this.animate(this.shown, value, performance.now());
  }

  stop(): void {
    cancelAnimationFrame(this.frame);
  }

  private animate(from: number, to: number, startedAt: number): void {
    const step = (now: number) => {
      const progress = Math.min(1, (now - startedAt) / this.duration);
      this.render(from + (to - from) * easeOutCubic(progress));
      if (progress < 1) this.frame = requestAnimationFrame(step);
    };
    this.frame = requestAnimationFrame(step);
  }

  private render(value: number): void {
    this.shown = value;
    this.element.textContent = this.format(value);
  }
}

const ICON_PATHS = {
  star: 'M12 2.6l2.83 5.95 6.53.78-4.82 4.49 1.25 6.46L12 17.1l-5.79 3.18 1.25-6.46-4.82-4.49 6.53-.78z',
  heart:
    'M12 20.5C6 16.2 2.5 12.9 2.5 8.9 2.5 6 4.7 3.8 7.5 3.8c1.9 0 3.5 1 4.5 2.6 1-1.6 2.6-2.6 4.5-2.6 2.8 0 5 2.2 5 5.1 0 4-3.5 7.3-9.5 11.6z',
  crown: 'M3 8l4.5 3.5L12 4l4.5 7.5L21 8l-1.8 9.5H4.8zM4.8 19h14.4v2.2H4.8z',
  lock: 'M7 10V7.5a5 5 0 0 1 10 0V10h.5a1.5 1.5 0 0 1 1.5 1.5v8a1.5 1.5 0 0 1-1.5 1.5h-11A1.5 1.5 0 0 1 5 19.5v-8A1.5 1.5 0 0 1 6.5 10zm2.2 0h5.6V7.5a2.8 2.8 0 0 0-5.6 0z',
  pause: 'M6.5 4.5h4v15h-4zM13.5 4.5h4v15h-4z',
  soundOn:
    'M3 9.5h3.8L12 5v14l-5.2-4.5H3zM15.2 8.6a4.6 4.6 0 0 1 0 6.8l-1.3-1.4a2.7 2.7 0 0 0 0-4zm2.6-2.8a8.4 8.4 0 0 1 0 12.4l-1.3-1.4a6.5 6.5 0 0 0 0-9.6z',
  soundOff:
    'M3 9.5h3.8L12 5v14l-5.2-4.5H3zm12.1-.9 2.2 2.2 2.2-2.2 1.4 1.4-2.2 2.2 2.2 2.2-1.4 1.4-2.2-2.2-2.2 2.2-1.4-1.4 2.2-2.2-2.2-2.2z',
} as const;

export type IconName = keyof typeof ICON_PATHS;

export function icon(name: IconName, className: string): SVGSVGElement {
  return svg(
    'svg',
    { viewBox: '0 0 24 24', class: className, 'aria-hidden': 'true' },
    svg('path', { d: ICON_PATHS[name], 'fill-rule': 'evenodd' }),
  );
}

export function fingerColor(finger: string | undefined): string {
  return `var(--finger-${finger ?? 'thumb'})`;
}
