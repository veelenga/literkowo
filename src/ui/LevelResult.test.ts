import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { GameResult } from '../game/Game';
import { i18n } from '../i18n/i18n';
import { levelResult } from './LevelResult';
import { KEY_READY_MS, type Overlay } from './overlay';

const ONE_STAR = 1;
const NO_STARS = 0;

const WON: GameResult = {
  won: true,
  score: 120,
  accuracy: 0.95,
  wpm: 12,
  lettersFreed: 30,
  xp: 20,
  coins: 5,
  phasesCleared: 2,
  keys: { practised: {}, weakest: [], mastered: [] },
};
const LOST: GameResult = { ...WON, won: false };
const REWARDS = {
  xpBefore: 0,
  xp: 20,
  coins: 5,
  treasures: { trophies: [], newItems: false, arenaOpened: false },
};

function actions() {
  return { onNext: vi.fn(), onRetry: vi.fn(), onMap: vi.fn() };
}

function pressEnter(): void {
  window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter' }));
}

function badgeButtonText(overlay: Overlay): string {
  return overlay.element.querySelector('button:has(.kbd)')?.firstChild?.textContent ?? '';
}

describe('levelResult', () => {
  let overlay: Overlay | undefined;

  beforeEach(() => {
    vi.useFakeTimers();
    vi.stubGlobal('matchMedia', () => ({ matches: false }));
  });

  afterEach(() => {
    overlay?.dispose();
    overlay = undefined;
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it('goes to the next level on Enter', () => {
    const onActions = actions();
    overlay = levelResult(WON, ONE_STAR, REWARDS, onActions);
    vi.advanceTimersByTime(KEY_READY_MS);
    pressEnter();
    pressEnter();
    expect(onActions.onNext).toHaveBeenCalledOnce();
    expect(badgeButtonText(overlay)).toBe(i18n.t.next);
  });

  it('ignores Enter right after the card opens', () => {
    const onActions = actions();
    overlay = levelResult(WON, ONE_STAR, REWARDS, onActions);
    vi.advanceTimersByTime(KEY_READY_MS - 1);
    pressEnter();
    expect(onActions.onNext).not.toHaveBeenCalled();
  });

  it('ignores Enter after the card closes', () => {
    const onActions = actions();
    overlay = levelResult(WON, ONE_STAR, REWARDS, onActions);
    vi.advanceTimersByTime(KEY_READY_MS);
    overlay.dispose();
    pressEnter();
    expect(onActions.onNext).not.toHaveBeenCalled();
  });

  it('retries on Enter after a loss', () => {
    const onActions = actions();
    overlay = levelResult(LOST, NO_STARS, REWARDS, onActions);
    vi.advanceTimersByTime(KEY_READY_MS);
    pressEnter();
    expect(onActions.onRetry).toHaveBeenCalledOnce();
    expect(onActions.onNext).not.toHaveBeenCalled();
    expect(badgeButtonText(overlay)).toBe(i18n.t.retry);
  });

  it('opens the map on Enter when there is no next level', () => {
    const onActions = { ...actions(), onNext: undefined };
    overlay = levelResult(WON, ONE_STAR, REWARDS, onActions);
    vi.advanceTimersByTime(KEY_READY_MS);
    pressEnter();
    expect(onActions.onMap).toHaveBeenCalledOnce();
    expect(badgeButtonText(overlay)).toBe(i18n.t.map);
  });
});
