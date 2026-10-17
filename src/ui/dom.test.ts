import { describe, expect, it, vi } from 'vitest';
import { el, releaseFocus, trustedSvg } from './dom';

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

  it('sets styles through the style declaration, custom properties included', () => {
    const bar = el('div', { style: '--fill: 40%; width: 40%' });
    expect(bar.style.getPropertyValue('--fill')).toBe('40%');
    expect(bar.style.width).toBe('40%');
  });

  it('keeps markup in text as text', () => {
    const label = el('span', { text: '<b>hi</b>' });
    expect(label.children).toHaveLength(0);
    expect(label.textContent).toBe('<b>hi</b>');
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

describe('trustedSvg', () => {
  it('wraps static markup in an svg with the given attributes', () => {
    const art = trustedSvg({ viewBox: '0 0 10 10' }, '<path d="M0 0h10"/>');
    expect(art.getAttribute('viewBox')).toBe('0 0 10 10');
    expect(art.firstElementChild?.namespaceURI).toBe('http://www.w3.org/2000/svg');
    expect(art.firstElementChild?.tagName).toBe('path');
  });
});
