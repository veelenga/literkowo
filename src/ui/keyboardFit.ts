export interface ViewportMetrics {
  readonly layoutHeight: number;
  readonly visualHeight: number;
  readonly offsetTop: number;
  readonly scale: number;
}

export interface VisibleArea {
  readonly top: number;
  readonly height: number;
}

export const KEYBOARD_OPEN_ATTRIBUTE = 'data-keyboard-open';
const VISIBLE_TOP = '--visible-top';
const VISIBLE_HEIGHT = '--visible-height';
const KEYBOARD_MIN_HEIGHT = 150;
const UNZOOMED_SCALE = 1.01;

export function areaAboveKeyboard(metrics: ViewportMetrics): VisibleArea | undefined {
  if (metrics.scale > UNZOOMED_SCALE) return undefined;
  const height = Math.round(metrics.visualHeight);
  if (metrics.layoutHeight - height < KEYBOARD_MIN_HEIGHT) return undefined;
  return { top: Math.max(0, Math.round(metrics.offsetTop)), height };
}

export function fitAboveKeyboard(root: HTMLElement = document.documentElement): () => void {
  const viewport = window.visualViewport;
  if (!viewport) return () => undefined;
  const update = () => applyArea(root, areaAboveKeyboard(readMetrics(root, viewport)));
  viewport.addEventListener('resize', update);
  viewport.addEventListener('scroll', update);
  update();
  return () => {
    viewport.removeEventListener('resize', update);
    viewport.removeEventListener('scroll', update);
    applyArea(root, undefined);
  };
}

function readMetrics(root: HTMLElement, viewport: VisualViewport): ViewportMetrics {
  return {
    layoutHeight: root.clientHeight,
    visualHeight: viewport.height,
    offsetTop: viewport.offsetTop,
    scale: viewport.scale,
  };
}

function applyArea(root: HTMLElement, area: VisibleArea | undefined): void {
  root.toggleAttribute(KEYBOARD_OPEN_ATTRIBUTE, Boolean(area));
  if (!area) {
    root.style.removeProperty(VISIBLE_TOP);
    root.style.removeProperty(VISIBLE_HEIGHT);
    return;
  }
  root.style.setProperty(VISIBLE_TOP, `${area.top}px`);
  root.style.setProperty(VISIBLE_HEIGHT, `${area.height}px`);
}
