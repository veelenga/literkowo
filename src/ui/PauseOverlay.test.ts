import { afterEach, describe, expect, it } from 'vitest';
import { readQualityChoice, saveQualityChoice } from '../game/quality';
import { pauseOverlay } from './PauseOverlay';

const STORAGE_KEY = 'literkowo.quality';

function chips(): HTMLButtonElement[] {
  return [...pauseOverlay().element.querySelectorAll<HTMLButtonElement>('.quality-options .chip')];
}

function activeLabels(buttons: HTMLButtonElement[]): string[] {
  return buttons
    .filter((chip) => chip.classList.contains('is-active'))
    .map((chip) => chip.textContent ?? '');
}

describe('pauseOverlay quality picker', () => {
  afterEach(() => {
    localStorage.removeItem(STORAGE_KEY);
  });

  it('offers auto and the three presets with auto active by default', () => {
    const buttons = chips();
    expect(buttons.map((chip) => chip.textContent)).toEqual(['Auto', 'Wysoka', 'Średnia', 'Niska']);
    expect(activeLabels(buttons)).toEqual(['Auto']);
  });

  it('marks the stored choice', () => {
    saveQualityChoice('medium');
    expect(activeLabels(chips())).toEqual(['Średnia']);
  });

  it('saves the picked choice and moves the highlight', () => {
    const buttons = chips();
    buttons[3].click();
    expect(readQualityChoice()).toBe('low');
    expect(activeLabels(buttons)).toEqual(['Niska']);
    expect(buttons[3].getAttribute('aria-pressed')).toBe('true');
    expect(buttons[0].getAttribute('aria-pressed')).toBe('false');
  });
});
