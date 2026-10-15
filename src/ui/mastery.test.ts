import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { sfx } from '../audio/Sfx';
import { regionOf } from '../course/catalog';
import {
  EMPTY_KEY_STAT,
  RECENT_WINDOW,
  recordHit,
  recordMiss,
  type KeyStat,
} from '../course/keyStats';
import { requireLevel } from '../testing/levels';
import { keyDots, keyStatus, masteryMeter, ResultKeys } from './mastery';

const DAYS = ['2026-01-01', '2026-01-02', '2026-01-03'];

function mastered(): KeyStat {
  let stat: KeyStat = { ...EMPTY_KEY_STAT, days: DAYS };
  for (let i = 0; i < RECENT_WINDOW; i += 1) stat = recordHit(stat, 400);
  return stat;
}

function texts(root: Element, selector: string): string[] {
  return [...root.querySelectorAll(selector)].map((node) => node.textContent ?? '');
}

describe('keyStatus', () => {
  it('names a key without practice as new', () => {
    expect(keyStatus('f', undefined).textContent).toBe('Nowy klawisz');
  });

  it('shows the level and the recent accuracy', () => {
    const status = keyStatus('f', recordMiss(recordHit(EMPTY_KEY_STAT)));
    expect(status.dataset.mastery).toBe('learning');
    expect(status.textContent).toBe('Uczysz się50%');
  });
});

describe('map mastery', () => {
  it('counts the mastered keys of a region', () => {
    const meter = masteryMeter(regionOf(requireLevel('polana-1')), { f: mastered() });
    expect(meter.querySelector('strong')?.textContent).toBe('1/8');
    expect(meter.querySelector<HTMLElement>('.mastery-meter-fill')?.style.width).toBe('13%');
  });

  it('gives each new key a dot with its level', () => {
    const dots = keyDots('fj', { f: mastered() });
    const levels = [...dots.querySelectorAll<HTMLElement>('.node-key')].map(
      (dot) => dot.dataset.mastery,
    );
    expect(levels).toEqual(['mastered', 'none']);
  });
});

describe('ResultKeys', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.stubGlobal('matchMedia', () => ({ matches: true }));
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it('lists the weakest keys with their accuracy', () => {
    const keys = new ResultKeys({
      practised: {},
      weakest: [
        { key: 'j', accuracy: 0.5 },
        { key: 'f', accuracy: 0.875 },
      ],
      mastered: [],
    });
    expect(texts(keys.element, '.key-chip')).toEqual(['J50%', 'F88%']);
  });

  it('praises a run without mistakes', () => {
    const keys = new ResultKeys({ practised: {}, weakest: [], mastered: [] });
    expect(keys.element.querySelector('.result-keys-clean')?.textContent).toBe('Bez pomyłek');
  });

  it('celebrates keys that became mastered', () => {
    const sparkle = vi.spyOn(sfx, 'sparkle');
    const keys = new ResultKeys({ practised: {}, weakest: [], mastered: ['f'] });
    expect(texts(keys.element, '.key-chip.is-mastered')).toEqual(['F']);
    keys.reveal();
    vi.runAllTimers();
    expect(keys.element.querySelector('.mastered-callout')?.textContent).toBe('Opanowany: F');
    expect(sparkle).toHaveBeenCalledOnce();
  });

  it('stays quiet when no key became mastered', () => {
    const sparkle = vi.spyOn(sfx, 'sparkle');
    const keys = new ResultKeys({ practised: {}, weakest: [], mastered: [] });
    keys.reveal();
    vi.runAllTimers();
    expect(keys.element.querySelector('.mastered-callout')).toBeNull();
    expect(sparkle).not.toHaveBeenCalled();
  });
});
