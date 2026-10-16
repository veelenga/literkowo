import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { sfx } from '../../audio/Sfx';
import { GOLD, NO_MEDAL, SILVER } from '../../arena/medals';
import type { GameResult } from '../../game/Game';
import { KEY_READY_MS } from '../overlay';
import { arenaResult, type ArenaRunSummary } from './ArenaResult';
import { EMPTY_TALLY } from '../../course/counters';

const RESULT: GameResult = {
  won: false,
  score: 4120,
  accuracy: 0.953,
  wpm: 20,
  lettersFreed: 300,
  xp: 62,
  coins: 40,
  coinBoost: 1,
  keys: { practised: {}, weakest: [], mastered: [] },
  phasesCleared: 8,
  seconds: 140,
  phases: [],
  tally: EMPTY_TALLY,
};

function summary(overrides: Partial<ArenaRunSummary> = {}): ArenaRunSummary {
  return {
    result: RESULT,
    wavesCleared: 8,
    medal: SILVER,
    newRecord: false,
    earned: {
      xpBefore: 50,
      xp: 62,
      coins: 55,
      treasures: { trophies: [], newItems: false, arenaOpened: false },
    },
    ...overrides,
  };
}

function setup(overrides: Partial<ArenaRunSummary> = {}) {
  const onArena = vi.fn();
  const onRetry = vi.fn();
  const overlay = arenaResult(summary(overrides), { onArena, onRetry, onShop: vi.fn() });
  document.body.append(overlay.element);
  const text = (selector: string) => overlay.element.querySelector(selector)?.textContent;
  return { overlay, onArena, onRetry, text };
}

function pressEnter(): void {
  window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter' }));
}

describe('arenaResult', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.stubGlobal('matchMedia', () => ({ matches: true }));
    vi.spyOn(sfx, 'sparkle').mockImplementation(() => undefined);
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
    document.body.replaceChildren();
  });

  it('shows the medal, what the next one needs and the run in three tiles', () => {
    const { overlay, text } = setup();
    vi.runAllTimers();
    expect(overlay.element.querySelector('.medal-large.is-silver')).not.toBeNull();
    expect(text('.result-hint')).toBe('Srebro. Złoto: fala 10 i 97%');
    const tiles = [...overlay.element.querySelectorAll('.result-stat')].map((tile) => [
      tile.querySelector('.result-stat-label')?.textContent,
      tile.querySelector('.result-stat-value')?.textContent,
    ]);
    expect(tiles).toEqual([
      ['Fale', '8'],
      ['Punkty', '4120'],
      ['Celność', '95'],
    ]);
    expect(text('.coin-pill')).toBe('+55');
    overlay.dispose();
  });

  it('celebrates a new record with confetti', () => {
    const { overlay, text } = setup({ newRecord: true, medal: GOLD });
    vi.runAllTimers();
    expect(text('.result-title')).toBe('Nowy rekord!');
    expect(text('.result-hint')).toBe('Złoto! To najlepszy medal');
    expect(overlay.element.querySelector('.confetti')).not.toBeNull();
    overlay.dispose();
  });

  it('names the first medal after a run without one', () => {
    const { overlay, text } = setup({ medal: NO_MEDAL, wavesCleared: 1 });
    expect(text('.result-title')).toBe('Mrok był szybszy');
    expect(text('.result-hint')).toBe('Bez medalu. Brąz: fala 3 i 85%');
    overlay.dispose();
  });

  it('plays again on Enter only after the card settles', () => {
    const { overlay, onRetry, onArena } = setup();
    pressEnter();
    expect(onRetry).not.toHaveBeenCalled();
    vi.advanceTimersByTime(KEY_READY_MS);
    pressEnter();
    pressEnter();
    expect(onRetry).toHaveBeenCalledOnce();
    overlay.element.querySelector<HTMLButtonElement>('.button-ghost')?.click();
    expect(onArena).toHaveBeenCalledOnce();
    overlay.dispose();
  });
});
