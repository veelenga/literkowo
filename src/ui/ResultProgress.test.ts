import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { sfx } from '../audio/Sfx';
import { ResultProgress } from './ResultProgress';

const FILL_DURATION_MS = 800;

function fillWidth(progress: ResultProgress): string {
  return progress.element.querySelector<HTMLElement>('.xp-bar-fill')?.style.width ?? '';
}

function discText(progress: ResultProgress): string {
  return progress.element.querySelector('.level-disc')?.textContent ?? '';
}

describe('ResultProgress', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.stubGlobal('matchMedia', () => ({ matches: true }));
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it('starts from the progress before the level and shows the coins earned', () => {
    const progress = new ResultProgress({ xpBefore: 50, xp: 20, coins: 31 });
    expect(discText(progress)).toBe('1');
    expect(fillWidth(progress)).toBe('50%');
    expect(progress.element.querySelector('.coin-pill')?.textContent).toBe('+31');
  });

  it('fills the bar without a celebration when the level stays the same', () => {
    const progress = new ResultProgress({ xpBefore: 50, xp: 20, coins: 0 });
    progress.reveal();
    vi.advanceTimersByTime(FILL_DURATION_MS);
    expect(fillWidth(progress)).toBe('70%');
    expect(progress.element.querySelector('.level-up-banner')).toBeNull();
  });

  it('celebrates a new level with the rank name, confetti and sound', () => {
    const fanfare = vi.spyOn(sfx, 'levelComplete');
    const sparkle = vi.spyOn(sfx, 'sparkle');
    const progress = new ResultProgress({ xpBefore: 90, xp: 66, coins: 0 });
    progress.reveal();
    expect(fillWidth(progress)).toBe('100%');
    vi.advanceTimersByTime(FILL_DURATION_MS);
    expect(discText(progress)).toBe('2');
    expect(fillWidth(progress)).toBe('50%');
    expect(progress.element.querySelector('.level-up-banner')?.textContent).toBe(
      'Nowy poziom!Pisklę',
    );
    expect(progress.element.querySelectorAll('.confetti-piece').length).toBeGreaterThan(0);
    expect(fanfare).toHaveBeenCalledOnce();
    expect(sparkle).toHaveBeenCalledOnce();
  });

  it('cancels a pending celebration when stopped', () => {
    const progress = new ResultProgress({ xpBefore: 90, xp: 66, coins: 0 });
    progress.reveal();
    progress.stop();
    vi.advanceTimersByTime(FILL_DURATION_MS);
    expect(progress.element.querySelector('.level-up-banner')).toBeNull();
  });
});
