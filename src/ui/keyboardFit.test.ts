import { afterEach, describe, expect, it } from 'vitest';
import { areaAboveKeyboard, fitAboveKeyboard, KEYBOARD_OPEN_ATTRIBUTE } from './keyboardFit';

const PHONE = { layoutHeight: 844, visualHeight: 844, offsetTop: 0, scale: 1 };

class FakeViewport extends EventTarget {
  height = PHONE.layoutHeight;
  offsetTop = 0;
  scale = 1;

  resizeTo(height: number): void {
    this.height = height;
    this.dispatchEvent(new Event('resize'));
  }
}

function phoneRoot(): HTMLElement {
  const root = document.createElement('div');
  Object.defineProperty(root, 'clientHeight', { value: PHONE.layoutHeight });
  return root;
}

function useViewport(viewport: FakeViewport | undefined): void {
  Object.defineProperty(window, 'visualViewport', { value: viewport, configurable: true });
}

describe('areaAboveKeyboard', () => {
  it('leaves the layout alone while the whole viewport is visible', () => {
    expect(areaAboveKeyboard(PHONE)).toBeUndefined();
  });

  it('leaves the layout alone for browser toolbars', () => {
    expect(areaAboveKeyboard({ ...PHONE, visualHeight: 760 })).toBeUndefined();
  });

  it('fits the area above an open keyboard', () => {
    expect(areaAboveKeyboard({ ...PHONE, visualHeight: 480.4 })).toEqual({ top: 0, height: 480 });
  });

  it('follows the visual viewport when the page is panned', () => {
    const panned = { ...PHONE, visualHeight: 480, offsetTop: 40.6 };
    expect(areaAboveKeyboard(panned)).toEqual({ top: 41, height: 480 });
  });

  it('never moves above the page during an overscroll bounce', () => {
    const bounced = { ...PHONE, visualHeight: 480, offsetTop: -12 };
    expect(areaAboveKeyboard(bounced)?.top).toBe(0);
  });

  it('ignores a pinch zoom', () => {
    expect(areaAboveKeyboard({ ...PHONE, visualHeight: 422, scale: 2 })).toBeUndefined();
  });
});

describe('fitAboveKeyboard', () => {
  afterEach(() => useViewport(undefined));

  it('does nothing without the VisualViewport API', () => {
    useViewport(undefined);
    const root = phoneRoot();
    fitAboveKeyboard(root)();
    expect(root.hasAttribute(KEYBOARD_OPEN_ATTRIBUTE)).toBe(false);
  });

  it('sizes the visible area while the keyboard is open', () => {
    const viewport = new FakeViewport();
    useViewport(viewport);
    const root = phoneRoot();
    fitAboveKeyboard(root);
    viewport.resizeTo(500);
    expect(root.hasAttribute(KEYBOARD_OPEN_ATTRIBUTE)).toBe(true);
    expect(root.style.getPropertyValue('--visible-height')).toBe('500px');
    expect(root.style.getPropertyValue('--visible-top')).toBe('0px');
  });

  it('clears the area when the keyboard closes and after cleanup', () => {
    const viewport = new FakeViewport();
    useViewport(viewport);
    const root = phoneRoot();
    const stop = fitAboveKeyboard(root);
    viewport.resizeTo(500);
    viewport.resizeTo(PHONE.layoutHeight);
    expect(root.hasAttribute(KEYBOARD_OPEN_ATTRIBUTE)).toBe(false);
    expect(root.style.getPropertyValue('--visible-height')).toBe('');
    viewport.resizeTo(500);
    stop();
    expect(root.hasAttribute(KEYBOARD_OPEN_ATTRIBUTE)).toBe(false);
    viewport.resizeTo(400);
    expect(root.hasAttribute(KEYBOARD_OPEN_ATTRIBUTE)).toBe(false);
  });
});
