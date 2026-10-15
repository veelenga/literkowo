import { afterEach, describe, expect, it, vi } from 'vitest';
import { removeStorage } from '../storage';
import {
  applyReducedMotion,
  prefersReducedMotion,
  readReducedMotion,
  REDUCED_MOTION_KEY,
  saveReducedMotion,
} from './motionPreference';

const FORCED_ATTRIBUTE = 'data-reduced-motion';

function systemReducesMotion(reduce: boolean): void {
  vi.stubGlobal('matchMedia', () => ({ matches: reduce }));
}

describe('reduced motion preference', () => {
  afterEach(() => {
    removeStorage(REDUCED_MOTION_KEY);
    document.documentElement.removeAttribute(FORCED_ATTRIBUTE);
    vi.unstubAllGlobals();
  });

  it('follows the system until it is forced on', () => {
    expect(readReducedMotion()).toBe('auto');
    systemReducesMotion(false);
    expect(prefersReducedMotion()).toBe(false);
    systemReducesMotion(true);
    expect(prefersReducedMotion()).toBe(true);
  });

  it('reduces motion when forced, whatever the system says', () => {
    systemReducesMotion(false);
    saveReducedMotion('always');
    expect(readReducedMotion()).toBe('always');
    expect(prefersReducedMotion()).toBe(true);
  });

  it('marks the page so the styles calm down too', () => {
    saveReducedMotion('always');
    expect(document.documentElement.hasAttribute(FORCED_ATTRIBUTE)).toBe(true);
    saveReducedMotion('auto');
    expect(document.documentElement.hasAttribute(FORCED_ATTRIBUTE)).toBe(false);
  });

  it('applies a stored choice on start', () => {
    saveReducedMotion('always');
    document.documentElement.removeAttribute(FORCED_ATTRIBUTE);
    applyReducedMotion();
    expect(document.documentElement.hasAttribute(FORCED_ATTRIBUTE)).toBe(true);
  });
});
