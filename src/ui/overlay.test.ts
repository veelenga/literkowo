import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  claimEscapeKey,
  createOverlay,
  onWindowKey,
  onWindowKeyAfter,
  OverlaySlot,
} from './overlay';

const DELAY_MS = 600;

function pressEnter(): void {
  window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter' }));
}

function setup() {
  const host = document.createElement('div');
  const background = document.createElement('div');
  host.append(background);
  return { host, background, slot: new OverlaySlot(host, background) };
}

function overlayWith(cleanup = vi.fn()) {
  return { overlay: createOverlay(document.createElement('div'), cleanup), cleanup };
}

describe('OverlaySlot', () => {
  it('shows one overlay and makes the background inert', () => {
    const { host, background, slot } = setup();
    const { overlay } = overlayWith();
    slot.open(overlay);
    expect(host.contains(overlay.element)).toBe(true);
    expect(background.hasAttribute('inert')).toBe(true);
  });

  it('disposes the previous overlay when a new one opens', () => {
    const { host, background, slot } = setup();
    const first = overlayWith();
    const second = overlayWith();
    slot.open(first.overlay);
    slot.open(second.overlay);
    expect(first.cleanup).toHaveBeenCalledOnce();
    expect(host.contains(first.overlay.element)).toBe(false);
    expect(host.contains(second.overlay.element)).toBe(true);
    expect(background.hasAttribute('inert')).toBe(true);
  });

  it('restores the background on close', () => {
    const { host, background, slot } = setup();
    const { overlay, cleanup } = overlayWith();
    slot.open(overlay);
    slot.close();
    expect(cleanup).toHaveBeenCalledOnce();
    expect(host.contains(overlay.element)).toBe(false);
    expect(background.hasAttribute('inert')).toBe(false);
  });

  it('releases only the overlay that is still open', () => {
    const { slot } = setup();
    const first = overlayWith();
    const second = overlayWith();
    slot.open(first.overlay);
    slot.open(second.overlay);
    slot.release(first.overlay);
    expect(second.cleanup).not.toHaveBeenCalled();
    slot.release(second.overlay);
    expect(second.cleanup).toHaveBeenCalledOnce();
  });
});

describe('createOverlay', () => {
  it('runs cleanups once', () => {
    const { overlay, cleanup } = overlayWith();
    overlay.dispose();
    overlay.dispose();
    expect(cleanup).toHaveBeenCalledOnce();
  });
});

describe('onWindowKey', () => {
  it('stops listening after cleanup', () => {
    const handler = vi.fn();
    const stop = onWindowKey(handler);
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter' }));
    stop();
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter' }));
    expect(handler).toHaveBeenCalledOnce();
  });
});

describe('claimEscapeKey', () => {
  it('handles Escape before other window listeners see it', () => {
    const later = vi.fn<(event: KeyboardEvent) => void>();
    const stopLater = onWindowKey(later);
    const handler = vi.fn();
    const stop = claimEscapeKey(handler);
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
    pressEnter();
    stop();
    stopLater();
    expect(handler).toHaveBeenCalledOnce();
    expect(later.mock.calls.map(([event]) => event.key)).toEqual(['Enter']);
  });

  it('lets Escape through once released', () => {
    const later = vi.fn();
    const stopLater = onWindowKey(later);
    claimEscapeKey(() => undefined)();
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
    stopLater();
    expect(later).toHaveBeenCalledOnce();
  });
});

describe('onWindowKeyAfter', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it('ignores keys until the delay has passed', () => {
    vi.useFakeTimers();
    const handler = vi.fn();
    const stop = onWindowKeyAfter(DELAY_MS, handler);
    pressEnter();
    vi.advanceTimersByTime(DELAY_MS);
    pressEnter();
    stop();
    expect(handler).toHaveBeenCalledOnce();
  });

  it('never listens when stopped before the delay', () => {
    vi.useFakeTimers();
    const handler = vi.fn();
    const stop = onWindowKeyAfter(DELAY_MS, handler);
    stop();
    vi.advanceTimersByTime(DELAY_MS);
    pressEnter();
    expect(handler).not.toHaveBeenCalled();
  });
});
