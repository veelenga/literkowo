import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { removeStorage } from '../storage';
import { HINT_PILL_LEAVE_MS } from './hintPill';
import { ROTATE_HINT_KEY, ROTATE_HINT_LIFETIME_MS, rotateHint } from './RotateHint';

function stubMedia(matches: boolean) {
  const listeners = new Set<() => void>();
  vi.stubGlobal('matchMedia', () => ({
    matches,
    addEventListener: (_event: string, listener: () => void) => listeners.add(listener),
    removeEventListener: (_event: string, listener: () => void) => listeners.delete(listener),
  }));
  return {
    listeners,
    turn: () => listeners.forEach((listener) => listener()),
  };
}

function showHint(): HTMLElement {
  const hint = rotateHint();
  if (!hint) throw new Error('Missing hint');
  document.body.append(hint);
  return hint;
}

describe('rotateHint', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    removeStorage(ROTATE_HINT_KEY);
    vi.useRealTimers();
    vi.unstubAllGlobals();
    document.body.replaceChildren();
  });

  it('shows once on a phone held upright', () => {
    stubMedia(true);
    expect(showHint().textContent).toContain('Obróć telefon');
    expect(rotateHint()).toBeUndefined();
  });

  it('stays away on a tablet or a phone held sideways and keeps its chance', () => {
    stubMedia(false);
    expect(rotateHint()).toBeUndefined();
    stubMedia(true);
    expect(rotateHint()).toBeDefined();
  });

  it('fades out on its own', () => {
    stubMedia(true);
    const hint = showHint();
    vi.advanceTimersByTime(ROTATE_HINT_LIFETIME_MS);
    expect(hint.classList.contains('is-leaving')).toBe(true);
    vi.advanceTimersByTime(HINT_PILL_LEAVE_MS);
    expect(hint.isConnected).toBe(false);
  });

  it('leaves on a tap', () => {
    const media = stubMedia(true);
    const hint = showHint();
    hint.click();
    expect(hint.isConnected).toBe(false);
    expect(media.listeners.size).toBe(0);
  });

  it('leaves when the phone turns', () => {
    const media = stubMedia(true);
    const hint = showHint();
    media.turn();
    expect(hint.isConnected).toBe(false);
    expect(media.listeners.size).toBe(0);
  });
});
