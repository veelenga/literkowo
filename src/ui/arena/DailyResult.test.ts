import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { sfx } from '../../audio/Sfx';
import { formatOnWeekday } from '../../arena/formats';
import { BRONZE, GOLD, NO_MEDAL, SILVER } from '../../arena/medals';
import { EMPTY_TALLY } from '../../course/counters';
import type { GameResult } from '../../game/Game';
import { KEY_READY_MS } from '../overlay';
import { dailyResult, type DailyRunSummary } from './DailyResult';

const RESULT: GameResult = {
  won: true,
  score: 3200,
  accuracy: 0.953,
  wpm: 16,
  lettersFreed: 260,
  xp: 70,
  coins: 25,
  coinBoost: 1,
  keys: { practised: {}, weakest: [], mastered: [] },
  phasesCleared: 6,
  seconds: 161,
  phases: [],
  tally: { ...EMPTY_TALLY, words: 48 },
};

const PAYOUT = { run: 25, stamp: 20, medal: 20, chests: 40, family: 0, total: 105 };

function summary(overrides: Partial<DailyRunSummary> = {}): DailyRunSummary {
  return {
    result: RESULT,
    format: formatOnWeekday(6),
    outcome: { medal: SILVER, improved: true, triesLeft: 2, payout: PAYOUT },
    earned: {
      xpBefore: 50,
      xp: 70,
      coins: PAYOUT.total,
      treasures: { trophies: [], newItems: false, arenaOpened: false },
    },
    ...overrides,
  };
}

function setup(overrides: Partial<DailyRunSummary> = {}) {
  const onArena = vi.fn();
  const onRetry = vi.fn();
  const overlay = dailyResult(summary(overrides), { onArena, onRetry, onShop: vi.fn() });
  document.body.append(overlay.element);
  const text = (selector: string) => overlay.element.querySelector(selector)?.textContent;
  const tiles = () =>
    [...overlay.element.querySelectorAll('.result-stat')].map((tile) => [
      tile.querySelector('.result-stat-label')?.textContent,
      tile.querySelector('.result-stat-value')?.textContent,
    ]);
  return { overlay, onArena, onRetry, text, tiles };
}

function pressEnter(): void {
  window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter' }));
}

describe('dailyResult', () => {
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

  it('shows the medal, the next goal, the words, the time and the accuracy', () => {
    const { overlay, text, tiles } = setup();
    vi.runAllTimers();
    expect(text('.result-title')).toBe('Najlepsza próba dnia!');
    expect(overlay.element.querySelector('.medal-large.is-silver')).not.toBeNull();
    expect(text('.result-hint')).toBe('Srebro. Złoto: 3 minuty i 97%');
    expect(tiles()).toEqual([
      ['Słowa', '48'],
      ['Czas', '2:41'],
      ['Celność', '95'],
    ]);
    overlay.dispose();
  });

  it('lists the coins of the run, the stamp, the medal and the chest', () => {
    const { overlay } = setup();
    const lines = [...overlay.element.querySelectorAll('.daily-coin')].map((line) => [
      line.querySelector('.daily-coin-label')?.textContent,
      line.querySelector('.coin-pill strong')?.textContent,
    ]);
    expect(lines).toEqual([
      ['Za słowa', '+25'],
      ['Pieczątka', '+20'],
      ['Medal', '+20'],
      ['Skrzynia', '+40'],
    ]);
    overlay.dispose();
  });

  it('grades the time attack by pace', () => {
    const { overlay, text, tiles } = setup({
      format: formatOnWeekday(1),
      outcome: { medal: BRONZE, improved: false, triesLeft: 1, payout: PAYOUT },
    });
    vi.runAllTimers();
    expect(text('.result-title')).toBe('Dobra robota!');
    expect(text('.result-hint')).toBe('Brąz. Srebro: 15 słów na minutę i 93%');
    expect(tiles()[1]).toEqual(['Tempo', '16']);
    overlay.dispose();
  });

  it('plays again on Enter while tries remain', () => {
    const { overlay, onRetry, onArena } = setup();
    vi.advanceTimersByTime(KEY_READY_MS);
    pressEnter();
    expect(onRetry).toHaveBeenCalledOnce();
    overlay.element.querySelector<HTMLButtonElement>('.button-ghost')?.click();
    expect(onArena).toHaveBeenCalledOnce();
    overlay.dispose();
  });

  it('says a new challenge comes tomorrow after the last try', () => {
    const { overlay, onRetry, onArena, text } = setup({
      outcome: { medal: GOLD, improved: false, triesLeft: 0, payout: PAYOUT },
    });
    expect(text('.result-note')).toBe('Nowe wyzwanie jutro');
    expect(overlay.element.querySelector('.button-ghost')).toBeNull();
    expect(text('.button-primary')).toContain('Arena');
    vi.advanceTimersByTime(KEY_READY_MS);
    pressEnter();
    expect(onArena).toHaveBeenCalledOnce();
    expect(onRetry).not.toHaveBeenCalled();
    overlay.dispose();
  });

  it('cheers up after a run without a medal', () => {
    const { overlay, text } = setup({
      outcome: { medal: NO_MEDAL, improved: true, triesLeft: 2, payout: PAYOUT },
    });
    expect(text('.result-title')).toBe('Mrok był szybszy');
    expect(text('.result-hint')).toBe('Bez medalu. Brąz: 1 minuta i 85%');
    overlay.dispose();
  });
});
