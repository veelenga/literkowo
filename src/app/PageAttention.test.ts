import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { PageAttention, type VisibilitySource } from './PageAttention';

const BLUR_GRACE_MS = 2000;

class FakePage extends EventTarget implements VisibilitySource {
  visibilityState: DocumentVisibilityState = 'visible';

  set(state: DocumentVisibilityState): void {
    this.visibilityState = state;
    this.dispatchEvent(new Event('visibilitychange'));
  }
}

function setup() {
  const page = new FakePage();
  const window = new EventTarget();
  const onChange = vi.fn();
  const attention = new PageAttention(onChange, { page, window });
  return { page, window, onChange, attention };
}

describe('PageAttention', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('reports away as soon as the page is hidden and back when it shows again', () => {
    const { page, onChange, attention } = setup();
    page.set('hidden');
    expect(attention.away).toBe(true);
    page.set('visible');
    expect(onChange.mock.calls).toEqual([[true], [false]]);
  });

  it('waits for the grace period before a lost focus counts as away', () => {
    const { window, onChange } = setup();
    window.dispatchEvent(new Event('blur'));
    vi.advanceTimersByTime(BLUR_GRACE_MS - 1);
    expect(onChange).not.toHaveBeenCalled();
    vi.advanceTimersByTime(1);
    expect(onChange).toHaveBeenCalledWith(true);
  });

  it('ignores a short focus loss', () => {
    const { window, onChange } = setup();
    window.dispatchEvent(new Event('blur'));
    vi.advanceTimersByTime(BLUR_GRACE_MS / 2);
    window.dispatchEvent(new Event('focus'));
    vi.advanceTimersByTime(BLUR_GRACE_MS);
    expect(onChange).not.toHaveBeenCalled();
  });

  it('stays away while the page is hidden even if focus returns', () => {
    const { page, window, onChange, attention } = setup();
    page.set('hidden');
    window.dispatchEvent(new Event('focus'));
    expect(attention.away).toBe(true);
    expect(onChange).toHaveBeenCalledOnce();
  });

  it('stops listening after dispose', () => {
    const { page, window, onChange, attention } = setup();
    window.dispatchEvent(new Event('blur'));
    attention.dispose();
    page.set('hidden');
    vi.advanceTimersByTime(BLUR_GRACE_MS);
    expect(onChange).not.toHaveBeenCalled();
  });
});
