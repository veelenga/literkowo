import { describe, expect, it, vi } from 'vitest';
import { KeyboardHint } from './KeyboardHint';
import { KEYBOARD_LAYOUTS } from './keyboardLayout';

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

describe('KeyboardHint layouts', () => {
  const label = (hint: KeyboardHint, key: string) =>
    hint.element.querySelector(`[data-key="${key}"]`)?.textContent;

  it('shows capitals on the full keyboard', () => {
    const hint = new KeyboardHint(vi.fn());
    expect(hint.element.classList.contains('keyboard-full')).toBe(true);
    expect(label(hint, 'q')).toBe('Q');
    expect(hint.element.querySelector('[data-key=" "]')).not.toBeNull();
  });

  it('shows lower case keys without a space bar on the compact keyboard', () => {
    const hint = new KeyboardHint(vi.fn(), KEYBOARD_LAYOUTS.compact);
    expect(hint.element.classList.contains('keyboard-compact')).toBe(true);
    expect(label(hint, 'q')).toBe('q');
    expect(hint.element.querySelectorAll('.key-row')).toHaveLength(3);
    expect(hint.element.querySelector('[data-key=" "]')).toBeNull();
    expect(hint.element.querySelector('[data-key="alt"]')).not.toBeNull();
  });

  it('highlights the next key on the compact keyboard', () => {
    const hint = new KeyboardHint(vi.fn(), KEYBOARD_LAYOUTS.compact);
    hint.show('ś');
    const next = [...hint.element.querySelectorAll('.is-next')].map((key) =>
      key.getAttribute('data-key'),
    );
    expect(next).toEqual(['s', 'alt']);
  });
});
