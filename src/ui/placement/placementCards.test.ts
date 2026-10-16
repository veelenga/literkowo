import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { placementOutcome, placementStages } from '../../arena/placement';
import { sfx } from '../../audio/Sfx';
import type { PhaseRecord } from '../../game/PhaseMeter';
import { KEY_READY_MS, type Overlay } from '../overlay';
import { fingersCard } from './FingersCard';
import { placementIntro } from './PlacementIntro';
import { placementResult } from './PlacementResult';

const STAGES = placementStages('pl');
const REGIONS = STAGES.map((stage) => stage.keySet.region);
const PASS: PhaseRecord = { hits: 40, mistakes: 1, reached: 0, typingSeconds: 10 };
const FAIL: PhaseRecord = { hits: 10, mistakes: 5, reached: 0, typingSeconds: 10 };

let overlay: Overlay | undefined;

function press(key: string): void {
  window.dispatchEvent(new KeyboardEvent('keydown', { key }));
}

function chips(element: HTMLElement): string[] {
  return [...element.querySelectorAll('.stage-chip')].map(
    (chip) => `${chip.textContent ?? ''} ${chip.classList.contains('is-lit') ? 'lit' : 'dim'}`,
  );
}

beforeEach(() => {
  vi.useFakeTimers();
  vi.stubGlobal('matchMedia', () => ({ matches: true }));
  vi.spyOn(sfx, 'sparkle').mockImplementation(() => undefined);
});

afterEach(() => {
  overlay?.dispose();
  overlay = undefined;
  vi.useRealTimers();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe('placementIntro', () => {
  function open() {
    const actions = { onStart: vi.fn(), onClose: vi.fn() };
    overlay = placementIntro(REGIONS, actions);
    return { ...actions, element: overlay.element };
  }

  it('names the test, every stage and the rule of 12 seconds', () => {
    const { element } = open();
    expect(element.querySelector('.learn-panel .eyebrow')?.textContent).toBe('Sprawdzian');
    expect(element.querySelectorAll('.stage-chip.is-ahead')).toHaveLength(5);
    expect(element.querySelector('.placement-rule')?.textContent).toBe(
      'Pisz słowa, które widzisz. Każdy etap trwa 12 sekund.',
    );
  });

  it('starts on Enter and closes on Escape only after the card is ready', () => {
    const { onStart, onClose } = open();
    press('Enter');
    press('Escape');
    expect(onStart).not.toHaveBeenCalled();
    vi.advanceTimersByTime(KEY_READY_MS);
    press('Enter');
    expect(onStart).toHaveBeenCalledOnce();
    expect(onClose).not.toHaveBeenCalled();
  });

  it('closes from the close button and Escape', () => {
    const { onClose, element } = open();
    element.querySelector<HTMLButtonElement>('.close-button')?.click();
    vi.advanceTimersByTime(KEY_READY_MS);
    press('Escape');
    expect(onClose).toHaveBeenCalledTimes(2);
  });
});

describe('placementResult', () => {
  function open(records: PhaseRecord[], startId?: string) {
    const actions = { onMap: vi.fn(), onArena: startId ? vi.fn() : undefined };
    const outcome = placementOutcome(STAGES, records);
    const start = REGIONS.find((region) => region.id === startId);
    overlay = placementResult({ outcome, regions: REGIONS, start }, actions);
    return { ...actions, element: overlay.element };
  }

  it('says where the child starts with the passed stages lit', () => {
    const { element } = open([PASS, PASS, FAIL], 'gory');
    expect(element.querySelector('.result-title')?.textContent).toBe('Zaczynasz tutaj: Góry');
    expect(chips(element)).toEqual([
      'Polana lit',
      'Las lit',
      'Góry dim',
      'Jaskinia dim',
      'Wyspa Ogonków dim',
    ]);
    vi.advanceTimersByTime(KEY_READY_MS * 3);
    const values = [...element.querySelectorAll('.result-stat-value')].map((v) => v.textContent);
    expect(values).toHaveLength(2);
  });

  it('starts a beginner from the beginning without an arena button', () => {
    const { element } = open([FAIL]);
    expect(element.querySelector('.result-title')?.textContent).toBe(
      'Zaczniemy od początku. Tak będzie najlepiej!',
    );
    expect(element.querySelectorAll('.stage-chip.is-lit')).toHaveLength(0);
    const buttons = [...element.querySelectorAll('.result-actions .button')];
    expect(buttons.map((button) => button.textContent?.trim())).toEqual(['Na mapę⏎']);
  });

  it('offers the arena next to the map and goes to the map on Enter or Escape', () => {
    const { element, onMap, onArena } = open([PASS, PASS, PASS, PASS, PASS], 'wyspa');
    expect(element.querySelector('.result-title')?.textContent).toBe(
      'Zaczynasz tutaj: Wyspa Ogonków',
    );
    element.querySelector<HTMLButtonElement>('.result-actions .button-ghost')?.click();
    expect(onArena).toHaveBeenCalledOnce();
    vi.advanceTimersByTime(KEY_READY_MS);
    press('Enter');
    expect(onMap).toHaveBeenCalledOnce();
  });
});

describe('fingersCard', () => {
  it('colours every skipped key and marks the Polish letters on their base key', () => {
    const actions = { onStart: vi.fn(), onClose: vi.fn() };
    overlay = fingersCard('fjdksla;ą', actions);
    const element = overlay.element;
    expect(element.querySelector('.eyebrow')?.textContent).toBe('Palce na start');
    const lit = [...element.querySelectorAll('.finger-key.is-lit')].map(
      (key) => key.firstChild?.textContent,
    );
    expect(lit).toEqual(['A', 'S', 'D', 'F', 'J', 'K', 'L', ';']);
    expect(element.querySelector('.finger-key-alt')?.textContent).toBe('ą');
    expect(element.querySelectorAll('.hand-finger.is-active').length).toBeGreaterThan(0);
    vi.advanceTimersByTime(KEY_READY_MS);
    press('Enter');
    expect(actions.onStart).toHaveBeenCalledOnce();
  });
});
