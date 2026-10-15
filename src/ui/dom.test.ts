import { describe, expect, it, vi } from 'vitest';
import { el, releaseFocus } from './dom';

describe('el', () => {
  it('sets content, attributes and boolean attributes', () => {
    const button = el('button', {
      class: 'button',
      text: 'Go',
      title: 'Start',
      maxlength: 3,
      disabled: true,
      'aria-pressed': 'false',
    });
    expect(button.className).toBe('button');
    expect(button.textContent).toBe('Go');
    expect(button.getAttribute('title')).toBe('Start');
    expect(button.getAttribute('maxlength')).toBe('3');
    expect(button.disabled).toBe(true);
    expect(button.getAttribute('aria-pressed')).toBe('false');
  });

  it('skips false and undefined values', () => {
    const button = el('button', { disabled: false, title: undefined });
    expect(button.hasAttribute('disabled')).toBe(false);
    expect(button.hasAttribute('title')).toBe(false);
  });

  it('attaches typed event handlers', () => {
    const onKeydown = vi.fn((event: KeyboardEvent) => event.key);
    const input = el('input', { onKeydown });
    input.dispatchEvent(new KeyboardEvent('keydown', { key: 'a' }));
    expect(onKeydown).toHaveReturnedWith('a');
  });
});

describe('releaseFocus', () => {
  it('blurs the element that handled the event', () => {
    const button = el('button', { onClick: releaseFocus });
    document.body.append(button);
    button.focus();
    button.click();
    expect(document.activeElement).not.toBe(button);
    button.remove();
  });
});
