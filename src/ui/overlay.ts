export interface Overlay {
  readonly element: HTMLElement;
  dispose(): void;
}

type Cleanup = () => void;

export const KEY_READY_MS = 600;
const ESCAPE_KEY = 'Escape';

export function createOverlay(element: HTMLElement, ...cleanups: Cleanup[]): Overlay {
  let disposed = false;
  return {
    element,
    dispose: () => {
      if (disposed) return;
      disposed = true;
      cleanups.forEach((cleanup) => cleanup());
      element.remove();
    },
  };
}

type KeyHandler = (event: KeyboardEvent) => void;

export function onWindowKey(handler: KeyHandler): Cleanup {
  window.addEventListener('keydown', handler);
  return () => window.removeEventListener('keydown', handler);
}

export function claimEscapeKey(handler: () => void): Cleanup {
  const listener = (event: KeyboardEvent): void => {
    if (event.key !== ESCAPE_KEY) return;
    event.preventDefault();
    event.stopImmediatePropagation();
    handler();
  };
  window.addEventListener('keydown', listener, true);
  return () => window.removeEventListener('keydown', listener, true);
}

export type ShortcutKeys = Readonly<Partial<Record<string, () => void>>>;

const CLOSE_KEY = 'Escape';
const ACTIVATE_KEY = 'Enter';
const REPEATABLE_KEYS: ReadonlySet<string> = new Set([
  'ArrowLeft',
  'ArrowRight',
  'ArrowUp',
  'ArrowDown',
]);
const INERT_SELECTOR = '[inert]';
const FIELD_SELECTOR = 'input, textarea, select, [contenteditable="true"]';
const CONTROL_SELECTOR = `button, a[href], ${FIELD_SELECTOR}`;

export function onShortcutKeys(scope: HTMLElement, keys: ShortcutKeys): Cleanup {
  return onWindowKey((event) => {
    const action = keys[event.key];
    if (!action || !isShortcut(scope, event)) return;
    event.preventDefault();
    action();
  });
}

export function stepWithin(index: number, direction: number, length: number): number {
  return Math.min(Math.max(index + direction, 0), length - 1);
}

function isShortcut(scope: HTMLElement, event: KeyboardEvent): boolean {
  if (scope.closest(INERT_SELECTOR) || hasModifier(event) || event.isComposing) return false;
  if (event.repeat && !REPEATABLE_KEYS.has(event.key)) return false;
  if (event.key === CLOSE_KEY) return true;
  const target = event.target instanceof Element ? event.target : null;
  const blocker = event.key === ACTIVATE_KEY ? CONTROL_SELECTOR : FIELD_SELECTOR;
  return !target?.closest(blocker);
}

function hasModifier(event: KeyboardEvent): boolean {
  return event.ctrlKey || event.metaKey || event.altKey;
}

export function onWindowKeyAfter(delayMs: number, handler: KeyHandler): Cleanup {
  let stopListening: Cleanup | undefined;
  const timer = window.setTimeout(() => {
    stopListening = onWindowKey(handler);
  }, delayMs);
  return () => {
    window.clearTimeout(timer);
    stopListening?.();
  };
}

export class OverlaySlot {
  private current: Overlay | undefined;

  constructor(
    private readonly host: HTMLElement,
    private readonly background: HTMLElement,
  ) {}

  open(overlay: Overlay): void {
    this.close();
    this.current = overlay;
    this.background.toggleAttribute('inert', true);
    this.host.append(overlay.element);
  }

  close(): void {
    this.current?.dispose();
    this.current = undefined;
    this.background.toggleAttribute('inert', false);
  }

  release(overlay: Overlay): void {
    if (this.current === overlay) this.close();
  }
}
