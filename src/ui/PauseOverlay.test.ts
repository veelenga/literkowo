import { describe, expect, it, vi } from 'vitest';
import { pauseOverlay } from './PauseOverlay';

function open() {
  const actions = { onResume: vi.fn(), onSettings: vi.fn() };
  const overlay = pauseOverlay(actions.onResume, {}, actions.onSettings);
  return { ...actions, element: overlay.element };
}

describe('pauseOverlay', () => {
  it('resumes the level when tapped', () => {
    const { element, onResume } = open();
    element.querySelector<HTMLButtonElement>('.button-primary')?.click();
    expect(onResume).toHaveBeenCalledOnce();
  });

  it('opens the settings and no longer picks the quality itself', () => {
    const { element, onSettings, onResume } = open();
    const settings = element.querySelector<HTMLButtonElement>('.settings-text-button');
    expect(settings?.textContent).toBe('Ustawienia');
    settings?.click();
    expect(onSettings).toHaveBeenCalledOnce();
    expect(onResume).not.toHaveBeenCalled();
    expect(element.querySelector('.quality-picker')).toBeNull();
  });

  it('shows the accuracy of each key', () => {
    const { element } = open();
    expect(element.querySelector('.heatmap-title')?.textContent).toBe('Celność klawiszy');
  });
});
