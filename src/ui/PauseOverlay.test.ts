import { afterEach, describe, expect, it, vi } from 'vitest';
import type { Overlay } from './overlay';
import { pauseOverlay } from './PauseOverlay';

const overlays: Overlay[] = [];

function open() {
  const actions = { onResume: vi.fn(), onSettings: vi.fn() };
  const overlay = pauseOverlay(actions.onResume, {}, actions.onSettings);
  overlays.push(overlay);
  return { ...actions, overlay, element: overlay.element };
}

function pressEnter(): void {
  window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', cancelable: true }));
}

describe('pauseOverlay', () => {
  afterEach(() => {
    overlays.splice(0).forEach((overlay) => overlay.dispose());
  });

  it('resumes the level when tapped', () => {
    const { element, onResume } = open();
    element.querySelector<HTMLButtonElement>('.button-primary')?.click();
    expect(onResume).toHaveBeenCalledOnce();
  });

  it('resumes the level with Enter until the card is closed', () => {
    const { overlay, onResume } = open();
    pressEnter();
    overlay.dispose();
    pressEnter();
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
