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
