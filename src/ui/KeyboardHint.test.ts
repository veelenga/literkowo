import { describe, expect, it, vi } from 'vitest';
import { KeyboardHint } from './KeyboardHint';

function setup() {
  const onKey = vi.fn();
  const hint = new KeyboardHint(onKey);
  const tap = (key: string) => {
    const element = hint.element.querySelector(`[data-key="${key}"]`);
    if (!element) throw new Error(`Missing key ${key}`);
    const event = new MouseEvent('pointerdown', { bubbles: true, cancelable: true });
    element.dispatchEvent(event);
    return event;
  };
  const alt = () => hint.element.querySelector('[data-key="alt"]');
  return { hint, onKey, tap, alt };
}

describe('KeyboardHint taps', () => {
  it('types the tapped key', () => {
    const { onKey, tap } = setup();
    const event = tap('f');
    expect(onKey).toHaveBeenCalledWith('f');
    expect(event.defaultPrevented).toBe(true);
  });

  it('types a space from the space bar', () => {
    const { onKey, tap } = setup();
    tap(' ');
    expect(onKey).toHaveBeenCalledWith(' ');
  });

  it('holds the right Alt for the next key and shows it as latched', () => {
    const { onKey, tap, alt } = setup();
    tap('alt');
    expect(onKey).not.toHaveBeenCalled();
    expect(alt()?.classList.contains('is-latched')).toBe(true);
    tap('l');
    expect(onKey).toHaveBeenCalledWith('ł');
    expect(alt()?.classList.contains('is-latched')).toBe(false);
  });

  it('ignores taps between the keys', () => {
    const { hint, onKey } = setup();
    hint.element.dispatchEvent(new MouseEvent('pointerdown', { bubbles: true }));
    expect(onKey).not.toHaveBeenCalled();
  });
});
