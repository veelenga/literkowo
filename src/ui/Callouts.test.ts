import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { Callouts } from './Callouts';

const CALLOUT_LIFETIME_MS = 900;
const BANNER_LIFETIME_MS = 1400;
const EARLY_EXIT_MS = 200;
const QUICK_SUCCESSION_MS = 100;

function find(callouts: Callouts, text: string): HTMLElement {
  const match = [...callouts.element.querySelectorAll<HTMLElement>('.callout')].find(
    (item) => item.textContent === text,
  );
  if (!match) throw new Error(`No announcement with text ${text}`);
  return match;
}

function offsetOf(callouts: Callouts, text: string): number {
  return Number.parseFloat(find(callouts, text).style.top);
}

function settled(callouts: Callouts): string[] {
  return [...callouts.element.querySelectorAll('.callout:not(.is-leaving)')].map(
    (item) => item.textContent ?? '',
  );
}

describe('Callouts', () => {
  let callouts: Callouts;

  beforeEach(() => {
    vi.useFakeTimers();
    callouts = new Callouts();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('stacks callouts in quick succession with the newest on top', () => {
    callouts.show('Super!', 'callout');
    vi.advanceTimersByTime(QUICK_SUCCESSION_MS);
    callouts.show('Mega!', 'callout');

    expect(offsetOf(callouts, 'Mega!')).toBe(0);
    expect(offsetOf(callouts, 'Super!')).toBeGreaterThan(offsetOf(callouts, 'Mega!'));
  });

  it('keeps at most three callouts and fades the oldest early', () => {
    ['Super!', 'Mega!', 'Ultra!', 'Legenda!'].forEach((text) => callouts.show(text, 'callout'));

    expect(settled(callouts)).toEqual(['Mega!', 'Ultra!', 'Legenda!']);
    expect(find(callouts, 'Super!').classList.contains('is-leaving')).toBe(true);
    const offsets = settled(callouts).map((text) => offsetOf(callouts, text));
    expect(new Set(offsets).size).toBe(offsets.length);

    vi.advanceTimersByTime(EARLY_EXIT_MS);
    expect(callouts.element.querySelectorAll('.callout')).toHaveLength(3);
  });

  it('gives a banner the centre slot and pushes callouts below it', () => {
    callouts.show('Super!', 'callout');
    callouts.show('Gorączka!', 'banner');

    expect(offsetOf(callouts, 'Gorączka!')).toBe(0);
    expect(offsetOf(callouts, 'Super!')).toBeGreaterThan(0);
  });

  it('places warnings above the banner slot', () => {
    callouts.show('Gorączka!', 'banner');
    callouts.show('Uwaga!', 'warning');

    expect(offsetOf(callouts, 'Uwaga!')).toBeLessThan(offsetOf(callouts, 'Gorączka!'));
  });

  it('moves callouts back up once the banner is gone', () => {
    callouts.show('Gorączka!', 'banner');
    vi.advanceTimersByTime(BANNER_LIFETIME_MS - QUICK_SUCCESSION_MS);
    callouts.show('Super!', 'callout');
    expect(offsetOf(callouts, 'Super!')).toBeGreaterThan(0);

    vi.advanceTimersByTime(QUICK_SUCCESSION_MS);
    expect(offsetOf(callouts, 'Super!')).toBe(0);

    vi.advanceTimersByTime(CALLOUT_LIFETIME_MS);
    expect(callouts.element.children).toHaveLength(0);
  });
});
