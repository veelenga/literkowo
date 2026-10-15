import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { i18n } from '../i18n/i18n';
import { requireLevel } from '../testing/levels';
import { learnCard } from './LearnCard';
import { KEY_READY_MS, type Overlay } from './overlay';

const NO_ACTIONS = { onStart: () => undefined, onClose: () => undefined };

function card(levelId: string): HTMLElement {
  const overlay = learnCard(requireLevel(levelId), {}, NO_ACTIONS);
  overlay.dispose();
  return overlay.element;
}

function keys(element: HTMLElement): string[] {
  return [...element.querySelectorAll('.keycap-letter')].map((key) => key.textContent ?? '');
}

describe('learnCard', () => {
  it('shows the one new key with its finger and the hands', () => {
    const element = card('polana-4');
    expect(element.querySelector('.eyebrow')?.textContent).toBe('Nowy klawisz');
    expect(keys(element)).toEqual(['D']);
    expect(element.querySelector('.keycap-caption')?.textContent).toBe('lewy środkowy');
    expect(element.querySelector('.hands')).not.toBeNull();
  });

  it('shows both index finger keys on the first level', () => {
    const element = card('polana-1');
    expect(element.querySelector('.eyebrow')?.textContent).toBe(i18n.t.newKeys);
    expect(keys(element)).toEqual(['F', 'J']);
  });

  it('says in one line what a practice level is', () => {
    const element = card('polana-5');
    expect(element.querySelector('.eyebrow')?.textContent).toBe('Trening');
    expect(element.querySelector('.learn-hint')?.textContent).toBe(
      i18n.t.features.course.hints.practice,
    );
    expect(element.querySelector('.hands')).toBeNull();
  });

  it('says in one line what a review level is', () => {
    const element = card('polana-8');
    expect(element.querySelector('.eyebrow')?.textContent).toBe('Powtórka');
    expect(element.querySelector('.learn-hint')?.textContent).toBe(
      i18n.t.features.course.hints.review,
    );
    expect(keys(element)).toEqual(['D', 'K']);
  });
});

describe('learnCard keys and buttons', () => {
  let overlay: Overlay | undefined;

  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    overlay?.dispose();
    overlay = undefined;
    vi.useRealTimers();
  });

  function press(key: string): void {
    window.dispatchEvent(new KeyboardEvent('keydown', { key }));
  }

  function open() {
    const actions = { onStart: vi.fn(), onClose: vi.fn() };
    overlay = learnCard(requireLevel('polana-2'), {}, actions);
    return { ...actions, element: overlay.element };
  }

  it('ignores Enter and Escape right after the card opens', () => {
    const { onStart, onClose } = open();
    vi.advanceTimersByTime(KEY_READY_MS - 1);
    press('Enter');
    press('Escape');
    expect(onStart).not.toHaveBeenCalled();
    expect(onClose).not.toHaveBeenCalled();
  });

  it('starts the level on Enter once the card is ready', () => {
    const { onStart, onClose } = open();
    vi.advanceTimersByTime(KEY_READY_MS);
    press('Enter');
    expect(onStart).toHaveBeenCalledOnce();
    expect(onClose).not.toHaveBeenCalled();
  });

  it('starts the level on click right away', () => {
    const { onStart, element } = open();
    element.querySelector<HTMLButtonElement>('.button-primary')?.click();
    expect(onStart).toHaveBeenCalledOnce();
  });

  it('closes without starting on Escape once the card is ready', () => {
    const { onStart, onClose } = open();
    vi.advanceTimersByTime(KEY_READY_MS);
    press('Escape');
    expect(onClose).toHaveBeenCalledOnce();
    expect(onStart).not.toHaveBeenCalled();
  });

  it('closes without starting from the close button', () => {
    const { onStart, onClose, element } = open();
    const close = element.querySelector<HTMLButtonElement>('.close-button');
    expect(close?.getAttribute('aria-label')).toBe('Wróć do mapy');
    close?.click();
    expect(onClose).toHaveBeenCalledOnce();
    expect(onStart).not.toHaveBeenCalled();
  });
});
